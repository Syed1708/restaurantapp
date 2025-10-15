const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

function signAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
  // include jti-like unique id in payload (we'll set token string separately)
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signAccessToken, signRefreshToken, verifyToken, ACCESS_EXPIRES, REFRESH_EXPIRES };
