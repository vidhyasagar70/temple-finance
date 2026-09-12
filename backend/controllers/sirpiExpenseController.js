const mongoose = require('mongoose');
const SirpiExpense = require('../models/SirpiExpense');
const ledgerService = require('../services/ledgerService');
const { runWithTransaction } = require('../utils/transactionHelper');
const { toCSV, toXLSX } = require('../utils/exportUtil');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { rupeesToPaise, paiseToRupees } = require('../utils/money');

const createSirpiExpense = asyncHandler(async (req, res) => {
  const {
    date,
    paidThrough,
    receivedBy,
    amount,
    paymentMethod = 'CASH',
    notes,
  } = req.body;

  const amountPaise = rupeesToPaise(amount);
  if (amountPaise <= 0) {
    throw ApiError.badRequest('Amount must be a positive rupee value');
  }

  if (!paidThrough || !receivedBy) {
    throw ApiError.badRequest('Paid through (வசமிருந்தவர்) and Received by (பெற்றவர்) are required');
  }

  let createdRecord;
  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [record] = await SirpiExpense.create(
      [
        {
          date: new Date(date),
          paidThrough,
          receivedBy,
          amountPaise,
          paymentMethod: paymentMethod || 'CASH',
          notes,
          createdBy: req.user.id,
          status: 'ACTIVE',
        },
      ],
      opts
    );

    const ledgerTxn = await ledgerService.createLedgerEntry({
      session,
      date: record.date,
      type: 'SIRPI_EXPENSE',
      direction: 'DEBIT',
      amountPaise,
      sourceType: 'SirpiExpense',
      sourceId: record._id,
      paymentMethod: record.paymentMethod,
      description: `Sirpi Expense - Paid through ${paidThrough}, Received by ${receivedBy}`,
      createdBy: req.user.id,
    });

    record.ledgerTransactionId = ledgerTxn._id;
    await record.save(opts);

    createdRecord = record;
  });

  res.status(201).json({ success: true, data: createdRecord });
});

const listSirpiExpenses = asyncHandler(async (req, res) => {
  const { search, paymentMethod, from, to, page = 1, limit = 20 } = req.query;

  const query = { status: 'ACTIVE' };
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [{ paidThrough: regex }, { receivedBy: regex }, { notes: regex }];
  }
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      query.date.$lte = toDate;
    }
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total, totalSumResult] = await Promise.all([
    SirpiExpense.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    SirpiExpense.countDocuments(query),
    SirpiExpense.aggregate([
      { $match: { ...query, status: 'ACTIVE' } },
      { $group: { _id: null, totalPaise: { $sum: '$amountPaise' } } },
    ]),
  ]);

  const grandTotalPaise = totalSumResult[0]?.totalPaise || 0;

  res.json({
    success: true,
    data: items,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit) || 1,
    },
    grandTotalPaise,
  });
});

const cancelSirpiExpense = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    throw ApiError.badRequest('Cancellation reason is required');
  }

  const record = await SirpiExpense.findById(req.params.id);
  if (!record) {
    throw ApiError.notFound('Sirpi expense record not found');
  }
  if (record.status === 'CANCELLED') {
    throw ApiError.badRequest('Record is already cancelled');
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    record.status = 'CANCELLED';
    record.cancelledAt = new Date();
    record.cancelledBy = req.user.id;
    record.cancelReason = reason;
    await record.save(opts);

    if (record.ledgerTransactionId) {
      await ledgerService.cancelLedgerEntry({
        session,
        ledgerTransactionId: record.ledgerTransactionId,
        cancelledBy: req.user.id,
        cancelReason: reason,
      });
    }
  });

  res.json({ success: true, data: record });
});

const updateSirpiExpense = asyncHandler(async (req, res) => {
  const { date, paidThrough, receivedBy, amount, paymentMethod, notes } = req.body;

  const record = await SirpiExpense.findById(req.params.id);
  if (!record) {
    throw ApiError.notFound('Sirpi expense record not found');
  }
  if (record.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot update a cancelled record');
  }

  let amountPaise;
  if (amount !== undefined && amount !== null) {
    amountPaise = rupeesToPaise(Number(amount));
    if (amountPaise <= 0) throw ApiError.badRequest('Amount must be a positive rupee value');
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    if (date) record.date = new Date(date);
    if (paidThrough !== undefined) record.paidThrough = paidThrough;
    if (receivedBy !== undefined) record.receivedBy = receivedBy;
    if (amountPaise !== undefined) record.amountPaise = amountPaise;
    if (paymentMethod) record.paymentMethod = paymentMethod;
    if (notes !== undefined) record.notes = notes;

    await record.save(opts);

    if (record.ledgerTransactionId) {
      await ledgerService.updateLedgerEntry({
        session,
        ledgerTransactionId: record.ledgerTransactionId,
        date: record.date,
        amountPaise: record.amountPaise,
        paymentMethod: record.paymentMethod,
        description: `Sirpi Expense - Paid through ${record.paidThrough}, Received by ${record.receivedBy}`,
      });
    }
  });

  res.json({ success: true, data: record });
});

const exportSirpiExpenses = asyncHandler(async (req, res) => {
  const { format = 'csv', search, paymentMethod, from, to } = req.query;

  const query = { status: 'ACTIVE' };
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [{ paidThrough: regex }, { receivedBy: regex }, { notes: regex }];
  }
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      query.date.$lte = toDate;
    }
  }

  const items = await SirpiExpense.find(query).sort({ date: -1, createdAt: -1 });

  const columns = [
    { header: 'S.No', key: 'sno' },
    { header: 'Date', key: 'date' },
    { header: 'Paid Through (வசமிருந்தவர்)', key: 'paidThrough' },
    { header: 'Received By (பெற்றவர்)', key: 'receivedBy' },
    { header: 'Amount (Rupees)', key: 'amount' },
    { header: 'Payment Method', key: 'paymentMethod' },
    { header: 'Notes', key: 'notes' },
    { header: 'Status', key: 'status' },
  ];

  let overallTotalPaise = 0;
  const rows = items.map((item, idx) => {
    if (item.status === 'ACTIVE') {
      overallTotalPaise += item.amountPaise;
    }
    return {
      sno: item.sno || idx + 1,
      date: item.date ? new Date(item.date).toLocaleDateString('en-GB') : '',
      paidThrough: item.paidThrough || '—',
      receivedBy: item.receivedBy || '—',
      amount: paiseToRupees(item.amountPaise),
      paymentMethod: item.paymentMethod || 'CASH',
      notes: item.notes || '—',
      status: item.status || 'ACTIVE',
    };
  });

  if (items.length > 0) {
    rows.push({
      sno: '',
      date: 'TOTAL',
      paidThrough: `${items.length} records`,
      receivedBy: 'Sirpi Expenses Total',
      amount: paiseToRupees(overallTotalPaise),
      paymentMethod: '',
      notes: '',
      status: '',
    });
  }

  const exportDate = new Date().toISOString().split('T')[0];

  if (format === 'xlsx') {
    const buffer = await toXLSX(rows, columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="sirpi-expenses-export-${exportDate}.xlsx"`);
    return res.send(buffer);
  }

  const csv = toCSV(rows, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="sirpi-expenses-export-${exportDate}.csv"`);
  res.send(csv);
});

module.exports = {
  createSirpiExpense,
  listSirpiExpenses,
  updateSirpiExpense,
  cancelSirpiExpense,
  exportSirpiExpenses,
};
