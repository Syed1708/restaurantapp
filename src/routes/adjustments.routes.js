const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAdjustments, createAdjustment } = require('../controllers/stockAdjustment.controller');
const authorize = require('../middleware/authorize');


router.get('/', auth, authorize(['admin', 'manager']), getAdjustments);
router.post('/', auth, authorize(['admin', 'manager']), createAdjustment);

module.exports = router;
