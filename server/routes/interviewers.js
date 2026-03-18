const express = require('express');
const router = express.Router();
const Interviewer = require('../models/Interviewer');
const logActivity = require('../utils/logActivity');
const auth = require('../middleware/auth');

// Get all interviewers
router.get('/', async (req, res) => {
  try {
    const interviewers = await Interviewer.find().sort({ name: 1 });
    res.json(interviewers);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Get interviewer by ID
router.get('/:id', async (req, res) => {
  try {
    const interviewer = await Interviewer.findById(req.params.id);
    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found' });
    }
    res.json(interviewer);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Create new interviewer
router.post('/', async (req, res) => {
  try {
    const { name, email, department, available_times } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if interviewer with same email already exists
    const existingInterviewer = await Interviewer.findOne({ email });
    if (existingInterviewer) {
      return res.status(400).json({ message: 'Interviewer with this email already exists' });
    }

    const interviewer = await Interviewer.create({
      name,
      email,
      department: department || 'General',
      available_times: available_times || []
    });

    // Log activity
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'CREATE_INTERVIEWER',
      description: `Created interviewer: ${name}`,
      entity: 'Interviewer',
      entityId: interviewer._id.toString(),
      extraMeta: { name, email, department }
    });

    res.status(201).json(interviewer);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Update interviewer
router.put('/:id', async (req, res) => {
  try {
    const { name, email, department, available_times } = req.body;
    
    const interviewer = await Interviewer.findByIdAndUpdate(
      req.params.id,
      { name, email, department, available_times },
      { new: true }
    );

    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found' });
    }

    // Log activity
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'UPDATE_INTERVIEWER',
      description: `Updated interviewer: ${interviewer.name}`,
      entity: 'Interviewer',
      entityId: interviewer._id.toString(),
      extraMeta: { name, email, department }
    });

    res.json(interviewer);
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

// Delete interviewer
router.delete('/:id', async (req, res) => {
  try {
    const interviewer = await Interviewer.findByIdAndDelete(req.params.id);
    
    if (!interviewer) {
      return res.status(404).json({ message: 'Interviewer not found' });
    }

    // Log activity
    await logActivity({
      userId: req.user?.id || 'unknown',
      userRole: req.user?.role || 'unknown',
      actionType: 'DELETE_INTERVIEWER',
      description: `Deleted interviewer: ${interviewer.name}`,
      entity: 'Interviewer',
      entityId: interviewer._id.toString(),
      extraMeta: { name: interviewer.name, email: interviewer.email }
    });

    res.json({ message: 'Interviewer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});

module.exports = router; 