const StockItem = require("../models/StockItem");

// Get all stock items (location filtered)
async function getStockItems(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const filter =
      req.user.role === "admin"
        ? {}
        : { locationId: req.user.location };

    const stockItems = await StockItem.find(filter).populate("productId", "name").sort({ name: 1 });
    res.json({ stockItems });
  } catch (err) {
    next(err);
  }
}

// Create stock item
async function createStockItem(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { name, productId, quantity, unit, trackStock } = req.body;

    const stockItem = await StockItem.create({
      name,
      productId,
      quantity: quantity || 0,
      unit: unit || "pcs",
      trackStock: trackStock ?? true,
      locationId: req.user.location, // auto assign
    });

    res.status(201).json(stockItem);
  } catch (err) {
    next(err);
  }
}

// Update stock item
async function updateStockItem(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const stockItem = await StockItem.findById(req.params.id);
    if (!stockItem) return res.status(404).json({ message: "Stock item not found" });

    if (req.user.role !== "admin" && stockItem.locationId.toString() !== req.user.location.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    Object.assign(stockItem, req.body);
    const updated = await stockItem.save();

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// Delete stock item
async function deleteStockItem(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const stockItem = await StockItem.findById(req.params.id);
    if (!stockItem) return res.status(404).json({ message: "Stock item not found" });

    if (req.user.role !== "admin" && stockItem.locationId.toString() !== req.user.location.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await stockItem.remove();
    res.json({ message: "Stock item deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStockItems,
  createStockItem,
  updateStockItem,
  deleteStockItem,
};
