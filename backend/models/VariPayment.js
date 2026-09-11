const mongoose = require('mongoose');
const { PAYMENT_METHODS, RECORD_STATUS } = require('../utils/constants');

const variPaymentSchema = new mongoose.Schema(
  {
    pangaliId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pangali', required: true },
    financialYear: { type: String, required: true, trim: true }, // e.g. "2025-2026"
    amountPaise: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    receiptNumber: { type: String, required: true, unique: true, trim: true },
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

variPaymentSchema.index({ pangaliId: 1, financialYear: 1 });
variPaymentSchema.index({ paymentDate: -1 });
variPaymentSchema.index({ status: 1 });

module.exports = mongoose.model('VariPayment', variPaymentSchema);
