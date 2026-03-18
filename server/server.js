// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
// const morgan = require('morgan'); // Removed - install with: npm install morgan

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// app.use(morgan('combined')); // Removed - install morgan if you want HTTP request logging

// Static files (if needed)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const connectDB = require('./config/database');
connectDB();

// Import routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const logRoutes = require('./routes/logRoutes');
const roundRoutes = require('./routes/roundRoutes');
const interviewerRoutes = require('./routes/interviewers');
const interviewRoutes = require('./routes/interviews');
const dashboardRoutes = require('./routes/dashboardRoutes');
const Job = require('./models/Job'); // Added for public job endpoint

// Auth middleware
const authMiddleware = require('./middleware/auth');

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
console.log('🔧 Registering routes...');

try {
  // Public routes
  app.use('/api/auth', authRoutes);
  console.log('   ✅ /api/auth/* registered');

  // Public job endpoint for Python backend
  app.get('/api/public/jobs/:jobId', async (req, res) => {
    try {
      const job = await Job.findById(req.params.jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      res.json({ job });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server Error' });
    }
  });
  console.log('   ✅ /api/public/jobs/* registered (public)');

  // Protected routes
  app.use('/api/jobs', authMiddleware, jobRoutes);
  console.log('   ✅ /api/jobs/* registered');

  app.use('/api/resume', authMiddleware, resumeRoutes);
  console.log('   ✅ /api/resume/* registered');

  app.use('/api/candidates', authMiddleware, candidateRoutes);
  console.log('   ✅ /api/candidates/* registered');

  app.use('/api/logs', authMiddleware, logRoutes);
  console.log('   ✅ /api/logs/* registered (with auth)');

  app.use('/api/rounds', authMiddleware, roundRoutes);
  console.log('   ✅ /api/rounds/* registered');

  app.use('/api/interviewers', authMiddleware, interviewerRoutes);
  console.log('   ✅ /api/interviewers/* registered');

  app.use('/api/interviews', authMiddleware, interviewRoutes);
  console.log('   ✅ /api/interviews/* registered');

  // Register dashboard routes (no auth middleware)
  app.use('/api/dashboard', dashboardRoutes);
  console.log('   ✅ /api/dashboard/* registered');

} catch (error) {
  console.error('❌ Error registering routes:', error.message);
  process.exit(1);
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err.stack);
  
  // Default error response
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    error.stack = err.stack;
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;