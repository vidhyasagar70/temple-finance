const mongoose = require('mongoose');
const { FUND_TXN_TYPES, PAYMENT_METHODS, RECORD_STATUS } = require('../utils/constants');

// Every disbursement, principal repayment, and interest payment against a
// FundAdvance is its own immutable transaction row. Outstanding principal
// is always DERIVED as principalPaise minus the sum of ACTIVE
// PRINCIPAL_REPAYMENT transactions - it is never stored/edited directly.
const fundTransactionSchema = new mongoose.Schema(
  {
    fundAdvanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FundAdvance', required: true },
    type: { type: String, enum: FUND_TXN_TYPES, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    receiptNumber: { type: String, trim: true },
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

fundTransactionSchema.index({ fundAdvanceId: 1, date: -1 });
fundTransactionSchema.index({ type: 1 });
fundTransactionSchema.index({ status: 1 });

module.exports = mongoose.model('FundTransaction', fundTransactionSchema);
