
// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const VariantSchema = new Schema({
//   name: String,
//   priceDelta: { type: Number, default: 0 },
//   sku: String
// }, { _id: false });

// const IngredientSchema = new Schema({
//   materialId: { type: Schema.Types.ObjectId, ref: 'StockItem' },
//   qty: Number
// }, { _id: false });

// const ProductSchema = new Schema({
//   name: { type: String, required: true },
//   sku: String,
//   description: String,
//   category: { type: Schema.Types.ObjectId, ref: 'Category' },
//   price: { type: Number, required: true }, // cents
//   variants: [VariantSchema],
//   ingredients: [IngredientSchema],
//   trackStock: { type: Boolean, default: false },
//   stockUnit: String,
//   active: { type: Boolean, default: true }
// }, { timestamps: true });

// module.exports = mongoose.model('Product', ProductSchema);

const mongoose = require('mongoose');
const { Schema } = mongoose;

const VariantSchema = new Schema({
  name: String,
  priceDelta: { type: Number, default: 0 } // cents
}, { _id: false });

const IngredientSchema = new Schema({
  stockItemId: { type: Schema.Types.ObjectId, ref: 'StockItem' },
  qty: { type: Number, default: 0 } // units consumed when product sold
}, { _id: false });

const ProductSchema = new Schema({
  name: { type: String, required: true },
  sku: { type: String, index: true },
  description: String,
  category: String,
  price: { type: Number, required: true }, // store in cents
  variants: [ VariantSchema ],
  ingredients: [ IngredientSchema ],
  trackStock: { type: Boolean, default: false },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);

