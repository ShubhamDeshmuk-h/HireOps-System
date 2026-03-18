const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'hr' }, // hr, admin, etc.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
