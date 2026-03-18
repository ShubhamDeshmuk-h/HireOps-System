# Resume Upload Flow Documentation

## 🎯 Overview

The resume upload system now implements a comprehensive flow that creates both resume and candidate records with proper unique identifiers and metadata tracking.

## 📋 Complete Upload Flow

### 1. User Uploads Resume
```
Frontend → Node.js Backend (Port 5000)
POST /api/resume/upload/single
Content-Type: multipart/form-data

Form Data:
- resume: PDF file
- jobId: string (required)
- uploadedBy: string (email or admin ID)
```

### 2. Backend Receives File
The Node.js backend receives the file and extracts:
- **File buffer**: Raw PDF data
- **Original filename**: e.g., "Shubham_Deshmukh_Resume.pdf"
- **Job ID**: Which job this resume is for
- **Uploaded By**: Who uploaded the file

### 3. Generate Unique Identifiers
```javascript
const candidateId = uuidv4(); // e.g., "cd1e98af-1d2b-4c6d-a7f2-0ae123456789"
const resumeId = uuidv4();    // e.g., "res2f45b-3e4c-5d7e-b8f3-1bf234567890"
```

### 4. Store File Metadata
```javascript
// Create initial resume document
const resumeDoc = await Resume.create({
  candidateId: candidateId,
  resumeId: resumeId,
  job_id: req.body.jobId,
  uploadedBy: uploadedBy,
  originalFileName: filename,
  resumePath: filename, // Will be updated with GridFS path
  processing_status: 'pending'
});
```

### 5. Process Resume with AI
```javascript
// Send to Python backend for AI processing
const processingResponse = await axios.post('http://localhost:8000/api/upload-resume', formData);
const processedData = processingResponse.data;
```

### 6. Store File in GridFS
```javascript
// Save file to MongoDB GridFS
const gridFSId = await saveToGridFS(req.file.buffer, filename, req.body.jobId);

// Update resume document with GridFS path
await Resume.findByIdAndUpdate(resumeDoc._id, {
  resumePath: `gridfs://${gridFSId}`,
  processing_status: 'completed',
  match_score: processedData.match_score,
  parsing_method: 'llama3',
  extracted_data: processedData.parsed_data
});
```

### 7. Create/Update Candidate Record
```javascript
// Create or update candidate in database
const candidateRecord = await createOrUpdateCandidate(
  { ...processedData, candidateId: candidateId }, 
  req.body.jobId, 
  resumeId, 
  uploadedBy
);
```

## 📊 Database Schema

### Resume Collection Schema
```javascript
{
  candidateId: String,        // Unique ID for candidate
  resumeId: String,          // Unique ID for resume
  job_id: String,            // Job ID this resume is for
  uploadDate: Date,          // Timestamp when file was uploaded
  uploadedBy: String,        // Who uploaded the file (email or admin ID)
  originalFileName: String,  // Original name of uploaded file
  resumePath: String,        // Stored file path (GridFS or local path)
  processing_status: String, // 'pending', 'processing', 'completed', 'failed'
  match_score: Number,       // AI-generated match score
  parsing_method: String,    // 'llama3', 'fallback', 'error'
  extracted_data: Object,    // Parsed data from AI
  // Legacy fields for backward compatibility
  file_path: String,
  uploaded_by: ObjectId,
  uploaded_on: Date
}
```

### Candidate Collection Schema
```javascript
{
  candidate_id: String,      // Unique candidate identifier
  job_id: String,           // Job this candidate applied for
  resume_id: String,        // Resume ID for this candidate
  created_at: Date,         // When candidate record was created
  match_score: Number,      // AI-generated match score
  full_name: String,        // Candidate's full name
  email: String,           // Candidate's email
  phone: String,           // Candidate's phone
  linkedin: [String],      // LinkedIn profiles
  github: [String],        // GitHub profiles
  summary: String,         // Professional summary
  skills: [String],        // Technical skills
  education: [Object],     // Education history
  experience: [Object],    // Work experience
  projects: [Object],      // Projects
  status: String          // 'New', 'Shortlisted', 'Interviewed', 'Rejected', 'Hired'
}
```

## 🔄 Processing States

### Success Flow
1. **pending** → File uploaded, waiting for processing
2. **processing** → AI processing in progress
3. **completed** → Processing successful, data extracted

### Error Handling
1. **pending** → File uploaded
2. **failed** → Processing failed, fallback data used

### Fallback Processing
When AI backend is unavailable:
- Uses basic scoring (60-100 random)
- Creates candidate record with placeholder data
- Sets `parsing_method: 'fallback'`

## 📤 Response Format

### Successful Upload Response
```json
{
  "message": "Resume uploaded and processed successfully",
  "candidateId": "cd1e98af-1d2b-4c6d-a7f2-0ae123456789",
  "resumeId": "res2f45b-3e4c-5d7e-b8f3-1bf234567890",
  "filename": "Shubham_Deshmukh_Resume.pdf",
  "jobId": "job_123",
  "uploadedBy": "hr@company.com",
  "uploadDate": "2025-01-18T15:25:00.000Z",
  "score": 85,
  "result": "Shortlisted",
  "candidateRecord": "cd1e98af-1d2b-4c6d-a7f2-0ae123456789",
  "candidateData": {
    "name": "Shubham Deshmukh",
    "email": "shubham@example.com",
    "phone": "+91-9876543210",
    "summary": "Full Stack Developer with 3+ years experience...",
    "skills": ["React", "Node.js", "MongoDB", "JavaScript"],
    "experience": [...],
    "education": [...],
    "projects": [...],
    "parsing_method": "llama3"
  }
}
```

### Fallback Response
```json
{
  "message": "Resume uploaded with basic processing (AI backend unavailable)",
  "candidateId": "cd1e98af-1d2b-4c6d-a7f2-0ae123456789",
  "resumeId": "res2f45b-3e4c-5d7e-b8f3-1bf234567890",
  "score": 75,
  "result": "Shortlisted",
  "candidateData": {
    "name": "Processing Required",
    "email": "Processing Required",
    "phone": "Processing Required",
    "skills": ["Processing Required"],
    "experience": ["Processing Required"],
    "education": ["Processing Required"]
  },
  "note": "AI processing unavailable - please start Python backend for full analysis"
}
```

## 🧪 Testing

### Run Upload Flow Test
```bash
python test/test_upload_flow.py
```

This test validates:
- ✅ File upload to Node.js backend
- ✅ Unique ID generation
- ✅ AI processing via Python backend
- ✅ Candidate record creation
- ✅ Database schema compliance
- ✅ Response format validation

### Manual Testing
```bash
# Start services
./start_backends.ps1

# Test upload via curl
curl -X POST http://localhost:5000/api/resume/upload/single \
  -F "resume=@backend/uploads/sample_resume.pdf" \
  -F "jobId=test_job_123" \
  -F "uploadedBy=test@example.com"
```

## 🔧 Configuration

### Required Environment Variables
```bash
# Backend (.env)
HUGGINGFACE_API_TOKEN=your_token
MONGODB_URI=mongodb://localhost:27017/ats_db

# Server (.env)
MONGO_URI=mongodb://localhost:27017/ats_db
JWT_SECRET=your_secret
```

### File Storage
- **Development**: GridFS in MongoDB
- **Production**: Can be configured for cloud storage (AWS S3, etc.)

## 🚨 Error Handling

### Common Issues
1. **Python backend not running**: Falls back to basic processing
2. **AI processing fails**: Creates candidate with error status
3. **File upload fails**: Returns 400 error with details
4. **Database connection fails**: Returns 500 error

### Logging
All operations are logged with detailed information:
- File upload details
- Processing status
- Candidate creation/update
- Error messages with context

## 🔄 Backward Compatibility

The system maintains backward compatibility:
- Legacy fields preserved in schema
- Existing API endpoints unchanged
- Gradual migration path available

## 📈 Performance

### Optimizations
- Asynchronous file processing
- GridFS for efficient file storage
- Caching of parsed data
- Batch processing support

### Monitoring
- Processing time tracking
- Success/failure rates
- Storage usage metrics
- API response times

---

**Status**: ✅ Complete implementation with comprehensive error handling and testing 