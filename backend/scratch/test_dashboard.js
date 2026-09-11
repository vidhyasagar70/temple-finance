const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const LedgerTransaction = require('../models/LedgerTransaction');
const Pangali = require('../models/Pangali');

async function test() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/temple_finance');
  console.log('MongoDB connected');

  const stats = await LedgerTransaction.aggregate([
    { $match: { status: 'ACTIVE' } },
    {
      $group: {
        _id: '$type',
        totalPaise: { $sum: '$amountPaise' },
        count: { $sum: 1 },
      },
    },
  ]);

  const map = {};
  stats.forEach((item) => { map[item._id] = item.totalPaise; });

  const totalVariReceivedPaise = map['VARI_RECEIVED'] || 0;
  const totalDonationReceivedPaise = map['DONATION_RECEIVED'] || 0;
  const totalVariAndDonationPaise = totalVariReceivedPaise + totalDonationReceivedPaise;
  const totalExpensePaise = map['EXPENSE'] || 0;

  const balanceAgg = await LedgerTransaction.aggregate([
    { $match: { status: 'ACTIVE' } },
    {
      $group: {
        _id: null,
        totalCredit: {
          $sum: { $cond: [{ $eq: ['$direction', 'CREDIT'] }, '$amountPaise', 0] },
        },
        totalDebit: {
          $sum: { $cond: [{ $eq: ['$direction', 'DEBIT'] }, '$amountPaise', 0] },
        },
      },
    },
  ]);

  const currentBalancePaise = balanceAgg.length
    ? balanceAgg[0].totalCredit - balanceAgg[0].totalDebit
    : 0;

  console.log('\n--- DASHBOARD 5 METRICS TEST ---');
  console.log('1. Total Pangali Vari Collection:', `₹${(totalVariReceivedPaise / 100).toLocaleString('en-IN')}`);
  console.log('2. Total Cash Donations Received:', `₹${(totalDonationReceivedPaise / 100).toLocaleString('en-IN')}`);
  console.log('3. Vari Collection + Cash Donations:', `₹${(totalVariAndDonationPaise / 100).toLocaleString('en-IN')}`);
  console.log('4. Temple Expenses Done:', `₹${(totalExpensePaise / 100).toLocaleString('en-IN')}`);
  console.log('5. Current Balance:', `₹${(currentBalancePaise / 100).toLocaleString('en-IN')}`);
  console.log('--------------------------------\n');

  await mongoose.disconnect();
}

test().catch(console.error);
