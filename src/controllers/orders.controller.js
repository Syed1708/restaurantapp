const mongoose = require('mongoose');
const Order = require('../models/Order');
const StockItem = require('../models/StockItem');
const Product = require('../models/Product');
const { nextSequence } = require('../utils/counters');
const StockAdjustment = require('../models/StockAdjustment');

/**
 * Body example:
 * {
 *   "locationId": null,
 *   "table": "T1",
 *   "items": [
 *     { "productId": "64...", "qty": 2, "priceAtOrder": 1200 }
 *   ]
 * }
 */
async function createOrder(req, res, next) {
  const session = await mongoose.startSession();
  try {
    const { items = [], locationId = null, table = null } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items required' });
    }

    // compute totals
    const subtotal = items.reduce((s, it) => s + (it.priceAtOrder || 0) * (it.qty || 0), 0);
    const tax = 0;
    const total = subtotal + tax;
    const dateKey = new Date().toISOString().slice(0, 10);

    let createdOrder;

    await session.withTransaction(async () => {
      // 1) For each item, load product and prepare required stock decrements:
      const decrements = []; // array of { stockItem, qtyToRemove, productId }

      for (const it of items) {
        const product = await Product.findById(it.productId).session(session);
        if (!product) {
          const e = new Error(`Product not found ${it.productId}`);
          e.status = 400;
          throw e;
        }

        // If product defines ingredients -> treat as recipe
        if (Array.isArray(product.ingredients) && product.ingredients.length > 0) {
          for (const ing of product.ingredients) {
            // ingredient: { stockItemId, qty } meaning qty per one product unit
            const stockItemId = ing.stockItemId;
            const needed = (ing.qty || 0) * (it.qty || 0);
            if (!stockItemId) continue; // skip if misconfigured
            const stock = await StockItem.findById(stockItemId).session(session);
            if (!stock) {
              const err = new Error(`Stock item ${stockItemId} referenced in product ${product._id} not found`);
              err.status = 400;
              throw err;
            }
            if (stock.locationId && locationId && stock.locationId.toString() !== locationId) {
              // allow if location filter used; if mismatch, still proceed depending on policy.
            }
            if (stock.quantity < needed) {
              const err = new Error(`Insufficient stock for ${stock.name} (need ${needed}, available ${stock.quantity})`);
              err.status = 400;
              throw err;
            }
            decrements.push({ stockItem: stock, qty: needed, productId: product._id });
          }
        } else {
          // fallback: product-level StockItem (productId reference)
          const stock = await StockItem.findOne({ productId: product._id, locationId }).session(session);
          if (stock) {
            const needed = (it.qty || 0);
            if (stock.quantity < needed) {
              const err = new Error(`Insufficient stock for ${stock.name} (need ${needed}, available ${stock.quantity})`);
              err.status = 400;
              throw err;
            }
            decrements.push({ stockItem: stock, qty: needed, productId: product._id });
          } else {
            // product not tracked in stock — policy: skip or enforce. We'll skip.
          }
        }
      } // end items loop

      // 2) sequence number
      const seqName = `orders:${dateKey}:${locationId || 'default'}`;
      const number = await nextSequence(seqName);

      // 3) create order
      const orderDoc = {
        number,
        dateKey,
        locationId,
        table,
        items,
        subtotal,
        tax,
        total,
        status: 'open',
        createdBy: req.user ? req.user._id : null
      };
      const created = await Order.create([orderDoc], { session });
      createdOrder = created[0];

      // 4) decrement stock and log adjustments
      for (const d of decrements) {
        const s = d.stockItem;
        s.quantity = s.quantity - d.qty;
        s.lastUpdated = new Date();
        await s.save({ session });

        await StockAdjustment.create([{
          stockItemId: s._id,
          productId: d.productId,
          orderId: createdOrder._id,
          userId: req.user ? req.user._id : null,
          delta: -d.qty,
          reason: `Sold via order ${createdOrder._id}`
        }], { session });
      }
    }); // end transaction

    res.status(201).json({ order: createdOrder });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  } finally {
    session.endSession();
  }
}

module.exports = { createOrder };
