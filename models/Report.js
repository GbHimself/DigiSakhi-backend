const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  scam_type:   { type: String, required: true },
  location:    { type: String, default: '' },
  description: { type: String, required: true },
  date:        { type: String, default: '' },
  name:        { type: String, default: 'Anonymous' },
  source:      { type: String, default: '' },
  status:      { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  ip:          { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
