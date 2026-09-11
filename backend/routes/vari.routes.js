const express = require('express');
const { body } = require('express-validator');
const {
  createVariPayment,
  listVariPayments,
  updateVariPayment,
  cancelVariPayment,
  getVariSummary,
  getPangaliVariRoster,
  updatePangaliTargetVari,
  updatePangaliPendingVari,
  updateVariRosterItem,
  deleteVariRosterItem,
  exportVariPayments,
} = require('../controllers/variController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(verifyToken);

router.get('/', listVariPayments);
router.get('/summary', getVariSummary);
router.get('/roster', getPangaliVariRoster);
router.get('/export', exportVariPayments);

router.post(
  '/',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  [
    body('pangaliId').notEmpty().withMessage('Pangali ID is required'),
    body('financialYear').notEmpty().withMessage('Financial year is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than zero'),
    body('paymentDate').notEmpty().withMessage('Payment date is required'),
    body('paymentMethod').notEmpty().withMessage('Payment method is required'),
  ],
  validate,
  createVariPayment
);

router.put('/target/:pangaliId', requireRole('ADMIN', 'COMMITTEE_MEMBER'), updatePangaliTargetVari);
router.put('/pending/:pangaliId', requireRole('ADMIN', 'COMMITTEE_MEMBER'), updatePangaliPendingVari);
router.put('/roster/:pangaliId', requireRole('ADMIN', 'COMMITTEE_MEMBER'), updateVariRosterItem);
router.delete('/roster/:pangaliId', requireRole('ADMIN', 'COMMITTEE_MEMBER'), deleteVariRosterItem);
router.put('/:id', requireRole('ADMIN', 'COMMITTEE_MEMBER'), updateVariPayment);
router.put('/:id/cancel', requireRole('ADMIN'), cancelVariPayment);



module.exports = router;
