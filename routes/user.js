/**
 * USER AUTH ROUTES (optional login)
 * POST /api/user/register
 * POST /api/user/login
 * GET  /api/user/me  (requires token)
 * GET  /api/admin/users (admin only)
 */

const router    = require('express').Router();
const jwt       = require('jsonwebtoken');
const User      = require('../models/User');
const adminAuth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

/* Strict rate limit on auth — 10 attempts per 15 min */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please wait 15 minutes.' }
});

/* Middleware to verify user JWT */
function userAuth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Please log in' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/* ── POST /api/user/register ── */
router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password, state, district, shgName } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, password, state, district, shgName });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      result: 'success',
      token,
      user: { id: user._id, name: user.name, email: user.email, state: user.state }
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/* ── POST /api/user/login ── */
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'No account found with this email' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      result: 'success',
      token,
      user: { id: user._id, name: user.name, email: user.email, state: user.state }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/* ── GET /api/user/me ── */
router.get('/me', userAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Could not fetch profile' });
  }
});

/* ── GET /api/admin/users (admin) ── */
router.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Could not load users' });
  }
});

module.exports = router;
