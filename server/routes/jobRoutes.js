const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const mongoose = require('mongoose');
//const multer = require('multer');
const path = require('path');
const logActivity = require('../utils/logActivity');

require('dotenv').config();

// POST /api/jobs → Create job
router.post('/', async (req, res) => {
  try {
    const newJob = new Job(req.body);
    await newJob.save();
    // Log job creation
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'CREATE_JOB',
      description: `HR created job: ${newJob.title} #${newJob._id}`,
      entity: 'Job',
      entityId: newJob._id.toString(),
      jobId: newJob._id.toString(),
      extraMeta: req.body
    });
    res.status(201).json({ message: 'Job created', job: newJob });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// (Optional) GET all jobs
router.get('/', async (req, res) => {
  const jobs = await Job.find();
  res.json(jobs);
});

// GET /api/jobs/:jobId → Get job by ID
router.get('/:jobId', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// PUT /api/jobs/:jobId → Update job by ID
router.put('/:jobId', async (req, res) => {
  try {
    const updatedJob = await Job.findByIdAndUpdate(req.params.jobId, req.body, { new: true });
    if (!updatedJob) return res.status(404).json({ error: 'Job not found' });
    // Log job update
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'UPDATE_JOB',
      description: `Job updated: ${updatedJob.title} #${updatedJob._id}`,
      entity: 'Job',
      entityId: updatedJob._id.toString(),
      jobId: updatedJob._id.toString(),
      extraMeta: req.body
    });
    res.json({ message: 'Job updated', job: updatedJob });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE /api/jobs/:jobId → Delete job by _id or jobId
router.delete('/:jobId', async (req, res) => {
  try {
    let deletedJob = await Job.findByIdAndDelete(req.params.jobId);
    if (!deletedJob) {
      // Try by jobId (UUID)
      deletedJob = await Job.findOneAndDelete({ jobId: req.params.jobId });
    }
    if (!deletedJob) return res.status(404).json({ error: 'Job not found' });
    // Log job deletion
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'DELETE_JOB',
      description: `Job deleted: ${deletedJob.title} #${deletedJob._id}`,
      entity: 'Job',
      entityId: deletedJob._id.toString(),
      jobId: deletedJob._id.toString(),
      extraMeta: {}
    });
    res.json({ message: 'Job deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server Error' });
  }
});

// POST /api/jobs/:jobId/recalculate-shortlisting → Recalculate shortlisting for all candidates
router.post('/:jobId/recalculate-shortlisting', async (req, res) => {
  try {
    console.log('🔄 Starting shortlisting recalculation for job:', req.params.jobId);
    
    // Find the job
    let job = await Job.findById(req.params.jobId);
    if (!job) {
      // Try by jobId (UUID)
      job = await Job.findOne({ jobId: req.params.jobId });
    }
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get all candidates for this job
    const candidates = await Candidate.find({ job_id: job._id });
    console.log(`📊 Found ${candidates.length} candidates to recalculate`);

    let updatedCount = 0;
    const cutoffScore = job.cutoff_score || 70;

    // Create comprehensive job description for matching
    const jdParts = [];
    if (job.requirements) jdParts.push(job.requirements);
    if (job.skills && Array.isArray(job.skills)) jdParts.push(job.skills.join(', '));
    if (job.keywords && Array.isArray(job.keywords)) jdParts.push(job.keywords.join(', '));
    if (job.description) jdParts.push(job.description);
    if (job.title) jdParts.push(job.title);
    if (job.department) jdParts.push(job.department);
    
    const jobDescription = jdParts.filter(Boolean).join(' | ');

    for (const candidate of candidates) {
      try {
        // Use the existing match_score
        const matchScore = candidate.match_score || 0;
        // Update candidate status only
        const newStatus = matchScore >= cutoffScore ? 'Shortlisted' : 'Rejected';
        await Candidate.findByIdAndUpdate(candidate._id, {
          status: newStatus,
          updated_at: new Date()
        });
        updatedCount++;
        console.log(`✅ Updated candidate ${candidate.full_name}: score=${matchScore}%, status=${newStatus}`);
      } catch (candidateError) {
        console.error(`❌ Error updating candidate ${candidate.full_name}:`, candidateError);
      }
    }

    // Log the recalculation activity
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'RECALCULATE_SHORTLISTING',
      description: `Recalculated shortlisting for job: ${job.title} - ${updatedCount} candidates updated`,
      entity: 'Job',
      entityId: job._id.toString(),
      jobId: job._id.toString(),
      extraMeta: { updatedCount, cutoffScore }
    });

    console.log(`✅ Recalculation complete: ${updatedCount} candidates updated`);
    res.json({ 
      message: `Recalculated scores for ${updatedCount} candidates`,
      updated_count: updatedCount,
      job_title: job.title,
      cutoff_score: cutoffScore
    });

  } catch (error) {
    console.error('❌ Error in recalculate shortlisting:', error);
    res.status(500).json({ error: 'Failed to recalculate shortlisting' });
  }
});

module.exports = router;
