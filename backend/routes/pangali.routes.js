const express = require('express');
const { body } = require('express-validator');
const {
  listPangalis,
  getPangali,
  createPangali,
  updatePangali,
  deactivatePangali,
  getPangaliSummary,
  exportPangalis,
} = require('../controllers/pangaliController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(verifyToken);

router.get('/', listPangalis);
router.get('/export', exportPangalis);
router.get('/:id', getPangali);
router.get('/:id/summary', getPangaliSummary);

const pangaliValidators = [
  body('familyName').notEmpty().withMessage('Family name is required'),
  body('annualVariAmount').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Annual Vari amount must be a positive number'),
  body('phone').optional({ checkFalsy: true }).matches(/^[0-9]{10}$/),
];

router.post(
  '/',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  pangaliValidators,
  validate,
  createPangali
);

router.put(
  '/:id',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  validate,
  updatePangali
);

router.put('/:id/deactivate', requireRole('ADMIN'), deactivatePangali);

module.exports = router;
