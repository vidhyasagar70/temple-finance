const LedgerTransaction = require('../models/LedgerTransaction');
const ApiError = require('../utils/ApiError');
const { LEDGER_TYPE_DIRECTION } = require('../utils/constants');

/**
 * The ONLY function in the codebase allowed to insert into LedgerTransaction.
 * Every domain controller (Vari, Contribution, Donation, Fund, Expense) must
 * route through this so the ledger's shape and invariants stay consistent.
 *
 * Must be called inside an active mongoose session (session.withTransaction)
 * so the domain document and its ledger entry commit or roll back together.
 */
async function createLedgerEntry({
  session,
  date,
  type,
  direction,
  amountPaise,
  sourceType,
  sourceId,
  pangaliId,
  festivalId,
  paymentMethod,
  referenceNumber,
  description,
  createdBy,
}) {
  const expectedDirection = LEDGER_TYPE_DIRECTION[type];
  if (!expectedDirection) {
    throw ApiError.badRequest(`Unknown ledger type: ${type}`);
  }
  if (expectedDirection !== 'EITHER' && expectedDirection !== direction) {
    throw ApiError.badRequest(
      `Ledger type ${type} must be ${expectedDirection}, got ${direction}`
    );
  }
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw ApiError.badRequest('amountPaise must be a positive integer');
  }

  const opts = session ? { session } : {};
  const [txn] = await LedgerTransaction.create(
    [
      {
        date,
        type,
        direction,
        amountPaise,
        sourceType,
        sourceId,
        pangaliId,
        festivalId,
        paymentMethod,
        referenceNumber,
        description,
        createdBy,
        status: 'ACTIVE',
      },
    ],
    opts
  );
  return txn;
}

/**
 * Cancels a ledger entry (soft) - never deletes. Used when a domain record
 * (a Vari payment, donation, etc.) is cancelled, keeping the audit trail
 * intact while excluding the amount from balance aggregations.
 */
async function cancelLedgerEntry({ session, ledgerTransactionId, cancelledBy, cancelReason }) {
  const query = LedgerTransaction.findById(ledgerTransactionId);
  if (session) query.session(session);
  const txn = await query;
  if (!txn) {
    throw ApiError.notFound('Ledger transaction not found');
  }
  if (txn.status === 'CANCELLED') {
    return txn; // idempotent
  }
  txn.status = 'CANCELLED';
  txn.cancelledAt = new Date();
  txn.cancelledBy = cancelledBy;
  txn.cancelReason = cancelReason;
  const opts = session ? { session } : {};
  await txn.save(opts);
  return txn;
}

/**
 * Updates an active ledger entry when its parent domain document is edited.
 */
async function updateLedgerEntry({
  session,
  ledgerTransactionId,
  date,
  amountPaise,
  paymentMethod,
  description,
  pangaliId,
  festivalId,
}) {
  if (!ledgerTransactionId) return null;
  const query = LedgerTransaction.findById(ledgerTransactionId);
  if (session) query.session(session);
  const txn = await query;
  if (!txn || txn.status === 'CANCELLED') return null;

  if (date !== undefined) txn.date = date;
  if (amountPaise !== undefined && amountPaise > 0) txn.amountPaise = amountPaise;
  if (paymentMethod !== undefined) txn.paymentMethod = paymentMethod;
  if (description !== undefined) txn.description = description;
  if (pangaliId !== undefined) txn.pangaliId = pangaliId;
  if (festivalId !== undefined) txn.festivalId = festivalId;

  const opts = session ? { session } : {};
  await txn.save(opts);
  return txn;
}

module.exports = { createLedgerEntry, cancelLedgerEntry, updateLedgerEntry };
