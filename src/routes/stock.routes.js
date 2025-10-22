const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem
} = require('../controllers/stock.controller');
const authorize = require('../middleware/authorize');


router.get('/', getStockItems);
router.post('/', auth, authorize(['admin', 'manager']), createStockItem);
router.put('/:id', auth, authorize(['admin', 'manager']), updateStockItem);
router.delete('/:id', auth, authorize(['admin']), deleteStockItem);

module.exports = router;
