const express = require('express');
const { body } = require('express-validator');
const {
  createFundAdvance,
  listFundAdvances,
  getFundAdvance,
  recordRepayment,
  cancelFundAdvance,
  exportFundAdvances,
} = require('../controllers/fundController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(verifyToken);

router.get('/', listFundAdvances);
router.get('/export', exportFundAdvances);
router.get('/:id', getFundAdvance);

router.post(
  '/',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  [
    body('recipientType').isIn(['PANGALI', 'INDIVIDUAL']).withMessage('Invalid recipient type'),
    body('recipientName').notEmpty().withMessage('Recipient name is required'),
    body('principal').isFloat({ min: 0.01 }).withMessage('Principal must be greater than zero'),
    body('interestType').notEmpty().withMessage('Interest type is required'),
    body('interestRatePercent').isFloat({ min: 0 }).withMessage('Interest rate must be a non-negative number'),
    body('startDate').notEmpty().withMessage('Start date is required'),
    body('dueDate').notEmpty().withMessage('Due date is required'),
  ],
  validate,
  createFundAdvance
);

router.post(
  '/:id/repayments',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  [
    body('type').isIn(['PRINCIPAL_REPAYMENT', 'INTEREST_PAYMENT']).withMessage('Invalid repayment type'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
    body('date').notEmpty().withMessage('Repayment date is required'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  ],
  validate,
  recordRepayment
);

router.put('/:id/cancel', requireRole('ADMIN'), cancelFundAdvance);

module.exports = router;
