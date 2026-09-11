const mongoose = require('mongoose');
const { PAYMENT_METHODS, RECORD_STATUS, DONATION_PURPOSES } = require('../utils/constants');

const donationSchema = new mongoose.Schema(
  {
    donationType: { type: String, enum: ['CASH'], default: 'CASH' },
    donorName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'] },
    amountPaise: { type: Number, required: true, min: 1 },
    itemDescription: { type: String, trim: true },
    estimatedValuePaise: { type: Number, min: 0 },
    donationDate: { type: Date, required: true },
    purpose: { type: String, enum: DONATION_PURPOSES, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    receiptNumber: { type: String, unique: true, sparse: true, trim: true },
    notes: { type: String, trim: true },
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

donationSchema.index({ donationDate: -1 });
donationSchema.index({ purpose: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ donationType: 1 });

module.exports = mongoose.model('Donation', donationSchema);
