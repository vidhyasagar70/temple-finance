const mongoose = require('mongoose');
const Pangali = require('../models/Pangali');
const VariPayment = require('../models/VariPayment');
const Contribution = require('../models/Contribution');
const FundAdvance = require('../models/FundAdvance');
const FundTransaction = require('../models/FundTransaction');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { rupeesToPaise, paiseToRupees } = require('../utils/money');
const { toCSV, toXLSX } = require('../utils/exportUtil');

async function nextPangaliCode() {
  const allCodes = await Pangali.find({ pangaliCode: /^PNG-\d+$/ }).select('pangaliCode');
  let maxSeq = 0;
  allCodes.forEach((p) => {
    const m = p.pangaliCode.match(/\d+/);
    if (m) {
      const num = parseInt(m[0], 10);
      if (num > maxSeq) maxSeq = num;
    }
  });

  await Counter.findOneAndUpdate(
    { _id: 'PANGALI_CODE' },
    { $max: { seq: maxSeq } },
    { upsert: true, new: true }
  );

  const updatedCounter = await Counter.findOneAndUpdate(
    { _id: 'PANGALI_CODE' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  return `PNG-${String(updatedCounter.seq).padStart(4, '0')}`;
}

const listPangalis = asyncHandler(async (req, res) => {
  const { search, isActive, page = 1, limit = 25 } = req.query;

  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { familyName: new RegExp(search, 'i') },
      { houseName: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { pangaliCode: new RegExp(search, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Pangali.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(Number(limit)),
    Pangali.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) || 1 },
  });
});

const getPangali = asyncHandler(async (req, res) => {
  const pangali = await Pangali.findById(req.params.id);
  if (!pangali) throw ApiError.notFound('Pangali not found');
  res.json({ success: true, data: pangali });
});

const createPangali = asyncHandler(async (req, res) => {
  const { familyName, houseName, phone, address, memberCount, annualVariAmount, notes } = req.body;

  const cleanPhone = phone && phone.trim() ? phone.trim() : undefined;
  const pangaliCode = await nextPangaliCode();

  const pangali = await Pangali.create({
    pangaliCode,
    familyName: familyName ? familyName.trim() : '',
    houseName: houseName ? houseName.trim() : undefined,
    phone: cleanPhone,
    address: address ? address.trim() : undefined,
    memberCount: Number(memberCount) || 1,
    annualVariAmountPaise: rupeesToPaise(annualVariAmount || 0),
    notes: notes ? notes.trim() : undefined,
  });

  res.status(201).json({ success: true, data: pangali });
});

const updatePangali = asyncHandler(async (req, res) => {
  const pangali = await Pangali.findById(req.params.id);
  if (!pangali) throw ApiError.notFound('Pangali not found');

  const { familyName, houseName, phone, address, memberCount, annualVariAmount, notes, isActive } =
    req.body;

  if (familyName !== undefined) pangali.familyName = familyName;
  if (houseName !== undefined) pangali.houseName = houseName;
  if (phone !== undefined) pangali.phone = phone;
  if (address !== undefined) pangali.address = address;
  if (memberCount !== undefined) pangali.memberCount = memberCount;
  if (annualVariAmount !== undefined) pangali.annualVariAmountPaise = rupeesToPaise(annualVariAmount);
  if (notes !== undefined) pangali.notes = notes;
  if (isActive !== undefined) pangali.isActive = isActive;

  await pangali.save();
  res.json({ success: true, data: pangali });
});

const deactivatePangali = asyncHandler(async (req, res) => {
  const pangali = await Pangali.findById(req.params.id);
  if (!pangali) throw ApiError.notFound('Pangali not found');
  pangali.isActive = false;
  await pangali.save();
  res.json({ success: true, data: pangali });
});

const getPangaliSummary = asyncHandler(async (req, res) => {
  const pangaliId = new mongoose.Types.ObjectId(req.params.id);
  const pangali = await Pangali.findById(pangaliId);
  if (!pangali) throw ApiError.notFound('Pangali not found');

  const currentFY = req.query.financialYear;

  const variMatch = { pangaliId, status: 'ACTIVE' };
  if (currentFY) variMatch.financialYear = currentFY;

  const [variPayments, variAgg, contributions, fundAdvances] = await Promise.all([
    VariPayment.find(variMatch).sort({ paymentDate: -1 }),
    VariPayment.aggregate([
      { $match: variMatch },
      { $group: { _id: null, totalPaid: { $sum: '$amountPaise' } } },
    ]),
    Contribution.find({ pangaliId, status: 'ACTIVE' }).sort({ date: -1 }),
    FundAdvance.find({ pangaliId }).sort({ startDate: -1 }),
  ]);

  const totalVariPaid = variAgg[0]?.totalPaid || 0;
  const totalVariExpected = pangali.annualVariAmountPaise;
  const remainingVari = Math.max(totalVariExpected - totalVariPaid, 0);

  const fundAdvanceIds = fundAdvances.map((f) => f._id);
  const fundTxns = await FundTransaction.find({
    fundAdvanceId: { $in: fundAdvanceIds },
    status: 'ACTIVE',
  }).sort({ date: 1 });

  const fundAdvancesWithTotals = fundAdvances.map((advance) => {
    const txns = fundTxns.filter((t) => t.fundAdvanceId.toString() === advance._id.toString());
    const principalRepaid = txns
      .filter((t) => t.type === 'PRINCIPAL_REPAYMENT')
      .reduce((sum, t) => sum + t.amountPaise, 0);
    const interestPaid = txns
      .filter((t) => t.type === 'INTEREST_PAYMENT')
      .reduce((sum, t) => sum + t.amountPaise, 0);
    return {
      ...advance.toObject(),
      principalRepaidPaise: principalRepaid,
      principalOutstandingPaise: advance.principalPaise - principalRepaid,
      interestPaidPaise: interestPaid,
      transactions: txns,
    };
  });

  const totalPrincipalOutstanding = fundAdvancesWithTotals.reduce(
    (sum, f) => sum + f.principalOutstandingPaise,
    0
  );
  const totalInterestPaid = fundAdvancesWithTotals.reduce((sum, f) => sum + f.interestPaidPaise, 0);

  res.json({
    success: true,
    data: {
      pangali,
      vari: {
        totalExpectedPaise: totalVariExpected,
        totalPaidPaise: totalVariPaid,
        remainingPaise: remainingVari,
        payments: variPayments,
      },
      contributions,
      fund: {
        advances: fundAdvancesWithTotals,
        totalPrincipalOutstandingPaise: totalPrincipalOutstanding,
        totalInterestPaidPaise: totalInterestPaid,
      },
    },
  });
});

const exportPangalis = asyncHandler(async (req, res) => {
  const { format = 'csv', search, isActive } = req.query;

  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { familyName: new RegExp(search, 'i') },
      { houseName: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
      { pangaliCode: new RegExp(search, 'i') },
    ];
  }

  const items = await Pangali.find(query).sort({ familyName: 1 });

  const columns = [
    { header: 'Pangali Code', key: 'pangaliCode' },
    { header: 'Family Name', key: 'familyName' },
    { header: 'House Name', key: 'houseName', formatter: (val) => val || '—' },
    { header: 'Phone', key: 'phone', formatter: (val) => val || '—' },
    { header: 'Members', key: 'memberCount' },
    {
      header: 'Annual Vari (Rupees)',
      key: 'annualVariAmountPaise',
      formatter: (val) => paiseToRupees(val),
    },
    { header: 'Status', key: 'isActive', formatter: (val) => (val ? 'Active' : 'Inactive') },
  ];

  const exportDate = new Date().toISOString().split('T')[0];

  if (format === 'xlsx') {
    const buffer = await toXLSX(items, columns);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="pangalis-export-${exportDate}.xlsx"`);
    return res.send(buffer);
  }

  const csv = toCSV(items, columns);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="pangalis-export-${exportDate}.csv"`);
  res.send(csv);
});

module.exports = {
  listPangalis,
  getPangali,
  createPangali,
  updatePangali,
  deactivatePangali,
  getPangaliSummary,
  exportPangalis,
};
