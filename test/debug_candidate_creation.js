const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
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
    // Test candidate creation function
    const createOrUpdateCandidate = async (resumeData, jobId, resumeId, uploadedBy) => {
      try {
        console.log('[Candidate] Creating/updating candidate record...');
        console.log('Input data:', { resumeData, jobId, resumeId, uploadedBy });
        
        // Extract candidate data from parsed resume
        const candidateData = {
          candidate_id: resumeData.candidateId || uuidv4(), // Use provided candidateId or generate new
          job_id: jobId,
          resume_id: resumeId,
          created_at: new Date(),
          match_score: resumeData.match_score || 0,
          full_name: resumeData.parsed_data?.full_name || resumeData.parsed_data?.name || 'Unknown',
          email: resumeData.parsed_data?.email || 'Not found',
          phone: resumeData.parsed_data?.phone || 'Not found',
          linkedin: resumeData.parsed_data?.linkedin || [],
          github: resumeData.parsed_data?.github || [],
          summary: resumeData.parsed_data?.summary || '',
          skills: resumeData.parsed_data?.skills || [],
          education: resumeData.parsed_data?.education || [],
          experience: resumeData.parsed_data?.experience || [],
          projects: resumeData.parsed_data?.projects || [],
          status: 'New'
        };
        
        console.log('Candidate data to save:', candidateData);
        
        // Check if candidate already exists (by email and job)
        const candidatesCollection = db.collection('candidates');
        let existingCandidate = await candidatesCollection.findOne({
          email: candidateData.email,
          job_id: jobId
        });
        
        if (existingCandidate) {
          console.log('[Candidate] Updating existing candidate:', existingCandidate.candidate_id);
          
          // Update existing candidate with new data
          const updatedCandidate = await candidatesCollection.findOneAndUpdate(
            { _id: existingCandidate._id },
            {
              $set: {
                resume_id: resumeId,
                match_score: candidateData.match_score,
                full_name: candidateData.full_name,
                phone: candidateData.phone,
                summary: candidateData.summary,
                skills: candidateData.skills,
                education: candidateData.education,
                experience: candidateData.experience,
                projects: candidateData.projects,
                updated_at: new Date()
              }
            },
            { returnDocument: 'after' }
          );
          
          return updatedCandidate.value;
        } else {
          console.log('[Candidate] Creating new candidate:', candidateData.candidate_id);
          
          // Create new candidate
          const result = await candidatesCollection.insertOne(candidateData);
          console.log('Insert result:', result);
          
          return { ...candidateData, _id: result.insertedId };
        }
        
      } catch (error) {
        console.error('[Candidate] Error creating/updating candidate:', error);
        throw error;
      }
    };
    
    // Test with sample data
    const testResumeData = {
      candidateId: uuidv4(),
      match_score: 85,
      parsed_data: {
        name: 'Test Candidate',
        email: 'test@example.com',
        phone: '+1234567890',
        summary: 'Test summary',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: ['Software Developer at Test Corp'],
        education: ['BS Computer Science'],
        projects: ['Test Project']
      }
    };
    
    console.log('\n=== Testing Candidate Creation ===');
    const result = await createOrUpdateCandidate(
      testResumeData,
      'test_job_123',
      'test_resume_456',
      'test@example.com'
    );
    
    console.log('\n=== Result ===');
    console.log('Candidate created/updated:', result);
    
    // Check all candidates
    const allCandidates = await db.collection('candidates').find({}).toArray();
    console.log('\n=== All Candidates in Database ===');
    console.log(`Total candidates: ${allCandidates.length}`);
    allCandidates.forEach((c, i) => {
      console.log(`${i + 1}. ID: ${c.candidate_id}, Name: ${c.full_name}, Email: ${c.email}, Job: ${c.job_id}`);
    });
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    mongoose.connection.close();
  }
}); 