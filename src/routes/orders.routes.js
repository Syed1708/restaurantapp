const express = require('express');
const router = express.Router();
const { createOrder } = require('../controllers/orders.controller');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { z } = require('zod');

const orderSchema = z.object({
  locationId: z.string().nullable().optional(),
  table: z.string().nullable().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: z.number().int().min(1),
    priceAtOrder: z.number().int().min(0)
  })).min(1)
});

router.post('/', auth, authorize(['admin','manager','waiter']), validate(orderSchema), createOrder);

module.exports = router;
