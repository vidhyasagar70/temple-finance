const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Pangali = require('./models/Pangali');
const Counter = require('./models/Counter');

async function inspectPangalis() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/temple_finance';
  await mongoose.connect(MONGO_URI);

  console.log('--- INSPECTING PANGALIS & COUNTER ---');
  const count = await Pangali.countDocuments();
  console.log('Total Pangalis in DB:', count);

  const counter = await Counter.findById('PANGALI_CODE');
  console.log('Current Counter seq for PANGALI_CODE:', counter ? counter.seq : 'NULL');

  const latestPangalis = await Pangali.find().sort({ createdAt: -1 }).limit(10);
  console.log('Latest 10 created Pangalis:');
  latestPangalis.forEach((p) => {
    console.log(`- Code: ${p.pangaliCode}, Family: ${p.familyName}, Phone: "${p.phone}", CreatedAt: ${p.createdAt}`);
  });

  const indexes = await Pangali.collection.indexes();
  console.log('Pangali collection indexes:', JSON.stringify(indexes, null, 2));

  await mongoose.disconnect();
}

inspectPangalis();
