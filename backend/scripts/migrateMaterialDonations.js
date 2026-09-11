require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Donation = require('../models/Donation');
const Contribution = require('../models/Contribution');
const receiptService = require('../services/receiptService');
const Settings = require('../models/Settings');

async function migrateMaterialDonations() {
  await connectDB();
  console.log('--- Migrating Legacy Material Donations to Contributions ---');

  // Find any donation documents with donationType === 'MATERIAL' or itemDescription present
  const materialDonations = await Donation.find({
    $or: [{ donationType: 'MATERIAL' }, { itemDescription: { $exists: true, $ne: null } }],
  });

  console.log(`Found ${materialDonations.length} material donation records to migrate.`);

  let migratedCount = 0;
  const settings = await Settings.findOne();
  const currentFY = settings?.currentFinancialYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  for (const doc of materialDonations) {
    const notesArr = [];
    if (doc.itemDescription) notesArr.push(`Item: ${doc.itemDescription}`);
    if (doc.notes) notesArr.push(doc.notes);
    notesArr.push('Migrated from Donations module');
    const combinedNotes = notesArr.join(' | ');

    const receiptNumber = doc.receiptNumber || (await receiptService.generateReceiptNumber('CT', currentFY, null));

    await Contribution.create({
      personType: 'OTHER',
      personName: doc.donorName,
      contributionType: 'பொருட்கள் உதவி (Material / Service Offering)',
      amountPaise: doc.estimatedValuePaise || undefined,
      date: doc.donationDate || new Date(),
      paymentMethod: doc.estimatedValuePaise ? 'OTHER' : undefined,
      receiptNumber,
      festivalId: doc.festivalId,
      notes: combinedNotes,
      status: doc.status || 'ACTIVE',
      createdBy: doc.createdBy,
    });

    await Donation.findByIdAndDelete(doc._id);
    migratedCount++;
  }

  console.log(`Migration complete. Successfully migrated ${migratedCount} records to Contributions.\n`);
  await mongoose.disconnect();
  process.exit(0);
}

migrateMaterialDonations().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
