const express = require('express');
const { body } = require('express-validator');
const {
  createDonation,
  listDonations,
  updateDonation,
  cancelDonation,
  deleteDonation,
  getDonationSummary,
  exportDonations,
} = require('../controllers/donationController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(verifyToken);

router.get('/', listDonations);
router.get('/summary', getDonationSummary);
router.get('/export', exportDonations);

router.post(
  '/',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  [
    body('donorName').notEmpty().withMessage('Donor name is required'),
    body('donationDate').notEmpty().withMessage('Donation date is required'),
    body('purpose').notEmpty().withMessage('Donation purpose is required'),
  ],
  validate,
  createDonation
);

router.put('/:id', requireRole('ADMIN', 'COMMITTEE_MEMBER'), updateDonation);
router.put('/:id/cancel', requireRole('ADMIN'), cancelDonation);
router.delete('/:id', requireRole('ADMIN', 'COMMITTEE_MEMBER'), deleteDonation);


module.exports = router;
