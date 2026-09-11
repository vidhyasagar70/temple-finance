const mongoose = require('mongoose');
const Festival = require('../models/Festival');
const Expense = require('../models/Expense');
const Donation = require('../models/Donation');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { rupeesToPaise } = require('../utils/money');

const createFestival = asyncHandler(async (req, res) => {
  const { name, startDate, endDate, year, description, budget } = req.body;

  const festival = await Festival.create({
    name,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    year: Number(year),
    description,
    budgetPaise: budget ? rupeesToPaise(budget) : 0,
  });

  res.status(201).json({ success: true, data: festival });
});

const listFestivals = asyncHandler(async (req, res) => {
  const { year, page = 1, limit = 20 } = req.query;

  const query = {};
  if (year) query.year = Number(year);

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Festival.find(query).sort({ startDate: -1 }).skip(skip).limit(Number(limit)),
    Festival.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  });
});

const getFestivalSummary = asyncHandler(async (req, res) => {
  const festivalId = req.params.id;
  const festival = await Festival.findById(festivalId);
  if (!festival) throw ApiError.notFound('Festival not found');

  const [expenses, donations, expenseAgg] = await Promise.all([
    Expense.find({ festivalId, status: 'ACTIVE' }).sort({ date: -1 }),
    Donation.find({ festivalId, status: 'ACTIVE' }).sort({ donationDate: -1 }),
    Expense.aggregate([
      { $match: { festivalId: new mongoose.Types.ObjectId(festivalId), status: 'ACTIVE' } },
      { $group: { _id: null, totalSpent: { $sum: '$amountPaise' } } },
    ]),
  ]);

  const spentPaise = expenseAgg[0]?.totalSpent || 0;
  const budgetPaise = festival.budgetPaise || 0;
  const remainingPaise = budgetPaise - spentPaise; // Can be negative if over budget

  res.json({
    success: true,
    data: {
      festival,
      budgetPaise,
      spentPaise,
      remainingPaise,
      expenses,
      donations,
    },
  });
});

const updateFestival = asyncHandler(async (req, res) => {
  const festival = await Festival.findById(req.params.id);
  if (!festival) throw ApiError.notFound('Festival not found');

  const { name, startDate, endDate, year, description, budget } = req.body;

  if (name !== undefined) festival.name = name;
  if (startDate !== undefined) festival.startDate = new Date(startDate);
  if (endDate !== undefined) festival.endDate = new Date(endDate);
  if (year !== undefined) festival.year = Number(year);
  if (description !== undefined) festival.description = description;
  if (budget !== undefined) festival.budgetPaise = rupeesToPaise(budget);

  await festival.save();
  res.json({ success: true, data: festival });
});

module.exports = {
  createFestival,
  listFestivals,
  getFestivalSummary,
  updateFestival,
};
