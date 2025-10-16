const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem
} = require('../controllers/stock.controller');
const authorize = require('../middleware/authorize');

router.use(auth);

router.get('/', getStockItems);
router.post('/', authorize(['admin', 'manager']), createStockItem);
router.put('/:id', authorize(['admin', 'manager']), updateStockItem);
router.delete('/:id', authorize(['admin']), deleteStockItem);

module.exports = router;
