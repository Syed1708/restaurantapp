const Product = require("../models/Product");

// Get all products (location filtered for non-admin)
async function getProducts(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const filter =
      req.user.role === "admin"
        ? {}
        : { locationId: req.user.location };

    const products = await Product.find(filter).sort({ name: 1 });
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

// Get single product
async function getProduct(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (req.user.role !== "admin" && product.locationId.toString() !== req.user.location.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
}

// Create product
async function createProduct(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const { name, category, price, trackStock, ingredients, variants } = req.body;

    const product = await Product.create({
      name,
      category,
      price,
      trackStock: trackStock ?? true,
      ingredients: ingredients || [],
      variants: variants || [],
      locationId: req.user.location, // auto-assign
    });

    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

// Update product
async function updateProduct(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (req.user.role !== "admin" && product.locationId.toString() !== req.user.location.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    Object.assign(product, req.body);
    const updated = await product.save();

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// Delete product
async function deleteProduct(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (req.user.role !== "admin" && product.locationId.toString() !== req.user.location.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await product.remove();
    res.json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
