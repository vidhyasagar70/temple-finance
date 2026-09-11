const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });
}

const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    throw ApiError.badRequest('Phone and password are required');
  }

  const user = await User.findOne({ phone }).select('+passwordHash');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = issueToken(user);
  res.json({ success: true, data: { token, user: user.toSafeJSON() } });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  res.json({ success: true, data: user.toSafeJSON() });
});

module.exports = { login, me, issueToken };
