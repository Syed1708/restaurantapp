const mongoose = require('mongoose');
const { Schema } = mongoose;

const LocationSchema = new Schema({
  name: { type: String, required: true },         // e.g., "Paris Central"
  address: { type: String },
  city: { type: String },
  country: { type: String, default: 'France' },
  phone: { type: String },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Location', LocationSchema);
