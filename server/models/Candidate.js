const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  candidate_id: { type: String, required: true, unique: true },
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  resume_id: { type: String, required: true }, // Changed from ObjectId to String to accept UUID
  created_at: { type: Date, default: Date.now },
  match_score: { type: Number, default: 0 },
  full_name: String,
  email: String,
  phone: String,
  linkedin: [String],
  github: [String],
  summary: String,
  skills: [String],
  education: [{ degree: String, institute: String, year: String }],
  experience: [{ role: String, company: String, period: String, description: String }],
  projects: [{ title: String, description: String }],
  status: { type: String, enum: ['New', 'Shortlisted', 'Interviewed', 'Rejected', 'Hired'], default: 'New' }
});

module.exports = mongoose.model('Candidate', candidateSchema); 