const express = require('express');
const router = express.Router();
const Round = require('../models/Round');
const CandidateRound = require('../models/CandidateRound');
const Candidate = require('../models/Candidate');
const Interviewer = require('../models/Interviewer');
const Job = require('../models/Job');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const logActivity = require('../utils/logActivity');

// Configure Google Calendar API
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// GET /api/rounds/:roundId/eligible-candidates
router.get('/rounds/:roundId/eligible-candidates', async (req, res) => {
  try {
    const { roundId } = req.params;
    
    // Find current round details
    const currentRound = await Round.findById(roundId);
    if (!currentRound) {
      return res.status(404).json({ message: 'Round not found' });
    }

    // Get all rounds for that job in order
    const allRounds = await Round.find({ job_id: currentRound.job_id }).sort({ created_at: 1 });
    
    // Find previous round
    const currentRoundIndex = allRounds.findIndex(round => round._id.toString() === roundId);
    const previousRound = currentRoundIndex > 0 ? allRounds[currentRoundIndex - 1] : null;

    if (!previousRound) {
      // If this is the first round, return candidates who meet the initial job cutoff
      const job = await Job.findById(currentRound.job_id);
      const cutoff = job?.cutoff_score || job?.cutoff || 70; // Use job's cutoff_score or default
      
      const candidates = await Candidate.find({ 
        job_id: currentRound.job_id,
        match_score: { $gte: cutoff } // Only candidates with score >= cutoff
      });
      
      console.log(`First round: Found ${candidates.length} candidates with score >= ${cutoff} for job ${currentRound.job_id}`);
      return res.json(candidates);
    }

    // Return candidates who passed/shortlisted previous round with score >= cutoff
    const passedCandidates = await CandidateRound.find({
      round_id: previousRound._id,
      round_status: { $in: ['Passed', 'Shortlisted'] } // Both Passed and Shortlisted candidates move to next round
    }).populate('candidate_id');

    // Filter by round cutoff score
    const cutoff = currentRound.cutoff || 70;
    const eligibleCandidates = passedCandidates
      .filter(cr => {
        // For interview rounds, check if they have a result score
        if (previousRound.type === 'interview') {
          return (cr.result || 0) >= cutoff;
        }
        // For aptitude rounds, check the result score
        return (cr.result || 0) >= cutoff;
      })
      .map(cr => cr.candidate_id);
    
    console.log(`Round ${currentRound.name}: Found ${eligibleCandidates.length} candidates with score >= ${cutoff} from ${passedCandidates.length} passed candidates`);
    res.json(eligibleCandidates);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// POST /api/rounds/:roundId/schedule-interview
router.post('/rounds/:roundId/schedule-interview', async (req, res) => {
  try {
    const { roundId } = req.params;
    const { candidateId, interviewerId, scheduledAt } = req.body;

    console.log('Schedule interview request:', { roundId, candidateId, interviewerId, scheduledAt });

    // Validate candidate and interviewer
    const candidate = await Candidate.findById(candidateId);
    const interviewer = await Interviewer.findById(interviewerId);
    
    console.log('Found candidate:', candidate ? candidate.full_name : 'NOT FOUND');
    console.log('Found interviewer:', interviewer ? interviewer.name : 'NOT FOUND');
    
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }
    
    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found' });
    }

    // Try to create Google Calendar event (optional for now)
    let meetLink = null;
    let eventId = null;
    
    try {
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        const event = {
          summary: `Interview: ${candidate.full_name} - ${interviewer.name}`,
          description: `Interview for ${candidate.full_name}`,
          start: {
            dateTime: scheduledAt,
            timeZone: 'Asia/Kolkata',
          },
          end: {
            dateTime: new Date(new Date(scheduledAt).getTime() + 60 * 60 * 1000), // 1 hour later
            timeZone: 'Asia/Kolkata',
          },
          attendees: [
            { email: candidate.email },
            { email: interviewer.email }
          ],
          conferenceData: {
            createRequest: {
              requestId: `interview-${Date.now()}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        };

        const calendarResponse = await calendar.events.insert({
          calendarId: 'primary',
          resource: event,
          conferenceDataVersion: 1,
        });

        meetLink = calendarResponse.data.conferenceData?.entryPoints?.[0]?.uri;
        eventId = calendarResponse.data.id;
        console.log('Google Calendar event created successfully');
      } else {
        console.log('Google Calendar credentials not configured, skipping calendar event creation');
        // Generate a mock meet link for testing
        meetLink = `https://meet.google.com/mock-interview-${Date.now()}`;
      }
    } catch (calendarError) {
      console.error('Google Calendar error:', calendarError);
      // Generate a mock meet link for testing
      meetLink = `https://meet.google.com/mock-interview-${Date.now()}`;
    }

    // Update CandidateRound record
    const candidateRound = await CandidateRound.findOneAndUpdate(
      { candidate_id: candidateId, round_id: roundId },
      {
        interview_scheduled_at: scheduledAt,
        google_meet_link: meetLink,
        google_event_id: eventId,
        interviewer_id: interviewerId
      },
      { upsert: true, new: true }
    );

    // Try to send email notifications (optional for now)
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await sendInterviewInvitation(candidate, interviewer, meetLink, scheduledAt);
        console.log('Email invitation sent successfully');
      } else {
        console.log('Email credentials not configured, skipping email notification');
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    // Log activity
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'SCHEDULE_INTERVIEW',
      description: `Interview scheduled for ${candidate.full_name} with ${interviewer.name}`,
      entity: 'CandidateRound',
      entityId: candidateRound._id.toString(),
      roundId,
      candidateId: candidateId,
      extraMeta: { scheduledAt, meetLink }
    });

    res.json({ message: 'Interview scheduled successfully', candidateRound });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// POST /api/candidate-rounds/:candidateRoundId/feedback
router.post('/candidate-rounds/:candidateRoundId/feedback', async (req, res) => {
  try {
    const { candidateRoundId } = req.params;
    const { rating, technical_skills, communication, overall_comments, recommendation } = req.body;

    // Save feedback to database
    const candidateRound = await CandidateRound.findByIdAndUpdate(
      candidateRoundId,
      {
        interviewer_feedback: {
          rating,
          technical_skills,
          communication,
          overall_comments,
          recommendation,
          submitted_at: new Date()
        },
        status: recommendation === 'Hire' ? 'Passed' : 'Failed'
      },
      { new: true }
    ).populate('candidate_id');

    // Update candidate status
    await Candidate.findByIdAndUpdate(
      candidateRound.candidate_id._id,
      { status: recommendation === 'Hire' ? 'Shortlisted' : 'Rejected' }
    );

    // Notify HR via email
    await notifyHRInterviewComplete(candidateRound.candidate_id, {
      rating,
      technical_skills,
      communication,
      overall_comments,
      recommendation
    });

    // Log activity
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'SUBMIT_INTERVIEW_FEEDBACK',
      description: `Interview feedback submitted for ${candidateRound.candidate_id.full_name}`,
      entity: 'CandidateRound',
      entityId: candidateRoundId,
      candidateId: candidateRound.candidate_id._id.toString(),
      extraMeta: { rating, recommendation }
    });

    res.json({ message: 'Feedback submitted successfully', candidateRound });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// GET /api/interviewers
router.get('/interviewers', async (req, res) => {
  try {
    const interviewers = await Interviewer.find().sort({ name: 1 });
    res.json(interviewers);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// GET /api/jobs/:jobId/candidate-flow
router.get('/jobs/:jobId/candidate-flow', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job details
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // Get all rounds for this job
    const rounds = await Round.find({ job_id: jobId }).sort({ created_at: 1 });
    
    // Get all candidates for this job
    const allCandidates = await Candidate.find({ job_id: jobId });
    
    // Calculate candidate flow through rounds
    const candidateFlow = {
      job: {
        id: job._id,
        title: job.title,
        cutoff: job.cutoff || 70
      },
      rounds: [],
      totalCandidates: allCandidates.length,
      eligibleForFirstRound: 0,
      finalCandidates: []
    };
    
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const isFirstRound = i === 0;
      
      if (isFirstRound) {
        // First round: candidates with match_score >= job cutoff
        const eligibleCandidates = allCandidates.filter(c => (c.match_score || 0) >= job.cutoff);
        candidateFlow.eligibleForFirstRound = eligibleCandidates.length;
        
        candidateFlow.rounds.push({
          roundId: round._id,
          name: round.name,
          type: round.type,
          cutoff: round.cutoff || job.cutoff,
          eligibleCandidates: eligibleCandidates.length,
          passedCandidates: 0,
          isFirstRound: true
        });
      } else {
        // Subsequent rounds: candidates who passed previous round
        const previousRound = rounds[i - 1];
        const passedCandidates = await CandidateRound.find({
          round_id: previousRound._id,
          round_status: 'Passed'
        }).populate('candidate_id');
        
        // Filter by current round cutoff
        const cutoff = round.cutoff || 70;
        const eligibleCandidates = passedCandidates.filter(cr => (cr.result || 0) >= cutoff);
        
        candidateFlow.rounds.push({
          roundId: round._id,
          name: round.name,
          type: round.type,
          cutoff: cutoff,
          eligibleCandidates: eligibleCandidates.length,
          passedCandidates: 0,
          isFirstRound: false
        });
      }
    }
    
    // Get final candidates (those who passed the last round)
    if (rounds.length > 0) {
      const lastRound = rounds[rounds.length - 1];
      const finalCandidates = await CandidateRound.find({
        round_id: lastRound._id,
        round_status: 'Passed'
      }).populate('candidate_id');
      
      candidateFlow.finalCandidates = finalCandidates.map(cr => ({
        id: cr.candidate_id._id,
        name: cr.candidate_id.full_name,
        email: cr.candidate_id.email,
        finalScore: cr.result
      }));
    }
    
    res.json(candidateFlow);
  } catch (err) {
    console.error('Error getting candidate flow:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// POST /api/rounds/:roundId/candidates/:candidateId/status
router.post('/rounds/:roundId/candidates/:candidateId/status', async (req, res) => {
  try {
    const { roundId, candidateId } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['Shortlisted', 'Failed', 'Pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be one of: Shortlisted, Failed, Pending' 
      });
    }

    // Find and update candidate round status
    const candidateRound = await CandidateRound.findOneAndUpdate(
      { round_id: roundId, candidate_id: candidateId },
      { 
        round_status: status,
        hr_notes: notes,
        updated_at: new Date()
      },
      { new: true }
    ).populate('candidate_id');

    if (!candidateRound) {
      return res.status(404).json({ message: 'Candidate round not found' });
    }

    // If candidate is shortlisted/failed, update candidate status
    if (status === 'Shortlisted' || status === 'Failed') {
      await Candidate.findByIdAndUpdate(candidateId, {
        status: status === 'Shortlisted' ? 'Shortlisted' : 'Rejected'
      });
    }

    // Log the activity
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'UPDATE_CANDIDATE_STATUS',
      description: `Updated ${candidateRound.candidate_id.full_name}'s status to ${status} in ${roundId}`,
      entity: 'CandidateRound',
      entityId: candidateRound._id.toString(),
      candidateId: candidateId,
      extraMeta: { status, notes }
    });

    res.json({
      message: 'Status updated successfully',
      candidateRound
    });

  } catch (err) {
    console.error('Error updating candidate status:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Email Functions
async function sendInterviewInvitation(candidate, interviewer, meetLink, dateTime) {
  try {
    await transporter.sendMail({
      from: `ATS HR <${process.env.EMAIL_USER}>`,
      to: candidate.email,
      subject: 'Interview Invitation',
      text: `Dear ${candidate.full_name},\n\nYou have been invited for an interview with ${interviewer.name}.\n\nDate: ${new Date(dateTime).toLocaleString()}\nMeet Link: ${meetLink}\n\nBest regards,\nATS HR Team`
    });

    await transporter.sendMail({
      from: `ATS HR <${process.env.EMAIL_USER}>`,
      to: interviewer.email,
      subject: 'Interview Scheduled',
      text: `Dear ${interviewer.name},\n\nYou have an interview scheduled with ${candidate.full_name}.\n\nDate: ${new Date(dateTime).toLocaleString()}\nMeet Link: ${meetLink}\n\nBest regards,\nATS HR Team`
    });
  } catch (err) {
    console.error('Error sending interview emails:', err);
  }
}

async function sendFeedbackRequest(interviewer, candidateRoundId) {
  try {
    await transporter.sendMail({
      from: `ATS HR <${process.env.EMAIL_USER}>`,
      to: interviewer.email,
      subject: 'Interview Feedback Request',
      text: `Dear ${interviewer.name},\n\nPlease submit your feedback for the recent interview.\n\nFeedback Link: ${process.env.FRONTEND_URL}/feedback/${candidateRoundId}\n\nBest regards,\nATS HR Team`
    });
  } catch (err) {
    console.error('Error sending feedback request:', err);
  }
}

async function notifyHRInterviewComplete(candidate, feedback) {
  try {
    await transporter.sendMail({
      from: `ATS HR <${process.env.EMAIL_USER}>`,
      to: process.env.HR_EMAIL || process.env.EMAIL_USER,
      subject: 'Interview Completed - Feedback Submitted',
      text: `Interview completed for ${candidate.full_name}.\n\nFeedback:\nRating: ${feedback.rating}/10\nTechnical Skills: ${feedback.technical_skills}\nCommunication: ${feedback.communication}\nOverall Comments: ${feedback.overall_comments}\nRecommendation: ${feedback.recommendation}\n\nBest regards,\nATS System`
    });
  } catch (err) {
    console.error('Error notifying HR:', err);
  }
}

module.exports = router; 