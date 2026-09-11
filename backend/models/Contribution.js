const mongoose = require('mongoose');
const { PAYMENT_METHODS, RECORD_STATUS } = require('../utils/constants');

const contributionSchema = new mongoose.Schema(
  {
    personType: { type: String, enum: ['PANGALI', 'OTHER'], required: true },
    pangaliId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pangali' },
    personName: { type: String, trim: true },

    contributionType: { type: String, required: true, trim: true },
    amountPaise: { type: Number, min: 0 },
    date: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
    },
    receiptNumber: { type: String, unique: true, trim: true },
    notes: { type: String, trim: true },
    details: { type: String, trim: true },
    place: { type: String, trim: true },
    festivalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Festival' },

    status: { type: String, enum: RECORD_STATUS, default: 'ACTIVE' },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true },

    ledgerTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerTransaction' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

contributionSchema.index({ pangaliId: 1, date: -1 });
contributionSchema.index({ contributionType: 1 });
contributionSchema.index({ status: 1 });

module.exports = mongoose.model('Contribution', contributionSchema);
