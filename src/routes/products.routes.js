const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/products.controller');
const auth = require('../middleware/auth'); // enable when you have auth middleware

router.get('/', ctrl.listProducts);
router.get('/:id', ctrl.getProduct);
router.post('/',  ctrl.createProduct);
router.put('/:id', auth, ctrl.updateProduct);
router.delete('/:id', auth, ctrl.deleteProduct);

// helper: create stock item for product
router.post('/:productId/stock', ctrl.createStockForProduct);

module.exports = router;
