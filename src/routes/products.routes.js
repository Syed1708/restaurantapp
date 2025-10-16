const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/products.controller');
const authorize = require('../middleware/authorize');

// Public / auth-protected
router.use(auth);

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', authorize(['admin', 'manager']), createProduct);
router.put('/:id', authorize(['admin', 'manager']), updateProduct);
router.delete('/:id', authorize(['admin']), deleteProduct);

module.exports = router;
