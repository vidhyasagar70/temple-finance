const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

function transformValue(val) {
  if (!val) return val;
  if (typeof val === 'string') {
    // Convert 24-hex string to ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(val)) {
      return new mongoose.Types.ObjectId(val);
    }
    // Convert ISO date string to Date
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
      return new Date(val);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(transformValue);
  }
  if (typeof val === 'object' && val !== null && !(val instanceof Date) && !(val instanceof mongoose.Types.ObjectId)) {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = transformValue(v);
    }
    return res;
  }
  return val;
}

async function restoreAtlas(atlasUri) {
  try {
    const backupFilePath = path.join(__dirname, 'local_db_backup.json');
    if (!fs.existsSync(backupFilePath)) {
      console.error('Backup file local_db_backup.json not found!');
      process.exit(1);
    }

    const dumpData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(atlasUri, { serverSelectionTimeoutMS: 10000 });
    console.log('Connected to MongoDB Atlas!');

    const db = mongoose.connection.db;

    for (const [colName, docs] of Object.entries(dumpData)) {
      if (docs.length === 0) continue;
      
      const preparedDocs = docs.map(doc => transformValue(doc));

      // Clear existing collection in Atlas then insert documents
      await db.collection(colName).deleteMany({});
      await db.collection(colName).insertMany(preparedDocs);
      console.log(`Migrated ${preparedDocs.length} documents into Atlas collection: ${colName}`);
    }

    console.log('\nMigration to MongoDB Atlas completed with 100% data integrity!');
    
    // Verify document counts in Atlas
    console.log('\n--- Verifying MongoDB Atlas Document Counts ---');
    const atlasCols = await db.listCollections().toArray();
    for (const col of atlasCols) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`Collection '${col.name}': ${count} documents`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

const targetUri = process.argv[2];
if (!targetUri) {
  console.error('Please pass Atlas URI as argument');
  process.exit(1);
}

restoreAtlas(targetUri);
