require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const SirpiExpense = require('../models/SirpiExpense');
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

async function importSirpiExpenses() {
  await connectDB();
  console.log('===================================================');
  console.log('   TEMPLE FINANCE SYSTEM - SIRPI EXPENSES IMPORT');
  console.log('===================================================\n');

  const jsonPath = path.join(__dirname, '../data/import/sirpi_accounts.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: Data file not found at ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const items = JSON.parse(rawData);

  console.log(`Found ${items.length} Sirpi expense records in sirpi_accounts.json.`);

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
    const dateStr = item.date;
    const amountPaise = rupeesToPaise(item.amount);

    const startOfDay = new Date(itemDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(itemDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const paidThrough = item.paidThrough || '';
    const receivedBy = item.receivedBy || '';

    // Idempotency check
    const existing = await SirpiExpense.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      amountPaise: amountPaise,
      paidThrough: paidThrough,
      receivedBy: receivedBy,
      status: 'ACTIVE',
    });

    if (existing) {
      if (!existing.ledgerTransactionId) {
        await safeTransaction(async (session) => {
          const createOptions = session ? { session } : {};
          const ledgerTxn = await ledgerService.createLedgerEntry({
            session,
            date: existing.date,
            type: 'SIRPI_EXPENSE',
            direction: 'DEBIT',
            amountPaise,
            sourceType: 'SirpiExpense',
            sourceId: existing._id,
            paymentMethod: 'CASH',
            description: `Sirpi Expense - Paid through ${paidThrough}, Received by ${receivedBy}`,
            createdBy: adminUser._id,
          });
          existing.ledgerTransactionId = ledgerTxn._id;
          await existing.save(createOptions);
        });
      }
      skippedCount++;
      totalAmountPaise += amountPaise;
      datesSet.add(dateStr);
      allDates.push(itemDate);
      continue;
    }

    await safeTransaction(async (session) => {
      const createOptions = session ? { session } : {};

      const [record] = await SirpiExpense.create(
        [
          {
            sno: item.sno,
            date: itemDate,
            paidThrough: paidThrough,
            receivedBy: receivedBy,
            amountPaise: amountPaise,
            paymentMethod: 'CASH',
            notes: 'Imported from sirpi_accounts.json',
            createdBy: adminUser._id,
            status: 'ACTIVE',
          },
        ],
        createOptions
      );

      const ledgerTxn = await ledgerService.createLedgerEntry({
        session,
        date: record.date,
        type: 'SIRPI_EXPENSE',
        direction: 'DEBIT',
        amountPaise,
        sourceType: 'SirpiExpense',
        sourceId: record._id,
        paymentMethod: 'CASH',
        referenceNumber: undefined,
        description: `Sirpi Expense - Paid through ${paidThrough}, Received by ${receivedBy}`,
        createdBy: adminUser._id,
      });

      record.ledgerTransactionId = ledgerTxn._id;
      await record.save(createOptions);
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
  console.log(`Imported ${importedCount} Sirpi expense records across ${uniqueDatesCount} dates${skippedCount > 0 ? ` (${skippedCount} already present)` : ''}.`);
  console.log(`Total amount: ₹${totalRupeesStr}`);
  console.log(`Date range: ${minDateStr} to ${maxDateStr}`);
  console.log('===================================================\n');

  process.exit(0);
}

importSirpiExpenses().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
