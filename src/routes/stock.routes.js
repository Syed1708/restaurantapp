const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stock.controller');

router.get('/', ctrl.listStock);
router.post('/:stockItemId/adjust', ctrl.adjustStock);

module.exports = router;
