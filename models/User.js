const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true, minlength: 6 },
  state:     { type: String, default: '' },
  district:  { type: String, default: '' },
  shgName:   { type: String, default: '' },
  role:      { type: String, enum: ['user','admin'], default: 'user' },
  verified:  { type: Boolean, default: true }, /* simplified — no email verify for now */
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

/* Hash password before saving */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* Compare password */
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
