const jwt = require("jsonwebtoken");

// === Default expiry times (override with .env if needed) ===
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";  // short lifespan
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d"; // long lifespan

// === SECRET KEYS (required) ===
// Make sure to set these in your .env file:
// ACCESS_TOKEN_SECRET=your_access_secret_here
// REFRESH_TOKEN_SECRET=your_refresh_secret_here

// === Sign Access Token ===
function signAccessToken(payload) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
}

// === Sign Refresh Token ===
function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
}

// === Verify Access Token ===
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    return null;
  }
}

// === Verify Refresh Token ===
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  ACCESS_EXPIRES,
  REFRESH_EXPIRES,
};

