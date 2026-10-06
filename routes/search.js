/**
 * SEARCH API
 * GET /api/search?q=whatsapp+scam&type=all
 * Searches across: stories, reports (approved), alerts
 */

const router    = require('express').Router();
const Story     = require('../models/Story');
const Alert     = require('../models/Alert');
const Analytics = require('../models/Analytics');

router.get('/', async (req, res) => {
  const q    = (req.query.q || '').trim();
  const type = req.query.type || 'all'; /* all | stories | alerts */

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const regex = new RegExp(q, 'i');

  try {
    const results = {};

    /* Search stories */
    if (type === 'all' || type === 'stories') {
      results.stories = await Story.find({
        status: 'approved',
        $or: [
          { story:     { $regex: regex } },
          { lesson:    { $regex: regex } },
          { scam_type: { $regex: regex } },
          { name:      { $regex: regex } },
          { location:  { $regex: regex } }
        ]
      }).select('name location scam_type story lesson date badge').limit(10);
    }

    /* Search alerts */
    if (type === 'all' || type === 'alerts') {
      results.alerts = await Alert.find({
        active: true,
        text: { $regex: regex }
      }).select('text type createdAt').limit(10);
    }

    /* Log analytics */
    Analytics.create({
      type: 'search',
      query: q,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    }).catch(() => {});

    const total = (results.stories?.length || 0) + (results.alerts?.length || 0);
    res.json({ query: q, total, results });

  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
