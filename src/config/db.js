const mongoose = require('mongoose');

async function connect() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI missing in .env');
  await mongoose.connect(uri);
//   await mongoose.connect(uri, { dbName: 'restaurant' });
  console.log('✅ Connected to MongoDB');
}

module.exports = { connect };
