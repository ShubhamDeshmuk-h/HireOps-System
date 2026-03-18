const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const jobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    default: () => uuidv4(), // generate unique ID for each job
    unique: true,
    index: true,
  },
  title: String,
  department: String,
  location: String,
  type: String,
  description: String,
  requirements: String,
  skills: String,
  keywords: String,
  cutoff_score: {
    type: Number,
    default: 70,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Closed'],
    default: 'Draft',
  },
  createdBy: String,
  createdOn: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', jobSchema);
