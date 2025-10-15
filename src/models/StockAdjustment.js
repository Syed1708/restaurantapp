const mongoose = require('mongoose');
const { Schema } = mongoose;

const StockAdjustmentSchema = new Schema({
  stockItemId: { type: Schema.Types.ObjectId, ref: 'StockItem', required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null }, // optional: which product caused adjustment
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  delta: { type: Number, required: true }, // negative for consumption
  reason: { type: String, default: '' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('StockAdjustment', StockAdjustmentSchema);
