const express = require('express');
const { body } = require('express-validator');
const {
  createFestival,
  listFestivals,
  getFestivalSummary,
  updateFestival,
} = require('../controllers/festivalController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(verifyToken);

router.get('/', listFestivals);
router.get('/:id/summary', getFestivalSummary);

router.post(
  '/',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  [
    body('name').notEmpty().withMessage('Festival name is required'),
    body('startDate').notEmpty().withMessage('Start date is required'),
    body('endDate').notEmpty().withMessage('End date is required'),
    body('year').isNumeric().withMessage('Year must be a number'),
  ],
  validate,
  createFestival
);

router.put(
  '/:id',
  requireRole('ADMIN', 'COMMITTEE_MEMBER'),
  validate,
  updateFestival
);

module.exports = router;
