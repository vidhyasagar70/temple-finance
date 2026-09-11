const express = require('express');
const { body } = require('express-validator');
const {
  createContribution,
  getContributionById,
  updateContribution,
  listContributions,
  cancelContribution,
  getContributionTypes,
  exportContributions,
} = require('../controllers/contributionController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(verifyToken);

router.get('/', listContributions);
router.get('/types', getContributionTypes);
router.get('/export', exportContributions);
router.get('/:id', getContributionById);

router.post(
  '/',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  [
    body('personType').isIn(['PANGALI', 'OTHER']).withMessage('Invalid person type'),
    body('contributionType').notEmpty().withMessage('Contribution type is required'),
    body('date').notEmpty().withMessage('Date is required'),
  ],
  validate,
  createContribution
);

router.put(
  '/:id',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  updateContribution
);

router.put('/:id/cancel', requireRole('ADMIN'), cancelContribution);

module.exports = router;
