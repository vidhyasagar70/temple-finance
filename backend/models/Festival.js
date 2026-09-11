const mongoose = require('mongoose');

const festivalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    year: { type: Number, required: true },
    description: { type: String, trim: true },
    budgetPaise: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

festivalSchema.index({ year: 1, startDate: 1 });

module.exports = mongoose.model('Festival', festivalSchema);
