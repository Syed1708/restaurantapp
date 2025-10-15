const Product = require("../models/Product");
const StockItem = require("../models/StockItem");

async function listProducts(req, res, next) {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const p = await Product.findById(req.params.id).lean();
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const body = req.body;
    // Basic validation
    if (!body.name || typeof body.price !== "number") {
      return res
        .status(400)
        .json({
          message: "name and price are required (price number in cents)",
        });
    }
    const p = await Product.create(body);
    res.status(201).json(p);
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteProduct(req, res, next) {
  try {
    await Product.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// Quick helper to create a stock item for a product
async function createStockForProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const { name, quantity = 0, unit = "" } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });
    const stock = await StockItem.create({ name, productId, quantity, unit });
    res.status(201).json(stock);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createStockForProduct,
};
