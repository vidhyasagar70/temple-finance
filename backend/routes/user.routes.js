const express = require('express');
const { body } = require('express-validator');
const { listUsers, createUser, updateUser } = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(verifyToken, requireRole('ADMIN'));

router.get('/', listUsers);

router.post(
  '/',
  [
    body('name').notEmpty(),
    body('phone').matches(/^[0-9]{10}$/),
    body('password').isLength({ min: 6 }),
    body('role').isIn(ROLES),
  ],
  validate,
  createUser
);

router.put('/:id', updateUser);

module.exports = router;
