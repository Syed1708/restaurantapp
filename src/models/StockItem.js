const mongoose = require('mongoose');
const { Schema } = mongoose;

const StockItemSchema = new Schema({
  name: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' }, // optional link
  quantity: { type: Number, default: 0 }, // units
  unit: { type: String, default: '' }, // e.g., pcs, g, L
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('StockItem', StockItemSchema);
