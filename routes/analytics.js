/**
 * ANALYTICS ROUTES
 * POST /api/analytics/track  — track a page view or event (public)
 * GET  /api/admin/analytics  — get analytics data (admin only)
 */

const router    = require('express').Router();
const Analytics = require('../models/Analytics');
const Report    = require('../models/Report');
const Story     = require('../models/Story');
const Review    = require('../models/Review');
const adminAuth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

/* Rate limit tracking — max 60 events per IP per minute */
const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests' }
});

/* ── POST /api/analytics/track ── */
router.post('/track', trackLimiter, async (req, res) => {
  try {
    const { type, page, query, state, scamType } = req.body;
    if (!type) return res.status(400).json({ error: 'type is required' });

    await Analytics.create({
      type,
      page:      page     || '',
      query:     query    || '',
      state:     state    || '',
      scamType:  scamType || '',
      ip:        req.ip,
      userAgent: req.headers['user-agent'] || ''
    });

    res.json({ result: 'tracked' });
  } catch {
    res.json({ result: 'ok' }); /* silent fail — analytics should never block UX */
  }
});

/* ── GET /api/analytics (admin) ── */
router.get('/', adminAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    /* Page views per page */
    const pageViews = await Analytics.aggregate([
      { $match: { type: 'page_view', createdAt: { $gte: since } } },
      { $group: { _id: '$page', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    /* Views over time (daily) */
    const viewsOverTime = await Analytics.aggregate([
      { $match: { type: 'page_view', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    /* Scam types from reports */
    const scamTypes = await Report.aggregate([
      { $group: { _id: '$scam_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    /* Reports by state */
    const stateData = await Report.aggregate([
      { $match: { location: { $ne: '' } } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    /* Search queries */
    const topSearches = await Analytics.aggregate([
      { $match: { type: 'search', query: { $ne: '' }, createdAt: { $gte: since } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    /* Submission totals */
    const [totalReports, totalStories, totalReviews, pendingReports, pendingStories, pendingReviews] =
      await Promise.all([
        Report.countDocuments(),
        Story.countDocuments(),
        Review.countDocuments(),
        Report.countDocuments({ status: 'pending' }),
        Story.countDocuments({ status: 'pending' }),
        Review.countDocuments({ status: 'pending' })
      ]);

    /* Total page views */
    const totalViews = await Analytics.countDocuments({
      type: 'page_view',
      createdAt: { $gte: since }
    });

    res.json({
      period: `${days} days`,
      overview: {
        totalViews,
        totalReports,
        totalStories,
        totalReviews,
        pendingReports,
        pendingStories,
        pendingReviews
      },
      pageViews,
      viewsOverTime,
      scamTypes,
      stateData,
      topSearches
    });

  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'Could not load analytics' });
  }
});

module.exports = router;
