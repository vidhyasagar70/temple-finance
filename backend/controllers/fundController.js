const mongoose = require('mongoose');
const FundAdvance = require('../models/FundAdvance');
const FundTransaction = require('../models/FundTransaction');
const Pangali = require('../models/Pangali');
const ledgerService = require('../services/ledgerService');
const receiptService = require('../services/receiptService');
const { computeAdvanceTotals } = require('../services/fundService');
const { toCSV, toXLSX } = require('../utils/exportUtil');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { rupeesToPaise, paiseToRupees } = require('../utils/money');
const { runWithTransaction } = require('../utils/transactionHelper');

const createFundAdvance = asyncHandler(async (req, res) => {
  const {
    recipientType,
    pangaliId,
    recipientName,
    principal,
    interestType,
    interestRatePercent,
    startDate,
    dueDate,
    purpose,
    notes,
  } = req.body;

  let name = recipientName;
  if (recipientType === 'PANGALI') {
    if (!pangaliId) throw ApiError.badRequest('Pangali ID is required for Pangali recipient');
    const pangali = await Pangali.findById(pangaliId);
    if (!pangali) throw ApiError.notFound('Pangali record not found');
    if (!name) name = pangali.familyName;
  }

  const principalPaise = rupeesToPaise(principal);
  if (principalPaise <= 0) {
    throw ApiError.badRequest('Principal must be a positive rupee value');
  }

  const createdAdvance = await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [advance] = await FundAdvance.create(
      [
        {
          recipientType,
          pangaliId: recipientType === 'PANGALI' ? pangaliId : undefined,
          recipientName: name,
          principalPaise,
          interestType,
          interestRatePercent: Number(interestRatePercent),
          startDate: new Date(startDate),
          dueDate: new Date(dueDate),
          purpose,
          notes,
          status: 'ACTIVE',
          createdBy: req.user.id,
        },
      ],
      opts
    );

    const [disbursement] = await FundTransaction.create(
      [
        {
          fundAdvanceId: advance._id,
          type: 'DISBURSEMENT',
          amountPaise: principalPaise,
          date: new Date(startDate),
          paymentMethod: 'CASH',
          notes: notes || 'Initial fund disbursement',
          status: 'ACTIVE',
          createdBy: req.user.id,
        },
      ],
      opts
    );

    const ledgerTxn = await ledgerService.createLedgerEntry({
      session,
      date: disbursement.date,
      type: 'FUND_GIVEN',
      direction: 'DEBIT',
      amountPaise: principalPaise,
      sourceType: 'FundTransaction',
      sourceId: disbursement._id,
      pangaliId: advance.pangaliId,
      paymentMethod: 'CASH',
      description: `Fund disbursement to ${name}`,
      createdBy: req.user.id,
    });

    disbursement.ledgerTransactionId = ledgerTxn._id;
    await disbursement.save(opts);

    return advance;
  });

  const populated = await FundAdvance.findById(createdAdvance._id).populate(
    'pangaliId',
    'familyName pangaliCode houseName'
  );
  res.status(201).json({ success: true, data: populated });
});

const listFundAdvances = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, recipientType, search, status } = req.query;

  const query = {};
  if (recipientType) query.recipientType = recipientType;
  if (status) query.status = status;
  if (search) {
    query.recipientName = { $regex: search, $options: 'i' };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [advances, total] = await Promise.all([
    FundAdvance.find(query)
      .populate('pangaliId', 'familyName pangaliCode houseName')
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    FundAdvance.countDocuments(query),
  ]);

  const advanceIds = advances.map((a) => a._id);
  const transactions = await FundTransaction.find({
    fundAdvanceId: { $in: advanceIds },
    status: 'ACTIVE',
  });

  const data = advances.map((adv) => {
    const txns = transactions.filter(
      (t) => t.fundAdvanceId.toString() === adv._id.toString()
    );
    const totals = computeAdvanceTotals(adv, txns);
    return {
      ...adv.toObject(),
      ...totals,
    };
  });

  res.json({
    success: true,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit) || 1,
    },
  });
});

const getFundAdvance = asyncHandler(async (req, res) => {
  const advance = await FundAdvance.findById(req.params.id).populate(
    'pangaliId',
    'familyName pangaliCode houseName'
  );
  if (!advance) throw ApiError.notFound('Fund advance record not found');

  const transactions = await FundTransaction.find({
    fundAdvanceId: advance._id,
    status: 'ACTIVE',
  }).sort({ date: 1 });

  const totals = computeAdvanceTotals(advance, transactions);

  res.json({
    success: true,
    data: {
      ...advance.toObject(),
      ...totals,
      transactions,
    },
  });
});

const recordRepayment = asyncHandler(async (req, res) => {
  const { type, amount, date, paymentMethod, notes } = req.body;

  if (!['PRINCIPAL_REPAYMENT', 'INTEREST_PAYMENT'].includes(type)) {
    throw ApiError.badRequest('Repayment type must be PRINCIPAL_REPAYMENT or INTEREST_PAYMENT');
  }

  const advance = await FundAdvance.findById(req.params.id);
  if (!advance) throw ApiError.notFound('Fund advance record not found');
  if (advance.status === 'CANCELLED' || advance.status === 'CLOSED') {
    throw ApiError.badRequest(`Cannot record repayment for advance in ${advance.status} status`);
  }

  const amountPaise = rupeesToPaise(amount);
  if (amountPaise <= 0) {
    throw ApiError.badRequest('Amount must be a positive rupee value');
  }

  const currentFY = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const createdTxn = await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const receiptNumber = await receiptService.generateReceiptNumber('FD', currentFY, session);

    const [repayment] = await FundTransaction.create(
      [
        {
          fundAdvanceId: advance._id,
          type,
          amountPaise,
          date: new Date(date),
          paymentMethod,
          receiptNumber,
          notes,
          status: 'ACTIVE',
          createdBy: req.user.id,
        },
      ],
      opts
    );

    const ledgerType =
      type === 'PRINCIPAL_REPAYMENT' ? 'PRINCIPAL_RECEIVED' : 'INTEREST_RECEIVED';

    const ledgerTxn = await ledgerService.createLedgerEntry({
      session,
      date: repayment.date,
      type: ledgerType,
      direction: 'CREDIT',
      amountPaise,
      sourceType: 'FundTransaction',
      sourceId: repayment._id,
      pangaliId: advance.pangaliId,
      paymentMethod,
      referenceNumber: receiptNumber,
      description: notes || `${type.replace('_', ' ')} for ${advance.recipientName}`,
      createdBy: req.user.id,
    });

    repayment.ledgerTransactionId = ledgerTxn._id;
    await repayment.save(opts);

    const findQuery = FundTransaction.find({
      fundAdvanceId: advance._id,
      status: 'ACTIVE',
    });
    if (session) findQuery.session(session);
    const allTxns = await findQuery;

    const totals = computeAdvanceTotals(advance, allTxns);
    advance.status = totals.status;
    await advance.save(opts);

    return repayment;
  });

  res.status(201).json({ success: true, data: createdTxn });
});

const cancelFundAdvance = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw ApiError.badRequest('Cancellation reason is required');

  const advance = await FundAdvance.findById(req.params.id);
  if (!advance) throw ApiError.notFound('Fund advance record not found');
  if (advance.status === 'CANCELLED') throw ApiError.badRequest('Advance is already cancelled');

  const repayments = await FundTransaction.find({
    fundAdvanceId: advance._id,
    type: { $in: ['PRINCIPAL_REPAYMENT', 'INTEREST_PAYMENT'] },
    status: 'ACTIVE',
  });

  if (repayments.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'Cannot cancel advance: active repayments have already been recorded against this fund advance.',
    });
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    advance.status = 'CANCELLED';
    await advance.save(opts);

    const findQuery = FundTransaction.find({ fundAdvanceId: advance._id });
    if (session) findQuery.session(session);
    const txns = await findQuery;

    for (const txn of txns) {
      txn.status = 'CANCELLED';
      txn.cancelledAt = new Date();
      txn.cancelledBy = req.user.id;
      txn.cancelReason = reason;
      await txn.save(opts);

      if (txn.ledgerTransactionId) {
        await ledgerService.cancelLedgerEntry({
          session,
          ledgerTransactionId: txn.ledgerTransactionId,
          cancelledBy: req.user.id,
          cancelReason: reason,
        });
      }
    }
  });

  res.json({ success: true, data: advance });
});

const exportFundAdvances = asyncHandler(async (req, res) => {
  const { format = 'csv', pangaliId, status } = req.query;

  const query = {};
  if (pangaliId) query.pangaliId = pangaliId;
  if (status) query.status = status;

  const advances = await FundAdvance.find(query)
    .populate('pangaliId', 'familyName pangaliCode')
    .sort({ startDate: -1 });

  const advanceIds = advances.map((a) => a._id);
  const transactions = await FundTransaction.find({
    fundAdvanceId: { $in: advanceIds },
    status: 'ACTIVE',
  });

  const items = advances.map((adv) => {
    const txns = transactions.filter(
      (t) => t.fundAdvanceId.toString() === adv._id.toString()
    );
    const totals = computeAdvanceTotals(adv, txns);
    return {
      ...adv.toObject(),
      ...totals,
    };
  });

  const columns = [
    {
      header: 'Recipient Name',
      key: 'recipientName',
      formatter: (val, row) =>
        row.recipientType === 'PANGALI' && row.pangaliId
          ? `${row.pangaliId.familyName} (${row.pangaliId.pangaliCode})`
          : val,
    },
    { header: 'Category', key: 'recipientType' },
    {
      header: 'Principal (Rupees)',
      key: 'principalPaise',
      formatter: (val) => paiseToRupees(val),
    },
    {
      header: 'Outstanding Principal (Rupees)',
      key: 'principalOutstandingPaise',
      formatter: (val) => paiseToRupees(val),
    },
    {
      header: 'Interest Paid (Rupees)',
      key: 'interestPaidPaise',
      formatter: (val) => paiseToRupees(val),
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      formatter: (val) => (val ? new Date(val).toLocaleDateString() : ''),
    },
    { header: 'Status', key: 'status' },
  ];

  const exportDate = new Date().toISOString().split('T')[0];

  if (format === 'xlsx') {
    const buffer = await toXLSX(items, columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="fund-advances-export-${exportDate}.xlsx"`);
    return res.send(buffer);
  }

  const csv = toCSV(items, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="fund-advances-export-${exportDate}.csv"`);
  res.send(csv);
});

module.exports = {
  createFundAdvance,
  listFundAdvances,
  getFundAdvance,
  recordRepayment,
  cancelFundAdvance,
  exportFundAdvances,
};
