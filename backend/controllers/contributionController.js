const mongoose = require('mongoose');
const Contribution = require('../models/Contribution');
const Pangali = require('../models/Pangali');
const Settings = require('../models/Settings');
const ledgerService = require('../services/ledgerService');
const receiptService = require('../services/receiptService');
const { toCSV, toXLSX } = require('../utils/exportUtil');
const { DEFAULT_CONTRIBUTION_TYPES } = require('../utils/constants');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { rupeesToPaise, paiseToRupees } = require('../utils/money');

const { runWithTransaction } = require('../utils/transactionHelper');

const createContribution = asyncHandler(async (req, res) => {
  const {
    personType,
    pangaliId,
    personName,
    contributionType,
    amount,
    date,
    paymentMethod,
    festivalId,
    notes,
    details,
    place,
  } = req.body;

  let displayName = personName;
  if (personType === 'PANGALI') {
    if (!pangaliId) throw ApiError.badRequest('Pangali ID is required');
    const pangali = await Pangali.findById(pangaliId);
    if (!pangali) throw ApiError.notFound('Pangali record not found');
    displayName = pangali.familyName;
  } else {
    if (!personName) throw ApiError.badRequest('Person name is required for OTHER recipient');
  }

  let amountPaise = undefined;
  if (amount !== undefined && amount !== null && amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0) {
    amountPaise = rupeesToPaise(amount);
    if (amountPaise <= 0) throw ApiError.badRequest('Amount must be a positive rupee value');
  }

  const currentFY = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const createdContribution = await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    let receiptNumber;
    try {
      receiptNumber = await receiptService.generateReceiptNumber('CT', currentFY, session);
    } catch {
      receiptNumber = `CT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const createDoc = {
      personType,
      pangaliId: personType === 'PANGALI' ? pangaliId : undefined,
      personName: personType === 'OTHER' ? personName : undefined,
      contributionType,
      amountPaise: amountPaise || 0,
      date: new Date(date),
      paymentMethod: (amountPaise && amountPaise > 0) ? paymentMethod : undefined,
      receiptNumber,
      festivalId: festivalId || undefined,
      notes,
      details,
      place,
      status: 'ACTIVE',
      createdBy: req.user.id,
    };

    const [contribution] = await Contribution.create([createDoc], opts);

    if (amountPaise && amountPaise > 0) {
      try {
        const ledgerTxn = await ledgerService.createLedgerEntry({
          session,
          date: contribution.date,
          type: 'CONTRIBUTION_RECEIVED',
          direction: 'CREDIT',
          amountPaise,
          sourceType: 'Contribution',
          sourceId: contribution._id,
          pangaliId: contribution.pangaliId,
          festivalId: contribution.festivalId,
          paymentMethod,
          referenceNumber: receiptNumber,
          description: notes || details || `${contributionType} contribution from ${displayName}`,
          createdBy: req.user.id,
        });

        contribution.ledgerTransactionId = ledgerTxn._id;
        await contribution.save(opts);
      } catch (ledgerErr) {
        // ignore ledger failure for non-critical paths (material offerings)
      }
    }
    return contribution;
  });

  const populated = await Contribution.findById(createdContribution._id)
    .populate('pangaliId', 'familyName pangaliCode houseName')
    .populate('festivalId', 'name year');

  res.status(201).json({ success: true, data: populated });
});

const getContributionById = asyncHandler(async (req, res) => {
  const contribution = await Contribution.findById(req.params.id)
    .populate('pangaliId', 'familyName pangaliCode houseName')
    .populate('festivalId', 'name year')
    .populate('createdBy', 'name')
    .populate('cancelledBy', 'name');

  if (!contribution) throw ApiError.notFound('Contribution record not found');
  res.json({ success: true, data: contribution });
});

const updateContribution = asyncHandler(async (req, res) => {
  const contribution = await Contribution.findById(req.params.id);
  if (!contribution) throw ApiError.notFound('Contribution record not found');
  if (contribution.status === 'CANCELLED') throw ApiError.badRequest('Cannot update a cancelled contribution');

  const {
    personType,
    pangaliId,
    personName,
    contributionType,
    amount,
    date,
    paymentMethod,
    festivalId,
    notes,
    details,
    place,
  } = req.body;

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};

    if (personType !== undefined) contribution.personType = personType;
    if (personType === 'PANGALI') {
      if (pangaliId !== undefined) contribution.pangaliId = pangaliId;
      contribution.personName = undefined;
    } else if (personType === 'OTHER') {
      contribution.pangaliId = undefined;
      if (personName !== undefined) contribution.personName = personName;
    }
    if (contributionType !== undefined) contribution.contributionType = contributionType;
    if (date !== undefined) contribution.date = new Date(date);
    if (festivalId !== undefined) contribution.festivalId = festivalId || undefined;
    if (notes !== undefined) contribution.notes = notes;
    if (details !== undefined) contribution.details = details;
    if (place !== undefined) contribution.place = place;

    let newAmountPaise = 0;
    if (amount !== undefined && amount !== null && amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0) {
      newAmountPaise = rupeesToPaise(amount);
      if (newAmountPaise <= 0) throw ApiError.badRequest('Amount must be a positive rupee value');
    }

    const oldAmountPaise = contribution.amountPaise || 0;
    contribution.amountPaise = newAmountPaise;
    if (newAmountPaise > 0 && paymentMethod) {
      contribution.paymentMethod = paymentMethod;
    } else if (newAmountPaise === 0) {
      contribution.paymentMethod = undefined;
    }

    if (newAmountPaise !== oldAmountPaise || contribution.ledgerTransactionId) {
      if (contribution.ledgerTransactionId) {
        try {
          await ledgerService.cancelLedgerEntry({
            session,
            ledgerTransactionId: contribution.ledgerTransactionId,
            cancelledBy: req.user.id,
            cancelReason: 'Contribution updated',
          });
          contribution.ledgerTransactionId = undefined;
        } catch {}
      }

      if (newAmountPaise > 0) {
        try {
          const displayName =
            contribution.personType === 'PANGALI'
              ? (await Pangali.findById(contribution.pangaliId))?.familyName || 'Pangali'
              : contribution.personName || 'Devotee';

          const ledgerTxn = await ledgerService.createLedgerEntry({
            session,
            date: contribution.date,
            type: 'CONTRIBUTION_RECEIVED',
            direction: 'CREDIT',
            amountPaise: newAmountPaise,
            sourceType: 'Contribution',
            sourceId: contribution._id,
            pangaliId: contribution.pangaliId,
            festivalId: contribution.festivalId,
            paymentMethod: contribution.paymentMethod,
            referenceNumber: contribution.receiptNumber,
            description: notes || details || `${contributionType} contribution from ${displayName}`,
            createdBy: req.user.id,
          });
          contribution.ledgerTransactionId = ledgerTxn._id;
        } catch {}
      }
    }

    await contribution.save(opts);
  });

  const updated = await Contribution.findById(contribution._id)
    .populate('pangaliId', 'familyName pangaliCode houseName')
    .populate('festivalId', 'name year');

  res.json({ success: true, data: updated });
});

const buildContributionQuery = async (params) => {
  const {
    personType,
    pangaliId,
    contributionType,
    festivalId,
    paymentMethod,
    status,
    from,
    to,
    minAmount,
    maxAmount,
    search,
  } = params;

  const query = {};
  if (personType) query.personType = personType;
  if (pangaliId) query.pangaliId = pangaliId;
  if (contributionType) query.contributionType = contributionType;
  if (festivalId) query.festivalId = festivalId;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (status) query.status = status;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
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
    const matchedPangalis = await Pangali.find({
      $or: [{ familyName: searchRegex }, { pangaliCode: searchRegex }],
    }).select('_id');
    const pangaliIds = matchedPangalis.map((p) => p._id);

    query.$or = [
      { personName: searchRegex },
      { contributionType: searchRegex },
      { notes: searchRegex },
      { details: searchRegex },
      { place: searchRegex },
      { pangaliId: { $in: pangaliIds } },
    ];
  }

  return query;
};

const listContributions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const query = await buildContributionQuery(req.query);

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Contribution.find(query)
      .populate('pangaliId', 'familyName pangaliCode houseName')
      .populate('festivalId', 'name year')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Contribution.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) || 1 },
  });
});

const cancelContribution = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw ApiError.badRequest('Cancellation reason is required');

  const contribution = await Contribution.findById(req.params.id);
  if (!contribution) throw ApiError.notFound('Contribution record not found');
  if (contribution.status === 'CANCELLED') throw ApiError.badRequest('Contribution is already cancelled');

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    contribution.status = 'CANCELLED';
    contribution.cancelledAt = new Date();
    contribution.cancelledBy = req.user.id;
    contribution.cancelReason = reason;
    await contribution.save(opts);

    if (contribution.ledgerTransactionId) {
      try {
        await ledgerService.cancelLedgerEntry({
          session,
          ledgerTransactionId: contribution.ledgerTransactionId,
          cancelledBy: req.user.id,
          cancelReason: reason,
        });
      } catch {}
    }
  });

  res.json({ success: true, data: contribution });
});

const getContributionTypes = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne();
  const types =
    settings && settings.contributionTypes && settings.contributionTypes.length > 0
      ? settings.contributionTypes
      : DEFAULT_CONTRIBUTION_TYPES;

  res.json({ success: true, data: types });
});

const exportContributions = asyncHandler(async (req, res) => {
  const { format = 'csv' } = req.query;
  const query = await buildContributionQuery(req.query);

  const items = await Contribution.find(query)
    .populate('pangaliId', 'familyName pangaliCode')
    .populate('festivalId', 'name year')
    .sort({ date: -1 });

  const columns = [
    { header: 'Receipt No', key: 'receiptNumber' },
    {
      header: 'Contributor Person',
      key: 'person',
      formatter: (_, row) =>
        row.personType === 'PANGALI'
          ? `${row.pangaliId?.familyName || ''} (${row.pangaliId?.pangaliCode || ''})`
          : row.personName || '—',
    },
    { header: 'Person Category', key: 'personType' },
    { header: 'Contribution Type', key: 'contributionType' },
    { header: 'Place', key: 'place', formatter: (val) => val || '—' },
    { header: 'Details / What they gave', key: 'details', formatter: (val) => val || '—' },
    {
      header: 'Amount (Rupees)',
      key: 'amount',
      formatter: (_, row) => (row.amountPaise ? paiseToRupees(row.amountPaise) : '—'),
    },
    {
      header: 'Date',
      key: 'date',
      formatter: (val) => (val ? new Date(val).toLocaleDateString() : ''),
    },
    { header: 'Payment Method', key: 'paymentMethod', formatter: (val) => val || '—' },
    {
      header: 'Festival',
      key: 'festival',
      formatter: (_, row) => (row.festivalId ? `${row.festivalId.name} (${row.festivalId.year})` : '—'),
    },
    { header: 'Notes', key: 'notes', formatter: (val) => val || '—' },
    { header: 'Status', key: 'status' },
  ];

  const exportDate = new Date().toISOString().split('T')[0];

  if (format === 'xlsx') {
    const buffer = await toXLSX(items, columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="contributions-export-${exportDate}.xlsx"`);
    return res.send(buffer);
  }

  const csv = toCSV(items, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="contributions-export-${exportDate}.csv"`);
  res.send(csv);
});

module.exports = {
  createContribution,
  getContributionById,
  updateContribution,
  listContributions,
  cancelContribution,
  getContributionTypes,
  exportContributions,
};
