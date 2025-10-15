// src/controllers/reportStatus.controller.js
const { Queue } = require('bullmq');

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const queue = new Queue('reports', { connection });

async function getStatus(req, res, next) {
  try {
    const jobId = req.params.jobId;
    if (!jobId) return res.status(400).json({ message: 'jobId required' });

    const job = await queue.getJob(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const state = await job.getState(); // completed, failed, waiting, active, delayed
    const progress = job.progress;
    const result = job.returnvalue; // available if completed
    const attemptsMade = job.attemptsMade;

    res.json({
      id: job.id,
      name: job.name,
      state,
      progress,
      attemptsMade,
      data: job.data,
      returnvalue: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStatus };
