const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const multer = require('multer');

// Memory storage for processing files
const memoryStorage = multer.memoryStorage();

// GridFS storage for permanent storage
const gridStorage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => ({
    filename: Date.now() + '-' + file.originalname,
    bucketName: 'resumes',
    metadata: { jobId: req.body.jobId }
  })
});

// Use memory storage for processing, then save to GridFS
const upload = multer({ 
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = { upload }; 