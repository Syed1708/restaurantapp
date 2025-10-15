const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, default: 1 },
  priceAtOrder: { type: Number, required: true } // cents
}, { _id: false });

const PaymentSchema = new Schema({
  type: { type: String, enum: ['cash','card','voucher','other'], default: 'cash' },
  amount: Number
}, { _id: false });

const OrderSchema = new Schema({
  number: Number,
  dateKey: String, // e.g., 2025-10-14 for daily sequencing
  locationId: { type: Schema.Types.ObjectId, ref: 'Location', default: null },
  table: { type: String, default: null },
  items: [OrderItemSchema],
  status: { type: String, enum: ['open','in_kitchen','served','paid','cancelled'], default: 'open' },
  subtotal: Number,
  tax: Number,
  total: Number,
  payments: [PaymentSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
