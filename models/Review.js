const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  name:     { type: String, default: 'Anonymous' },
  location: { type: String, default: '' },
  rating:   { type: Number, required: true, min: 1, max: 5 },
  section:  { type: String, default: '' },
  comment:  { type: String, required: true },
  status:   { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  createdAt:{ type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
