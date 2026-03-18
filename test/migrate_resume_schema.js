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
    // Get the resumes collection
    const resumesCollection = db.collection('resumes');
    
    // Find documents with null resume_id
    const nullResumeIdDocs = await resumesCollection.find({ resume_id: null }).toArray();
    console.log(`Found ${nullResumeIdDocs.length} documents with null resume_id`);
    
    // Update documents with null resume_id
    for (const doc of nullResumeIdDocs) {
      const newResumeId = new mongoose.Types.ObjectId().toString();
      
      await resumesCollection.updateOne(
        { _id: doc._id },
        { 
          $set: { 
            resume_id: newResumeId,
            resumeId: newResumeId // Add the new field
          }
        }
      );
      
      console.log(`Updated document ${doc._id} with new resumeId: ${newResumeId}`);
    }
    
    // Find documents without resumeId field
    const docsWithoutResumeId = await resumesCollection.find({ resumeId: { $exists: false } }).toArray();
    console.log(`Found ${docsWithoutResumeId.length} documents without resumeId field`);
    
    // Add resumeId field to documents that don't have it
    for (const doc of docsWithoutResumeId) {
      const newResumeId = doc.resume_id || new mongoose.Types.ObjectId().toString();
      
      await resumesCollection.updateOne(
        { _id: doc._id },
        { 
          $set: { 
            resumeId: newResumeId,
            candidateId: doc.candidate_id || new mongoose.Types.ObjectId().toString(),
            uploadDate: doc.uploaded_on || new Date(),
            uploadedBy: doc.uploaded_by || 'unknown',
            originalFileName: doc.file_name || 'unknown.pdf',
            processing_status: 'completed',
            match_score: doc.match_score || 0,
            parsing_method: 'migrated'
          }
        }
      );
      
      console.log(`Added resumeId to document ${doc._id}: ${newResumeId}`);
    }
    
    // Drop the old unique index on resume_id if it exists
    try {
      await resumesCollection.dropIndex('resume_id_1');
      console.log('Dropped old resume_id unique index');
    } catch (error) {
      console.log('No old resume_id index to drop or already dropped');
    }
    
    // Create new unique index on resumeId
    try {
      await resumesCollection.createIndex({ resumeId: 1 }, { unique: true });
      console.log('Created new unique index on resumeId');
    } catch (error) {
      console.log('Index on resumeId already exists or error creating:', error.message);
    }
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}); 