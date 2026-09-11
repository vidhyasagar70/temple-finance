const mongoose = require('mongoose');
const { INTEREST_TYPES, FUND_ADVANCE_STATUS } = require('../utils/constants');

// The master record for money given out from temple funds. principalPaise,
// interestType and interestRatePercent are set once at creation and are
// NEVER edited afterwards (per the requirement that principal/interest
// figures must never be overwritten). Actual money movement happens via
// separate FundTransaction documents referencing this advance.
const fundAdvanceSchema = new mongoose.Schema(
  {
    recipientType: { type: String, enum: ['PANGALI', 'INDIVIDUAL'], required: true },
    pangaliId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pangali' }, // required when recipientType === PANGALI
    recipientName: { type: String, required: true, trim: true },

    principalPaise: { type: Number, required: true, min: 1, immutable: true },
    interestType: { type: String, enum: INTEREST_TYPES, required: true, immutable: true },
    interestRatePercent: { type: Number, required: true, min: 0, immutable: true },

    startDate: { type: Date, required: true, immutable: true },
    dueDate: { type: Date, required: true },
    purpose: { type: String, trim: true },
    notes: { type: String, trim: true },

    status: { type: String, enum: FUND_ADVANCE_STATUS, default: 'ACTIVE' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

fundAdvanceSchema.index({ pangaliId: 1 });
fundAdvanceSchema.index({ status: 1 });
fundAdvanceSchema.index({ dueDate: 1 });

module.exports = mongoose.model('FundAdvance', fundAdvanceSchema);
