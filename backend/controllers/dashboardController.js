const LedgerTransaction = require('../models/LedgerTransaction');
const Pangali = require('../models/Pangali');
const VariPayment = require('../models/VariPayment');
const Donation = require('../models/Donation');
const asyncHandler = require('../utils/asyncHandler');

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

module.exports = {
  getDashboardSummary,
};
