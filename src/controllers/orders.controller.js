const mongoose = require("mongoose");
const Order = require("../models/Order");
const StockItem = require("../models/StockItem");
const Product = require("../models/Product");
const StockAdjustment = require("../models/StockAdjustment");
const { nextSequence } = require("../utils/counters");

/**
 * Create new order
 * Body example:
 * {
 *   "table": "T1",
 *   "items": [
 *     { "productId": "64...", "qty": 2, "priceAtOrder": 1200 }
 *   ]
 * }
 */
async function createOrder(req, res, next) {
  const session = await mongoose.startSession();
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { items = [], table = null } = req.body;
    const locationId = req.user.location || req.body.locationId || null;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    // Calculate totals
    const subtotal = items.reduce(
      (s, it) => s + (it.priceAtOrder || 0) * (it.qty || 0),
      0
    );
    const tax = 0;
    const total = subtotal + tax;
    const dateKey = new Date().toISOString().slice(0, 10);

    let createdOrder;

    await session.withTransaction(async () => {
      const decrements = [];

      // Step 1: Validate all items and prepare stock decrements
      for (const it of items) {
        const product = await Product.findById(it.productId).session(session);
        if (!product) {
          throw Object.assign(new Error(`Product not found: ${it.productId}`), {
            status: 400,
          });
        }

        if (Array.isArray(product.ingredients) && product.ingredients.length) {
          // Product has ingredients (recipe)
          for (const ing of product.ingredients) {
            const stockItem = await StockItem.findById(ing.stockItemId).session(
              session
            );
            if (!stockItem) {
              throw Object.assign(
                new Error(
                  `Stock item ${ing.stockItemId} not found (used by product ${product._id})`
                ),
                { status: 400 }
              );
            }

            if (stockItem.quantity < ing.qty * it.qty) {
              throw Object.assign(
                new Error(
                  `Insufficient stock for ${stockItem.name} (need ${
                    ing.qty * it.qty
                  }, available ${stockItem.quantity})`
                ),
                { status: 400 }
              );
            }

            decrements.push({
              stockItem,
              qty: ing.qty * it.qty,
              productId: product._id,
            });
          }
        } else {
          // Product-level stock
          const stock = await StockItem.findOne({
            productId: product._id,
            locationId,
          }).session(session);

          if (stock && stock.trackStock) {
            if (stock.quantity < it.qty) {
              throw Object.assign(
                new Error(
                  `Insufficient stock for ${stock.name} (need ${it.qty}, available ${stock.quantity})`
                ),
                { status: 400 }
              );
            }

            decrements.push({
              stockItem: stock,
              qty: it.qty,
              productId: product._id,
            });
          }
        }
      }

      // Step 2: Generate order number
      const seqName = `orders:${dateKey}:${locationId || "default"}`;
      const number = await nextSequence(seqName);

      // Step 3: Create order
      const orderDoc = {
        number,
        dateKey,
        locationId,
        table,
        items,
        subtotal,
        tax,
        total,
        status: "open",
        createdBy: req.user._id,
      };
      const [created] = await Order.create([orderDoc], { session });
      createdOrder = created;

      // Step 4: Apply stock decrements + create adjustment logs
      for (const d of decrements) {
        const s = d.stockItem;
        s.quantity -= d.qty;
        s.lastUpdated = new Date();
        await s.save({ session });

        await StockAdjustment.create(
          [
            {
              stockItemId: s._id,
              productId: d.productId,
              orderId: createdOrder._id,
              userId: req.user._id,
              delta: -d.qty,
              reason: `Sold via order ${createdOrder._id}`,
            },
          ],
          { session }
        );
      }
    });

    res.status(201).json({
      message: "Order created successfully",
      order: createdOrder,
    });
  } catch (err) {
    if (err.status)
      return res.status(err.status).json({ message: err.message });
    next(err);
  } finally {
    session.endSession();
  }
}

/**
 * Get all orders (location filtered for non-admin)
 */
async function getOrders(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const filter =
      req.user.role === "admin"
        ? {}
        : { locationId: req.user.location || null };

    const orders = await Order.find(filter)
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

/**
 * Update order status (e.g. preparing, served, paid, cancelled)
 */
async function updateOrderStatus(req, res, next) {
  const session = await mongoose.startSession();
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "open",
      "preparing",
      "served",
      "paid",
      "cancelled",
    ];
    if (!validStatuses.includes(status))
      return res.status(400).json({ message: "Invalid status" });

    let updatedOrder;
    await session.withTransaction(async () => {
      const order = await Order.findById(id).session(session);
      if (!order) return res.status(404).json({ message: "Order not found" });

      // Optional: restock if cancelled
      if (status === "cancelled" && order.status !== "cancelled") {
        for (const item of order.items) {
          const product = await Product.findById(item.productId).session(
            session
          );
          if (!product) continue;

          if (Array.isArray(product.ingredients) && product.ingredients.length) {
            for (const ing of product.ingredients) {
              const stock = await StockItem.findById(ing.stockItemId).session(
                session
              );
              if (stock) {
                const qty = ing.qty * item.qty;
                stock.quantity += qty;
                await stock.save({ session });
                await StockAdjustment.create(
                  [
                    {
                      stockItemId: stock._id,
                      productId: product._id,
                      orderId: order._id,
                      userId: req.user._id,
                      delta: qty,
                      reason: `Restocked from cancelled order ${order._id}`,
                    },
                  ],
                  { session }
                );
              }
            }
          }
        }
      }

      order.status = status;
      updatedOrder = await order.save({ session });
    });

    res.json({
      message: `Order marked as ${status}`,
      order: updatedOrder,
    });
  } catch (err) {
    next(err);
  } finally {
    session.endSession();
  }
}

module.exports = { createOrder, getOrders, updateOrderStatus };
