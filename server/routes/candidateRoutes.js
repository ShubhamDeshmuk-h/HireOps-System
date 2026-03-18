const express = require('express');
const router = express.Router();
const Candidate = require('../models/Candidate');
const Resume = require('../models/Resume');
const logActivity = require('../utils/logActivity');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'offer-letters');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'offer-letter-' + uniqueSuffix + '.pdf');
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// GET /api/candidates - Get all candidates (optionally filter by job)
router.get('/', async (req, res) => {
  try {
    const { jobId } = req.query;
    const filter = jobId ? { job_id: jobId } : {};
    const candidates = await Candidate.find(filter)
      .sort({ created_at: -1 });
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// GET /api/candidates/:id - Get candidate by ID (using candidate_id)
router.get('/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ candidate_id: req.params.id });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    res.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate by ID:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// PATCH /api/candidates/:id/status - Update candidate status (using candidate_id)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const candidate = await Candidate.findOneAndUpdate(
      { candidate_id: req.params.id },
      { status },
      { new: true }
    );
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    // Log candidate status update
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'UPDATE_CANDIDATE_STATUS',
      description: `Candidate status updated to ${status} for ${candidate.full_name} (${candidate.email})`,
      entity: 'Candidate',
      entityId: candidate.candidate_id,
      jobId: candidate.job_id,
      candidateId: candidate.candidate_id,
      extraMeta: { status }
    });
    res.json(candidate);
  } catch (error) {
    console.error('Error updating candidate status:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// GET /api/candidates/:id/resume - Download candidate resume
router.get('/:id/resume', async (req, res) => {
  try {
    console.log('🔍 Resume request for candidate ID:', req.params.id);
    
    const candidate = await Candidate.findOne({ candidate_id: req.params.id });
    if (!candidate) {
      console.log('❌ Candidate not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Candidate not found' });
    }
    console.log('✅ Found candidate:', candidate.full_name, 'with candidate_id:', candidate.candidate_id);

    // Find the resume for this candidate using resume_id
    const resume = await Resume.findOne({ resumeId: candidate.resume_id });
    console.log('🔍 Resume search result:', resume ? 'Found' : 'Not found', 'for resumeId:', candidate.resume_id);
    
    if (!resume) {
      console.log('❌ No resume found for resumeId:', candidate.resume_id);
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Check if resume has GridFS path
    if (!resume.resumePath || !resume.resumePath.startsWith('gridfs://')) {
      console.log('❌ Resume found but no GridFS path:', resume);
      return res.status(404).json({ message: 'Resume file not found' });
    }
    
    // Extract GridFS ID from path
    const gridFSId = resume.resumePath.replace('gridfs://', '');
    console.log('📁 GridFS ID:', gridFSId);
    
    try {
      // Convert string ID to ObjectId
      const mongoose = require('mongoose');
      const objectId = new mongoose.Types.ObjectId(gridFSId);
      
      // Get file from GridFS
      const { GridFSBucket } = require('mongodb');
      const bucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'resumes'
      });
      
      const downloadStream = bucket.openDownloadStream(objectId);
      
      // Set headers for file download
      const filename = resume.originalFileName || `${candidate.full_name}_Resume.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      // Pipe the file stream to response
      downloadStream.pipe(res);
      
      downloadStream.on('error', (error) => {
        console.error('❌ GridFS download error:', error);
        res.status(500).json({ message: 'Error downloading resume file' });
      });
      
    } catch (gridFSError) {
      console.error('❌ GridFS error:', gridFSError);
      return res.status(500).json({ message: 'Error accessing resume file' });
    }

  } catch (error) {
    console.error('❌ Error downloading resume:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// POST /api/candidates/:id/send-email - Send email to candidate
router.post('/:id/send-email', async (req, res) => {
  try {
    const { subject, message, emailType } = req.body;
    const candidate = await Candidate.findOne({ candidate_id: req.params.id });
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `ATS HR <${process.env.EMAIL_USER}>`,
      to: candidate.email,
      subject: subject,
      text: message,
    });

    // Log the email activity
    await logActivity({
      userId: req.user?.id || 'system',
      userRole: req.user?.role || 'hr',
      actionType: 'SEND_EMAIL',
      description: `Email sent to ${candidate.full_name} (${candidate.email}) - ${emailType || 'General'}`,
      entity: 'Candidate',
      entityId: candidate.candidate_id,
      jobId: candidate.job_id,
      candidateId: candidate.candidate_id,
      extraMeta: { subject, emailType }
    });

    res.json({ message: 'Email sent successfully' });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// POST /api/candidates/:id/send-offer - Send offer letter to candidate
router.post('/:id/send-offer', upload.single('offerLetter'), async (req, res) => {
  try {
    const { offerDetails } = req.body;
    const candidate = await Candidate.findOne({ candidate_id: req.params.id });
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Offer letter PDF is required' });
    }

    const offerDetailsObj = JSON.parse(offerDetails);

    // Create email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Create professional offer letter email
    const emailSubject = `Offer Letter - ${offerDetailsObj.position} Position`;
    const emailBody = `
Dear ${candidate.full_name},

We are pleased to offer you the position of ${offerDetailsObj.position} at our company.

Position Details:
- Position: ${offerDetailsObj.position}
- Department: ${offerDetailsObj.department}
- Location: ${offerDetailsObj.location}
- Salary: ${offerDetailsObj.salary}
- Start Date: ${offerDetailsObj.startDate}
- Reporting To: ${offerDetailsObj.reportingTo}

${offerDetailsObj.terms ? `Additional Terms & Conditions:\n${offerDetailsObj.terms}\n` : ''}

Please find the detailed offer letter attached to this email. Please review it carefully and respond within 7 days to confirm your acceptance.

If you have any questions, please don't hesitate to contact us.

Best regards,
HR Team
${process.env.COMPANY_NAME || 'Company Name'}
    `;

    // Send email with attachment
    await transporter.sendMail({
      from: `ATS HR <${process.env.EMAIL_USER}>`,
      to: candidate.email,
      subject: emailSubject,
      text: emailBody,
      attachments: [
        {
          filename: `Offer_Letter_${candidate.full_name}.pdf`,
          path: req.file.path
        }
      ]
    });

    // Log the offer letter activity
    await logActivity({
      userId: req.user?.id || 'system',
      userRole: req.user?.role || 'hr',
      actionType: 'SEND_OFFER_LETTER',
      description: `Offer letter sent to ${candidate.full_name} (${candidate.email}) for ${offerDetailsObj.position} position`,
      entity: 'Candidate',
      entityId: candidate.candidate_id,
      jobId: candidate.job_id,
      candidateId: candidate.candidate_id,
      extraMeta: { 
        position: offerDetailsObj.position,
        department: offerDetailsObj.department,
        salary: offerDetailsObj.salary,
        startDate: offerDetailsObj.startDate,
        fileName: req.file.filename
      }
    });

    res.json({ message: 'Offer letter sent successfully' });

  } catch (error) {
    console.error('Error sending offer letter:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// DELETE /api/candidates/:id - Delete candidate by ID (using candidate_id)
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ Deleting candidate with ID:', req.params.id);
    
    const candidate = await Candidate.findOne({ candidate_id: req.params.id });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    // Store candidate info for logging before deletion
    const candidateInfo = {
      full_name: candidate.full_name,
      email: candidate.email,
      job_id: candidate.job_id,
      candidate_id: candidate.candidate_id
    };

    // Delete the candidate
    await Candidate.findOneAndDelete({ candidate_id: req.params.id });

    // Log the deletion activity
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'DELETE_CANDIDATE',
      description: `Candidate deleted: ${candidateInfo.full_name} (${candidateInfo.email})`,
      entity: 'Candidate',
      entityId: candidateInfo.candidate_id,
      jobId: candidateInfo.job_id,
      candidateId: candidateInfo.candidate_id,
      extraMeta: { deletedCandidate: candidateInfo }
    });

    console.log('✅ Candidate deleted successfully:', candidateInfo.full_name);
    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting candidate:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

module.exports = router; 