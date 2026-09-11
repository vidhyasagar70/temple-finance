const express = require('express');
const { getDashboardSummary } = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.use(verifyToken);

router.get('/summary', getDashboardSummary);

module.exports = router;
