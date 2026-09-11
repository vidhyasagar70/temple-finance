// One-time bootstrap script: creates the first ADMIN user and a default
// Settings document if none exist yet. Run with: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Settings = require('../models/Settings');

async function seed() {
  await connectDB();

  const existingAdmin = await User.findOne({ role: 'ADMIN' });
  if (existingAdmin) {
    console.log('An ADMIN user already exists:', existingAdmin.phone);
  } else {
    const admin = new User({
      name: process.env.SEED_ADMIN_NAME || 'Temple Administrator',
      phone: process.env.SEED_ADMIN_PHONE || '9999999999',
      role: 'ADMIN',
    });
    await admin.setPassword(process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!');
    await admin.save();
    console.log('Created ADMIN user with phone:', admin.phone);
    console.log('IMPORTANT: change the seed password after first login.');
  }

  const existingSettings = await Settings.findOne();
  if (!existingSettings) {
    await Settings.create({
      templeName: 'Village Temple',
      currentFinancialYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    });
    console.log('Created default Settings document.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
