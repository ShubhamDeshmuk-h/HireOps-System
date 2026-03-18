const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ats_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Check recent resumes
    console.log('\n=== Recent Resumes ===');
    const recentResumes = await db.collection('resumes').find({}).sort({ created_at: -1 }).limit(5).toArray();
    console.log(`Found ${recentResumes.length} recent resumes`);
    
    recentResumes.forEach((resume, i) => {
      console.log(`${i + 1}. Resume ID: ${resume.resumeId}, Candidate ID: ${resume.candidateId}, Job: ${resume.job_id}, Status: ${resume.processing_status}, Score: ${resume.match_score}`);
    });
    
    // Check recent candidates
    console.log('\n=== Recent Candidates ===');
    const recentCandidates = await db.collection('candidates').find({}).sort({ created_at: -1 }).limit(5).toArray();
    console.log(`Found ${recentCandidates.length} recent candidates`);
    
    recentCandidates.forEach((candidate, i) => {
      console.log(`${i + 1}. Candidate ID: ${candidate.candidate_id}, Name: ${candidate.full_name}, Email: ${candidate.email}, Job: ${candidate.job_id}, Resume: ${candidate.resume_id}`);
    });
    
    // Check for any candidates without proper job_id
    console.log('\n=== Candidates with Missing Job ID ===');
    const candidatesWithoutJob = await db.collection('candidates').find({ job_id: { $exists: false } }).toArray();
    console.log(`Found ${candidatesWithoutJob.length} candidates without job_id`);
    
    candidatesWithoutJob.forEach((candidate, i) => {
      console.log(`${i + 1}. Candidate ID: ${candidate.candidate_id}, Name: ${candidate.full_name}, Email: ${candidate.email}`);
    });
    
    // Check for any resumes without proper candidateId
    console.log('\n=== Resumes with Missing Candidate ID ===');
    const resumesWithoutCandidate = await db.collection('resumes').find({ candidateId: { $exists: false } }).toArray();
    console.log(`Found ${resumesWithoutCandidate.length} resumes without candidateId`);
    
    resumesWithoutCandidate.forEach((resume, i) => {
      console.log(`${i + 1}. Resume ID: ${resume.resumeId}, Job: ${resume.job_id}, Status: ${resume.processing_status}`);
    });
    
    // Check for any processing errors
    console.log('\n=== Resumes with Processing Errors ===');
    const errorResumes = await db.collection('resumes').find({ processing_status: 'failed' }).toArray();
    console.log(`Found ${errorResumes.length} resumes with processing errors`);
    
    errorResumes.forEach((resume, i) => {
      console.log(`${i + 1}. Resume ID: ${resume.resumeId}, Job: ${resume.job_id}, Error: ${resume.error_message || 'Unknown error'}`);
    });
    
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    mongoose.connection.close();
  }
}); 