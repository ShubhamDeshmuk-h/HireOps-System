const mongoose = require('mongoose');

const interviewerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String },
  available_times: [{ type: String }], // e.g., ['Monday 10:00-12:00', 'Wednesday 14:00-16:00']
});

module.exports = mongoose.model('Interviewer', interviewerSchema); 