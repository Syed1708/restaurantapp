const express = require('express');
const router = express.Router();
const { enqueueReport } = require('../controllers/report.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');

router.post('/', auth, authorize(['admin','manager']), enqueueReport);

module.exports = router;
