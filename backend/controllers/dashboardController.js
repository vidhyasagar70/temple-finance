const LedgerTransaction = require('../models/LedgerTransaction');
const Pangali = require('../models/Pangali');
const VariPayment = require('../models/VariPayment');
const Donation = require('../models/Donation');
const asyncHandler = require('../utils/asyncHandler');
const { toCSV, toXLSX } = require('../utils/exportUtil');
const { formatINR, paiseToWords } = require('../utils/money');

// @desc    Get dashboard financial summary calculated strictly from LedgerTransaction
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = asyncHandler(async (req, res) => {
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
  const countMap = {};
  stats.forEach((item) => {
    map[item._id] = item.totalPaise;
    countMap[item._id] = item.count;
  });

  const totalVariReceivedPaise = map['VARI_RECEIVED'] || 0;
  const totalDonationReceivedPaise = map['DONATION_RECEIVED'] || 0;
  const totalContributionReceivedPaise = map['CONTRIBUTION_RECEIVED'] || 0;
  const totalInterestReceivedPaise = map['INTEREST_RECEIVED'] || 0;
  const totalExpensePaise = map['EXPENSE'] || 0;
  const totalSirpiExpensePaise = map['SIRPI_EXPENSE'] || 0;

  const variCount = countMap['VARI_RECEIVED'] || 0;
  const donationCount = countMap['DONATION_RECEIVED'] || 0;
  const sirpiCount = countMap['SIRPI_EXPENSE'] || 0;

  // Total active Pangali count
  const pangaliCount = await Pangali.countDocuments({ isActive: true });

  // Calculate overall balance: Total CREDIT - Total DEBIT
  const balanceAgg = await LedgerTransaction.aggregate([
    { $match: { status: 'ACTIVE' } },
    {
      $group: {
        _id: null,
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'CREDIT'] }, '$amountPaise', 0],
          },
        },
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'DEBIT'] }, '$amountPaise', 0],
          },
        },
      },
    },
  ]);

  const currentBalancePaise = balanceAgg.length
    ? balanceAgg[0].totalCredit - balanceAgg[0].totalDebit
    : 0;

  const totalVariAndDonationPaise = totalVariReceivedPaise + totalDonationReceivedPaise;

  res.json({
    success: true,
    data: {
      totalVariReceivedPaise,
      totalDonationReceivedPaise,
      totalVariAndDonationPaise,
      totalContributionReceivedPaise,
      totalInterestReceivedPaise,
      totalExpensePaise,
      totalSirpiExpensePaise,
      currentBalancePaise,
      pangaliCount,
      variCount,
      donationCount,
      sirpiCount,
    },
  });
});

// @desc    Export dashboard summary to CSV or XLSX
// @route   GET /api/dashboard/export
// @access  Private
const exportDashboardSummary = asyncHandler(async (req, res) => {
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';

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
  const countMap = {};
  stats.forEach((item) => {
    map[item._id] = item.totalPaise;
    countMap[item._id] = item.count;
  });

  const variTotal = map['VARI_RECEIVED'] || 0;
  const donationTotal = map['DONATION_RECEIVED'] || 0;
  const contributionTotal = map['CONTRIBUTION_RECEIVED'] || 0;
  const interestTotal = map['INTEREST_RECEIVED'] || 0;
  const expenseTotal = map['EXPENSE'] || 0;
  const sirpiTotal = map['SIRPI_EXPENSE'] || 0;

  const variCount = countMap['VARI_RECEIVED'] || 0;
  const donationCount = countMap['DONATION_RECEIVED'] || 0;
  const sirpiCount = countMap['SIRPI_EXPENSE'] || 0;

  const pangaliCount = await Pangali.countDocuments({ isActive: true });

  const balanceAgg = await LedgerTransaction.aggregate([
    { $match: { status: 'ACTIVE' } },
    {
      $group: {
        _id: null,
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'CREDIT'] }, '$amountPaise', 0],
          },
        },
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ['$direction', 'DEBIT'] }, '$amountPaise', 0],
          },
        },
      },
    },
  ]);

  const currentBalance = balanceAgg.length
    ? balanceAgg[0].totalCredit - balanceAgg[0].totalDebit
    : 0;

  const combinedTotal = variTotal + donationTotal;

  const rows = [
    {
      category: 'பங்காளிகள் வரி வசூல் மொத்தம் (Pangali Vari Collection)',
      amount: formatINR(variTotal),
      words: paiseToWords(variTotal),
      details: `${pangaliCount} பங்காளிகள் (${variCount} ரசீதுகள்)`,
    },
    {
      category: 'பண நன்கொடைகள் மொத்தம் (Cash Donations Received)',
      amount: formatINR(donationTotal),
      words: paiseToWords(donationTotal),
      details: `${donationCount} நன்கொடைகள்`,
    },
    {
      category: 'வரி வசூல் + நன்கொடை கூட்டுத்தொகை (Vari + Donations Total)',
      amount: formatINR(combinedTotal),
      words: paiseToWords(combinedTotal),
      details: 'வரி மற்றும் நன்கொடை மொத்த தொகை',
    },
    {
      category: 'கோவில் செலவுகள் மொத்தம் (Temple General Expenses)',
      amount: formatINR(expenseTotal),
      words: paiseToWords(expenseTotal),
      details: 'கும்பாபிஷேகம் & பொது பராமரிப்பு',
    },
    {
      category: 'சிற்பி வேலை செலவுகள் (Sirpi Expenses)',
      amount: formatINR(sirpiTotal),
      words: paiseToWords(sirpiTotal),
      details: `சிற்பி வேலை செலுத்துதல்கள் (${sirpiCount} பதிவுகள்)`,
    },
    {
      category: 'தற்போதைய நிலுவை இருப்பு (Current Net Balance)',
      amount: formatINR(currentBalance),
      words: paiseToWords(currentBalance),
      details: 'நிகர கணக்கு இருப்பு (Net Cash Balance)',
    },
    {
      category: 'பொருள் வடிவிலான பங்களிப்புகள் (In-Kind Contributions)',
      amount: formatINR(contributionTotal),
      words: paiseToWords(contributionTotal),
      details: 'பொருட்கள் மற்றும் வரவுகள்',
    },
    {
      category: 'பெறப்பட்ட வட்டி மொத்தம் (Total Interest Received)',
      amount: formatINR(interestTotal),
      words: paiseToWords(interestTotal),
      details: 'வட்டி வருவாய்கள்',
    },
  ];

  const columns = [
    { header: 'கணக்கு பிரிவு (Category)', key: 'category' },
    { header: 'தொகை (Rupees)', key: 'amount' },
    { header: 'தொகை எழுத்தால் (Amount in Words)', key: 'words' },
    { header: 'விபரம் (Details)', key: 'details' },
  ];

  const exportDate = new Date().toISOString().split('T')[0];

  if (format === 'xlsx') {
    const buffer = await toXLSX(rows, columns, 'அருள்மிகு சூராயம்மன் கோவில் துணை - நிதி நிலை அறிக்கை');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="dashboard-summary-${exportDate}.xlsx"`);
    return res.send(buffer);
  }

  const csvString = toCSV(rows, columns, 'அருள்மிகு சூராயம்மன் கோவில் துணை - நிதி நிலை அறிக்கை');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="dashboard-summary-${exportDate}.csv"`);
  return res.send(csvString);
});

module.exports = {
  getDashboardSummary,
  exportDashboardSummary,
};

