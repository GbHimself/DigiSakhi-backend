const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  name:      { type: String, default: 'Anonymous' },
  location:  { type: String, default: '' },
  scam_type: { type: String, required: true },
  date:      { type: String, default: '' },
  story:     { type: String, required: true },
  lesson:    { type: String, default: '' },
  platform:  { type: String, default: 'Other' },
  platformIcon: { type: String, default: 'fas fa-exclamation-circle' },
  platformColor:{ type: String, default: '#7c3aed' },
  badge:     { type: String, default: '' },
  outcome:   { type: String, default: '' },
  status:    { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Story', storySchema);
