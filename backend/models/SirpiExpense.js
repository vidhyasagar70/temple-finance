const mongoose = require('mongoose');
const { PAYMENT_METHODS, RECORD_STATUS } = require('../utils/constants');

const sirpiExpenseSchema = new mongoose.Schema(
  {
    sno: { type: Number },
    date: { type: Date, required: true },
    paidThrough: { type: String, trim: true, required: true }, // e.g. "D. முத்துராமன் வசம்"
    receivedBy: { type: String, trim: true, required: true },   // e.g. "து. முத்துராமன்"
    amountPaise: { type: Number, required: true, min: 1 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'CASH', required: true },
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

sirpiExpenseSchema.index({ date: -1 });
sirpiExpenseSchema.index({ status: 1 });

module.exports = mongoose.model('SirpiExpense', sirpiExpenseSchema);
