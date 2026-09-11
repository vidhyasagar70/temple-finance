const mongoose = require('mongoose');
const {
  LEDGER_TYPES,
  LEDGER_DIRECTIONS,
  PAYMENT_METHODS,
  RECORD_STATUS,
} = require('../utils/constants');

// This is the single source of truth for every financial movement in the
// temple. Nothing else in the system should be trusted for balance
// calculations. Records are NEVER deleted - only status: CANCELLED.
const ledgerTransactionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    type: { type: String, enum: LEDGER_TYPES, required: true },
    direction: { type: String, enum: LEDGER_DIRECTIONS, required: true },
    amountPaise: { type: Number, required: true, min: 1 },

    // Polymorphic back-reference to whichever domain document caused this entry
    sourceType: {
      type: String,
      required: true,
      enum: [
        'VariPayment',
        'Contribution',
        'Donation',
        'FundTransaction',
        'Expense',
        'SirpiExpense',
        'Adjustment',
      ],
    },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },

    pangaliId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pangali' },
    festivalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Festival' },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    referenceNumber: { type: String, trim: true },
    description: { type: String, trim: true },

    status: { type: String, enum: RECORD_STATUS, default: 'ACTIVE' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ledgerTransactionSchema.index({ date: -1 });
ledgerTransactionSchema.index({ type: 1, date: -1 });
ledgerTransactionSchema.index({ pangaliId: 1, date: -1 });
ledgerTransactionSchema.index({ status: 1 });
ledgerTransactionSchema.index({ sourceType: 1, sourceId: 1 });

module.exports = mongoose.model('LedgerTransaction', ledgerTransactionSchema);
