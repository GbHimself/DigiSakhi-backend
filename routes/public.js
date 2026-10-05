/**
 * PUBLIC ROUTES — no auth needed
 * GET  /api/stories  — approved stories for Real Incidents page
 * GET  /api/reviews  — approved reviews for Real Incidents page
 * GET  /api/alerts   — active scam alerts for ticker
 * POST /api/reports  — submit a scam report
 * POST /api/stories  — submit a story
 * POST /api/reviews  — submit a review
 */

const router  = require('express').Router();
const rateLimit = require('express-rate-limit');
const Story   = require('../models/Story');
const Review  = require('../models/Review');
const Report  = require('../models/Report');
const Alert   = require('../models/Alert');

/* Rate limiter — max 5 submissions per IP per 15 minutes */
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please wait 15 minutes and try again.' }
});

/* ─── GET /api/stories ─── */
router.get('/stories', async (req, res) => {
  try {
    const stories = await Story.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .select('-__v -ip');
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: 'Could not load stories' });
  }
});

/* ─── GET /api/reviews ─── */
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .select('-__v');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: 'Could not load reviews' });
  }
});

/* ─── GET /api/alerts ─── */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Alert.find({ active: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-__v');
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Could not load alerts' });
  }
});

/* ─── POST /api/reports ─── */
router.post('/reports', submitLimiter, async (req, res) => {
  try {
    const { scam_type, location, description, date, name, source } = req.body;
    if (!scam_type || !description) {
      return res.status(400).json({ error: 'scam_type and description are required' });
    }
    const report = await Report.create({
      scam_type, location, description, date, name, source,
      ip: req.ip
    });
    res.json({ result: 'success', id: report._id });
  } catch (err) {
    res.status(500).json({ error: 'Could not save report' });
  }
});

/* ─── POST /api/stories ─── */
router.post('/stories', submitLimiter, async (req, res) => {
  try {
    const { name, location, scam_type, date, story, lesson } = req.body;
    if (!scam_type || !story) {
      return res.status(400).json({ error: 'scam_type and story are required' });
    }
    await Story.create({ name, location, scam_type, date, story, lesson });
    res.json({ result: 'success' });
  } catch (err) {
    res.status(500).json({ error: 'Could not save story' });
  }
});

/* ─── POST /api/reviews ─── */
router.post('/reviews', submitLimiter, async (req, res) => {
  try {
    const { name, location, rating, section, comment } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({ error: 'rating and comment are required' });
    }
    await Review.create({ name, location, rating: Number(rating), section, comment });
    res.json({ result: 'success' });
  } catch (err) {
    res.status(500).json({ error: 'Could not save review' });
  }
});

module.exports = router;
