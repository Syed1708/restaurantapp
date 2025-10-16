const bcrypt = require("bcrypt");
const crypto = require("crypto");
const {
  signAccessToken,
  signRefreshToken,
  REFRESH_EXPIRES,
  ACCESS_EXPIRES,
} = require("../utils/token");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const ms = require("ms"); // optional, but we'll compute expiry manually

// helper: create a DB-backed refresh token and return token string
async function createRefreshToken({ userId, ip }) {
  // create a secure random token string (we'll sign payload too, but storing raw token allows revoke & rotation)
  const token = crypto.randomBytes(40).toString("hex");
  // compute expiry date (30 days by default)
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";
  // ms package isn't required; use Date arithmetic
  const now = new Date();
  const expiresAt = new Date(now.getTime() + parseRefreshExpiryMs(expiresIn));

  const rt = await RefreshToken.create({
    token,
    user: userId,
    expiresAt,
    createdByIp: ip || "",
  });

  return rt;
}

function parseRefreshExpiryMs(str) {
  // simple parser for formats like '30d' '15m' '24h' or fallback to days number
  try {
    const num = parseInt(str, 10);
    if (!isNaN(num) && /^[0-9]+$/.test(str)) {
      // numeric assume days
      return num * 24 * 60 * 60 * 1000;
    }
    // support formats like '30d','15m','24h'
    const unit = str.slice(-1);
    const val = parseInt(str.slice(0, -1), 10);
    if (unit === "d") return val * 24 * 60 * 60 * 1000;
    if (unit === "h") return val * 60 * 60 * 1000;
    if (unit === "m") return val * 60 * 1000;
  } catch (e) {}
  // default 30 days
  return 30 * 24 * 60 * 60 * 1000;
}

// cookie options
function refreshTokenCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    signed: false,
    path: "/api/auth/refresh-token",
    // maxAge is ms, but we set cookie as expires below for clarity
  };
}

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ message: "name,email,password required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);

    // if a manager is creating a user, use their location
    let assignedLocation = location;
    if (req.user && req.user.role === 'manager') {
      assignedLocation = req.user.location;
    }
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || "waiter",
      location: assignedLocation, // ✅ assign automatically
    });
    res
      .status(201)
      .json({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        location: user.location,
      });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || "";

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // issue access token
    const accessToken = signAccessToken({
      sub: String(user._id),
      role: user.role,
      location: user.location,
    });

    // create refresh token stored in DB
    const refreshTokenDoc = await createRefreshToken({ userId: user._id, ip });

    // set cookie
    const cookieOptions = refreshTokenCookieOptions();
    // convert expiresAt to cookie expiry
    res.cookie(
      process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken",
      refreshTokenDoc.token,
      {
        ...cookieOptions,
        expires: refreshTokenDoc.expiresAt,
      }
    );

    res.json({
      accessToken,
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const tokenFromCookie =
      req.cookies[process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken"];
    const ip = req.ip || req.connection?.remoteAddress || "";

    if (!tokenFromCookie)
      return res.status(401).json({ message: "Refresh token missing" });

    // find token in DB
    const stored = await RefreshToken.findOne({
      token: tokenFromCookie,
    }).populate("user");
    if (!stored)
      return res.status(401).json({ message: "Invalid refresh token" });

    // check active
    if (stored.revokedAt || stored.isExpired) {
      return res
        .status(401)
        .json({ message: "Refresh token expired or revoked" });
    }

    // token rotation: revoke the used refresh token and create a new one
    stored.revokedAt = new Date();
    stored.revokedByIp = ip;

    const newRt = await createRefreshToken({ userId: stored.user._id, ip });
    stored.replacedByToken = newRt.token;
    await stored.save();

    // issue new access token
    const accessToken = signAccessToken({
      sub: String(stored.user._id),
      role: stored.user.role,
    });

    // set new cookie (rotate)
    const cookieOptions = refreshTokenCookieOptions();
    res.cookie(
      process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken",
      newRt.token,
      {
        ...cookieOptions,
        expires: newRt.expiresAt,
      }
    );

    res.json({
      accessToken,
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const tokenFromCookie =
      req.cookies[process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken"];
    const ip = req.ip || req.connection?.remoteAddress || "";

    if (tokenFromCookie) {
      const stored = await RefreshToken.findOne({ token: tokenFromCookie });
      if (stored && !stored.revokedAt) {
        stored.revokedAt = new Date();
        stored.revokedByIp = ip;
        await stored.save();
      }
    }

    // clear cookie in response
    res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/refresh-token",
    });

    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    // auth middleware sets req.user
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refreshToken, logout, me };
