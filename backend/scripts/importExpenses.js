require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Expense = require('../models/Expense');
const ledgerService = require('../services/ledgerService');
const { rupeesToPaise, paiseToRupees } = require('../utils/money');

async function safeTransaction(fn) {
  let session = null;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await fn(session);
    });
  } catch (err) {
    if (err.message && err.message.includes('Transaction numbers are only allowed')) {
      // Fallback for standalone MongoDB instances without replica set
      await fn(null);
    } else {
      throw err;
    }
  } finally {
    if (session) session.endSession();
  }
}

function formatDateDDMMYYYY(dateObj) {
  const d = new Date(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

async function importExpenses() {
  await connectDB();
  console.log('===================================================');
  console.log('   TEMPLE FINANCE SYSTEM - EXPENSES IMPORT');
  console.log('===================================================\n');

  const jsonPath = path.join(__dirname, '../data/import/expenses.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: Data file not found at ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const items = JSON.parse(rawData);

  console.log(`Found ${items.length} expense records in expenses.json.`);

  const adminUser = (await User.findOne({ role: 'ADMIN' })) || (await User.findOne({}));
  if (!adminUser) {
    console.error('Error: No admin user found in database.');
    process.exit(1);
  }

  let importedCount = 0;
  let skippedCount = 0;
  let totalAmountPaise = 0;
  const datesSet = new Set();
  const allDates = [];

  for (const item of items) {
    const itemDate = new Date(item.date);
    const dateStr = item.date; // YYYY-MM-DD
    const amountPaise = rupeesToPaise(item.amount);

    const startOfDay = new Date(itemDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(itemDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const descEnglish = item.descriptionEnglish || '';
    const descTamil = item.particularsTamil || '';
    const mainDesc = descEnglish || descTamil;

    // Idempotency check
    const existing = await Expense.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      amountPaise: amountPaise,
      $or: [
        { descriptionEnglish: descEnglish },
        { descriptionTamil: descTamil },
        { description: mainDesc },
      ],
      status: 'ACTIVE',
    });

    if (existing) {
      skippedCount++;
      totalAmountPaise += amountPaise;
      datesSet.add(dateStr);
      allDates.push(itemDate);
      continue;
    }

    await safeTransaction(async (session) => {
      const createOptions = session ? { session } : {};

      const [expense] = await Expense.create(
        [
          {
            date: itemDate,
            descriptionTamil: descTamil,
            descriptionEnglish: descEnglish,
            description: mainDesc,
            eventOrOccasion: item.event || '',
            category: item.category || 'OTHER',
            amountPaise: amountPaise,
            paidTo: 'Not recorded',
            paymentMethod: 'CASH',
            notes: 'Imported from Kovil_Renovation_Expenses-v2.xlsx',
            createdBy: adminUser._id,
            status: 'ACTIVE',
          },
        ],
        createOptions
      );

      const ledgerTxn = await ledgerService.createLedgerEntry({
        session,
        date: expense.date,
        type: 'EXPENSE',
        direction: 'DEBIT',
        amountPaise,
        sourceType: 'Expense',
        sourceId: expense._id,
        paymentMethod: 'CASH',
        referenceNumber: undefined,
        description: mainDesc || `Expense - ${item.category || 'General'}`,
        createdBy: adminUser._id,
      });

      expense.ledgerTransactionId = ledgerTxn._id;
      await expense.save(createOptions);
    });

    importedCount++;
    totalAmountPaise += amountPaise;
    datesSet.add(dateStr);
    allDates.push(itemDate);
  }

  allDates.sort((a, b) => a - b);
  const minDateStr = allDates.length > 0 ? formatDateDDMMYYYY(allDates[0]) : '';
  const maxDateStr = allDates.length > 0 ? formatDateDDMMYYYY(allDates[allDates.length - 1]) : '';
  const uniqueDatesCount = datesSet.size;
  const totalRupeesStr = paiseToRupees(totalAmountPaise).toLocaleString('en-IN');

  console.log('\n===================================================');
  console.log(`Imported ${importedCount} expense records across ${uniqueDatesCount} dates${skippedCount > 0 ? ` (${skippedCount} already present)` : ''}.`);
  console.log(`Total amount: ₹${totalRupeesStr}`);
  console.log(`Date range: ${minDateStr} to ${maxDateStr}`);
  console.log('===================================================\n');

  process.exit(0);
}

importExpenses().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
