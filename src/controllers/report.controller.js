// src/controllers/report.controller.js
const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // password: process.env.REDIS_PASSWORD || undefined,
};

const reportQueue = new Queue('reports', { connection });

/**
 * POST /api/reports
 * body: { type: 'sales-summary', from: '2025-10-01', to: '2025-10-14', email: 'x@y' }
 */
async function enqueueReport(req, res, next) {
  try {
    const payload = req.body || {};
    if (!payload.type) return res.status(400).json({ message: 'type required' });

    // additional metadata: who requested it
    payload.requestedBy = (req.user && req.user._id) ? String(req.user._id) : null;
    payload.requestedAt = new Date().toISOString();

    const job = await reportQueue.add('generate', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100, // keep last 100 successful job results
      removeOnFail: 1000
    });

    res.status(202).json({ jobId: job.id, status: 'queued' });
  } catch (err) {
    next(err);
  }
}

module.exports = { enqueueReport };
