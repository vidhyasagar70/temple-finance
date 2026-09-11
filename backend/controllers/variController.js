const mongoose = require('mongoose');
const VariPayment = require('../models/VariPayment');
const Pangali = require('../models/Pangali');
const LedgerTransaction = require('../models/LedgerTransaction');
const ledgerService = require('../services/ledgerService');
const receiptService = require('../services/receiptService');
const { runWithTransaction } = require('../utils/transactionHelper');
const { toCSV, toXLSX } = require('../utils/exportUtil');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { rupeesToPaise, paiseToRupees } = require('../utils/money');

const createVariPayment = asyncHandler(async (req, res) => {
  const { pangaliId, financialYear, amount, paymentDate, paymentMethod, notes } = req.body;

  const pangali = await Pangali.findById(pangaliId);
  if (!pangali || !pangali.isActive) {
    throw ApiError.notFound('Pangali not found or inactive');
  }

  const amountPaise = rupeesToPaise(amount);
  if (amountPaise <= 0) {
    throw ApiError.badRequest('Amount must be a positive rupee value');
  }

  let createdPayment;
  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    const receiptNumber = await receiptService.generateReceiptNumber('VR', financialYear, session);

    const [payment] = await VariPayment.create(
      [
        {
          pangaliId,
          financialYear,
          amountPaise,
          paymentDate: new Date(paymentDate),
          paymentMethod,
          receiptNumber,
          notes,
          createdBy: req.user.id,
          status: 'ACTIVE',
        },
      ],
      opts
    );

    const ledgerTxn = await ledgerService.createLedgerEntry({
      session,
      date: payment.paymentDate,
      type: 'VARI_RECEIVED',
      direction: 'CREDIT',
      amountPaise,
      sourceType: 'VariPayment',
      sourceId: payment._id,
      pangaliId,
      paymentMethod,
      referenceNumber: receiptNumber,
      description: notes || `Vari payment for FY ${financialYear}`,
      createdBy: req.user.id,
    });

    payment.ledgerTransactionId = ledgerTxn._id;
    await payment.save(opts);

    createdPayment = payment;
  });

  const populated = await VariPayment.findById(createdPayment._id).populate(
    'pangaliId',
    'familyName pangaliCode houseName'
  );
  res.status(201).json({ success: true, data: populated });
});

const buildVariQuery = async (params) => {
  const { pangaliId, financialYear, paymentMethod, status, from, to, minAmount, maxAmount, search } = params;

  const query = {};
  if (pangaliId) query.pangaliId = pangaliId;
  if (financialYear) query.financialYear = financialYear;
  if (paymentMethod) query.paymentMethod = paymentMethod;
  if (status) query.status = status;
  if (from || to) {
    query.paymentDate = {};
    if (from) query.paymentDate.$gte = new Date(from);
    if (to) query.paymentDate.$lte = new Date(to);
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

    query.$or = [{ pangaliId: { $in: pangaliIds } }, { notes: searchRegex }];
  }

  return query;
};

const listVariPayments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const query = await buildVariQuery(req.query);

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    VariPayment.find(query)
      .populate('pangaliId', 'familyName pangaliCode houseName phone')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    VariPayment.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  });
});

const updateVariPayment = asyncHandler(async (req, res) => {
  const { amount, paymentDate, paymentMethod, notes, financialYear } = req.body;

  const payment = await VariPayment.findById(req.params.id);
  if (!payment) {
    throw ApiError.notFound('Vari payment record not found');
  }
  if (payment.status === 'CANCELLED') {
    throw ApiError.badRequest('Cannot update a cancelled payment record');
  }

  let amountPaise;
  if (amount !== undefined && amount !== null) {
    amountPaise = rupeesToPaise(Number(amount));
    if (amountPaise <= 0) throw ApiError.badRequest('Amount must be a positive rupee value');
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    if (amountPaise !== undefined) payment.amountPaise = amountPaise;
    if (paymentDate) payment.paymentDate = new Date(paymentDate);
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (financialYear) payment.financialYear = financialYear;
    if (notes !== undefined) payment.notes = notes;

    await payment.save(opts);

    if (payment.ledgerTransactionId) {
      await ledgerService.updateLedgerEntry({
        session,
        ledgerTransactionId: payment.ledgerTransactionId,
        date: payment.paymentDate,
        amountPaise: payment.amountPaise,
        paymentMethod: payment.paymentMethod,
        description: payment.notes || `Vari payment for FY ${payment.financialYear}`,
      });
    }
  });

  const updated = await VariPayment.findById(payment._id).populate(
    'pangaliId',
    'familyName pangaliCode houseName'
  );
  res.json({ success: true, data: updated });
});

const cancelVariPayment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    throw ApiError.badRequest('Cancellation reason is required');
  }

  const payment = await VariPayment.findById(req.params.id);
  if (!payment) {
    throw ApiError.notFound('Vari payment record not found');
  }
  if (payment.status === 'CANCELLED') {
    throw ApiError.badRequest('Payment record is already cancelled');
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    payment.status = 'CANCELLED';
    payment.cancelledAt = new Date();
    payment.cancelledBy = req.user.id;
    payment.cancelReason = reason;
    await payment.save(opts);

    if (payment.ledgerTransactionId) {
      await ledgerService.cancelLedgerEntry({
        session,
        ledgerTransactionId: payment.ledgerTransactionId,
        cancelledBy: req.user.id,
        cancelReason: reason,
      });
    }
  });

  res.json({ success: true, data: payment });
});

const getVariSummary = asyncHandler(async (req, res) => {
  const { pangaliId, financialYear = '2026-2027' } = req.query;

  const pangalis = await Pangali.find(
    pangaliId ? { _id: pangaliId, isActive: true } : { isActive: true }
  );

  const matchQuery = { status: 'ACTIVE' };
  if (financialYear && financialYear !== 'all') {
    matchQuery.financialYear = financialYear;
  }
  if (pangaliId) {
    matchQuery.pangaliId = new mongoose.Types.ObjectId(pangaliId);
  }

  const paidAgg = await VariPayment.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$pangaliId', totalPaid: { $sum: '$amountPaise' } } },
  ]);

  const map = {};
  paidAgg.forEach((p) => {
    map[p._id.toString()] = p.totalPaid;
  });

  let totalExpectedPaise = 0;
  let totalPaidPaise = 0;
  let totalPendingPaise = 0;

  pangalis.forEach((p) => {
    const target = p.annualVariAmountPaise || 0;
    const paid = map[p._id.toString()] || 0;
    let pending = 0;

    if (p.pendingAmountPaise !== undefined && p.pendingAmountPaise !== null) {
      pending = p.pendingAmountPaise;
    } else if (target === 0) {
      pending = 0;
    } else if (paid >= target) {
      pending = 0;
    } else {
      pending = Math.max(target - paid, 0);
    }

    totalExpectedPaise += target;
    totalPaidPaise += paid;
    totalPendingPaise += pending;
  });

  res.json({
    success: true,
    data: {
      financialYear,
      totalExpectedPaise,
      totalPaidPaise,
      remainingPaise: totalPendingPaise,
    },
  });
});

const exportVariPayments = asyncHandler(async (req, res) => {
  const { format = 'csv' } = req.query;
  const query = await buildVariQuery(req.query);

  const items = await VariPayment.find(query)
    .populate('pangaliId', 'familyName pangaliCode')
    .sort({ paymentDate: -1 });

  const columns = [
    { header: 'Receipt No.', key: 'receiptNumber' },
    {
      header: 'Pangali Family',
      key: 'pangali',
      formatter: (_, row) =>
        row.pangaliId ? `${row.pangaliId.familyName} (${row.pangaliId.pangaliCode})` : '—',
    },
    { header: 'Financial Year', key: 'financialYear' },
    {
      header: 'Amount (Rupees)',
      key: 'amountPaise',
      formatter: (val) => paiseToRupees(val),
    },
    {
      header: 'Payment Date',
      key: 'paymentDate',
      formatter: (val) => (val ? new Date(val).toLocaleDateString() : ''),
    },
    { header: 'Method', key: 'paymentMethod' },
    { header: 'Status', key: 'status' },
  ];

  const exportDate = new Date().toISOString().split('T')[0];

  if (format === 'xlsx') {
    const buffer = await toXLSX(items, columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="vari-export-${exportDate}.xlsx"`);
    return res.send(buffer);
  }

  const csv = toCSV(items, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="vari-export-${exportDate}.csv"`);
  res.send(csv);
});

const getPangaliVariRoster = asyncHandler(async (req, res) => {
  const {
    financialYear = '2026-2027',
    search = '',
    status = '',
    page = 1,
    limit = 20,
  } = req.query;

  const pangaliQuery = { isActive: true };
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    pangaliQuery.$or = [
      { familyName: regex },
      { pangaliCode: regex },
      { houseName: regex },
      { phone: regex },
    ];
  }

  const pangalis = await Pangali.find(pangaliQuery).sort({ pangaliCode: 1 });

  const paymentMatch = { status: 'ACTIVE' };
  if (financialYear && financialYear !== 'all') {
    paymentMatch.financialYear = financialYear;
  }

  const paymentsAgg = await VariPayment.aggregate([
    {
      $match: paymentMatch,
    },
    {
      $group: {
        _id: '$pangaliId',
        totalPaidPaise: { $sum: '$amountPaise' },
        paymentCount: { $sum: 1 },
      },
    },
  ]);

  const paymentMap = {};
  paymentsAgg.forEach((p) => {
    paymentMap[p._id.toString()] = p;
  });

  let roster = pangalis.map((p) => {
    const paidData = paymentMap[p._id.toString()];
    const totalPaidPaise = paidData ? paidData.totalPaidPaise : 0;
    const target = p.annualVariAmountPaise || 0;

    let remainingPaise = 0;
    if (p.pendingAmountPaise !== undefined && p.pendingAmountPaise !== null) {
      remainingPaise = p.pendingAmountPaise;
    } else if (target === 0) {
      remainingPaise = 0;
    } else if (totalPaidPaise >= target) {
      remainingPaise = 0;
    } else {
      remainingPaise = Math.max(target - totalPaidPaise, 0);
    }

    let variStatus = remainingPaise === 0 ? 'PAID' : 'PENDING';

    return {
      _id: p._id,
      pangaliCode: p.pangaliCode,
      familyName: p.familyName,
      houseName: p.houseName,
      phone: p.phone,
      annualVariAmountPaise: target,
      totalPaidPaise,
      remainingPaise,
      paymentCount: paidData ? paidData.paymentCount : 0,
      variStatus,
    };
  });

  if (status) {
    roster = roster.filter((r) => r.variStatus === status);
  }

  const total = roster.length;
  const skip = (Number(page) - 1) * Number(limit);
  const paginatedRoster = roster.slice(skip, skip + Number(limit));

  res.json({
    success: true,
    data: paginatedRoster,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  });
});

const updatePangaliTargetVari = asyncHandler(async (req, res) => {
  const { annualVariAmount } = req.body;
  if (annualVariAmount === undefined || Number(annualVariAmount) < 0) {
    throw ApiError.badRequest('Valid annual vari amount is required');
  }

  const pangali = await Pangali.findById(req.params.pangaliId);
  if (!pangali) {
    throw ApiError.notFound('Pangali not found');
  }

  pangali.annualVariAmountPaise = rupeesToPaise(Number(annualVariAmount));
  await pangali.save();

  res.json({ success: true, data: pangali });
});

const updatePangaliPendingVari = asyncHandler(async (req, res) => {
  const { pendingAmount } = req.body;
  if (pendingAmount === undefined || Number(pendingAmount) < 0) {
    throw ApiError.badRequest('Valid pending amount is required');
  }

  const pangali = await Pangali.findById(req.params.pangaliId);
  if (!pangali) {
    throw ApiError.notFound('Pangali not found');
  }

  pangali.pendingAmountPaise = rupeesToPaise(Number(pendingAmount));
  await pangali.save();

  res.json({ success: true, data: pangali });
});

const updateVariRosterItem = asyncHandler(async (req, res) => {
  const { pangaliId } = req.params;
  const {
    pangaliCode,
    familyName,
    houseName,
    amountCollected,
    pendingAmount,
    variStatus,
    financialYear = '2026-2027',
  } = req.body;

  const pangali = await Pangali.findById(pangaliId);
  if (!pangali) {
    throw ApiError.notFound('Pangali record not found');
  }

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    // 1. Update Pangali fields
    if (pangaliCode !== undefined && pangaliCode.trim()) {
      const query = Pangali.findOne({
        _id: { $ne: pangali._id },
        pangaliCode: pangaliCode.trim(),
      });
      if (session) query.session(session);
      const existingWithCode = await query;
      if (existingWithCode) {
        throw ApiError.badRequest(`Pangali code ${pangaliCode} is already taken`);
      }
      pangali.pangaliCode = pangaliCode.trim();
    }
    if (familyName !== undefined && familyName.trim()) {
      pangali.familyName = familyName.trim();
    }
    if (houseName !== undefined) {
      pangali.houseName = houseName.trim();
    }

    // 2. Handle Pending Amount and Status
    if (variStatus === 'PAID' || variStatus === 'EXEMPTED') {
      pangali.pendingAmountPaise = 0;
    } else if (pendingAmount !== undefined && pendingAmount !== null) {
      pangali.pendingAmountPaise = rupeesToPaise(Number(pendingAmount));
    }

    await pangali.save(opts);

    // 3. Handle Amount Collected
    if (amountCollected !== undefined && amountCollected !== null && amountCollected !== '') {
      const targetPaidPaise = rupeesToPaise(Number(amountCollected));

      // Find active payments for this Pangali & FY
      const activeQuery = VariPayment.find({
        pangaliId: pangali._id,
        financialYear,
        status: 'ACTIVE',
      });
      if (session) activeQuery.session(session);
      const activePayments = await activeQuery;

      const currentPaidPaise = activePayments.reduce((sum, p) => sum + p.amountPaise, 0);

      if (targetPaidPaise !== currentPaidPaise) {
        if (activePayments.length > 0) {
          // Update the primary active payment record
          const primaryPayment = activePayments[0];
          primaryPayment.amountPaise = targetPaidPaise;
          await primaryPayment.save(opts);

          if (primaryPayment.ledgerTransactionId) {
            await ledgerService.updateLedgerEntry({
              session,
              ledgerTransactionId: primaryPayment.ledgerTransactionId,
              amountPaise: targetPaidPaise,
              date: primaryPayment.paymentDate,
              paymentMethod: primaryPayment.paymentMethod,
              description: `Vari payment for FY ${financialYear} (Updated)`,
            });
          }

          // Cancel extra payments if any
          for (let i = 1; i < activePayments.length; i++) {
            const extra = activePayments[i];
            extra.status = 'CANCELLED';
            extra.cancelReason = 'Adjusted during roster edit';
            await extra.save(opts);

            if (extra.ledgerTransactionId) {
              await ledgerService.cancelLedgerEntry({
                session,
                ledgerTransactionId: extra.ledgerTransactionId,
                cancelledBy: req.user.id,
                cancelReason: 'Adjusted during roster edit',
              });
            }
          }
        } else if (targetPaidPaise > 0) {
          // Create a new VariPayment record
          const receiptNumber = await receiptService.generateReceiptNumber('VR', financialYear, session);
          const [newPayment] = await VariPayment.create(
            [
              {
                pangaliId: pangali._id,
                financialYear,
                amountPaise: targetPaidPaise,
                paymentDate: new Date(),
                paymentMethod: 'CASH',
                receiptNumber,
                notes: 'Recorded via Roster Edit',
                createdBy: req.user.id,
                status: 'ACTIVE',
              },
            ],
            opts
          );

          const ledgerTxn = await ledgerService.createLedgerEntry({
            session,
            date: newPayment.paymentDate,
            type: 'VARI_RECEIVED',
            direction: 'CREDIT',
            amountPaise: targetPaidPaise,
            sourceType: 'VariPayment',
            sourceId: newPayment._id,
            pangaliId: pangali._id,
            paymentMethod: 'CASH',
            referenceNumber: receiptNumber,
            description: `Vari payment for FY ${financialYear}`,
            createdBy: req.user.id,
          });

          newPayment.ledgerTransactionId = ledgerTxn._id;
          await newPayment.save(opts);
        }
      }
    }
  });

  res.json({ success: true, message: 'Vari roster item updated successfully' });
});

const deleteVariRosterItem = asyncHandler(async (req, res) => {
  const { pangaliId } = req.params;
  const { financialYear = '2026-2027' } = req.query;

  const pangali = await Pangali.findById(pangaliId);
  if (!pangali) {
    throw ApiError.notFound('Pangali record not found');
  }

  const userId = req.user?.id || req.user?._id;

  await runWithTransaction(async (session) => {
    const opts = session ? { session } : {};
    // Find all active Vari payments for this Pangali & FY
    const activeQuery = VariPayment.find({
      pangaliId: pangali._id,
      ...(financialYear && financialYear !== 'all' && { financialYear }),
      status: 'ACTIVE',
    });
    if (session) activeQuery.session(session);
    const activePayments = await activeQuery;

    for (const payment of activePayments) {
      payment.status = 'CANCELLED';
      payment.cancelledAt = new Date();
      if (userId) payment.cancelledBy = userId;
      payment.cancelReason = 'Deleted from Vari Roster';
      await payment.save(opts);

      if (payment.ledgerTransactionId) {
        await ledgerService.cancelLedgerEntry({
          session,
          ledgerTransactionId: payment.ledgerTransactionId,
          cancelledBy: userId,
          cancelReason: 'Deleted from Vari Roster',
        });
      }
    }

    // Reset pending amount & annual vari amount, and set isActive to false
    pangali.pendingAmountPaise = 0;
    pangali.isActive = false;
    await pangali.save(opts);
  });

  res.json({ success: true, message: 'Vari collection record deleted and ledger updated' });
});

module.exports = {
  createVariPayment,
  listVariPayments,
  updateVariPayment,
  cancelVariPayment,
  getVariSummary,
  getPangaliVariRoster,
  updatePangaliTargetVari,
  updatePangaliPendingVari,
  updateVariRosterItem,
  deleteVariRosterItem,
  exportVariPayments,
};



