require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Pangali = require('../models/Pangali');

async function fixPangaliTargetVari() {
  await connectDB();
  console.log('--- Migration: Standardize Pangali Target Vari to ₹15,000 ---');

  const targetPaise = 1500000; // ₹15,000 in paise
  const pangalis = await Pangali.find({ isActive: true });

  let updatedCount = 0;
  for (const p of pangalis) {
    if (!p.annualVariAmountPaise || p.annualVariAmountPaise < targetPaise) {
      p.annualVariAmountPaise = targetPaise;
      await p.save();
      updatedCount++;
    }
  }

  console.log(`Updated ${updatedCount} Pangali records to default ₹15,000 target vari.`);
  process.exit(0);
}

fixPangaliTargetVari().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
