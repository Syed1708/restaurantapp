const express = require('express');
const auth = require('../middleware/auth');
const authorizeOrPermission = require('../middleware/authorize');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/products.controller');



router.get('/', auth, getProducts);
router.get('/:id', auth, getProduct);
router.post('/', auth, authorizeOrPermission(['admin', 'manager']), createProduct);
router.put('/:id', auth, authorizeOrPermission(['admin', 'manager']), updateProduct);
router.delete('/:id', auth, authorizeOrPermission(['admin']), deleteProduct);

module.exports = router;
