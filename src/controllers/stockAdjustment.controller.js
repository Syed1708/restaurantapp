const StockAdjustment = require("../models/StockAdjustment");

// Get all adjustments (filter by location if non-admin)
async function getAdjustments(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const filter =
      req.user.role === "admin"
        ? {}
        : { locationId: req.user.location };

    const adjustments = await StockAdjustment.find(filter)
      .populate("stockItemId", "name")
      .populate("productId", "name")
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json({ adjustments });
  } catch (err) {
    next(err);
  }
}

// Create adjustment (manual)
async function createAdjustment(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { stockItemId, productId, orderId, delta, reason } = req.body;

    const adj = await StockAdjustment.create({
      stockItemId,
      productId,
      orderId: orderId || null,
      delta,
      reason,
      userId: req.user._id,
      locationId: req.user.location, // auto assign
    });

    res.status(201).json(adj);
  } catch (err) {
    next(err);
  }
}

module.exports = { getAdjustments, createAdjustment };
