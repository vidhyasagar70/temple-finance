const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const LedgerTransaction = require('../models/LedgerTransaction');
const ledgerService = require('../services/ledgerService');
const receiptService = require('../services/receiptService');
const { runWithTransaction } = require('../utils/transactionHelper');
const { toCSV, toXLSX } = require('../utils/exportUtil');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { rupeesToPaise, paiseToRupees } = require('../utils/money');

const createDonation = asyncHandler(async (req, res) => {
  const {
    donorName,
    phone,
    amount,
    donationDate,
    purpose,
    paymentMethod,
    festivalId,
    notes,
  } = req.body;

  const amountPaise = rupeesToPaise(amount);
  if (amountPaise <= 0) throw ApiError.badRequest('Amount must be a positive rupee value');
  if (!paymentMethod) throw ApiError.badRequest('Payment method is required');

  const currentFY = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  let createdDonation;

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const receiptNumber = await receiptService.generateReceiptNumber('DN', currentFY, session);

    const [donation] = await Donation.create(
      [
        {
          donationType: 'CASH',
          donorName,
          phone,
          amountPaise,
          donationDate: new Date(donationDate),
          purpose,
          paymentMethod,
          receiptNumber,
          festivalId: festivalId || undefined,
          notes,
          createdBy: req.user.id,
          status: 'ACTIVE',
        },
      ],
      opts
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
      paymentMethod,
      referenceNumber: receiptNumber,
      description: notes || `Cash donation from ${donorName} for ${purpose}`,
      createdBy: req.user.id,
    });

    donation.ledgerTransactionId = ledgerTxn._id;
    await donation.save(opts);
    createdDonation = donation;
  });

  const populated = await Donation.findById(createdDonation._id).populate('festivalId', 'name year');
  res.status(201).json({ success: true, data: populated });
});

const buildDonationQuery = (params) => {
  const { purpose, festivalId, from, to, minAmount, maxAmount, search } = params;

  const query = {};
  if (purpose) query.purpose = purpose;
  if (festivalId) query.festivalId = festivalId;
  if (from || to) {
    query.donationDate = {};
    if (from) query.donationDate.$gte = new Date(from);
    if (to) query.donationDate.$lte = new Date(to);
  }

  if (
    (minAmount !== undefined && minAmount !== null && minAmount !== '') ||
    (maxAmount !== undefined && maxAmount !== null && maxAmount !== '')
  ) {
    query.amountPaise = {};
    if (minAmount !== undefined && minAmount !== null && minAmount !== '') {
      query.amountPaise.$gte = rupeesToPaise(Number(minAmount));
    }
    if (maxAmount !== undefined && maxAmount !== null && maxAmount !== '') {
      query.amountPaise.$lte = rupeesToPaise(Number(maxAmount));
    }
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [{ donorName: searchRegex }, { notes: searchRegex }, { receiptNumber: searchRegex }];
  }

  return query;
};

const listDonations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const query = buildDonationQuery(req.query);

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Donation.find(query)
      .populate('festivalId', 'name year')
      .sort({ donationDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Donation.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  });
});

const cancelDonation = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw ApiError.badRequest('Cancellation reason is required');

  const donation = await Donation.findById(req.params.id);
  if (!donation) throw ApiError.notFound('Donation record not found');
  if (donation.status === 'CANCELLED') throw ApiError.badRequest('Donation record is already cancelled');

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    donation.status = 'CANCELLED';
    donation.cancelledAt = new Date();
    donation.cancelledBy = req.user.id;
    donation.cancelReason = reason;
    await donation.save(opts);

    if (donation.ledgerTransactionId) {
      await ledgerService.cancelLedgerEntry({
        session,
        ledgerTransactionId: donation.ledgerTransactionId,
        cancelledBy: req.user.id,
        cancelReason: reason,
      });
    }
  });

  res.json({ success: true, data: donation });
});

const exportDonations = asyncHandler(async (req, res) => {
  const { format = 'csv' } = req.query;
  const query = buildDonationQuery(req.query);

  const items = await Donation.find(query).populate('festivalId', 'name year').sort({ donationDate: -1 });

  const columns = [
    { header: 'Receipt No', key: 'receiptNumber', formatter: (val) => val || '—' },
    { header: 'Donor Name', key: 'donorName' },
    {
      header: 'Amount (Rupees)',
      key: 'amountPaise',
      formatter: (val) => (val ? paiseToRupees(val) : 0),
    },
    { header: 'Purpose', key: 'purpose' },
    {
      header: 'Donation Date',
      key: 'donationDate',
      formatter: (val) => (val ? new Date(val).toLocaleDateString() : ''),
    },
    { header: 'Method', key: 'paymentMethod', formatter: (val) => val || '—' },
    { header: 'Status', key: 'status' },
  ];

  const exportDate = new Date().toISOString().split('T')[0];

  if (format === 'xlsx') {
    const buffer = await toXLSX(items, columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="donations-export-${exportDate}.xlsx"`);
    return res.send(buffer);
  }

  const csv = toCSV(items, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="donations-export-${exportDate}.csv"`);
  res.send(csv);
});

const getDonationSummary = asyncHandler(async (req, res) => {
  const agg = await Donation.aggregate([
    { $match: { status: 'ACTIVE' } },
    {
      $group: {
        _id: null,
        totalDonationPaise: { $sum: '$amountPaise' },
        totalCount: { $sum: 1 },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      totalDonationPaise: agg[0]?.totalDonationPaise || 0,
      totalCount: agg[0]?.totalCount || 0,
    },
  });
});

const updateDonation = asyncHandler(async (req, res) => {
  const { donorName, phone, amount, donationDate, purpose, paymentMethod, festivalId, notes } = req.body;

  const donation = await Donation.findById(req.params.id);
  if (!donation) throw ApiError.notFound('Donation record not found');
  if (donation.status === 'CANCELLED') throw ApiError.badRequest('Cannot update a cancelled donation record');

  const amountPaise = amount !== undefined ? rupeesToPaise(amount) : donation.amountPaise;
  if (amountPaise <= 0) throw ApiError.badRequest('Amount must be a positive rupee value');

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    if (donorName !== undefined) donation.donorName = donorName;
    if (phone !== undefined) donation.phone = phone;
    donation.amountPaise = amountPaise;
    if (donationDate) donation.donationDate = new Date(donationDate);
    if (purpose) donation.purpose = purpose;
    if (paymentMethod) donation.paymentMethod = paymentMethod;
    donation.festivalId = festivalId || undefined;
    if (notes !== undefined) donation.notes = notes;

    await donation.save(opts);

    if (donation.ledgerTransactionId) {
      await ledgerService.updateLedgerEntry({
        session,
        ledgerTransactionId: donation.ledgerTransactionId,
        date: donation.donationDate,
        amountPaise: donation.amountPaise,
        paymentMethod: donation.paymentMethod,
        festivalId: donation.festivalId,
        description: donation.notes || `Cash donation from ${donation.donorName} for ${donation.purpose}`,
      });
    }
  });


  const updated = await Donation.findById(donation._id).populate('festivalId', 'name year');
  res.json({ success: true, data: updated });
});

const deleteDonation = asyncHandler(async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) throw ApiError.notFound('Donation record not found');

  const userId = req.user?.id || req.user?._id;

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    donation.status = 'CANCELLED';
    donation.cancelledAt = new Date();
    if (userId) donation.cancelledBy = userId;
    donation.cancelReason = 'Deleted from Donations';
    await donation.save(opts);

    if (donation.ledgerTransactionId) {
      await ledgerService.cancelLedgerEntry({
        session,
        ledgerTransactionId: donation.ledgerTransactionId,
        cancelledBy: userId,
        cancelReason: 'Deleted from Donations',
      });
    }
  });

  res.json({ success: true, message: 'Donation record deleted successfully' });
});

module.exports = {
  createDonation,
  listDonations,
  updateDonation,
  cancelDonation,
  deleteDonation,
  getDonationSummary,
  exportDonations,
};

