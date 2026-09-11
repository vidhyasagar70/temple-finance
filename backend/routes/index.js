const express = require('express');

const router = express.Router();

// Active routes
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/pangalis', require('./pangali.routes'));
router.use('/vari', require('./vari.routes'));
router.use('/contributions', require('./contribution.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/sirpi-expenses', require('./sirpiExpense.routes'));
router.use('/festivals', require('./festival.routes'));
router.use('/fund-advances', require('./fund.routes'));
router.use('/temple-funds', require('./fund.routes'));
router.use('/donations', require('./donation.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
