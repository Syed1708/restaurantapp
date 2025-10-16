const StockItem = require('../models/StockItem');
const StockAdjustment = require('../models/StockAdjustment');

async function listStock(req, res, next) {
  try {
    const q = {};
    if (req.query.locationId) q.locationId = req.query.locationId;
    const items = await StockItem.find(q).lean();
    res.json(items);
  } catch (err) { next(err); }
}

async function adjustStock(req, res, next) {
  try {
    const { stockItemId } = req.params;
    const { delta, reason = '' } = req.body;
    if (typeof delta !== 'number') return res.status(400).json({ message: 'delta (number) required' });

    const stock = await StockItem.findById(stockItemId);
    if (!stock) return res.status(404).json({ message: 'not found' });

    stock.quantity = (stock.quantity || 0) + delta;
    stock.lastUpdated = new Date();
    await stock.save();

    await StockAdjustment.create({
      stockItemId: stock._id,
      productId: stock.productId || null,
      userId: req.user ? req.user._id : null,
      delta,
      reason: reason || (delta < 0 ? 'manual decrement' : 'manual increment')
    });

    res.json(stock);
  } catch (err) { next(err); }
}

module.exports = { listStock, adjustStock };
