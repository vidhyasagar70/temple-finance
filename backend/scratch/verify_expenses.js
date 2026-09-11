require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Expense = require('../models/Expense');

async function verify() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/temple_finance');

  const count = await Expense.countDocuments({ status: 'ACTIVE' });
  console.log(`Active expenses count: ${count}`);

  const facetResults = await Expense.aggregate([
    { $match: { status: 'ACTIVE' } },
    {
      $facet: {
        groupedData: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
              totalAmountPaise: { $sum: '$amountPaise' },
              itemCount: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
        ],
        grandTotal: [
          {
            $group: {
              _id: null,
              grandTotalPaise: { $sum: '$amountPaise' },
            },
          },
        ],
      },
    },
  ]);

  const groups = facetResults[0]?.groupedData || [];
  const grandTotalPaise = facetResults[0]?.grandTotal[0]?.grandTotalPaise || 0;

  console.log(`Unique dates count: ${groups.length}`);
  console.log(`Grand total amount in Rupees: ₹${(grandTotalPaise / 100).toLocaleString('en-IN')}`);
  console.log('\nTop 5 date groups:');
  console.table(groups.slice(0, 5));

  await mongoose.disconnect();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
