
const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: String,
  role: { type: String, enum: ['admin','manager','waiter','chef'], default: 'waiter' },
  permissions: [String],
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  active: { type: Boolean, default: true },

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
