const Counter = require('../models/Counter');

/**
 * Generates a gap-free, collision-free receipt number like "VR-2026-0001"
 * using an atomic findOneAndUpdate increment. Safe under concurrent requests.
 *
 * @param {string} prefix e.g. "VR", "CT", "DN", "FD"
 * @param {string} financialYear e.g. "2025-2026" -> we use the trailing year "2026"
 * @param {import('mongoose').ClientSession} [session]
 */
async function generateReceiptNumber(prefix, financialYear, session) {
  const yearPart = financialYear.split('-').pop();
  const counterId = `RECEIPT_${prefix}_${yearPart}`;
  const options = { upsert: true, new: true };
  if (session) options.session = session;

  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    options
  );
  const seqPadded = String(counter.seq).padStart(4, '0');
  return `${prefix}-${yearPart}-${seqPadded}`;
}

module.exports = { generateReceiptNumber };
