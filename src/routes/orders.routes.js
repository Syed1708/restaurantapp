const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { z } = require('zod');


const {
  createOrder,
  getOrders,
  updateOrderStatus
} = require('../controllers/orders.controller');

const orderSchema = z.object({
  locationId: z.string().nullable().optional(),
  table: z.string().nullable().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number().int().min(1),
    priceAtOrder: z.number().int().min(0)
  })).min(1)
});


// Create new order
router.post('/', auth, authorize(['admin','manager','waiter']), validate(orderSchema), createOrder);

// Get all orders (filtered by location for non-admin)
router.get('/', authorize(['admin', 'manager', 'waiter']), getOrders);

// Update order status (preparing, served, paid, cancelled)
router.patch('/:id/status', authorize(['admin', 'manager', 'waiter']), updateOrderStatus);

module.exports = router;

