require('dotenv').config();
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

const ledgerService = require('../services/ledgerService');
const receiptService = require('../services/receiptService');
const { computeAdvanceTotals } = require('../services/fundService');
const { rupeesToPaise } = require('../utils/money');

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

async function seedSampleData() {
  await connectDB();
  console.log('--- Starting Sample Data Seeding ---');

  // Ensure Admin & Settings exist
  let admin = await User.findOne({ role: 'ADMIN' });
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
  const currentFY = `${currentYear}-${currentYear + 1}`;
  if (!settings) {
    settings = await Settings.create({
      templeName: 'Arulmigu Mariamman Kovil',
      currentFinancialYear: currentFY,
    });
    console.log('Created default Settings document');
  }

  // 1. Seed Users
  const userCount = await User.countDocuments();
  if (userCount < 3) {
    const committeeMember = new User({
      name: 'M. Senthil Kumar',
      phone: '9000000001',
      role: 'COMMITTEE_MEMBER',
    });
    await committeeMember.setPassword('Password123!');
    await committeeMember.save();

    const viewer = new User({
      name: 'K. Rajavelu',
      phone: '9000000002',
      role: 'VIEWER',
    });
    await viewer.setPassword('Password123!');
    await viewer.save();

    console.log('Seeded Committee Member (9000000001) & Viewer (9000000002)');
  } else {
    console.log('Users already seeded.');
  }

  // 2. Seed Pangalis
  let pangalis = await Pangali.find();
  if (pangalis.length < 5) {
    const pData = [
      { pangaliCode: 'PNG-0001', familyName: 'Periyaveettu Family', houseName: 'Vadakku Theru', phone: '9842100001', memberCount: 6, annualVariAmountPaise: rupeesToPaise(5000), isActive: true },
      { pangaliCode: 'PNG-0002', familyName: 'Kilmukku Pillaiyar Lineage', houseName: 'Kizhakku Street', phone: '9842100002', memberCount: 4, annualVariAmountPaise: rupeesToPaise(3000), isActive: true },
      { pangaliCode: 'PNG-0003', familyName: 'Mela Street Thavasi Family', houseName: 'Mela Street', phone: '9842100003', memberCount: 8, annualVariAmountPaise: rupeesToPaise(10000), isActive: true },
      { pangaliCode: 'PNG-0004', familyName: 'Bazaar Street Kovil Pangali', houseName: 'Main Bazaar', phone: '9842100004', memberCount: 5, annualVariAmountPaise: rupeesToPaise(6000), isActive: true },
      { pangaliCode: 'PNG-0005', familyName: 'Thenmadom Branch', houseName: 'South Street', phone: '9842100005', memberCount: 3, annualVariAmountPaise: rupeesToPaise(4000), isActive: false },
    ];
    for (const p of pData) {
      if (!(await Pangali.findOne({ pangaliCode: p.pangaliCode }))) {
        await Pangali.create(p);
      }
    }
    pangalis = await Pangali.find();
    console.log('Seeded 5 Pangali families.');
  } else {
    console.log('Pangalis already seeded.');
  }

  // 3. Seed Festivals
  let festivals = await Festival.find({ year: currentYear });
  if (festivals.length < 2) {
    const f1 = await Festival.create({
      name: 'Chithirai Thiruvizha 2026',
      startDate: new Date(currentYear, 3, 14),
      endDate: new Date(currentYear, 3, 24),
      year: currentYear,
      description: 'Annual 10-day Chithirai festival with Theru Thiruvizha and Annadhanam',
      budgetPaise: rupeesToPaise(50000),
    });
    const f2 = await Festival.create({
      name: 'Aadi Perukku Pooja 2026',
      startDate: new Date(currentYear, 7, 3),
      endDate: new Date(currentYear, 7, 4),
      year: currentYear,
      description: 'Special Aadi Month Abhishekam and Lamp Pooja',
      budgetPaise: rupeesToPaise(15000),
    });
    festivals = [f1, f2];
    console.log('Seeded 2 Festivals for current year.');
  } else {
    console.log('Festivals already seeded.');
  }

  // 4. Seed Vari Payments
  const variCount = await VariPayment.countDocuments();
  if (variCount < 5) {
    const p1 = pangalis[0];
    const p2 = pangalis[1];
    const p3 = pangalis[2];

    await safeTransaction(async (session) => {
      const vEntries = [
        { pangaliId: p1._id, amount: 5000, date: new Date(currentYear, 0, 15), method: 'CASH', notes: 'Full vari payment for year' },
        { pangaliId: p2._id, amount: 1500, date: new Date(currentYear, 1, 10), method: 'UPI', notes: 'Partial vari instalment 1' },
        { pangaliId: p2._id, amount: 1500, date: new Date(currentYear, 4, 1), method: 'CASH', notes: 'Final vari instalment 2' },
        { pangaliId: p3._id, amount: 5000, date: new Date(currentYear, 2, 20), method: 'BANK', notes: 'First instalment' },
        { pangaliId: p3._id, amount: 2500, date: new Date(currentYear, 5, 12), method: 'UPI', notes: 'Second instalment' },
      ];

      for (const ve of vEntries) {
        const rNum = await receiptService.generateReceiptNumber('VR', currentFY, session);
        const amountPaise = rupeesToPaise(ve.amount);
        const createOptions = session ? { session } : {};
        const [payment] = await VariPayment.create(
          [
            {
              pangaliId: ve.pangaliId,
              financialYear: currentFY,
              amountPaise,
              paymentDate: ve.date,
              paymentMethod: ve.method,
              receiptNumber: rNum,
              notes: ve.notes,
              createdBy: admin._id,
              status: 'ACTIVE',
            },
          ],
          createOptions
        );

        const ledgerTxn = await ledgerService.createLedgerEntry({
          session,
          date: payment.paymentDate,
          type: 'VARI_RECEIVED',
          direction: 'CREDIT',
          amountPaise,
          sourceType: 'VariPayment',
          sourceId: payment._id,
          pangaliId: ve.pangaliId,
          paymentMethod: ve.method,
          referenceNumber: rNum,
          description: ve.notes,
          createdBy: admin._id,
        });

        payment.ledgerTransactionId = ledgerTxn._id;
        await payment.save(createOptions);
      }
    });
    console.log('Seeded 5 Vari Payment records.');
  } else {
    console.log('Vari Payments already seeded.');
  }

  // 5. Seed Contributions
  const ctCount = await Contribution.countDocuments();
  if (ctCount < 5) {
    await safeTransaction(async (session) => {
      const createOptions = session ? { session } : {};
      const ctData = [
        { personType: 'PANGALI', pangaliId: pangalis[0]._id, type: 'FESTIVAL_CONTRIBUTION', amount: 2000, date: new Date(currentYear, 3, 10), method: 'CASH', festivalId: festivals[0]._id, notes: 'Special Annadhanam pledge' },
        { personType: 'PANGALI', pangaliId: pangalis[1]._id, type: 'NEETHI', amount: 1000, date: new Date(currentYear, 3, 12), method: 'UPI', notes: 'Neethi contribution' },
        { personType: 'OTHER', personName: 'S. Shanmugam (Singapore)', type: 'RENOVATION_CONTRIBUTION', amount: 10000, date: new Date(currentYear, 2, 5), method: 'BANK', notes: 'Gopuram painting contribution' },
        { personType: 'OTHER', personName: 'V. Meenakshi Ammal', type: 'SPECIAL_CONTRIBUTION', amount: 2500, date: new Date(currentYear, 4, 18), method: 'CASH', notes: 'Prasadam offering' },
        { personType: 'PANGALI', pangaliId: pangalis[2]._id, type: 'FESTIVAL_CONTRIBUTION', amount: 5000, date: new Date(currentYear, 3, 15), method: 'CASH', festivalId: festivals[0]._id, notes: 'Theru decoration sponsor' },
      ];

      for (const ct of ctData) {
        const rNum = await receiptService.generateReceiptNumber('CT', currentFY, session);
        const amountPaise = rupeesToPaise(ct.amount);
        const [contribution] = await Contribution.create(
          [
            {
              personType: ct.personType,
              pangaliId: ct.pangaliId,
              personName: ct.personName,
              contributionType: ct.type,
              amountPaise,
              date: ct.date,
              paymentMethod: ct.method,
              receiptNumber: rNum,
              festivalId: ct.festivalId,
              notes: ct.notes,
              createdBy: admin._id,
              status: 'ACTIVE',
            },
          ],
          createOptions
        );

        const ledgerTxn = await ledgerService.createLedgerEntry({
          session,
          date: contribution.date,
          type: 'CONTRIBUTION_RECEIVED',
          direction: 'CREDIT',
          amountPaise,
          sourceType: 'Contribution',
          sourceId: contribution._id,
          pangaliId: ct.pangaliId,
          festivalId: ct.festivalId,
          paymentMethod: ct.method,
          referenceNumber: rNum,
          description: ct.notes,
          createdBy: admin._id,
        });

        contribution.ledgerTransactionId = ledgerTxn._id;
        await contribution.save(createOptions);
      }
    });
    console.log('Seeded 5 Contribution records.');
  } else {
    console.log('Contributions already seeded.');
  }

  // 6. Seed Donations (Cash + Material)
  const dnCount = await Donation.countDocuments();
  if (dnCount < 5) {
    await safeTransaction(async (session) => {
      const createOptions = session ? { session } : {};
      const dnData = [
        { type: 'CASH', donor: 'Dr. A. Arumugam', amount: 5001, date: new Date(currentYear, 1, 1), purpose: 'GENERAL_TEMPLE_FUND', method: 'CASH', notes: 'New Year Ubayam' },
        { type: 'CASH', donor: 'K. Lakshmi Narayanan', amount: 10000, date: new Date(currentYear, 3, 14), purpose: 'FESTIVAL', method: 'UPI', festivalId: festivals[0]._id, notes: 'Chithirai Thiruvizha donor' },
        { type: 'MATERIAL', donor: 'T. Palanisamy', itemDescription: 'Raw Rice - 50kg bag', estimatedValue: 2500, date: new Date(currentYear, 3, 15), purpose: 'ANNADHANAM', festivalId: festivals[0]._id, notes: 'For Annadhanam kitchen' },
        { type: 'MATERIAL', donor: 'S. Kasthuri', itemDescription: 'Brass Kuthu Vilakku (2 Pairs)', estimatedValue: 3500, date: new Date(currentYear, 4, 1), purpose: 'POOJA', notes: 'Sannidhi lamps' },
        { type: 'MATERIAL', donor: 'Village Farmers Association', itemDescription: 'Sesame Cooking Oil - 15L Tin', estimatedValue: null, date: new Date(currentYear, 3, 16), purpose: 'POOJA', notes: 'Oil donation for lamps' },
      ];

      for (const dn of dnData) {
        if (dn.type === 'CASH') {
          const rNum = await receiptService.generateReceiptNumber('DN', currentFY, session);
          const amountPaise = rupeesToPaise(dn.amount);
          const [donation] = await Donation.create(
            [
              {
                donationType: 'CASH',
                donorName: dn.donor,
                amountPaise,
                donationDate: dn.date,
                purpose: dn.purpose,
                paymentMethod: dn.method,
                receiptNumber: rNum,
                festivalId: dn.festivalId,
                notes: dn.notes,
                createdBy: admin._id,
                status: 'ACTIVE',
              },
            ],
            createOptions
          );

          const ledgerTxn = await ledgerService.createLedgerEntry({
            session,
            date: donation.donationDate,
            type: 'DONATION_RECEIVED',
            direction: 'CREDIT',
            amountPaise,
            sourceType: 'Donation',
            sourceId: donation._id,
            festivalId: donation.festivalId,
            paymentMethod: dn.method,
            referenceNumber: rNum,
            description: dn.notes,
            createdBy: admin._id,
          });

          donation.ledgerTransactionId = ledgerTxn._id;
          await donation.save(createOptions);
        } else {
          const estimatedValuePaise = dn.estimatedValue ? rupeesToPaise(dn.estimatedValue) : undefined;
          const [donation] = await Donation.create(
            [
              {
                donationType: 'MATERIAL',
                donorName: dn.donor,
                itemDescription: dn.itemDescription,
                estimatedValuePaise,
                donationDate: dn.date,
                purpose: dn.purpose,
                festivalId: dn.festivalId,
                notes: dn.notes,
                createdBy: admin._id,
                status: 'ACTIVE',
              },
            ],
            createOptions
          );

          if (estimatedValuePaise) {
            const ledgerTxn = await ledgerService.createLedgerEntry({
              session,
              date: donation.donationDate,
              type: 'DONATION_RECEIVED',
              direction: 'CREDIT',
              amountPaise: estimatedValuePaise,
              sourceType: 'Donation',
              sourceId: donation._id,
              festivalId: donation.festivalId,
              paymentMethod: 'OTHER',
              description: `Material donation (${dn.itemDescription})`,
              createdBy: admin._id,
            });
            donation.ledgerTransactionId = ledgerTxn._id;
            await donation.save(createOptions);
          }
        }
      }
    });
    console.log('Seeded 5 Donation records (2 CASH, 3 MATERIAL).');
  } else {
    console.log('Donations already seeded.');
  }

  // 7. Seed Temple Fund Advances (CLOSED, PARTIALLY_REPAID, ACTIVE, OVERDUE)
  const fundCount = await FundAdvance.countDocuments();
  if (fundCount < 4) {
    await safeTransaction(async (session) => {
      const createOptions = session ? { session } : {};

      // Adv 1: CLOSED
      const [a1] = await FundAdvance.create(
        [
          {
            recipientType: 'PANGALI',
            pangaliId: pangalis[0]._id,
            recipientName: pangalis[0].familyName,
            principalPaise: rupeesToPaise(20000),
            interestType: 'MONTHLY',
            interestRatePercent: 12,
            startDate: new Date(currentYear - 1, 0, 10),
            dueDate: new Date(currentYear - 1, 6, 10),
            purpose: 'Emergency medical advance',
            status: 'CLOSED',
            createdBy: admin._id,
          },
        ],
        createOptions
      );
      const [t1Dis] = await FundTransaction.create(
        [{ fundAdvanceId: a1._id, type: 'DISBURSEMENT', amountPaise: a1.principalPaise, date: a1.startDate, paymentMethod: 'CASH', createdBy: admin._id, status: 'ACTIVE' }],
        createOptions
      );
      await ledgerService.createLedgerEntry({ session, date: a1.startDate, type: 'FUND_GIVEN', direction: 'DEBIT', amountPaise: a1.principalPaise, sourceType: 'FundTransaction', sourceId: t1Dis._id, pangaliId: a1.pangaliId, paymentMethod: 'CASH', createdBy: admin._id });

      const [t1Rep] = await FundTransaction.create(
        [{ fundAdvanceId: a1._id, type: 'PRINCIPAL_REPAYMENT', amountPaise: a1.principalPaise, date: new Date(currentYear - 1, 5, 1), paymentMethod: 'CASH', receiptNumber: 'FD-2025-0001', createdBy: admin._id, status: 'ACTIVE' }],
        createOptions
      );
      await ledgerService.createLedgerEntry({ session, date: t1Rep.date, type: 'PRINCIPAL_RECEIVED', direction: 'CREDIT', amountPaise: a1.principalPaise, sourceType: 'FundTransaction', sourceId: t1Rep._id, pangaliId: a1.pangaliId, paymentMethod: 'CASH', referenceNumber: 'FD-2025-0001', createdBy: admin._id });

      // Adv 2: PARTIALLY_REPAID
      const [a2] = await FundAdvance.create(
        [
          {
            recipientType: 'PANGALI',
            pangaliId: pangalis[1]._id,
            recipientName: pangalis[1].familyName,
            principalPaise: rupeesToPaise(30000),
            interestType: 'SIMPLE',
            interestRatePercent: 10,
            startDate: new Date(currentYear, 0, 15),
            dueDate: new Date(currentYear, 11, 31),
            purpose: 'Agriculture loan',
            status: 'PARTIALLY_REPAID',
            createdBy: admin._id,
          },
        ],
        createOptions
      );
      const [t2Dis] = await FundTransaction.create(
        [{ fundAdvanceId: a2._id, type: 'DISBURSEMENT', amountPaise: a2.principalPaise, date: a2.startDate, paymentMethod: 'CASH', createdBy: admin._id, status: 'ACTIVE' }],
        createOptions
      );
      await ledgerService.createLedgerEntry({ session, date: a2.startDate, type: 'FUND_GIVEN', direction: 'DEBIT', amountPaise: a2.principalPaise, sourceType: 'FundTransaction', sourceId: t2Dis._id, pangaliId: a2.pangaliId, paymentMethod: 'CASH', createdBy: admin._id });

      const [t2Rep] = await FundTransaction.create(
        [{ fundAdvanceId: a2._id, type: 'PRINCIPAL_REPAYMENT', amountPaise: rupeesToPaise(10000), date: new Date(currentYear, 3, 1), paymentMethod: 'UPI', receiptNumber: 'FD-2026-0002', createdBy: admin._id, status: 'ACTIVE' }],
        createOptions
      );
      await ledgerService.createLedgerEntry({ session, date: t2Rep.date, type: 'PRINCIPAL_RECEIVED', direction: 'CREDIT', amountPaise: rupeesToPaise(10000), sourceType: 'FundTransaction', sourceId: t2Rep._id, pangaliId: a2.pangaliId, paymentMethod: 'UPI', referenceNumber: 'FD-2026-0002', createdBy: admin._id });

      // Adv 3: ACTIVE (No repayments)
      const [a3] = await FundAdvance.create(
        [
          {
            recipientType: 'INDIVIDUAL',
            recipientName: 'V. Sundaram Pillai',
            principalPaise: rupeesToPaise(15000),
            interestType: 'MONTHLY',
            interestRatePercent: 12,
            startDate: new Date(currentYear, 2, 1),
            dueDate: new Date(currentYear, 8, 30),
            purpose: 'Small business loan',
            status: 'ACTIVE',
            createdBy: admin._id,
          },
        ],
        createOptions
      );
      const [t3Dis] = await FundTransaction.create(
        [{ fundAdvanceId: a3._id, type: 'DISBURSEMENT', amountPaise: a3.principalPaise, date: a3.startDate, paymentMethod: 'CASH', createdBy: admin._id, status: 'ACTIVE' }],
        createOptions
      );
      await ledgerService.createLedgerEntry({ session, date: a3.startDate, type: 'FUND_GIVEN', direction: 'DEBIT', amountPaise: a3.principalPaise, sourceType: 'FundTransaction', sourceId: t3Dis._id, paymentMethod: 'CASH', createdBy: admin._id });

      // Adv 4: OVERDUE
      const [a4] = await FundAdvance.create(
        [
          {
            recipientType: 'INDIVIDUAL',
            recipientName: 'R. Perumal',
            principalPaise: rupeesToPaise(25000),
            interestType: 'YEARLY',
            interestRatePercent: 12,
            startDate: new Date(currentYear - 1, 0, 1),
            dueDate: new Date(currentYear - 1, 11, 31),
            purpose: 'House repair loan',
            status: 'OVERDUE',
            createdBy: admin._id,
          },
        ],
        createOptions
      );
      const [t4Dis] = await FundTransaction.create(
        [{ fundAdvanceId: a4._id, type: 'DISBURSEMENT', amountPaise: a4.principalPaise, date: a4.startDate, paymentMethod: 'CASH', createdBy: admin._id, status: 'ACTIVE' }],
        createOptions
      );
      await ledgerService.createLedgerEntry({ session, date: a4.startDate, type: 'FUND_GIVEN', direction: 'DEBIT', amountPaise: a4.principalPaise, sourceType: 'FundTransaction', sourceId: t4Dis._id, paymentMethod: 'CASH', createdBy: admin._id });
    });
    console.log('Seeded 4 Fund Advance records (CLOSED, PARTIALLY_REPAID, ACTIVE, OVERDUE).');
  } else {
    console.log('Fund Advances already seeded.');
  }

  // 8. Seed Expenses
  const expCount = await Expense.countDocuments();
  if (expCount < 5) {
    await safeTransaction(async (session) => {
      const createOptions = session ? { session } : {};
      const expData = [
        { category: 'PRIEST', amount: 8000, date: new Date(currentYear, 3, 14), paidTo: 'Chief Priest Sundara Gurukkal', method: 'CASH', festivalId: festivals[0]._id, billNo: 'V-001', desc: 'Sambhavanai for Chithirai festival' },
        { category: 'ANNADHANAM', amount: 15000, date: new Date(currentYear, 3, 15), paidTo: 'Sri Ram Catering Services', method: 'BANK', festivalId: festivals[0]._id, billNo: 'V-002', desc: 'Meals for 1000 devotees' },
        { category: 'ELECTRICITY', amount: 3200, date: new Date(currentYear, 2, 5), paidTo: 'TNEB Electricity Board', method: 'UPI', billNo: 'EB-9921', desc: 'Monthly temple power bill' },
        { category: 'CLEANING', amount: 1500, date: new Date(currentYear, 3, 1), paidTo: 'K. Muthu Sanitary Team', method: 'CASH', billNo: 'V-003', desc: 'Temple premises deep cleaning' },
        { category: 'POOJA', amount: 4500, date: new Date(currentYear, 3, 13), paidTo: 'Venkateswara Flowers & Pooja Store', method: 'CASH', festivalId: festivals[0]._id, billNo: 'V-004', desc: 'Garlands & pooja materials' },
      ];

      for (const ed of expData) {
        const amountPaise = rupeesToPaise(ed.amount);
        const [expense] = await Expense.create(
          [
            {
              category: ed.category,
              amountPaise,
              date: ed.date,
              paidTo: ed.paidTo,
              paymentMethod: ed.method,
              festivalId: ed.festivalId,
              billNumber: ed.billNo,
              description: ed.desc,
              createdBy: admin._id,
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
          festivalId: expense.festivalId,
          paymentMethod: ed.method,
          referenceNumber: ed.billNo,
          description: ed.desc,
          createdBy: admin._id,
        });

        expense.ledgerTransactionId = ledgerTxn._id;
        await expense.save(createOptions);
      }
    });
    console.log('Seeded 5 Expense records.');
  } else {
    console.log('Expenses already seeded.');
  }

  console.log('\n--- Seed complete summary ---');
  console.log(`  Users: ${await User.countDocuments()}`);
  console.log(`  Pangalis: ${await Pangali.countDocuments()}`);
  console.log(`  Festivals: ${await Festival.countDocuments()}`);
  console.log(`  Vari Payments: ${await VariPayment.countDocuments()}`);
  console.log(`  Contributions: ${await Contribution.countDocuments()}`);
  console.log(`  Donations: ${await Donation.countDocuments()}`);
  console.log(`  Fund Advances: ${await FundAdvance.countDocuments()}`);
  console.log(`  Expenses: ${await Expense.countDocuments()}`);

  await mongoose.disconnect();
  process.exit(0);
}

seedSampleData().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
