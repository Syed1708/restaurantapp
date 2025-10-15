const mongoose = require('mongoose');
const { Schema } = mongoose;

const RefreshTokenSchema = new Schema({
  token: { type: String, required: true, unique: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  revokedAt: { type: Date, default: null },
  replacedByToken: { type: String, default: null },
  createdByIp: String,
  revokedByIp: String,
}, { timestamps: true });

RefreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= this.expiresAt.getTime();
});

RefreshTokenSchema.virtual('isActive').get(function () {
  return !this.revokedAt && !this.isExpired;
});

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
