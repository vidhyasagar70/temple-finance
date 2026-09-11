const mongoose = require('mongoose');

// Generic atomic counter, keyed by an arbitrary string (e.g. "RECEIPT_VARI_2026").
// Used with findOneAndUpdate + $inc + upsert so concurrent requests never
// collide on the same receipt number, even under load.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
