/**
 * All money in the database is stored as INTEGER PAISE (1 rupee = 100 paise).
 * This is the ONLY place rupee <-> paise conversion should happen.
 * Never store or compute with JS floating point rupees.
 */

/**
 * Convert a rupee amount (number or numeric string, as typed by a user,
 * e.g. 1234.50) into an integer paise value. Throws on invalid input.
 */
function rupeesToPaise(rupees) {
  const num = typeof rupees === 'string' ? Number(rupees) : rupees;
  if (typeof num !== 'number' || Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error('Invalid monetary amount');
  }
  if (num < 0) {
    throw new Error('Monetary amount cannot be negative');
  }
  // Round to nearest paisa to defend against float noise (e.g. 19.999999999998)
  return Math.round(num * 100);
}

/**
 * Convert integer paise back to a rupee number for API responses / display.
 */
function paiseToRupees(paise) {
  if (typeof paise !== 'number' || !Number.isInteger(paise)) {
    throw new Error('Invalid paise value');
  }
  return paise / 100;
}

/**
 * Format paise as an INR display string, e.g. 1234550 -> "₹12,345.50"
 */
function formatINR(paise) {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

function isValidPaise(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

module.exports = { rupeesToPaise, paiseToRupees, formatINR, isValidPaise };
