const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  type:      { type: String, required: true },
  /* page_view, search, report_submit, story_submit, review_submit */
  page:      { type: String, default: '' },
  query:     { type: String, default: '' },
  state:     { type: String, default: '' },
  scamType:  { type: String, default: '' },
  userAgent: { type: String, default: '' },
  ip:        { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

/* Auto-delete analytics older than 90 days */
analyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Analytics', analyticsSchema);
