const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * auth middleware:
 * - looks for Authorization: Bearer <token> OR httpOnly cookie named 'token'
 * - verifies token, loads user from DB, attaches to req.user
 * - if token missing -> 401
 */
async function auth(req, res, next) {
  try {
    const authHeader = (req.headers.authorization || '').trim();
    let token = null;

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: token missing' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Unauthorized: invalid token' });
    }

    const userId = payload.sub;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await User.findById(userId).select('-passwordHash').lean();
    if (!user) return res.status(401).json({ message: 'Unauthorized: user not found' });

    req.user = user; // simple POJO (lean())
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = auth;
