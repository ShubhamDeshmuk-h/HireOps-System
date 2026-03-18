const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  candidateId: { type: String, required: true }, // Unique ID for candidate
  resumeId: { type: String, required: true, unique: true }, // Unique ID for resume
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true }, // Job ID this resume is for
  uploadDate: { type: Date, default: Date.now }, // Timestamp when file was uploaded
  uploadedBy: { type: String, required: true }, // Who uploaded the file (email or admin ID)
  originalFileName: { type: String, required: true }, // Original name of uploaded file
  resumePath: { type: String }, // Stored file path (GridFS or local path)
  file_path: { type: String }, // Legacy field for backward compatibility
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Legacy field for backward compatibility
  uploaded_on: { type: Date, default: Date.now }, // Legacy field for backward compatibility
  extracted_data: { type: mongoose.Schema.Types.Mixed }, // Parsed data from AI
  processing_status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  match_score: { type: Number, default: 0 },
  parsing_method: { type: String, default: 'unknown' },
  // Legacy fields for backward compatibility
  resume_id: { type: String, sparse: true }, // Legacy field, not required, sparse index
  uploaded_on: { type: Date, default: Date.now } // Legacy field
});

// Add pre-save middleware to ensure resumeId is never null
resumeSchema.pre('save', function(next) {
  if (!this.resumeId) {
    this.resumeId = new mongoose.Types.ObjectId().toString();
  }
  next();
});

module.exports = mongoose.model('Resume', resumeSchema); 