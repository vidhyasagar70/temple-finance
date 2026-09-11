/**
 * Shared helper to compute totals for a FundAdvance against its FundTransaction records.
 * 
 * @param {Object} advance - FundAdvance document or object
 * @param {Array} transactions - Array of FundTransaction documents or objects
 * @returns {Object}
 */
function computeAdvanceTotals(advance, transactions = []) {
  const activeTxns = transactions.filter((t) => t.status === 'ACTIVE');

  const principalRepaidPaise = activeTxns
    .filter((t) => t.type === 'PRINCIPAL_REPAYMENT')
    .reduce((sum, t) => sum + (t.amountPaise || 0), 0);

  const interestPaidPaise = activeTxns
    .filter((t) => t.type === 'INTEREST_PAYMENT')
    .reduce((sum, t) => sum + (t.amountPaise || 0), 0);

  const principalOutstandingPaise = Math.max(
    (advance.principalPaise || 0) - principalRepaidPaise,
    0
  );

  let calculatedStatus = advance.status;
  const now = new Date();
  const due = advance.dueDate ? new Date(advance.dueDate) : null;

  if (calculatedStatus !== 'CLOSED' && calculatedStatus !== 'CANCELLED') {
    if (principalOutstandingPaise === 0 && (advance.principalPaise || 0) > 0) {
      calculatedStatus = 'CLOSED';
    } else if (due && due < now && principalOutstandingPaise > 0) {
      calculatedStatus = 'OVERDUE';
    } else if (principalRepaidPaise > 0) {
      calculatedStatus = 'PARTIALLY_REPAID';
    }
  }

  return {
    principalRepaidPaise,
    principalOutstandingPaise,
    interestPaidPaise,
    status: calculatedStatus,
  };
}

module.exports = { computeAdvanceTotals };
