const express = require('express');
const { body } = require('express-validator');
const { login, me } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/login',
  [
    body('phone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit phone required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/me', verifyToken, me);

module.exports = router;
