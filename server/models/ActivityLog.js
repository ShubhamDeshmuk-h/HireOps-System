const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true },
  timestamp: { type: Date, required: true, default: Date.now },
  userId: { type: String, required: true },
  userRole: { type: String, required: true },
  actionType: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  description: { type: String, required: true },
  jobId: { type: String },
  candidateId: { type: String },
  roundId: { type: String },
  extraMeta: { type: Object },
}, { collection: 'activitylogs' });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema); 