const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const LOCAL_URI = 'mongodb://127.0.0.1:27017/temple_finance';

async function dumpLocalData() {
  try {
    console.log('Connecting to local MongoDB:', LOCAL_URI);
    await mongoose.connect(LOCAL_URI);
    console.log('Connected to local MongoDB!');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Local collections:', collections.map(c => c.name));

    const dumpData = {};
    for (const col of collections) {
      const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
      dumpData[col.name] = docs;
      console.log(`Extracted ${docs.length} documents from collection: ${col.name}`);
    }

    const backupFilePath = path.join(__dirname, 'local_db_backup.json');
    fs.writeFileSync(backupFilePath, JSON.stringify(dumpData, null, 2));
    console.log(`Successfully saved local database backup to: ${backupFilePath}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error dumping local data:', err);
  }
}

dumpLocalData();
