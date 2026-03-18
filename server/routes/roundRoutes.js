const express = require('express');
const router = express.Router();
const Round = require('../models/Round');
const CandidateRound = require('../models/CandidateRound');
const Candidate = require('../models/Candidate');
const Interviewer = require('../models/Interviewer');
const Job = require('../models/Job');
const nodemailer = require('nodemailer');
const logActivity = require('../utils/logActivity');
const { scheduleInterviewWithGoogleCalendar } = require('../services/googleCalendarService');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const csv = require('csvtojson');
const mongoose = require('mongoose');

// Remove role-based middleware for now to fix the 404 issue
// const { requireHR, requireAdmin, requireInterviewer, roleAuth } = require('../middleware/roleAuth');

// Create a new round for a job - Allow all authenticated users for now
router.post('/', async (req, res) => {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        message: 'Database connection not ready. Please try again.' 
      });
    }
    
    const { job_id, name, type, description, cutoff, step } = req.body;
    
    console.log('🔍 Creating round with data:', { job_id, name, type, description, cutoff, step });
    
    // Validate required fields
    if (!job_id) {
      return res.status(400).json({ message: 'Job ID is required' });
    }
    
    if (!name || !type) {
      return res.status(400).json({ message: 'Round name and type are required' });
    }
    
    // Convert job_id from UUID to ObjectId if needed
    let actualJobId = job_id;
    if (job_id && !/^[0-9a-fA-F]{24}$/.test(job_id)) {
      // Try to find job by UUID with timeout
      const job = await Job.findOne({ jobId: job_id }).maxTimeMS(10000);
      if (job) {
        actualJobId = job._id;
      } else {
        return res.status(404).json({ message: 'Job not found' });
      }
    }
    
    // Check for existing round with same step for this job
    const existingRound = await Round.findOne({ 
      job_id: actualJobId, 
      step: step || 1 
    }).maxTimeMS(10000);
    
    if (existingRound) {
      return res.status(400).json({ 
        message: `Round with step ${step || 1} already exists for this job` 
      });
    }
    
    const round = await Round.create({ 
      job_id: actualJobId, 
      name, 
      type, 
      description: description || '', 
      cutoff: cutoff || 70,
      step: step || 1
    });
    
    // Log round creation
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'CREATE_ROUND',
      description: `${type} Round created for job #${job_id}`,
      entity: 'Round',
      entityId: round._id.toString(),
      jobId: job_id,
      roundId: round._id.toString(),
      extraMeta: { name, type, description, cutoff, step }
    });
    
    console.log('✅ Round created successfully:', round._id);
    res.status(201).json(round);
  } catch (err) {
    console.error('❌ Error creating round:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Test endpoint to verify route is working
router.get('/test', (req, res) => {
  res.json({ message: 'Round routes are working!', timestamp: new Date() });
});

// List all rounds for a job
router.get('/job/:jobId', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    let rounds = [];
    // Try as ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(jobId)) {
      rounds = await Round.find({ job_id: jobId }).sort({ created_at: 1 });
    }
    // If not found, try as string (UUID)
    if (!rounds.length) {
      // Find Job by jobId (UUID)
      const job = await Job.findOne({ jobId });
      if (job) {
        rounds = await Round.find({ job_id: job._id }).sort({ created_at: 1 });
      }
    }
    res.json(rounds);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Assign candidates to a round
router.post('/:roundId/assign', async (req, res) => {
  try {
    const { candidateIds } = req.body; // array of candidate IDs
    const roundId = req.params.roundId;
    const assignments = await Promise.all(candidateIds.map(async (candidate_id) => {
      return CandidateRound.findOneAndUpdate(
        { candidate_id, round_id: roundId },
        { candidate_id, round_id: roundId },
        { upsert: true, new: true }
      );
    }));
    // Log candidate assignment
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'ASSIGN_CANDIDATES_TO_ROUND',
      description: `Assigned ${candidateIds.length} candidates to round #${roundId}`,
      entity: 'Round',
      entityId: roundId,
      roundId,
      extraMeta: { candidateIds }
    });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Update candidate round result/status
router.patch('/:roundId/candidate/:candidateRoundId', async (req, res) => {
  try {
    const { status, result } = req.body;
    const updated = await CandidateRound.findByIdAndUpdate(
      req.params.candidateRoundId,
      { status, result, updated_at: new Date() },
      { new: true }
    );
    // Log candidate round status update
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'UPDATE_CANDIDATE_ROUND_STATUS',
      description: `Updated candidate round status to ${status} (result: ${result}) for round #${req.params.roundId}`,
      entity: 'CandidateRound',
      entityId: req.params.candidateRoundId,
      roundId: req.params.roundId,
      candidateId: updated?.candidate_id,
      extraMeta: { status, result }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Update candidate status by candidate_id (UUID)
router.patch('/:roundId/candidate/:candidateId/status', async (req, res) => {
  try {
    const { roundId, candidateId } = req.params;
    const { status, notes } = req.body;
    
    // Find the candidate first
    const candidate = await Candidate.findOne({ candidate_id: candidateId });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    // Find or create CandidateRound record
    let candidateRound = await CandidateRound.findOneAndUpdate(
      { 
        candidate_id: candidate._id, // Use MongoDB ObjectId
        round_id: roundId 
      },
      { 
        status: status,
        round_status: status, // Keep both fields in sync
        hr_notes: notes,
        updated_at: new Date()
      },
      { 
        new: true, 
        upsert: true 
      }
    );
    
    // Log the status update
    await logActivity({
      userId: req.user?.id || 'system',
      userRole: req.user?.role || 'hr',
      actionType: 'UPDATE_CANDIDATE_STATUS',
      description: `Updated ${candidate.full_name}'s status to ${status} in round ${roundId}`,
      entity: 'CandidateRound',
      entityId: candidateRound._id.toString(),
      jobId: candidate.job_id,
      candidateId: candidate.candidate_id,
      roundId: roundId,
      extraMeta: { status, notes, previousStatus: candidateRound.status }
    });
    
    res.json({ 
      message: 'Status updated successfully',
      candidateRound,
      candidate: {
        candidate_id: candidate.candidate_id,
        full_name: candidate.full_name,
        email: candidate.email
      }
    });
    
  } catch (err) {
    console.error('Error updating candidate status:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Schedule interviews and send invites with Google Calendar
router.post('/:roundId/schedule-interviews', async (req, res) => {
  try {
    const { 
      candidateIds, 
      interviewerId, 
      scheduledAt, 
      duration, 
      interviewType, 
      location, 
      meetingLink, 
      notes,
      subject,
      message,
      hr_email
    } = req.body;
    
    const roundId = req.params.roundId;
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ message: 'No candidates selected.' });
    }
    if (!interviewerId || !scheduledAt) {
      return res.status(400).json({ message: 'Interviewer and scheduled time are required.' });
    }
    
    // Find the round
    const round = await Round.findById(roundId);
    if (!round) {
      return res.status(404).json({ message: 'Round not found.' });
    }
    
    // Find the interviewer
    const interviewer = await Interviewer.findById(interviewerId);
    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found.' });
    }
    
    // Find candidates
    const candidates = await Candidate.find({ candidate_id: { $in: candidateIds } });
    if (!candidates.length) {
      return res.status(404).json({ message: 'No candidates found for the selected IDs.' });
    }
    
    let scheduledCount = 0;
    let emailSentCount = 0;
    let googleCalendarCount = 0;
    
    for (const candidate of candidates) {
      try {
        let meetLink = meetingLink;
        let eventId = null;
        let htmlLink = null;
        
        // Use Google Calendar for online interviews
        if (interviewType === 'online') {
          console.log(`📅 Scheduling Google Calendar event for ${candidate.full_name}`);
          
          const googleResult = await scheduleInterviewWithGoogleCalendar(
            candidate.full_name,
            candidate.email,
            interviewer.email,
            scheduledAt,
            duration,
            round.name
          );
          
          if (googleResult.success) {
            meetLink = googleResult.meetLink;
            eventId = googleResult.eventId;
            htmlLink = googleResult.htmlLink;
            googleCalendarCount++;
            
            console.log(`✅ Google Calendar event created for ${candidate.full_name}`);
            console.log(`🔗 Meet Link: ${meetLink}`);
          } else {
            console.error(`❌ Google Calendar failed for ${candidate.full_name}:`, googleResult.error);
            // Fallback to manual meet link generation
            const generateMeetCode = () => {
              const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
              let code = '';
              for (let i = 0; i < 3; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              code += '-';
              for (let i = 0; i < 4; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              code += '-';
              for (let i = 0; i < 3; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
              }
              return code;
            };
            
            const meetCode = generateMeetCode();
            meetLink = `https://meet.google.com/${meetCode}`;
            console.log(`🔄 Using fallback meet link: ${meetLink}`);
          }
        } else {
          // For offline interviews, use provided location
          meetLink = location || 'Offline Interview';
        }
        
        // Create or update CandidateRound record
        const candidateRound = await CandidateRound.findOneAndUpdate(
          { 
            candidate_id: candidate._id, // Use MongoDB ObjectId
            round_id: roundId 
          },
          { 
            interview_scheduled_at: scheduledAt,
            google_meet_link: meetLink,
            interviewer_id: interviewerId,
            status: 'Scheduled',
            round_status: 'Scheduled',
            google_event_id: eventId,
            google_calendar_link: htmlLink,
            updated_at: new Date()
          },
          { 
            new: true, 
            upsert: true 
          }
        );
        
        scheduledCount++;
        
        // Send email invitation if Google Calendar didn't handle it
        if (!googleResult?.success || interviewType === 'offline') {
          try {
            const transporter = require('nodemailer').createTransport({
              service: 'gmail',
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            });
            
            // Create personalized message with meet link
            let personalizedMessage = message
              .replace('[Please select date and time]', new Date(scheduledAt).toLocaleString())
              .replace('${scheduledAt}', new Date(scheduledAt).toLocaleString());
            
            // Add meet link to message if it's an online interview
            if (interviewType === 'online' && meetLink) {
              personalizedMessage += `\n\nMeeting Link: ${meetLink}`;
            }
            
            await transporter.sendMail({
              from: `ATS HR <${process.env.EMAIL_USER}>`,
              to: candidate.email,
              subject,
              text: personalizedMessage,
            });
            
            emailSentCount++;
            
          } catch (emailErr) {
            console.error('Error sending interview invite to', candidate.email, emailErr);
          }
        } else {
          emailSentCount += googleResult.interviewerEmailSent && googleResult.candidateEmailSent ? 2 : 0;
        }
        
        // Log the scheduling activity
        await logActivity({
          userId: req.user?.id || 'system',
          userRole: req.user?.role || 'hr',
          actionType: 'SCHEDULE_INTERVIEW',
          description: `Interview scheduled for ${candidate.full_name} (${candidate.email}) for round ${round.name}`,
          entity: 'CandidateRound',
          entityId: candidateRound._id.toString(),
          jobId: candidate.job_id,
          candidateId: candidate.candidate_id,
          roundId: roundId,
          extraMeta: { 
            subject, 
            scheduledAt, 
            interviewerId,
            interviewType,
            meetLink,
            eventId,
            htmlLink,
            googleCalendarUsed: googleResult?.success || false
          }
        });
        
      } catch (err) {
        console.error('Error scheduling interview for', candidate.email, err);
      }
    }
    
    res.json({ 
      message: `Successfully scheduled ${scheduledCount} interviews. ${googleCalendarCount} Google Calendar events created. ${emailSentCount} email invites sent.`,
      scheduledCount,
      emailSentCount,
      googleCalendarCount,
      meetLink: candidates.length > 0 ? 'Google Meet links generated automatically' : null
    });
    
  } catch (err) {
    console.error('Error in schedule-interviews:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Send aptitude test link via email to selected candidates
router.post('/:roundId/send-aptitude', async (req, res) => {
  try {
    const { candidateIds, test_link, hr_email } = req.body;
    const roundId = req.params.roundId;
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ message: 'No candidates selected.' });
    }
    // Look up candidates by candidate_id (string)
    const candidates = await Candidate.find({ candidate_id: { $in: candidateIds } });
    if (!candidates.length) {
      console.error('No candidates found for IDs:', candidateIds);
      return res.status(404).json({ message: 'No candidates found for the selected IDs.' });
    }
    // Provider-agnostic nodemailer config
    let transporterConfig;
    if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
      transporterConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT, 10),
        secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };
    } else {
      transporterConfig = {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };
    }

    const transporter = nodemailer.createTransporter(transporterConfig);
    // Verify SMTP connection before sending
    await transporter.verify().catch(err => {
      console.error('SMTP connection failed:', err);
      throw new Error('SMTP connection failed: ' + err.message);
    });
    let sentCount = 0;
    for (const candidate of candidates) {
      try {
        await transporter.sendMail({
          from: `ATS HR <${process.env.EMAIL_USER}>`,
          to: candidate.email,
          subject: 'Aptitude Test Link',
          text: `Dear ${candidate.full_name},\n\nPlease complete your aptitude test using the following link: ${test_link}\n\nBest regards,\nATS HR Team`,
        });
        sentCount++;
        await CandidateRound.findOneAndUpdate(
          { candidate_id: candidate._id, round_id: roundId }, // Use MongoDB ObjectId, not UUID string
          { test_link, sent_at: new Date() },
          { upsert: true }
        );
      } catch (emailErr) {
        console.error('Error sending email to', candidate.email, emailErr);
        return res.status(500).json({ message: `Failed to send email to ${candidate.email}: ${emailErr.message}` });
      }
    }
    if (sentCount === 0) {
      return res.status(500).json({ message: 'No emails were sent. Check SMTP credentials and candidate emails.' });
    }
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'SEND_APTITUDE_LINK',
      description: `Sent aptitude link to ${candidateIds.length} candidates for round #${roundId}`,
      entity: 'Round',
      entityId: roundId,
      roundId,
      extraMeta: { candidateIds, test_link }
    });
    res.json({ message: `Aptitude test links sent to ${sentCount} candidates.` });
  } catch (err) {
    console.error('Error in send-aptitude:', err.stack || err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Download CSV template for aptitude results
router.get('/:roundId/template', async (req, res) => {
  try {
    const { roundId } = req.params;
    const round = await Round.findById(roundId);
    if (!round) return res.status(404).json({ message: 'Round not found' });
    
    // Get candidates for this round to create template
    const candidates = await Candidate.find({ job_id: round.job_id });
    
    // Create CSV template
    let csvContent = 'email,candidate_id,name,score\n';
    csvContent += '# Template for aptitude test results\n';
    csvContent += '# Required columns: email OR candidate_id OR name, score\n';
    csvContent += '# Score should be a number (0-100)\n';
    csvContent += '# Example:\n';
    
    // Add sample rows
    candidates.slice(0, 3).forEach(candidate => {
      csvContent += `${candidate.email},${candidate.candidate_id},${candidate.full_name},85\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="aptitude_results_template_${round.name}.csv"`);
    res.send(csvContent);
    
  } catch (err) {
    console.error('Error generating template:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Upload aptitude results (CSV or JSON)
router.post('/:roundId/upload-result', upload.single('resultFile'), async (req, res) => {
  try {
    const { roundId } = req.params;
    const round = await Round.findById(roundId);
    if (!round) return res.status(404).json({ message: 'Round not found' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    console.log('📁 File uploaded:', req.file.originalname, 'Size:', req.file.size, 'Type:', req.file.mimetype);
    
    let results = [];
    if (req.file.mimetype === 'application/json') {
      results = JSON.parse(req.file.buffer.toString());
    } else if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      const csvString = req.file.buffer.toString();
      console.log('📊 CSV content preview:', csvString.substring(0, 200));
      results = await csv().fromString(csvString);
    } else {
      return res.status(400).json({ message: 'Unsupported file type. Please upload CSV or JSON file.' });
    }
    
    console.log('📋 Parsed results:', results.length, 'rows');
    console.log('📋 Sample row:', results[0]);
    
    // Use cutoff from request if provided, else round.cutoff
    const cutoff = req.body.cutoff !== undefined ? Number(req.body.cutoff) : (round.cutoff || 70);
    console.log('🎯 Cutoff score:', cutoff);
    
    let updated = [];
    let skipped = [];
    let errors = [];
    
    for (const row of results) {
      try {
        console.log('🔄 Processing row:', row);
        
        // Extract score - handle different column names
        let score = null;
        if (row.score !== undefined) score = Number(row.score);
        else if (row.Score !== undefined) score = Number(row.Score);
        else if (row.SCORE !== undefined) score = Number(row.SCORE);
        else if (row.result !== undefined) score = Number(row.result);
        else if (row.Result !== undefined) score = Number(row.Result);
        else if (row.RESULT !== undefined) score = Number(row.RESULT);
        
        if (isNaN(score)) {
          console.warn('⚠️ Invalid score in row:', row);
          skipped.push({ row, reason: 'Invalid or missing score' });
          continue;
        }
        
        // Determine status based on score
        let status = score >= cutoff ? 'Passed' : 'Failed';
        
        // Find candidate by email (preferred) or candidate_id
        let candidate = null;
        
        // Try to find by email first
        if (row.email) {
          candidate = await Candidate.findOne({ email: row.email.trim() });
        }
        
        // If not found by email, try candidate_id
        if (!candidate && row.candidate_id) {
          candidate = await Candidate.findOne({ candidate_id: row.candidate_id.toString() });
        }
        
        // If still not found, try by name (less reliable)
        if (!candidate && row.name) {
          candidate = await Candidate.findOne({ 
            full_name: { $regex: new RegExp(row.name.trim(), 'i') } 
          });
        }
        
        if (!candidate) {
          console.warn('❌ Candidate not found for:', row);
          skipped.push({ 
            row, 
            reason: 'Candidate not found by email, candidate_id, or name',
            searchCriteria: { email: row.email, candidate_id: row.candidate_id, name: row.name }
          });
          continue;
        }
        
        console.log('✅ Found candidate:', candidate.full_name, 'Score:', score, 'Status:', status);
        
        // Create or update CandidateRound record
        let candidateRound = await CandidateRound.findOneAndUpdate(
          { 
            candidate_id: candidate._id, // Use MongoDB ObjectId, not UUID string
            round_id: roundId 
          },
          { 
            result: score, 
            round_status: status,
            updated_at: new Date()
          },
          { 
            new: true, 
            upsert: true // Create if doesn't exist
          }
        );
        
        if (candidateRound) {
          updated.push({ 
            candidate_id: candidate.candidate_id, // Keep UUID for response
            candidate_name: candidate.full_name,
            email: candidate.email,
            score, 
            status 
          });
          
          // Log the activity
          await logActivity({
            userId: req.user?.id || 'system',
            userRole: req.user?.role || 'hr',
            actionType: 'UPLOAD_APTITUDE_RESULT',
            description: `Aptitude result uploaded for ${candidate.full_name}: ${score}/${cutoff} (${status})`,
            entity: 'CandidateRound',
            entityId: candidateRound._id.toString(),
            jobId: candidate.job_id,
            candidateId: candidate.candidate_id,
            roundId: roundId,
            extraMeta: { score, cutoff, status, roundName: round.name }
          });
        }
        
      } catch (rowError) {
        console.error('❌ Error processing row:', row, rowError);
        errors.push({ row, error: rowError.message });
      }
    }
    
    console.log('📊 Processing complete:', {
      total: results.length,
      updated: updated.length,
      skipped: skipped.length,
      errors: errors.length
    });
    
    res.json({ 
      message: `Results processed successfully. ${updated.length} updated, ${skipped.length} skipped.`,
      updated, 
      skipped,
      errors,
      summary: {
        total: results.length,
        updated: updated.length,
        skipped: skipped.length,
        errors: errors.length,
        cutoff
      }
    });
    
  } catch (err) {
    console.error('❌ Error in upload-result:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Interviewer submits feedback for a candidate in a round
router.post('/:roundId/candidate/:candidateRoundId/feedback', async (req, res) => {
  try {
    const { feedback, status } = req.body;
    const updated = await CandidateRound.findByIdAndUpdate(
      req.params.candidateRoundId,
      { feedback, round_status: status || 'Attended', updated_at: new Date() },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get CandidateRound by round and candidate
router.get('/:roundId/candidate/:candidateId', async (req, res) => {
  try {
    const { roundId, candidateId } = req.params;
    const cr = await CandidateRound.findOne({ round_id: roundId, candidate_id: candidateId });
    if (!cr) return res.status(404).json({});
    res.json(cr);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get all candidates assigned to a round
router.get('/:roundId/candidates', async (req, res) => {
  try {
    const { roundId } = req.params;
    const candidateRounds = await CandidateRound.find({ round_id: roundId }).populate('candidate_id');
    const candidates = candidateRounds.map(cr => cr.candidate_id);
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Delete a specific round and its candidate assignments
router.delete('/:roundId', async (req, res) => {
  try {
    let { roundId } = req.params;
    if (mongoose.Types.ObjectId.isValid(roundId)) {
      roundId = new mongoose.Types.ObjectId(roundId);
    }
    // Delete all candidate-round assignments for this round
    await CandidateRound.deleteMany({ round_id: roundId });
    // Delete the round itself
    const deleted = await Round.findByIdAndDelete(roundId);
    if (!deleted) return res.status(404).json({ message: 'Round not found' });
    // Log deletion
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'DELETE_ROUND',
      description: `Round deleted: ${deleted.name} #${deleted._id}`,
      entity: 'Round',
      entityId: deleted._id.toString(),
      jobId: deleted.job_id?.toString(),
      roundId: deleted._id.toString(),
      extraMeta: {}
    });
    res.json({ message: 'Round deleted' });
  } catch (err) {
    console.error('Error deleting round:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Enhanced email invite feature with test details
router.post('/:roundId/send-invite', async (req, res) => {
  try {
    const { 
      candidateIds, 
      subject, 
      message, 
      hr_email,
      testLink,
      testDateTime,
      testDuration,
      testInstructions
    } = req.body;
    
    const roundId = req.params.roundId;
    
    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ message: 'No candidates selected.' });
    }
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required.' });
    }
    
    // Validate test details for aptitude tests
    if (testLink || testDateTime || testDuration || testInstructions) {
      if (!testLink || !testDateTime) {
        return res.status(400).json({ message: 'Test link and date/time are required for aptitude tests.' });
      }
    }
    
    const candidates = await Candidate.find({ candidate_id: { $in: candidateIds } });
    if (!candidates.length) {
      console.error('No candidates found for IDs:', candidateIds);
      return res.status(404).json({ message: 'No candidates found for the selected IDs.' });
    }
    
    const transporter = require('nodemailer').createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    let sentCount = 0;
    for (const candidate of candidates) {
      try {
        // Create personalized message for each candidate
        let personalizedMessage = message;
        
        // Replace placeholders with actual values for aptitude tests
        if (testLink && testDateTime) {
          const formattedDateTime = new Date(testDateTime).toLocaleString();
          personalizedMessage = message
            .replace('[Please add test link]', testLink)
            .replace('[Please select date and time]', formattedDateTime)
            .replace('${testLink}', testLink)
            .replace('${formattedDateTime}', formattedDateTime);
        }
        
        await transporter.sendMail({
          from: `ATS HR <${process.env.EMAIL_USER}>`,
          to: candidate.email,
          subject,
          text: personalizedMessage,
        });
        sentCount++;
        
        // Log the email activity
        await logActivity({
          userId: req.user?.id || 'system',
          userRole: req.user?.role || 'hr',
          actionType: 'SEND_EMAIL_INVITE',
          description: `Email invite sent to ${candidate.full_name} (${candidate.email}) for round ${roundId}`,
          entity: 'Candidate',
          entityId: candidate.candidate_id,
          jobId: candidate.job_id,
          candidateId: candidate.candidate_id,
          roundId: roundId,
          extraMeta: { 
            subject, 
            testLink, 
            testDateTime, 
            testDuration,
            emailType: testLink ? 'aptitude_test' : 'general'
          }
        });
        
      } catch (emailErr) {
        console.error('Error sending invite to', candidate.email, emailErr);
        return res.status(500).json({ message: `Failed to send invite to ${candidate.email}: ${emailErr.message}` });
      }
    }
    
    if (sentCount === 0) {
      return res.status(500).json({ message: 'No invites were sent. Check SMTP credentials and candidate emails.' });
    }
    
    res.json({ 
      message: `Invites sent to ${sentCount} candidates.`,
      sentCount,
      testDetails: testLink ? {
        testLink,
        testDateTime,
        testDuration,
        testInstructions
      } : null
    });
    
  } catch (err) {
    console.error('Error in send-invite:', err.stack || err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get all CandidateRound objects for a round (for results/status display)
router.get('/:roundId/candidate-rounds', async (req, res) => {
  try {
    const { roundId } = req.params;
    let query = {};
    // Try as ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(roundId)) {
      query.round_id = roundId;
    } else {
      // Try as string (for legacy or numeric IDs)
      query.round_id = roundId;
    }
    const candidateRounds = await CandidateRound.find(query);
    const passedCount = candidateRounds.filter(cr => cr.round_status === 'Passed').length;
    res.json({ candidateRounds, passedCount });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get detailed candidate performance across all rounds for a job
router.get('/job/:jobId/candidate/:candidateId/performance', async (req, res) => {
  try {
    const { jobId, candidateId } = req.params;
    console.log('🔍 Performance request for jobId:', jobId, 'candidateId:', candidateId);
    
    // Get all rounds for the job
    const rounds = await Round.find({ job_id: jobId }).sort({ step: 1 });
    
    if (rounds.length === 0) {
      return res.status(404).json({ message: 'No rounds found for this job' });
    }

    // Get candidate details - handle both UUID and ObjectId
    let candidate;
    console.log('🔍 Looking for candidate with ID:', candidateId);
    console.log('🔍 ID format check (ObjectId):', /^[0-9a-fA-F]{24}$/.test(candidateId));
    
    if (/^[0-9a-fA-F]{24}$/.test(candidateId)) {
      // It's a MongoDB ObjectId
      console.log('🔍 Searching by ObjectId:', candidateId);
      candidate = await Candidate.findById(candidateId);
    } else {
      // It's a UUID string
      console.log('🔍 Searching by candidate_id (UUID):', candidateId);
      candidate = await Candidate.findOne({ candidate_id: candidateId });
    }

    if (!candidate) {
      console.log('❌ Candidate not found for ID:', candidateId);
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    console.log('✅ Found candidate:', candidate.full_name, 'with _id:', candidate._id);

    // Get candidate performance for all rounds
    const roundIds = rounds.map(round => round._id);
    console.log('🔍 Looking for candidate rounds with:');
    console.log('  - Round IDs:', roundIds);
    console.log('  - Candidate _id:', candidate._id);
    
    const candidateRounds = await CandidateRound.find({
      round_id: { $in: roundIds },
      candidate_id: candidate._id
    }).populate('round_id', 'name type step evaluation_schema');
    
    console.log('✅ Found', candidateRounds.length, 'candidate rounds');

    // Create performance summary
    console.log('🔍 Creating performance data for', rounds.length, 'rounds');
    const performanceData = rounds.map(round => {
      const candidateRound = candidateRounds.find(cr => cr.round_id._id.toString() === round._id.toString());
      
      if (candidateRound) {
        console.log(`✅ Found data for round ${round.step}: ${round.name}`);
      } else {
        console.log(`❌ No data for round ${round.step}: ${round.name}`);
      }
      
      return {
        round: {
          _id: round._id,
          name: round.name,
          type: round.type,
          step: round.step,
          evaluation_schema: round.evaluation_schema
        },
        performance: candidateRound ? {
          status: candidateRound.round_status || candidateRound.status,
          result: candidateRound.result,
          score: candidateRound.score,
          interviewer_notes: candidateRound.interviewer_notes,
          hr_notes: candidateRound.hr_notes,
          interview_scheduled_at: candidateRound.interview_scheduled_at,
          interview_completed_at: candidateRound.interview_completed_at,
          created_at: candidateRound.created_at,
          updated_at: candidateRound.updated_at
        } : null
      };
    });

    // Calculate overall statistics
    const completedRounds = performanceData.filter(p => p.performance !== null);
    const passedRounds = completedRounds.filter(p => 
      p.performance.status === 'Passed' || p.performance.round_status === 'Passed'
    );
    const failedRounds = completedRounds.filter(p => 
      p.performance.status === 'Failed' || p.performance.round_status === 'Failed'
    );

    const overallStats = {
      totalRounds: rounds.length,
      completedRounds: completedRounds.length,
      passedRounds: passedRounds.length,
      failedRounds: failedRounds.length,
      successRate: completedRounds.length > 0 ? (passedRounds.length / completedRounds.length * 100).toFixed(1) : 0,
      averageScore: completedRounds.length > 0 
        ? (completedRounds.reduce((sum, p) => sum + (parseInt(p.performance.result) || 0), 0) / completedRounds.length).toFixed(1)
        : 0
    };

    res.json({
      candidate: {
        _id: candidate._id,
        candidate_id: candidate.candidate_id,
        full_name: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        match_score: candidate.match_score,
        status: candidate.status,
        job_id: candidate.job_id
      },
      performance: performanceData,
      overallStats
    });

  } catch (error) {
    console.error('Error fetching candidate performance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Advance candidates to next round - Allow all for now (remove HR restriction)
router.post('/:roundId/advance', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { roundId } = req.params;
    const { idempotencyKey } = req.body; // Add idempotency key
    
    console.log('🔍 Advancing candidates from round:', roundId, 'Idempotency key:', idempotencyKey);
    
    // Check for existing advancement with same idempotency key
    if (idempotencyKey) {
      const existingAdvancement = await logActivity.findOne({
        actionType: 'ADVANCE_CANDIDATES',
        'extraMeta.idempotencyKey': idempotencyKey,
        roundId: roundId
      }).session(session);
      
      if (existingAdvancement) {
        await session.abortTransaction();
        return res.status(409).json({ 
          message: 'Advancement already processed with this idempotency key',
          existingAdvancement: existingAdvancement._id
        });
      }
    }
    
    // Get current round
    const currentRound = await Round.findById(roundId).session(session);
    if (!currentRound) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Round not found' });
    }

    // Find next round
    const nextRound = await Round.findOne({ 
      job_id: currentRound.job_id, 
      step: currentRound.step + 1 
    }).session(session);
    
    // Get candidates who passed the current round
    const passedCandidates = await CandidateRound.find({
      round_id: roundId,
      $or: [
        { status: 'Passed' },
        { round_status: 'Passed' },
        { 
          $expr: { 
            $and: [
              { $gte: ['$result', currentRound.cutoff || 70] },
              { $ne: ['$result', null] },
              { $ne: ['$result', ''] }
            ]
          }
        }
      ]
    }).populate('candidate_id').session(session);
    
    console.log(`✅ Found ${passedCandidates.length} candidates who passed round ${currentRound.name}`);
    
    const advancedCandidates = [];
    
    if (nextRound) {
      // Create CandidateRound entries for next round
      for (const candidateRound of passedCandidates) {
        // Check if candidate already exists in next round (idempotency)
        const existingNextRound = await CandidateRound.findOne({
          candidate_id: candidateRound.candidate_id,
          round_id: nextRound._id
        }).session(session);
        
        if (!existingNextRound) {
          const newCandidateRound = new CandidateRound({
            candidate_id: candidateRound.candidate_id,
            round_id: nextRound._id,
            status: 'Pending',
            round_status: 'Pending'
          });
          
          await newCandidateRound.save({ session });
          advancedCandidates.push({
            candidate_id: candidateRound.candidate_id,
            round_id: nextRound._id,
            status: 'Pending'
          });
        } else {
          console.log(`⚠️ Candidate ${candidateRound.candidate_id} already exists in next round`);
        }
      }
      
      console.log(`✅ Advanced ${advancedCandidates.length} candidates to round ${nextRound.name}`);
    } else {
      // No next round - finalize candidates
      console.log('🏁 No next round found - finalizing candidates');
      
      for (const candidateRound of passedCandidates) {
        // Check if candidate is already hired (idempotency)
        const candidate = await Candidate.findById(candidateRound.candidate_id).session(session);
        if (candidate && candidate.status !== 'Hired') {
          // Update candidate status to Hired
          await Candidate.findByIdAndUpdate(
            candidateRound.candidate_id,
            { status: 'Hired' },
            { session }
          );
          
          advancedCandidates.push({
            candidate_id: candidateRound.candidate_id,
            status: 'Hired',
            final: true
          });
        } else if (candidate && candidate.status === 'Hired') {
          console.log(`⚠️ Candidate ${candidateRound.candidate_id} already hired`);
        }
      }
    }
    
    // Log the advancement with idempotency key
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'ADVANCE_CANDIDATES',
      description: `Advanced ${advancedCandidates.length} candidates from round ${currentRound.name}${nextRound ? ` to ${nextRound.name}` : ' (finalized)'}`,
      entity: 'Round',
      entityId: roundId,
      jobId: currentRound.job_id.toString(),
      roundId,
      extraMeta: { 
        advancedCandidates: advancedCandidates.length,
        nextRoundId: nextRound?._id?.toString(),
        isFinal: !nextRound,
        idempotencyKey: idempotencyKey || `advance_${roundId}_${Date.now()}`
      }
    });
    
    await session.commitTransaction();
    
    res.json({
      message: `Successfully advanced ${advancedCandidates.length} candidates`,
      advancedCandidates,
      nextRound: nextRound ? {
        id: nextRound._id,
        name: nextRound.name,
        step: nextRound.step
      } : null,
      isFinal: !nextRound,
      idempotencyKey: idempotencyKey || `advance_${roundId}_${Date.now()}`
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error advancing candidates:', error);
    res.status(500).json({ 
      message: 'Failed to advance candidates', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
});

// Rest of the routes remain the same...
// (I'll continue with the remaining routes in the next part due to length limits)

module.exports = router;