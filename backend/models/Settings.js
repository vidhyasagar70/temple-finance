const mongoose = require('mongoose');
const {
  DEFAULT_CONTRIBUTION_TYPES,
  DEFAULT_EXPENSE_CATEGORIES,
} = require('../utils/constants');

// This collection is intended to hold exactly one document. Enforced at the
// controller level (findOneAndUpdate with upsert, always on a fixed known id).
const settingsSchema = new mongoose.Schema(
  {
    templeName: { type: String, required: true, default: 'Village Temple' },
    address: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    currentFinancialYear: { type: String, required: true }, // e.g. "2025-2026"

    variTypes: { type: [String], default: ['Regular Vari'] },
    contributionTypes: { type: [String], default: DEFAULT_CONTRIBUTION_TYPES },
    expenseCategories: { type: [String], default: DEFAULT_EXPENSE_CATEGORIES },

    receiptPrefixes: {
      VARI: { type: String, default: 'VR' },
      CONTRIBUTION: { type: String, default: 'CT' },
      DONATION: { type: String, default: 'DN' },
      FUND: { type: String, default: 'FD' },
    },

    interestDefaults: {
      defaultType: { type: String, default: 'YEARLY' },
      defaultRatePercent: { type: Number, default: 12 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
