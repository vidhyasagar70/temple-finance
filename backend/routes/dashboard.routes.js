const express = require('express');
const { getDashboardSummary, exportDashboardSummary } = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/summary', getDashboardSummary);
router.get('/export', exportDashboardSummary);

module.exports = router;

