const mongoose = require('mongoose');

const pangaliSchema = new mongoose.Schema(
  {
    pangaliCode: { type: String, required: true, unique: true, trim: true }, // e.g. PNG-0001, auto-generated
    familyName: { type: String, required: true, trim: true },
    houseName: { type: String, trim: true },
    phone: { type: String, trim: true, match: [/^[0-9]{10}$/, 'Phone number must be 10 digits'] },
    address: { type: String, trim: true },
    memberCount: { type: Number, min: 0, default: 1 },
    annualVariAmountPaise: { type: Number, required: true, min: 0 },
    pendingAmountPaise: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pangaliSchema.index({ familyName: 'text', houseName: 'text', phone: 'text' });

module.exports = mongoose.model('Pangali', pangaliSchema);
