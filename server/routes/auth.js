const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Otp = require('../models/otp');

const JWT_SECRET = process.env.JWT_SECRET;

// Helper: Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// === 1. Request OTP ===
router.post('/request-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: 'Email is required' });

  const otpCode = generateOTP();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await Otp.deleteMany({ email }); // Remove old OTPs

    await Otp.create({
      email,
      otp: otpCode,
      createdAt: new Date(),
    });

    await transporter.sendMail({
      from: `"ATS Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is ${otpCode}. It expires in 5 minutes.`,
    });

    res.json({ message: 'OTP sent to email.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send OTP', error: err.message });
  }
});

// === 2. Verify OTP + Optional Reset Password ===
router.post('/verify-otp-reset', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Check if OTP is expired (5 mins)
    const now = new Date();
    const diffMs = now - otpRecord.createdAt;
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes > 5) {
      await Otp.deleteMany({ email }); // clean up
      return res.status(400).json({ message: 'OTP expired. Please request again.' });
    }

    // Only verify OTP
    if (!newPassword) {
      return res.json({ message: 'OTP verified successfully', success: true });
    }

    // Reset password (if newPassword is sent)
    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = await User.findOneAndUpdate({ email }, { password: hashed });

    if (!updated) return res.status(404).json({ message: 'User not found' });

    await Otp.deleteMany({ email }); // delete OTP after use

    res.json({ message: 'Password reset successfully ✅' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// === 3. Login ===
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
