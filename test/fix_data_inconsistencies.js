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
    // Fix candidates without job_id
    console.log('\n=== Fixing Candidates without Job ID ===');
    const candidatesWithoutJob = await db.collection('candidates').find({ job_id: { $exists: false } }).toArray();
    console.log(`Found ${candidatesWithoutJob.length} candidates without job_id`);
    
    for (const candidate of candidatesWithoutJob) {
      // Try to find a job for this candidate by looking at their resume
      const resume = await db.collection('resumes').findOne({ resume_id: candidate.resume_id });
      if (resume && resume.job_id) {
        await db.collection('candidates').updateOne(
          { _id: candidate._id },
          { $set: { job_id: resume.job_id } }
        );
        console.log(`Fixed candidate ${candidate.candidate_id}: set job_id to ${resume.job_id}`);
      } else {
        // If no resume found, set a default job or mark for deletion
        console.log(`Could not find job for candidate ${candidate.candidate_id}, marking for review`);
      }
    }
    
    // Fix resumes without candidateId
    console.log('\n=== Fixing Resumes without Candidate ID ===');
    const resumesWithoutCandidate = await db.collection('resumes').find({ candidateId: { $exists: false } }).toArray();
    console.log(`Found ${resumesWithoutCandidate.length} resumes without candidateId`);
    
    for (const resume of resumesWithoutCandidate) {
      // Generate a new candidateId for this resume
      const newCandidateId = new mongoose.Types.ObjectId().toString();
      await db.collection('resumes').updateOne(
        { _id: resume._id },
        { $set: { candidateId: newCandidateId } }
      );
      console.log(`Fixed resume ${resume.resumeId}: set candidateId to ${newCandidateId}`);
    }
    
    // Check for any orphaned candidates (candidates without corresponding resumes)
    console.log('\n=== Checking for Orphaned Candidates ===');
    const allCandidates = await db.collection('candidates').find({}).toArray();
    let orphanedCount = 0;
    
    for (const candidate of allCandidates) {
      const resume = await db.collection('resumes').findOne({ resume_id: candidate.resume_id });
      if (!resume) {
        console.log(`Orphaned candidate: ${candidate.candidate_id} (resume_id: ${candidate.resume_id} not found)`);
        orphanedCount++;
      }
    }
    
    console.log(`Found ${orphanedCount} orphaned candidates`);
    
    // Summary
    console.log('\n=== Summary ===');
    const finalCandidates = await db.collection('candidates').find({}).toArray();
    const finalResumes = await db.collection('resumes').find({}).toArray();
    
    console.log(`Total candidates: ${finalCandidates.length}`);
    console.log(`Total resumes: ${finalResumes.length}`);
    
    // Show recent candidates with proper data
    console.log('\n=== Recent Candidates (Fixed) ===');
    const recentCandidates = await db.collection('candidates').find({}).sort({ created_at: -1 }).limit(5).toArray();
    recentCandidates.forEach((candidate, i) => {
      console.log(`${i + 1}. ID: ${candidate.candidate_id}, Name: ${candidate.full_name}, Email: ${candidate.email}, Job: ${candidate.job_id || 'MISSING'}, Resume: ${candidate.resume_id}`);
    });
    
  } catch (error) {
    console.error('Fix failed:', error);
  } finally {
    mongoose.connection.close();
  }
}); 