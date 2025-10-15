
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin','manager','waiter','kitchen'], default: 'waiter' },
  permissions: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
