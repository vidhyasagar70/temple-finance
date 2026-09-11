const express = require('express');
const { body } = require('express-validator');
const {
  createExpense,
  listExpenses,
  getExpensesByDate,
  updateExpense,
  cancelExpense,
  exportExpenses,
} = require('../controllers/expenseController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(verifyToken);

router.get('/', listExpenses);
router.get('/by-date', getExpensesByDate);
router.get('/export', exportExpenses);

router.post(
  '/',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  [
    body('category').optional(),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
    body('date').notEmpty().withMessage('Expense date is required'),
    body('paidTo').optional(),
    body('paymentMethod').optional(),
  ],
  validate,
  createExpense
);

router.put('/:id', requireRole('ADMIN', 'COMMITTEE_MEMBER'), updateExpense);
router.put('/:id/cancel', requireRole('ADMIN'), cancelExpense);

module.exports = router;
