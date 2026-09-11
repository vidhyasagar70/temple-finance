const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectDB() {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri);
    // eslint-disable-next-line no-console
    console.log('MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
