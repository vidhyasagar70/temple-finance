const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const ledgerService = require('../services/ledgerService');
const { runWithTransaction } = require('../utils/transactionHelper');
const { toCSV, toXLSX } = require('../utils/exportUtil');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { rupeesToPaise, paiseToRupees } = require('../utils/money');

const createExpense = asyncHandler(async (req, res) => {
  const {
    category,
    amount,
    date,
    paidTo,
    paymentMethod = 'CASH',
    festivalId,
    billNumber,
    description,
    descriptionTamil,
    descriptionEnglish,
    eventOrOccasion,
    notes,
  } = req.body;

  const amountPaise = rupeesToPaise(amount);
  if (amountPaise <= 0) {
    throw ApiError.badRequest('Amount must be a positive rupee value');
  }

  let createdExpense;
  const mainDesc = description || descriptionEnglish || descriptionTamil || (category ? `${category} expense` : 'Temple expense');

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [expense] = await Expense.create(
      [
        {
          category,
          amountPaise,
          date: new Date(date),
          paidTo: paidTo || 'Not recorded',
          paymentMethod: paymentMethod || 'CASH',
          festivalId: festivalId || undefined,
          billNumber,
          description: mainDesc,
          descriptionTamil,
          descriptionEnglish: descriptionEnglish || description,
          eventOrOccasion,
          notes,
          createdBy: req.user.id,
          status: 'ACTIVE',
        },
      ],
      opts
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
      paymentMethod: expense.paymentMethod,
      referenceNumber: billNumber,
      description: mainDesc,
      createdBy: req.user.id,
    });

    expense.ledgerTransactionId = ledgerTxn._id;
    await expense.save(opts);

    createdExpense = expense;
  });

  const populated = await Expense.findById(createdExpense._id).populate('festivalId', 'name year');
  res.status(201).json({ success: true, data: populated });
});

const listExpenses = asyncHandler(async (req, res) => {
  const { category, festivalId, paymentMethod, from, to, page = 1, limit = 20 } = req.query;

  const query = { status: 'ACTIVE' };
  if (category) query.category = category;
  if (festivalId) query.festivalId = festivalId;
  if (paymentMethod) query.paymentMethod = paymentMethod;
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
  const [items, total] = await Promise.all([
    Expense.find(query)
      .populate('festivalId', 'name year')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Expense.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  });
});

const getExpensesByDate = asyncHandler(async (req, res) => {
  const { category, festivalId, paymentMethod, from, to, page = 1, limit = 20 } = req.query;

  const matchStage = { status: 'ACTIVE' };
  if (category) matchStage.category = category;
  if (festivalId) matchStage.festivalId = new mongoose.Types.ObjectId(festivalId);
  if (paymentMethod) matchStage.paymentMethod = paymentMethod;
  if (from || to) {
    matchStage.date = {};
    if (from) matchStage.date.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      matchStage.date.$lte = toDate;
    }
  }

  const facetResults = await Expense.aggregate([
    { $match: matchStage },
    {
      $facet: {
        groupedData: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              totalAmountPaise: { $sum: '$amountPaise' },
              itemCount: { $sum: 1 },
              items: { $push: '$$ROOT' },
            },
          },
          { $sort: { _id: -1 } },
          { $skip: (Number(page) - 1) * Number(limit) },
          { $limit: Number(limit) },
        ],
        totalDates: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            },
          },
          { $count: 'count' },
        ],
        grandTotal: [
          {
            $group: {
              _id: null,
              grandTotalPaise: { $sum: '$amountPaise' },
            },
          },
        ],
      },
    },
  ]);

  const rawGroups = facetResults[0]?.groupedData || [];
  const total = facetResults[0]?.totalDates[0]?.count || 0;
  const grandTotalPaise = facetResults[0]?.grandTotal[0]?.grandTotalPaise || 0;

  for (const group of rawGroups) {
    await Expense.populate(group.items, { path: 'festivalId', select: 'name year' });
  }

  const data = rawGroups.map((group) => ({
    date: group._id,
    itemCount: group.itemCount,
    totalAmountPaise: group.totalAmountPaise,
    items: group.items,
  }));

  res.json({
    success: true,
    data,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit) || 1,
    },
    grandTotalPaise,
  });
});

const cancelExpense = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    throw ApiError.badRequest('Cancellation reason is required');
  }

  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    throw ApiError.notFound('Expense record not found');
  }
  if (expense.status === 'CANCELLED') {
    throw ApiError.badRequest('Expense record is already cancelled');
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    expense.status = 'CANCELLED';
    expense.cancelledAt = new Date();
    expense.cancelledBy = req.user.id;
    expense.cancelReason = reason;
    await expense.save(opts);

    if (expense.ledgerTransactionId) {
      await ledgerService.cancelLedgerEntry({
        session,
        ledgerTransactionId: expense.ledgerTransactionId,
        cancelledBy: req.user.id,
        cancelReason: reason,
      });
    }
  });

  res.json({ success: true, data: expense });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    throw ApiError.notFound('Expense record not found');
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    expense.status = 'CANCELLED';
    expense.cancelledAt = new Date();
    expense.cancelledBy = req.user.id;
    expense.cancelReason = reason || 'Deleted by user';
    await expense.save(opts);

    if (expense.ledgerTransactionId) {
      await ledgerService.cancelLedgerEntry({
        session,
        ledgerTransactionId: expense.ledgerTransactionId,
        cancelledBy: req.user.id,
        cancelReason: reason || 'Deleted by user',
      });
    }
  });

  res.json({ success: true, message: 'Expense deleted successfully', data: expense });
});

const updateExpense = asyncHandler(async (req, res) => {
  const {
    category,
    amount,
    date,
    paidTo,
    paymentMethod,
    festivalId,
    billNumber,
    description,
    descriptionTamil,
    descriptionEnglish,
    eventOrOccasion,
    notes,
  } = req.body;

  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    throw ApiError.notFound('Expense record not found');
  }
  if (expense.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot update a cancelled expense record');
  }

  let amountPaise;
  if (amount !== undefined && amount !== null) {
    amountPaise = rupeesToPaise(Number(amount));
    if (amountPaise <= 0) throw ApiError.badRequest('Amount must be a positive rupee value');
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    if (category !== undefined) expense.category = category;
    if (amountPaise !== undefined) expense.amountPaise = amountPaise;
    if (date) expense.date = new Date(date);
    if (paidTo !== undefined) expense.paidTo = paidTo;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (festivalId !== undefined) expense.festivalId = festivalId || undefined;
    if (billNumber !== undefined) expense.billNumber = billNumber;
    if (descriptionTamil !== undefined) expense.descriptionTamil = descriptionTamil;
    if (descriptionEnglish !== undefined) expense.descriptionEnglish = descriptionEnglish;
    if (description !== undefined) expense.description = description;
    if (eventOrOccasion !== undefined) expense.eventOrOccasion = eventOrOccasion;
    if (notes !== undefined) expense.notes = notes;

    const mainDesc = expense.description || expense.descriptionEnglish || expense.descriptionTamil || 'Expense';
    expense.description = mainDesc;

    await expense.save(opts);

    if (expense.ledgerTransactionId) {
      await ledgerService.updateLedgerEntry({
        session,
        ledgerTransactionId: expense.ledgerTransactionId,
        date: expense.date,
        amountPaise: expense.amountPaise,
        paymentMethod: expense.paymentMethod,
        festivalId: expense.festivalId,
        description: mainDesc,
      });
    }
  });

  const updated = await Expense.findById(expense._id).populate('festivalId', 'name year');
  res.json({ success: true, data: updated });
});

const exportExpenses = asyncHandler(async (req, res) => {
  const { format = 'csv', category, festivalId, paymentMethod, from, to } = req.query;

  const query = { status: 'ACTIVE' };
  if (category) query.category = category;
  if (festivalId) query.festivalId = festivalId;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      query.date.$lte = toDate;
    }
  }

  const items = await Expense.find(query).populate('festivalId', 'name year').sort({ date: -1 });

  const columns = [
    { header: 'Date', key: 'date' },
    { header: 'Particulars (Tamil)', key: 'particularsTamil' },
    { header: 'Description (English)', key: 'descriptionEnglish' },
    { header: 'Event / Occasion', key: 'eventOrOccasion' },
    { header: 'Category', key: 'category' },
    { header: 'Amount (Rupees)', key: 'amount' },
    { header: 'Payment Method', key: 'paymentMethod' },
    { header: 'Paid To', key: 'paidTo' },
    { header: 'Festival', key: 'festival' },
    { header: 'Bill No.', key: 'billNumber' },
    { header: 'Status', key: 'status' },
  ];

  const rows = [];
  let overallTotalPaise = 0;

  const groupedMap = new Map();
  items.forEach((item) => {
    const dStr = item.date ? new Date(item.date).toISOString().split('T')[0] : 'Unknown';
    if (!groupedMap.has(dStr)) groupedMap.set(dStr, []);
    groupedMap.get(dStr).push(item);
  });

  for (const [dStr, group] of groupedMap.entries()) {
    let dateSumPaise = 0;
    const displayDateStr = group[0].date ? new Date(group[0].date).toLocaleDateString('en-GB') : dStr;

    group.forEach((item) => {
      dateSumPaise += item.amountPaise;
      overallTotalPaise += item.amountPaise;
      rows.push({
        date: item.date ? new Date(item.date).toLocaleDateString('en-GB') : '',
        particularsTamil: item.descriptionTamil || '—',
        descriptionEnglish: item.descriptionEnglish || item.description || '—',
        eventOrOccasion: item.eventOrOccasion || '—',
        category: item.category || '—',
        amount: paiseToRupees(item.amountPaise),
        paymentMethod: item.paymentMethod || '—',
        paidTo: item.paidTo || 'Not recorded',
        festival: item.festivalId ? `${item.festivalId.name} (${item.festivalId.year})` : '—',
        billNumber: item.billNumber || '—',
        status: item.status || 'ACTIVE',
      });
    });

    rows.push({
      date: `Subtotal (${displayDateStr})`,
      particularsTamil: `${group.length} items`,
      descriptionEnglish: 'Daily Subtotal',
      eventOrOccasion: '',
      category: '',
      amount: paiseToRupees(dateSumPaise),
      paymentMethod: '',
      paidTo: '',
      festival: '',
      billNumber: '',
      status: '',
    });
  }

  if (items.length > 0) {
    rows.push({
      date: 'GRAND TOTAL',
      particularsTamil: `${items.length} total items`,
      descriptionEnglish: 'Overall Expenses Total',
      eventOrOccasion: '',
      category: '',
      amount: paiseToRupees(overallTotalPaise),
      paymentMethod: '',
      paidTo: '',
      festival: '',
      billNumber: '',
      status: '',
    });
  }

  const exportDate = new Date().toISOString().split('T')[0];

  if (format === 'xlsx') {
    const buffer = await toXLSX(rows, columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-export-${exportDate}.xlsx"`);
    return res.send(buffer);
  }

  const csv = toCSV(rows, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="expenses-export-${exportDate}.csv"`);
  res.send(csv);
});

module.exports = {
  createExpense,
  listExpenses,
  getExpensesByDate,
  updateExpense,
  cancelExpense,
  deleteExpense,
  exportExpenses,
};
