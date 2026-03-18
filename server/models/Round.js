const mongoose = require('mongoose');

const evaluationCriteriaSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Technical Skills", "Communication"
  weight: { type: Number, min: 0, max: 100, default: 25 }, // Weight in percentage
  maxScore: { type: Number, min: 1, max: 10, default: 5 }, // Maximum score
  description: { type: String }, // Description of what to evaluate
  required: { type: Boolean, default: false } // Whether this criteria is required
});

const roundSchema = new mongoose.Schema({
  job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  name: { type: String, required: true }, // e.g., Aptitude, Interview 1
  type: { type: String, enum: ['aptitude', 'interview', 'technical', 'presentation', 'group'], required: true },
  description: { type: String },
  date_time: { type: Date }, // Scheduled date and time
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // HR/Admin ID
  cutoff: { type: Number, default: 70 }, // Passing score for aptitude
  step: { type: Number, required: true }, // Round step/order (1, 2, 3, etc.)
  status: { type: String, enum: ['Active', 'Inactive', 'Completed'], default: 'Active' },
  
  // Evaluation schema for structured scoring
  evaluation_schema: {
    criteria: [evaluationCriteriaSchema],
    totalWeight: { type: Number, default: 100 },
    passingScore: { type: Number, min: 0, max: 100, default: 70 },
    instructions: { type: String }, // Instructions for evaluators
    rubric: { type: String } // Detailed rubric description
  },
  
  // Round-specific settings
  settings: {
    allowPartialScores: { type: Boolean, default: true },
    requireAllCriteria: { type: Boolean, default: false },
    autoCalculateTotal: { type: Boolean, default: true },
    allowComments: { type: Boolean, default: true },
    allowRecommendations: { type: Boolean, default: true }
  },
  
  created_at: { type: Date, default: Date.now }
});

// Add unique compound index to prevent duplicate steps per job
roundSchema.index({ job_id: 1, step: 1 }, { unique: true });

// Pre-save middleware to validate step ordering
roundSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('step') || this.isModified('job_id')) {
    // Check for existing rounds with the same step for this job
    const existingRound = await this.constructor.findOne({
      job_id: this.job_id,
      step: this.step,
      _id: { $ne: this._id } // Exclude current document if updating
    });
    
    if (existingRound) {
      return next(new Error(`Round with step ${this.step} already exists for this job`));
    }
  }
  
  // Validate evaluation schema if present and has criteria
  if (this.evaluation_schema && this.evaluation_schema.criteria && this.evaluation_schema.criteria.length > 0) {
    const totalWeight = this.evaluation_schema.criteria.reduce((sum, criteria) => sum + criteria.weight, 0);
    if (totalWeight !== 100) {
      return next(new Error(`Evaluation criteria weights must sum to 100, got ${totalWeight}`));
    }
  }
  
  next();
});

// Method to calculate total score from individual criteria scores
roundSchema.methods.calculateTotalScore = function(criteriaScores) {
  if (!this.evaluation_schema || !this.evaluation_schema.criteria) {
    return null;
  }
  
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const criteria of this.evaluation_schema.criteria) {
    const score = criteriaScores[criteria.name] || 0;
    totalScore += (score / criteria.maxScore) * criteria.weight;
    totalWeight += criteria.weight;
  }
  
  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
};

// Method to validate criteria scores
roundSchema.methods.validateCriteriaScores = function(criteriaScores) {
  if (!this.evaluation_schema || !this.evaluation_schema.criteria) {
    return { valid: true, errors: [] };
  }
  
  const errors = [];
  
  for (const criteria of this.evaluation_schema.criteria) {
    const score = criteriaScores[criteria.name];
    
    if (criteria.required && (score === undefined || score === null)) {
      errors.push(`${criteria.name} is required`);
    }
    
    if (score !== undefined && score !== null) {
      if (score < 0 || score > criteria.maxScore) {
        errors.push(`${criteria.name} score must be between 0 and ${criteria.maxScore}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = mongoose.model('Round', roundSchema); 