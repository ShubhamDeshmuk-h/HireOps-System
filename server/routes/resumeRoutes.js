const express = require('express');
const { upload } = require('../middleware/uploadMiddleware');
const { uploadSingleResume, getResume } = require('../controllers/resumeController');

const router = express.Router();

router.post('/upload/single', upload.single('resume'), uploadSingleResume);
router.get('/:id', getResume);

module.exports = router;
