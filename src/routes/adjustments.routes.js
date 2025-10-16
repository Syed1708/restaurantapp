const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getAdjustments, createAdjustment } = require('../controllers/stockAdjustment.controller');
const authorize = require('../middleware/authorize');

router.use(protect);

router.get('/', authorize(['admin', 'manager']), getAdjustments);
router.post('/', authorize(['admin', 'manager']), createAdjustment);

module.exports = router;
