const Resume = require('../models/Resume');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const axios = require('axios');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const logActivity = require('../utils/logActivity');
const Job = require('../models/Job');

// GridFS setup
const { GridFSBucket } = require('mongodb');
let bucket;

mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'resumes'
  });
});

// Function to save file to GridFS
const saveToGridFS = async (buffer, filename, jobId) => {
  const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'resumes'
  });
  
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { jobId }
  });
  
  return new Promise((resolve, reject) => {
    uploadStream.end(buffer, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve(uploadStream.id);
      }
    });
  });
};

// Function to create or update candidate record
const createOrUpdateCandidate = async (resumeData, jobId, resumeId, uploadedBy) => {
  try {
    // Fetch job to get cutoff_score
    let job = await Job.findOne({ jobId: jobId }) || await Job.findById(jobId);
    const cutoff = job?.cutoff_score ?? 70;
    const matchScore = resumeData.match_score || 0;
    // Only allow 'Shortlisted' or 'Rejected'
    let status = matchScore >= cutoff ? 'Shortlisted' : 'Rejected';

    console.log('[Candidate] Creating/updating candidate record...');
    console.log('[Candidate] Input resumeData:', JSON.stringify(resumeData, null, 2));
    
    // Transform education from string array to object array
    const transformEducation = (educationData) => {
      if (!educationData || !Array.isArray(educationData)) return [];
      
      return educationData.map(edu => {
        if (typeof edu === 'string') {
          // Try to parse education string into structured format
          return {
            degree: edu,
            institute: '',
            year: ''
          };
        } else if (typeof edu === 'object') {
          return {
            degree: edu.degree || edu.degree_name || '',
            institute: edu.institute || edu.institution || edu.school || '',
            year: edu.year || edu.graduation_year || ''
          };
        }
        return { degree: '', institute: '', year: '' };
      });
    };
    
    // Transform experience from string array to object array
    const transformExperience = (experienceData) => {
      if (!experienceData || !Array.isArray(experienceData)) return [];
      
      return experienceData.map(exp => {
        if (typeof exp === 'string') {
          // Try to parse experience string into structured format
          return {
            role: exp,
            company: '',
            period: '',
            description: exp
          };
        } else if (typeof exp === 'object') {
          return {
            role: exp.role || exp.title || exp.position || '',
            company: exp.company || exp.organization || '',
            period: exp.period || exp.duration || exp.time_period || '',
            description: exp.description || exp.summary || ''
          };
        }
        return { role: '', company: '', period: '', description: '' };
      });
    };
    
    // Transform projects from string array to object array
    const transformProjects = (projectsData) => {
      if (!projectsData || !Array.isArray(projectsData)) return [];
      
      return projectsData.map(project => {
        if (typeof project === 'string') {
          return {
            title: project,
            description: project
          };
        } else if (typeof project === 'object') {
          return {
            title: project.title || project.name || '',
            description: project.description || project.summary || ''
          };
        }
        return { title: '', description: '' };
      });
    };
    
    // Extract candidate data from parsed resume
    const candidateData = {
      candidate_id: resumeData.candidateId || uuidv4(), // Use provided candidateId or generate new
      job_id: jobId,
      resume_id: resumeId, // Keep as string for now, we'll handle this differently
      created_at: new Date(),
      match_score: matchScore,
      full_name: resumeData.parsed_data?.full_name || resumeData.parsed_data?.name || 'Unknown',
      email: resumeData.parsed_data?.email || 'Not found',
      phone: resumeData.parsed_data?.phone || 'Not found',
      linkedin: resumeData.parsed_data?.linkedin || [],
      github: resumeData.parsed_data?.github || [],
      summary: resumeData.parsed_data?.summary || '',
      skills: resumeData.parsed_data?.skills || [],
      education: transformEducation(resumeData.parsed_data?.education),
      experience: transformExperience(resumeData.parsed_data?.experience),
      projects: transformProjects(resumeData.parsed_data?.projects),
      status // Only 'Shortlisted' or 'Rejected'
    };
    
    console.log('[Candidate] Transformed candidate data:', JSON.stringify(candidateData, null, 2));
    
    // Check if candidate already exists (by email and job)
    let existingCandidate = await Candidate.findOne({
      email: candidateData.email,
      job_id: jobId
    });
    
    if (existingCandidate) {
      console.log('[Candidate] Updating existing candidate:', existingCandidate.candidate_id);
      
      // Update existing candidate with new data and status
      const updatedCandidate = await Candidate.findByIdAndUpdate(
        existingCandidate._id,
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
            status: status, // Always update status to Shortlisted/Rejected
            updated_at: new Date()
          }
        },
        { new: true }
      );
      
      return updatedCandidate;
    } else {
      console.log('[Candidate] Creating new candidate:', candidateData.candidate_id);
      
      // Create new candidate
      const newCandidate = await Candidate.create(candidateData);
      return newCandidate;
    }
    
  } catch (error) {
    console.error('[Candidate] Error creating/updating candidate:', error);
    throw error;
  }
};

exports.uploadSingleResume = async (req, res) => {
  try {
    console.log('[ResumeUpload] jobId received:', req.body.jobId);
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadedBy = req.body.uploadedBy || 'unknown';
    const jd = req.body.jd || '';
    
    // Find or create user for uploaded_by field
    let user = await User.findOne({ email: uploadedBy });
    if (!user) {
      // Create a temporary user if not found
      user = await User.create({
        name: uploadedBy,
        email: uploadedBy,
        password: 'temp_password_' + Date.now(),
        role: 'hr'
      });
    }
    
    // Ensure we have a valid filename
    const filename = req.file.originalname || req.file.filename || `resume_${Date.now()}.pdf`;
    
    // Generate unique identifiers
    const candidateId = uuidv4(); // Unique ID for candidate
    const resumeId = uuidv4(); // Unique ID for resume
    
    // First, save the file metadata (we'll update this after processing)
    const resumeDoc = await Resume.create({
      candidateId: candidateId,
      resumeId: resumeId,
      job_id: req.body.jobId,
      uploadedBy: uploadedBy,
      originalFileName: filename,
      resumePath: filename, // Will be updated with GridFS path
      uploaded_by: user._id, // Legacy field
      uploaded_on: new Date(), // Legacy field
      processing_status: 'pending'
    });

    // Now process the resume using the Python backend
    try {
      console.log('[ResumeUpload] File details:', {
        filename: filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer ? req.file.buffer.length : 'undefined'
      });
      
      const FormData = require('form-data');
        const formData = new FormData();
        formData.append('jobId', req.body.jobId);
        formData.append('uploadedBy', uploadedBy);
        formData.append('files', req.file.buffer, {
          filename: filename,
          contentType: req.file.mimetype
        });

      const processingResponse = await axios.post('http://localhost:8000/api/upload-resume', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000 // 30 second timeout for processing
      });

      const processedData = processingResponse.data;
      
      // Parse match_score from string to number (remove % symbol)
      const matchScore = typeof processedData.match_score === 'string' 
        ? parseFloat(processedData.match_score.replace('%', '')) 
        : processedData.match_score || 0;
      
      console.log('[ResumeUpload] Processed data:', {
        match_score: processedData.match_score,
        parsed_match_score: matchScore,
        parsed_data: processedData.parsed_data
      });
      
        // Save file to GridFS after successful processing
        try {
          const gridFSId = await saveToGridFS(req.file.buffer, filename, req.body.jobId);
          console.log(`File saved to GridFS with ID: ${gridFSId}`);
          
        // Update resume document with GridFS ID and processing status
          await Resume.findByIdAndUpdate(resumeDoc._id, {
          resumePath: `gridfs://${gridFSId}`,
          file_path: `gridfs://${gridFSId}`, // Legacy field
          processing_status: 'completed',
          match_score: matchScore,
          parsing_method: processedData.parsed_data?.parsing_method || 'llama3',
          extracted_data: processedData.parsed_data
          });
        } catch (gridFSError) {
          console.error('GridFS save error:', gridFSError);
          // Continue even if GridFS save fails
        }
      
      // Create or update candidate record
      let candidateRecord = null;
      try {
        let jobObjectId = req.body.jobId;
        if (!mongoose.Types.ObjectId.isValid(jobObjectId)) {
          // Try to find Job by jobId (UUID)
          const Job = require('../models/Job');
          const jobDoc = await Job.findOne({ jobId: req.body.jobId });
          if (jobDoc) jobObjectId = jobDoc._id;
        }
        candidateRecord = await createOrUpdateCandidate(
          { 
            ...processedData, 
            candidateId: candidateId,
            match_score: matchScore  // Use parsed number
          }, 
          jobObjectId, 
          resumeId, 
          uploadedBy
        );
        console.log('[ResumeUpload] Candidate record created/updated:', candidateRecord.candidate_id);
      } catch (candidateError) {
        console.error('[ResumeUpload] Error creating candidate record:', candidateError);
        // Continue even if candidate creation fails
      }
      
      // After resume is uploaded and processed, log the action
      await logActivity({
        userId: req.user?.id || user._id?.toString() || 'unknown',
        userRole: req.user?.role || user.role || 'unknown',
        actionType: 'UPLOAD_RESUME',
        description: `Resume uploaded for ${req.file.originalname} by ${uploadedBy}`,
        entity: 'Resume',
        entityId: resumeId,
        jobId: req.body.jobId,
        extraMeta: { filename: req.file.originalname }
      });

      // After candidate is created/updated, log the action
      if (candidateRecord) {
        await logActivity({
          userId: req.user?.id || user._id?.toString() || 'unknown',
          userRole: req.user?.role || user.role || 'unknown',
          actionType: 'CANDIDATE_PARSED',
          description: `Candidate data extracted for ${candidateRecord.full_name} (${candidateRecord.email})`,
          entity: 'Candidate',
          entityId: candidateRecord.candidate_id,
          jobId: req.body.jobId,
          candidateId: candidateRecord.candidate_id,
          extraMeta: { resumeId }
        });
      }
        
        res.status(201).json({
          message: 'Resume uploaded and processed successfully',
          candidateId: candidateId,
          resumeId: resumeId,
          filename: filename,
          jobId: req.body.jobId,
          uploadedBy,
          uploadDate: resumeDoc.uploadDate,
          score: matchScore,
          result: processedData.result,
          candidateRecord: candidateRecord ? candidateRecord.candidate_id : null,
          candidateData: {
            name: processedData.parsed_data?.full_name || processedData.parsed_data?.name,
            email: processedData.parsed_data?.email,
            phone: processedData.parsed_data?.phone,
            summary: processedData.parsed_data?.summary,
            skills: processedData.parsed_data?.skills,
            keywords: processedData.parsed_data?.keywords,
            experience: processedData.parsed_data?.experience,
            education: processedData.parsed_data?.education,
            projects: processedData.parsed_data?.projects,
            parsing_method: processedData.parsed_data?.parsing_method
          }
        });

    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Log the actual error response from Python backend
      if (processingError.response) {
        console.error('Python backend error response:', {
          status: processingError.response.status,
          data: processingError.response.data,
          detail: processingError.response.data.detail
        });
      }
      
      // Check if it's a connection error (Python backend not running)
      if (processingError.code === 'ECONNREFUSED' || processingError.code === 'ENOTFOUND') {
        console.log('Python backend not available, using fallback processing');
        
        // Fallback: Basic processing without AI
        const basicScore = Math.floor(Math.random() * 40) + 60; // Random score 60-100
        const shortlisted = basicScore >= 75;
        
        // Update resume document with fallback status
        await Resume.findByIdAndUpdate(resumeDoc._id, {
          processing_status: 'completed',
          match_score: basicScore,
          parsing_method: 'fallback'
        });
        
        // Create basic candidate data for fallback
        const fallbackData = {
          match_score: basicScore,
          parsed_data: {
            full_name: 'Processing Required',
            email: 'Processing Required',
            phone: 'Processing Required',
            summary: 'AI processing unavailable',
            skills: ['Processing Required'],
            experience: ['Processing Required'],
            education: ['Processing Required'],
            projects: ['Processing Required']
          }
        };
        
        // Create or update candidate record even in fallback
        let candidateRecord = null;
        try {
          let jobObjectId = req.body.jobId;
          if (!mongoose.Types.ObjectId.isValid(jobObjectId)) {
            // Try to find Job by jobId (UUID)
            const Job = require('../models/Job');
            const jobDoc = await Job.findOne({ jobId: req.body.jobId });
            if (jobDoc) jobObjectId = jobDoc._id;
          }
          candidateRecord = await createOrUpdateCandidate(
            { ...fallbackData, candidateId: candidateId }, 
            jobObjectId, 
            resumeId, 
            uploadedBy
          );
          console.log('[ResumeUpload] Fallback candidate record created:', candidateRecord.candidate_id);
        } catch (candidateError) {
          console.error('[ResumeUpload] Error creating fallback candidate record:', candidateError);
        }
        
        res.status(201).json({
          message: 'Resume uploaded with basic processing (AI backend unavailable)',
          candidateId: candidateId,
          resumeId: resumeId,
          filename: filename,
          jobId: req.body.jobId,
          uploadedBy,
          uploadDate: resumeDoc.uploadDate,
          score: basicScore,
          result: shortlisted ? 'Shortlisted' : 'Not Shortlisted',
          candidateRecord: candidateRecord ? candidateRecord.candidate_id : null,
          candidateData: {
            name: 'Processing Required',
            email: 'Processing Required',
            phone: 'Processing Required',
            skills: ['Processing Required'],
            experience: ['Processing Required'],
            education: ['Processing Required']
          },
          note: 'AI processing unavailable - please start Python backend for full analysis'
        });
      } else {
        // Other processing errors
        // Update resume document with error status
        await Resume.findByIdAndUpdate(resumeDoc._id, {
          processing_status: 'failed',
          match_score: 0,
          parsing_method: 'error'
        });
        
        // Create basic candidate data for error case
        const errorData = {
          match_score: 0,
          parsed_data: {
            full_name: 'Processing Failed',
            email: 'Processing Failed',
            phone: 'Processing Failed',
            summary: 'Resume processing failed',
            skills: ['Processing Failed'],
            experience: ['Processing Failed'],
            education: ['Processing Failed'],
            projects: ['Processing Failed']
          }
        };
        
        // Create or update candidate record even in error case
        let candidateRecord = null;
        try {
          let jobObjectId = req.body.jobId;
          if (!mongoose.Types.ObjectId.isValid(jobObjectId)) {
            // Try to find Job by jobId (UUID)
            const Job = require('../models/Job');
            const jobDoc = await Job.findOne({ jobId: req.body.jobId });
            if (jobDoc) jobObjectId = jobDoc._id;
          }
          candidateRecord = await createOrUpdateCandidate(
            { ...errorData, candidateId: candidateId }, 
            jobObjectId, 
            resumeId, 
            uploadedBy
          );
          console.log('[ResumeUpload] Error case candidate record created:', candidateRecord.candidate_id);
        } catch (candidateError) {
          console.error('[ResumeUpload] Error creating error case candidate record:', candidateError);
        }
        
        res.status(201).json({
          message: 'Resume uploaded but processing failed',
          candidateId: candidateId,
          resumeId: resumeId,
          filename: filename,
          jobId: req.body.jobId,
          uploadedBy,
          uploadDate: resumeDoc.uploadDate,
          score: 0,
          result: 'Processing Failed',
          candidateRecord: candidateRecord ? candidateRecord.candidate_id : null,
          error: processingError.message
        });
      }
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

exports.getResume = async (req, res) => {
  try {
    const { id } = req.params;
    const { download } = req.query;
    
    console.log('[GetResume] Request for resume ID:', id, 'Download:', download);
    
    // Find resume by resumeId
    const resume = await Resume.findOne({ resumeId: id });
    if (!resume) {
      console.log('[GetResume] Resume not found for ID:', id);
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    console.log('[GetResume] Found resume:', {
      resumeId: resume.resumeId,
      resumePath: resume.resumePath,
      originalFileName: resume.originalFileName
    });
    
    // Check if resume has GridFS path
    if (!resume.resumePath || !resume.resumePath.startsWith('gridfs://')) {
      console.log('[GetResume] No GridFS path found for resume:', id);
      return res.status(404).json({ message: 'Resume file not found' });
    }
    
    // Extract GridFS ID from path
    const gridFSId = resume.resumePath.replace('gridfs://', '');
    console.log('[GetResume] GridFS ID:', gridFSId);
    
    try {
      // Convert string ID to ObjectId
      const objectId = new mongoose.Types.ObjectId(gridFSId);
      
      // Get file from GridFS
      const downloadStream = bucket.openDownloadStream(objectId);
      
      // Set headers
      const filename = resume.originalFileName || 'resume.pdf';
      res.setHeader('Content-Type', 'application/pdf');
      
      if (download) {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      }
      
      // Pipe the file stream to response
      downloadStream.pipe(res);
      
      downloadStream.on('error', (error) => {
        console.error('[GetResume] GridFS download error:', error);
        res.status(500).json({ message: 'Error downloading resume file' });
      });
      
    } catch (gridFSError) {
      console.error('[GetResume] GridFS error:', gridFSError);
      return res.status(500).json({ message: 'Error accessing resume file' });
    }
    
  } catch (error) {
    console.error('[GetResume] Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 