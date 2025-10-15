// worker/report.worker.js
require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const { Worker } = require('bullmq');
const mongoose = require('mongoose');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10)
};

const Order = require('../src/models/Order'); // ensure mongoose models work in worker
const Product = require('../src/models/Product');

async function connectMongo() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DBNAME || 'restaurant' });
    console.log('Worker: connected to MongoDB');
  }
}

async function generateSalesCSV(payload) {
  // Example aggregation: sum totals per day between dates
  const { from, to } = payload;
  // Minimal pipeline — adjust as needed
  const match = {};
  if (from) match.createdAt = { $gte: new Date(from) };
  if (to) {
    match.createdAt = match.createdAt || {};
    match.createdAt.$lte = new Date(to);
  }

  const pipeline = [
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        totalAmount: { $sum: '$total' },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const rows = await Order.aggregate(pipeline).allowDiskUse(true).exec();

  // write CSV local file (for demo) — in prod write to S3
  const outDir = path.join(__dirname, 'reports');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `sales-${Date.now()}.csv`);
  const header = 'date,totalAmount,count\n';
  const lines = rows.map(r => `${r._id},${r.totalAmount || 0},${r.count || 0}`).join('\n');
  await fs.writeFile(outPath, header + lines);
  return outPath;
}

const worker = new Worker(
  'reports',
  async job => {
    console.log('Worker: processing job', job.id, job.data);
    await connectMongo();

    const payload = job.data;
    if (payload.type === 'sales-summary') {
      const filePath = await generateSalesCSV(payload);
      // return result to be stored as job.returnvalue
      return { filePath };
    }
    // other types...
    return { ok: true };
  },
  { connection }
);

worker.on('completed', (job, returnvalue) => {
  console.log(`Worker: job ${job.id} completed. Result:`, returnvalue);
  // Potentially: notify user via socket or email
});
worker.on('failed', (job, err) => {
  console.error(`Worker: job ${job.id} failed:`, err);
});
