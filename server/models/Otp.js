const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // auto-delete after 5 mins
  },
});

module.exports = mongoose.model('Otp', otpSchema);
