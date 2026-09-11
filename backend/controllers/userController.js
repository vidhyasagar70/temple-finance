const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: users.map((u) => u.toSafeJSON()) });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, phone, email, password, role } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) {
    throw ApiError.conflict('A user with this phone number already exists');
  }

  const user = new User({ name, phone, email, role });
  await user.setPassword(password);
  await user.save();

  res.status(201).json({ success: true, data: user.toSafeJSON() });
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, isActive, password } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) await user.setPassword(password);

  await user.save();
  res.json({ success: true, data: user.toSafeJSON() });
});

module.exports = { listUsers, createUser, updateUser };
