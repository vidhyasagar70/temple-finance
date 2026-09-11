require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Settings = require('../models/Settings');
const Pangali = require('../models/Pangali');
const Festival = require('../models/Festival');
const VariPayment = require('../models/VariPayment');
const Contribution = require('../models/Contribution');
const Donation = require('../models/Donation');
const FundAdvance = require('../models/FundAdvance');
const FundTransaction = require('../models/FundTransaction');
const Expense = require('../models/Expense');
const LedgerTransaction = require('../models/LedgerTransaction');
const Counter = require('../models/Counter');

const ledgerService = require('../services/ledgerService');
const receiptService = require('../services/receiptService');
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

function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s\-\_\.\(\)\,\/\\\=\:\;]/g, '');
}

async function importRealData() {
  await connectDB();
  console.log('===================================================');
  console.log('   TEMPLE FINANCE SYSTEM - REAL DATA IMPORT');
  console.log('===================================================\n');

  // --- Step 1: Remove Dummy Seed Data ---
  console.log('>>> 1. Cleaning dummy sample data...');

  const preCounts = {
    Pangalis: await Pangali.countDocuments(),
    VariPayments: await VariPayment.countDocuments(),
    Contributions: await Contribution.countDocuments(),
    Donations: await Donation.countDocuments(),
    FundAdvances: await FundAdvance.countDocuments(),
    FundTransactions: await FundTransaction.countDocuments(),
    Expenses: await Expense.countDocuments(),
    Festivals: await Festival.countDocuments(),
    LedgerTransactions: await LedgerTransaction.countDocuments(),
    Counters: await Counter.countDocuments(),
  };

  console.log('Pre-cleanup document counts:');
  console.table(preCounts);

  await Pangali.deleteMany({});
  await VariPayment.deleteMany({});
  await Contribution.deleteMany({});
  await Donation.deleteMany({});
  await FundAdvance.deleteMany({});
  await FundTransaction.deleteMany({});
  await Expense.deleteMany({});
  await Festival.deleteMany({});
  await LedgerTransaction.deleteMany({});
  await Counter.deleteMany({});

  const postCounts = {
    Pangalis: await Pangali.countDocuments(),
    VariPayments: await VariPayment.countDocuments(),
    Contributions: await Contribution.countDocuments(),
    Donations: await Donation.countDocuments(),
    FundAdvances: await FundAdvance.countDocuments(),
    FundTransactions: await FundTransaction.countDocuments(),
    Expenses: await Expense.countDocuments(),
    Festivals: await Festival.countDocuments(),
    LedgerTransactions: await LedgerTransaction.countDocuments(),
    Counters: await Counter.countDocuments(),
  };

  console.log('\nPost-cleanup document counts (Users & Settings retained):');
  console.table(postCounts);

  // --- Get Admin & Settings ---
  let admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) {
    admin = await User.findOne();
  }
  if (!admin) {
    admin = new User({
      name: 'Temple Administrator',
      phone: '9999999999',
      role: 'ADMIN',
    });
    await admin.setPassword('ChangeMe123!');
    await admin.save();
    console.log('Created Admin user: 9999999999');
  }

  let settings = await Settings.findOne();
  const currentYear = new Date().getFullYear();
  const currentFY = settings?.currentFinancialYear || `${currentYear}-${currentYear + 1}`;
  if (!settings) {
    settings = await Settings.create({
      templeName: 'Arulmigu Mariamman Kovil',
      currentFinancialYear: currentFY,
    });
  }

  const placeholderDate = new Date(2026, 2, 15); // March 15, 2026
  const dateNotes = 'Imported from handwritten ledger - exact payment date unknown, placeholder date used';

  // --- Step 2: Read JSON Files ---
  const importDir = path.join(__dirname, '../data/import');
  const variPath = path.join(importDir, 'vari_collection.json');
  const contribPath = path.join(importDir, 'contributions.json');
  const donationPath = path.join(importDir, 'donations.json');

  const variRecords = JSON.parse(fs.readFileSync(variPath, 'utf8'));
  const contribRecords = JSON.parse(fs.readFileSync(contribPath, 'utf8'));
  const donationRecords = JSON.parse(fs.readFileSync(donationPath, 'utf8'));

  console.log(`\nLoaded source JSON files:`);
  console.log(`  - Vari Collection: ${variRecords.length} records`);
  console.log(`  - Contributions: ${contribRecords.length} records`);
  console.log(`  - Donations: ${donationRecords.length} records\n`);

  // --- Step 3: Import Vari Collection ---
  console.log('>>> 2. Importing Vari Collection...');
  let variPaymentsCreatedCount = 0;
  let pangalisCreatedCount = 0;
  let totalVariCollectedPaise = 0;

  for (let i = 0; i < variRecords.length; i++) {
    const rec = variRecords[i];
    let pangali = await Pangali.findOne({ familyName: rec.familyName });

    if (!pangali) {
      const pangaliCode = `PNG-${String(i + 1).padStart(4, '0')}`;
      pangali = await Pangali.create({
        pangaliCode,
        familyName: rec.familyName,
        houseName: rec.guardianName ? `S/o ${rec.guardianName}` : undefined,
        address: rec.place || undefined,
        annualVariAmountPaise: rupeesToPaise(rec.totalAssessed),
        notes: rec.remarks || undefined,
        isActive: true,
      });
      pangalisCreatedCount++;
    }

    const installments = Array.isArray(rec.installments) ? rec.installments : [rec.totalAssessed];
    for (const instVal of installments) {
      const amountPaise = rupeesToPaise(instVal);
      totalVariCollectedPaise += amountPaise;

      await safeTransaction(async (session) => {
        const createOpts = session ? { session } : {};
        const receiptNumber = await receiptService.generateReceiptNumber('VR', currentFY, session);

        const [payment] = await VariPayment.create(
          [
            {
              pangaliId: pangali._id,
              financialYear: currentFY,
              amountPaise,
              paymentDate: placeholderDate,
              paymentMethod: 'CASH',
              receiptNumber,
              notes: rec.remarks ? `${rec.remarks} | ${dateNotes}` : dateNotes,
              createdBy: admin._id,
              status: 'ACTIVE',
            },
          ],
          createOpts
        );

        const ledgerTxn = await ledgerService.createLedgerEntry({
          session,
          date: payment.paymentDate,
          type: 'VARI_RECEIVED',
          direction: 'CREDIT',
          amountPaise,
          sourceType: 'VariPayment',
          sourceId: payment._id,
          pangaliId: pangali._id,
          paymentMethod: 'CASH',
          referenceNumber: receiptNumber,
          description: rec.remarks || `Vari payment installment from ${rec.familyName}`,
          createdBy: admin._id,
        });

        payment.ledgerTransactionId = ledgerTxn._id;
        await payment.save(createOpts);
      });
      variPaymentsCreatedCount++;
    }
  }

  console.log(`   Done. Pangalis: ${pangalisCreatedCount}, Vari Payments: ${variPaymentsCreatedCount}`);

  // --- Step 4: Import Contributions ---
  console.log('>>> 3. Importing Contributions...');
  let contribCreatedCount = 0;
  let totalContribCashPaise = 0;

  for (const rec of contribRecords) {
    const notesArr = [];
    if (rec.details) notesArr.push(rec.details);
    if (rec.place && rec.place !== '-') notesArr.push(`Place: ${rec.place}`);
    if (rec.notes) notesArr.push(rec.notes);
    notesArr.push(dateNotes);
    const combinedNotes = notesArr.join(' | ');

    const amountPaise = rec.amount ? rupeesToPaise(rec.amount) : undefined;
    if (amountPaise) totalContribCashPaise += amountPaise;

    await safeTransaction(async (session) => {
      const createOpts = session ? { session } : {};
      const receiptNumber = await receiptService.generateReceiptNumber('CT', currentFY, session);

      const [contribution] = await Contribution.create(
        [
          {
            personType: 'OTHER',
            personName: rec.personName,
            contributionType: rec.contributionType,
            amountPaise: amountPaise || undefined,
            date: placeholderDate,
            paymentMethod: rec.amount ? 'CASH' : undefined,
            receiptNumber,
            notes: combinedNotes,
            createdBy: admin._id,
            status: 'ACTIVE',
          },
        ],
        createOpts
      );

      if (amountPaise && amountPaise > 0) {
        const ledgerTxn = await ledgerService.createLedgerEntry({
          session,
          date: contribution.date,
          type: 'CONTRIBUTION_RECEIVED',
          direction: 'CREDIT',
          amountPaise,
          sourceType: 'Contribution',
          sourceId: contribution._id,
          paymentMethod: 'CASH',
          referenceNumber: receiptNumber,
          description: rec.details || `${rec.contributionType} from ${rec.personName}`,
          createdBy: admin._id,
        });

        contribution.ledgerTransactionId = ledgerTxn._id;
        await contribution.save(createOpts);
      }
    });
    contribCreatedCount++;
  }

  console.log(`   Done. Contributions: ${contribCreatedCount}`);

  // --- Step 5: Import Donations ---
  console.log('>>> 4. Importing Donations & Kumbabishekam Festival...');

  const festival = await Festival.create({
    name: 'கும்பாபிஷேகம் (Kumbabishekam)',
    startDate: new Date(2026, 2, 1),
    endDate: new Date(2026, 2, 31),
    year: 2026,
    description: 'Mahakumbabishekam Festival Consecration',
    budgetPaise: 0,
  });

  let donationsCreatedCount = 0;
  let totalDonationsCashPaise = 0;

  for (const rec of donationRecords) {
    const notesArr = [];
    if (rec.place) notesArr.push(`Place: ${rec.place}`);
    if (rec.refNo) notesArr.push(`Ref: ${rec.refNo}`);
    notesArr.push(`Source: ${rec.sourceFile}`);
    if (rec.notes) notesArr.push(rec.notes);
    notesArr.push(dateNotes);
    const combinedNotes = notesArr.join(' | ');

    const amountPaise = rupeesToPaise(rec.amount);
    totalDonationsCashPaise += amountPaise;

    await safeTransaction(async (session) => {
      const createOpts = session ? { session } : {};
      const receiptNumber = await receiptService.generateReceiptNumber('DN', currentFY, session);

      const [donation] = await Donation.create(
        [
          {
            donationType: 'CASH',
            donorName: rec.donorName,
            amountPaise,
            donationDate: placeholderDate,
            purpose: 'FESTIVAL',
            paymentMethod: 'CASH',
            receiptNumber,
            festivalId: festival._id,
            notes: combinedNotes,
            createdBy: admin._id,
            status: 'ACTIVE',
          },
        ],
        createOpts
      );

      const ledgerTxn = await ledgerService.createLedgerEntry({
        session,
        date: donation.donationDate,
        type: 'DONATION_RECEIVED',
        direction: 'CREDIT',
        amountPaise,
        sourceType: 'Donation',
        sourceId: donation._id,
        festivalId: festival._id,
        paymentMethod: 'CASH',
        referenceNumber: receiptNumber,
        description: `Kumbabishekam donation from ${rec.donorName}`,
        createdBy: admin._id,
      });

      donation.ledgerTransactionId = ledgerTxn._id;
      await donation.save(createOpts);
    });
    donationsCreatedCount++;
  }

  console.log(`   Done. Festival: ${festival.name}, Donations: ${donationsCreatedCount}`);

  // --- Step 6: Duplicate Donor Detection ---
  console.log('\n>>> 5. Checking for potential duplicate donors across source ledgers...');

  const list1 = donationRecords.filter((d) => d.sourceFile === 'kumbabishekam_donor_list_1');
  const list2 = donationRecords.filter((d) => d.sourceFile === 'kumbabishekam_donor_list_2');

  const possibleDuplicates = [];

  for (const d1 of list1) {
    const norm1 = normalizeText(d1.donorName);
    const words1 = d1.donorName.split(/[\s\-\.\,\(\)\/]+/).filter((w) => w.length >= 3);

    for (const d2 of list2) {
      const norm2 = normalizeText(d2.donorName);
      const hasWordOverlap = words1.some((w) => {
        const nw = normalizeText(w);
        return nw.length >= 3 && norm2.includes(nw);
      });

      const isNameMatch = norm1.length >= 4 && norm2.length >= 4 && (norm1 === norm2 || (norm1.length > 5 && norm2.length > 5 && (norm1.includes(norm2) || norm2.includes(norm1))));
      const isHighConfidenceDuplicate = isNameMatch || (d1.amount === d2.amount && hasWordOverlap && d1.place && d2.place && normalizeText(d1.place) === normalizeText(d2.place));

      if (isHighConfidenceDuplicate) {
        possibleDuplicates.push({
          donor1: d1.donorName,
          ref1: d1.refNo,
          place1: d1.place,
          amount1: d1.amount,
          source1: d1.sourceFile,
          donor2: d2.donorName,
          ref2: d2.refNo,
          place2: d2.place,
          amount2: d2.amount,
          source2: d2.sourceFile,
        });
      }
    }
  }

  if (possibleDuplicates.length > 0) {
    console.log(`\n⚠️  FLAGGED POSSIBLE DUPLICATE DONORS (${possibleDuplicates.length} pairs detected for manual review):`);
    possibleDuplicates.forEach((dup, idx) => {
      console.log(`  [Pair ${idx + 1}]`);
      console.log(`    List 1: "${dup.donor1}" | Ref: ${dup.ref1 || '—'} | Place: ${dup.place1 || '—'} | Amount: ₹${dup.amount1}`);
      console.log(`    List 2: "${dup.donor2}" | Ref: ${dup.ref2 || '—'} | Place: ${dup.place2 || '—'} | Amount: ₹${dup.amount2}`);
    });
  } else {
    console.log('   No obvious duplicate donor pairs flagged.');
  }

  // --- Step 7: Final Summary ---
  console.log('\n===================================================');
  console.log('Import complete:');
  console.log(`  Pangalis created/matched: ${await Pangali.countDocuments()}`);
  console.log(`  Vari payments created: ${variPaymentsCreatedCount}`);
  console.log(`  Contributions created: ${contribCreatedCount}`);
  console.log(`  Donations created: ${donationsCreatedCount}`);
  console.log(`  Festival created: ${festival.name}`);
  console.log(`  Total Vari collected: ₹${paiseToRupees(totalVariCollectedPaise).toLocaleString('en-IN')}`);
  console.log(`  Total contributions (cash portion only): ₹${paiseToRupees(totalContribCashPaise).toLocaleString('en-IN')}`);
  console.log(`  Total donations: ₹${paiseToRupees(totalDonationsCashPaise).toLocaleString('en-IN')}`);
  console.log('===================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

importRealData().catch((err) => {
  console.error('Import error:', err);
  process.exit(1);
});
