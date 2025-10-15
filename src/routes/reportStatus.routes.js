// src/routes/reportStatus.routes.js
const express = require('express');
const router = express.Router();
const { getStatus } = require('../controllers/reportStatus.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.get('/status/:jobId', auth, authorize(['admin','manager']), getStatus);

module.exports = router;
