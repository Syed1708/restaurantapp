const express = require('express');
const router = express.Router();
const { register, login, refreshToken, logout, me } = require('../controllers/auth.controller');
const auth = require('../middleware/auth'); // middleware verifies access token

router.post('/register', register);
router.post('/login', login);

// refresh-token uses cookie — do not require access token
router.post('/refresh-token', refreshToken);

// logout clears cookie & revokes refresh token
router.post('/logout', logout);

// protected route to get current user
router.get('/me', auth, me);

module.exports = router;
