/**
 * ADMIN ROUTES — JWT auth required
 * POST /api/admin/login
 * GET  /api/admin/dashboard  — counts summary
 * GET  /api/admin/reports    — all reports
 * GET  /api/admin/stories    — all stories (pending + approved)
 * GET  /api/admin/reviews    — all reviews
 * GET  /api/admin/alerts     — all alerts
 * PATCH /api/admin/:model/:id/status  — approve/reject
 * DELETE /api/admin/:model/:id        — delete entry
 * POST  /api/admin/alerts             — create new alert
 * PATCH /api/admin/alerts/:id         — update alert
 */

const router   = require('express').Router();
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const adminAuth= require('../middleware/auth');
const Report   = require('../models/Report');
const Story    = require('../models/Story');
const Review   = require('../models/Review');
const Alert    = require('../models/Alert');

const MODELS = { reports: Report, stories: Story, reviews: Review, alerts: Alert };

/* ─── POST /api/admin/login ─── */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { role: 'admin', username },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token });
});

/* ─── GET /api/admin/dashboard ─── */
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const [reports, stories, reviews, alerts] = await Promise.all([
      Report.countDocuments(),
      Story.countDocuments(),
      Review.countDocuments(),
      Alert.countDocuments({ active: true })
    ]);
    const pending = await Promise.all([
      Report.countDocuments({ status: 'pending' }),
      Story.countDocuments({ status: 'pending' }),
      Review.countDocuments({ status: 'pending' })
    ]);
    res.json({
      totals: { reports, stories, reviews, activeAlerts: alerts },
      pending: { reports: pending[0], stories: pending[1], reviews: pending[2] }
    });
  } catch (err) {
    res.status(500).json({ error: 'Dashboard error' });
  }
});

/* ─── GET /api/admin/:model ─── */
router.get('/:model', adminAuth, async (req, res) => {
  const Model = MODELS[req.params.model];
  if (!Model) return res.status(404).json({ error: 'Unknown model' });
  try {
    const items = await Model.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Could not load data' });
  }
});

/* ─── PATCH /api/admin/:model/:id/status ─── */
router.patch('/:model/:id/status', adminAuth, async (req, res) => {
  const Model = MODELS[req.params.model];
  if (!Model) return res.status(404).json({ error: 'Unknown model' });
  const { status } = req.body;
  if (!['approved','rejected','pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const item = await Model.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ result: 'updated', item });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

/* ─── DELETE /api/admin/:model/:id ─── */
router.delete('/:model/:id', adminAuth, async (req, res) => {
  const Model = MODELS[req.params.model];
  if (!Model) return res.status(404).json({ error: 'Unknown model' });
  try {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ result: 'deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

/* ─── POST /api/admin/alerts (create new alert) ─── */
router.post('/alerts', adminAuth, async (req, res) => {
  const { text, type } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const alert = await Alert.create({ text, type: type || 'danger' });
    res.json({ result: 'created', alert });
  } catch (err) {
    res.status(500).json({ error: 'Could not create alert' });
  }
});

/* ─── PATCH /api/admin/alerts/:id (toggle active / edit text) ─── */
router.patch('/alerts/:id', adminAuth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id, req.body, { new: true }
    );
    res.json({ result: 'updated', alert });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
