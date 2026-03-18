const ActivityLog = require('../models/ActivityLog');
const { v4: uuidv4 } = require('uuid');

async function logActivity({
  userId,
  userRole,
  actionType,
  description,
  entity,
  entityId,
  jobId,
  candidateId,
  roundId,
  extraMeta
}) {
  try {
    await ActivityLog.create({
      logId: uuidv4(),
      timestamp: new Date(),
      userId,
      userRole,
      actionType,
      description,
      entity,
      entityId,
      jobId,
      candidateId,
      roundId,
      extraMeta
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to log activity:', err);
  }
}

module.exports = logActivity; 