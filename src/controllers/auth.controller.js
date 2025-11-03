const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { log } = require("console");

// Environment configs
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "supersecret";
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "15m";
const REFRESH_TOKEN_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken";
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || "30d";

// Utils
function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
}

function parseExpiryMs(str) {
  const num = parseInt(str, 10);
  const unit = str.slice(-1);
  if (!isNaN(num)) {
    if (/^\d+$/.test(str)) return num * 24 * 60 * 60 * 1000;
    if (unit === "d") return num * 24 * 60 * 60 * 1000;
    if (unit === "h") return num * 60 * 60 * 1000;
    if (unit === "m") return num * 60 * 1000;
  }
  return 30 * 24 * 60 * 60 * 1000; // default 30 days
}

function refreshTokenCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    signed: false,
    // path: "/api/auth/refresh-token",
    path: "/", // accessible on all routes
  };
}

// Create refresh token in DB
async function createRefreshToken({ userId, ip }) {
  const token = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + parseExpiryMs(REFRESH_TOKEN_EXPIRES));

  const rt = await RefreshToken.create({
    token,
    user: userId,
    expiresAt,
    createdByIp: ip || "",
  });

  return rt;
}

// Register user
async function register(req, res, next) {
  try {
    const { name, email, password, role, permissions, locations } = req.body;

    console.log(req.body);
    
    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);

    let assignedLocations = [];

    // Admin can assign locations from request body
    if (req.user?.role === "admin") {
      assignedLocations = Array.isArray(locations) ? locations : [];
    }

    // Manager creating a user → assign their locations
    else if (req.user?.role === "manager") {
      assignedLocations = req.user.locations || [];
    }

    // Self-registration (no logged in user) → optional default branch
    else if (!req.user) {
      // e.g., assign first branch as default
      assignedLocations = locations ? (Array.isArray(locations) ? locations : [locations]) : [];
    }

    const user = await User.create({
      name,
      email,
      password: passwordHash,
      role: role || "waiter",
      permissions: permissions || [],
      locations: assignedLocations,
    });

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      locations: user.locations,
    });
  } catch (err) {
    next(err);
  }
}


// utils for populating user
async function getUserWithLocations(userId) {
  return await User.findById(userId)
    .populate("locations", "name") // fetch only name
    .lean();
}
// Login user
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || "";

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    // Generate access token
    const accessToken = signAccessToken({
      sub: String(user._id),
      role: user.role,
      locations: user.locations,
    });

    // Generate refresh token
    const refreshTokenDoc = await createRefreshToken({ userId: user._id, ip });

    // Set **refresh token** cookie
    const refreshOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/", // must be root
      expires: refreshTokenDoc.expiresAt,
    };
    res.cookie(
      process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken",
      refreshTokenDoc.token,
      refreshOptions
    );

    // Set **access token** cookie
    const accessOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/", // must be root so client can read SSR / API
      maxAge: 15 * 60 * 1000, // 15 min
    };
    res.cookie("accessToken", accessToken, accessOptions);

    // Send populated user
    const populatedUser = await getUserWithLocations(user._id);
    // Respond with user info (optional)
    res.json({
      user: {
        id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        role: populatedUser.role,
        permissions: populatedUser.permissions,
        locations: populatedUser.locations,
      },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
}

// Refresh token endpoint
async function refreshToken(req, res, next) {
  try {
    const tokenFromCookie = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    const ip = req.ip || req.connection?.remoteAddress || "";

    if (!tokenFromCookie)
      return res.status(401).json({ message: "Refresh token missing" });

    const stored = await RefreshToken.findOne({
      token: tokenFromCookie,
    }).populate("user");
    if (!stored || stored.revokedAt || stored.isExpired)
      return res.status(401).json({ message: "Invalid refresh token" });

    stored.revokedAt = new Date();
    stored.revokedByIp = ip;
    const newRt = await createRefreshToken({ userId: stored.user._id, ip });
    stored.replacedByToken = newRt.token;
    await stored.save();

    const accessToken = signAccessToken({
      sub: String(stored.user._id),
      role: stored.user.role,
      permissions: stored.user.permissions,
    });

    const populatedUser = await getUserWithLocations(stored.user._id);

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, newRt.token, {
      ...refreshTokenCookieOptions(),
      expires: newRt.expiresAt,
    });
    res.json({
      accessToken,
      user: {
        id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        role: populatedUser.role,
        permissions: populatedUser.permissions,
        locations: populatedUser.locations,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Logout endpoint
async function logout(req, res, next) {
  try {
    const tokenFromCookie = req.cookies[REFRESH_TOKEN_COOKIE_NAME];
    const ip = req.ip || req.connection?.remoteAddress || "";

    if (tokenFromCookie) {
      const stored = await RefreshToken.findOne({ token: tokenFromCookie });
      if (stored && !stored.revokedAt) {
        stored.revokedAt = new Date();
        stored.revokedByIp = ip;
        await stored.save();
      }
    }

    // Clear both cookies
    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

// Get current user (me)
async function me(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const populatedUser = await getUserWithLocations(req.user._id);
    console.log(populatedUser);
    

    res.json({
      user: {
        id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        role: populatedUser.role,
        permissions: populatedUser.permissions,
        locations: populatedUser.locations,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refreshToken, logout, me };
