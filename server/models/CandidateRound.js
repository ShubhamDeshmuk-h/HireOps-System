const mongoose = require('mongoose');

const candidateRoundSchema = new mongoose.Schema({
  candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  round_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Round', required: true },
  
  // Primary status field - use this as the canonical status
  status: { 
    type: String, 
    enum: ['Invited', 'Pending', 'Attended', 'Passed', 'Failed', 'Skipped'], 
    default: 'Pending' 
  },
  
  // Legacy status field for backward compatibility
  round_status: { 
    type: String, 
    enum: ['Invited', 'Pending', 'Passed', 'Shortlisted', 'Attended', 'Rejected'], 
    default: 'Pending' 
  },
  
  // Results - support both numeric scores and text feedback
  result: { type: mongoose.Schema.Types.Mixed }, // Can be number (score) or string (feedback)
  score: { type: Number }, // Numeric score for aptitude tests
  feedback: { type: String }, // Text feedback for interviews
  
  // Test-related fields
  test_link: { type: String }, // for aptitude
  sent_at: { type: Date }, // when test link was sent
  
  // Interview-related fields
  interviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For interview rounds
  interview_scheduled_at: { type: Date },
  google_meet_link: { type: String },
  google_event_id: { type: String },
  
  // Structured feedback for interviews
  interviewer_feedback: {
    rating: { type: Number, min: 1, max: 5 },
    technical_skills: { type: String },
    communication: { type: String },
    overall_comments: { type: String },
    recommendation: { type: String, enum: ['Strong Hire', 'Hire', 'Weak Hire', 'No Hire', 'Strong No Hire'] },
    submitted_at: { type: Date }
  },
  
  // HR notes
  hr_notes: { type: String },
  
  // Timestamps
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Ensure unique candidate-round combinations
candidateRoundSchema.index({ candidate_id: 1, round_id: 1 }, { unique: true });

// Pre-save middleware to sync status fields
candidateRoundSchema.pre('save', function(next) {
  // Sync round_status with status for backward compatibility
  if (this.isModified('status')) {
    this.round_status = this.status;
  } else if (this.isModified('round_status')) {
    this.status = this.round_status;
  }
  
  // Update timestamp
  this.updated_at = new Date();
  next();
});

// Virtual for determining if candidate passed
candidateRoundSchema.virtual('passed').get(function() {
  return this.status === 'Passed' || this.round_status === 'Passed';
});

// Virtual for determining if candidate failed
candidateRoundSchema.virtual('failed').get(function() {
  return this.status === 'Failed' || this.round_status === 'Failed';
});

// Method to check if candidate meets cutoff
candidateRoundSchema.methods.meetsCutoff = function(cutoff) {
  if (this.score && typeof this.score === 'number') {
    return this.score >= cutoff;
  }
  return this.status === 'Passed' || this.round_status === 'Passed';
};

module.exports = mongoose.model('CandidateRound', candidateRoundSchema); 