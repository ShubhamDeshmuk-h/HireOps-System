const mongoose = require('mongoose');
const Resume = require('./models/Resume');
const Candidate = require('./models/Candidate');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/ats', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugResumeIds() {
  try {
    console.log('=== RESUME COLLECTION ===');
    const resumes = await Resume.find({}).limit(5);
    console.log('Sample resumes:');
    resumes.forEach((resume, index) => {
      console.log(`${index + 1}. Resume ID: ${resume.resumeId}`);
      console.log(`   _id: ${resume._id}`);
      console.log(`   resumePath: ${resume.resumePath}`);
      console.log(`   originalFileName: ${resume.originalFileName}`);
      console.log(`   job_id: ${resume.job_id}`);
      console.log('---');
    });

    console.log('\n=== CANDIDATE COLLECTION ===');
    const candidates = await Candidate.find({}).limit(5);
    console.log('Sample candidates:');
    candidates.forEach((candidate, index) => {
      console.log(`${index + 1}. Candidate ID: ${candidate.candidate_id}`);
      console.log(`   _id: ${candidate._id}`);
      console.log(`   resume_id: ${candidate.resume_id}`);
      console.log(`   full_name: ${candidate.full_name}`);
      console.log(`   job_id: ${candidate.job_id}`);
      console.log('---');
    });

    // Check if there are any candidates with resume_id
    const candidatesWithResume = await Candidate.find({ resume_id: { $exists: true, $ne: null } });
    console.log(`\nCandidates with resume_id: ${candidatesWithResume.length}`);
    
    if (candidatesWithResume.length > 0) {
      console.log('First candidate with resume_id:');
      const firstCandidate = candidatesWithResume[0];
      console.log(`   candidate_id: ${firstCandidate.candidate_id}`);
      console.log(`   resume_id: ${firstCandidate.resume_id}`);
      
      // Try to find the corresponding resume
      const correspondingResume = await Resume.findOne({ resumeId: firstCandidate.resume_id });
      if (correspondingResume) {
        console.log('   Corresponding resume found:');
        console.log(`     resumeId: ${correspondingResume.resumeId}`);
        console.log(`     resumePath: ${correspondingResume.resumePath}`);
      } else {
        console.log('   No corresponding resume found');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugResumeIds(); 