const express = require('express');
const { body } = require('express-validator');
const {
  createSirpiExpense,
  listSirpiExpenses,
  updateSirpiExpense,
  cancelSirpiExpense,
  exportSirpiExpenses,
} = require('../controllers/sirpiExpenseController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(verifyToken);

router.get('/', listSirpiExpenses);
router.get('/export', exportSirpiExpenses);

router.post(
  '/',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
    body('date').notEmpty().withMessage('Expense date is required'),
    body('paidThrough').notEmpty().withMessage('Paid through (வசமிருந்தவர்) is required'),
    body('receivedBy').notEmpty().withMessage('Received by (பெற்றவர்) is required'),
    body('paymentMethod').optional(),
  ],
  validate,
  createSirpiExpense
);

router.put('/:id', requireRole('ADMIN', 'COMMITTEE_MEMBER'), updateSirpiExpense);
router.put('/:id/cancel', requireRole('ADMIN'), cancelSirpiExpense);

module.exports = router;
