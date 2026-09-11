const mongoose = require('mongoose');
const { PAYMENT_METHODS, RECORD_STATUS } = require('../utils/constants');

const expenseSchema = new mongoose.Schema(
  {
    category: { type: String, trim: true }, // optional, validated against Settings.expenseCategories if present
    amountPaise: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    paidTo: { type: String, trim: true, default: 'Not recorded' },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'CASH', required: true },
    festivalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Festival' },
    billNumber: { type: String, trim: true },
    description: { type: String, trim: true },
    descriptionTamil: { type: String, trim: true },
    descriptionEnglish: { type: String, trim: true },
    eventOrOccasion: { type: String, trim: true },
    notes: { type: String, trim: true },

    status: { type: String, enum: RECORD_STATUS, default: 'ACTIVE' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true },

    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerTransaction' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ festivalId: 1 });
expenseSchema.index({ status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
