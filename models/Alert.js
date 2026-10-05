const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  type:      { type: String, enum: ['danger','warning','info'], default: 'danger' },
  active:    { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', alertSchema);
