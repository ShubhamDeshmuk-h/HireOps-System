const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Resume = require('../models/Resume');
const ActivityLog = require('../models/ActivityLog');

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    // Count total jobs
    const totalJobs = await Job.countDocuments();
    // Count total candidates
    const totalCandidates = await Candidate.countDocuments();
    // Count resumes uploaded
    const resumesUploaded = await Resume.countDocuments();
    // Count offers sent today (actionType: 'OFFER_SENT', today only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const offersSentToday = await ActivityLog.countDocuments({
      actionType: 'OFFER_SENT',
      timestamp: { $gte: today, $lt: tomorrow }
    });
    // Count shortlisted today (actionType: 'SHORTLISTED', today only)
    const shortlistedToday = await ActivityLog.countDocuments({
      actionType: 'SHORTLISTED',
      timestamp: { $gte: today, $lt: tomorrow }
    });
    // Recent actions (last 7 logs)
    const recentActions = await ActivityLog.find({})
      .sort({ timestamp: -1 })
      .limit(7)
      .select('description timestamp');
    res.json({
      totalJobs,
      totalCandidates,
      resumesUploaded,
      offersSentToday,
      shortlistedToday,
      recentActions
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
});

module.exports = router;
