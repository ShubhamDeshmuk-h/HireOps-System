const mongoose = require('mongoose');
const ActivityLog = require('./models/ActivityLog');
const { v4: uuidv4 } = require('uuid');

mongoose.connect('mongodb://localhost:27017/ats', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function insertDummyLogs() {
  const logs = [
    {
      logId: uuidv4(),
      timestamp: new Date(),
      userId: 'hr1',
      userRole: 'hr',
      actionType: 'CREATE_JOB',
      entity: 'Job',
      entityId: 'job123',
      description: 'HR created job: Software Developer',
      jobId: 'job123',
      extraMeta: { department: 'Engineering' }
    },
    {
      logId: uuidv4(),
      timestamp: new Date(),
      userId: 'int1',
      userRole: 'interviewer',
      actionType: 'UPDATE_CANDIDATE_STATUS',
      entity: 'Candidate',
      entityId: 'cand456',
      description: 'Interviewer updated candidate status to Shortlisted',
      candidateId: 'cand456',
      jobId: 'job123',
      extraMeta: { status: 'Shortlisted' }
    },
    {
      logId: uuidv4(),
      timestamp: new Date(),
      userId: 'hr1',
      userRole: 'hr',
      actionType: 'UPLOAD_RESUME',
      entity: 'Resume',
      entityId: 'res789',
      description: 'Resume uploaded for John Doe',
      jobId: 'job123',
      candidateId: 'cand456',
      extraMeta: { filename: 'JohnDoe.pdf' }
    }
  ];
  await ActivityLog.insertMany(logs);
  ('Dummy logs inserted!');
  mongoose.connection.close();
}

insertDummyLogs(); 