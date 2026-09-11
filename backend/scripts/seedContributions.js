const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const User = require('../models/User');
const Contribution = require('../models/Contribution');
const Counter = require('../models/Counter');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/temple-finance';

async function generateReceiptNumber(financialYear, counterDoc) {
  if (!counterDoc) {
    counterDoc = { seq: 0 };
  }
  counterDoc.seq += 1;
  await Counter.findOneAndUpdate(
    { _id: `CONTRIBUTION_RECEIPT_${financialYear}` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `CT-${financialYear}-${String(counterDoc.seq).padStart(4, '0')}`;
}

async function seedContributions() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  console.log('✅ Connected to MongoDB');

  try {
    const contributionsPath = path.join(__dirname, '..', '..', 'contributions.json');
    const raw = fs.readFileSync(contributionsPath, 'utf8');
    const seedData = JSON.parse(raw);

    let adminUser = await User.findOne({ role: 'ADMIN' });
    if (!adminUser) {
      adminUser = await User.findOne();
    }
    if (!adminUser) {
      throw new Error('No user found in DB. Please seed a user first.');
    }
    console.log(`👤 Using admin user: ${adminUser.name || adminUser.email || adminUser._id}`);

    let counterDoc = await Counter.findOne({ _id: /CONTRIBUTION_RECEIPT/ }).sort({ _id: -1 });
    if (!counterDoc) {
      counterDoc = null;
    }

    const existingCount = await Contribution.countDocuments();
    console.log(`📋 Existing contributions: ${existingCount}`);

    if (existingCount > 0) {
      console.log('⚠️  Contribution collection is not empty. Skipping seed to avoid duplicates.');
      console.log('   (To force seed, manually drop the contributions collection first)');
      return;
    }

    const currentFY = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    let seq = counterDoc ? counterDoc.seq : 0;

    const created = [];
    for (const item of seedData) {
      seq += 1;
      await Counter.findOneAndUpdate(
        { _id: `CONTRIBUTION_RECEIPT_${currentFY}` },
        { $inc: { seq: 1 } },
        { upsert: true, new: true }
      );
      const receiptNumber = `CT-${currentFY}-${String(seq).padStart(4, '0')}`;

      const amountPaise = item.amount && !isNaN(Number(item.amount)) && Number(item.amount) > 0
        ? Math.round(Number(item.amount) * 100)
        : 0;

      const doc = {
        personType: 'OTHER',
        personName: item.personName || 'Unknown Devotee',
        contributionType: item.contributionType || 'General Contribution',
        amountPaise,
        date: new Date(),
        paymentMethod: amountPaise > 0 ? 'CASH' : undefined,
        receiptNumber,
        notes: item.notes || undefined,
        details: item.details || undefined,
        place: item.place || undefined,
        status: 'ACTIVE',
        createdBy: adminUser._id,
      };

      const contribution = await Contribution.create(doc);
      created.push(contribution);
      console.log(`✅ Added: ${receiptNumber} | ${item.contributionType} | ${item.personName?.slice(0, 30)}`);
    }

    console.log(`\n🎉 Successfully seeded ${created.length} contribution records from contributions.json`);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedContributions();
