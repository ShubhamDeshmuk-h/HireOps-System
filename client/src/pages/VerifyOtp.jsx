import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function VerifyOtp() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpStatus, setOtpStatus] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const navigate = useNavigate();

  // Send OTP to email
  const handleSendOtp = async () => {
    setOtpStatus('');
    if (!email) return setOtpStatus('❌ Please enter your email');
    try {
      await axios.post('http://localhost:5000/api/auth/request-otp', { email });
      setOtpStatus('✅ OTP sent to your email!');
    } catch (err) {
      setOtpStatus('❌ Failed to send OTP');
    }
  };

  // Verify OTP only
  const handleVerifyOtp = async () => {
    setOtpStatus('');
    if (!email || !otp) return setOtpStatus('❌ Email and OTP are required');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-otp-reset', {
        email,
        otp,
      });

      if (res.data.message.includes('verified') || res.data.success) {
        setOtpStatus('✅ OTP Verified! You may now reset your password.');
        setOtpVerified(true);
      } else {
        setOtpStatus('❌ Invalid OTP');
      }
    } catch (err) {
      setOtpStatus(err.response?.data?.message || '❌ Failed to verify OTP');
    }
  };

  // Final reset after OTP verification
  const handleResetPassword = async () => {
    setResetStatus('');
    if (newPassword !== confirmPassword) {
      return setResetStatus('❌ Passwords do not match');
    }

    try {
      const res = await axios.post('http://localhost:5000/api/auth/verify-otp-reset', {
        email,
        otp,
        newPassword,
      });

      setResetStatus('✅ Password reset successful!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setResetStatus(err.response?.data?.message || '❌ Failed to reset password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-blue-700 text-center mb-6">Verify OTP & Reset Password</h2>

        <input
          type="email"
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={handleSendOtp}
          className="w-full mb-4 bg-blue-500 text-white py-2 rounded-xl font-semibold hover:bg-blue-600 transition"
        >
          Send OTP
        </button>

        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full mb-3 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={handleVerifyOtp}
          className="w-full mb-4 bg-blue-500 text-white py-2 rounded-xl font-semibold hover:bg-green-600 transition"
        >
          Verify OTP
        </button>

        {otpStatus && (
          <p className={`text-sm mb-3 text-center ${otpStatus.includes('✅') ? 'text-blue-600' : 'text-red-600'}`}>
            {otpStatus}
          </p>
        )}
        <div className="text-center mt-4 text-sm">
          <a href="/login" className="text-blue-600 hover:underline">
            back to login!
          </a>
        </div>

        {/* Show password fields only after OTP verified */}
        {otpVerified && (
          <>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-3 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full mb-4 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            />

            <button
              onClick={handleResetPassword}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-semibold transition duration-300"
            >
              Reset Password
            </button>

            {resetStatus && (
              <p className={`text-sm mt-4 text-center ${resetStatus.includes('✅') ? 'text-blue-600' : 'text-red-600'}`}>
                {resetStatus}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyOtp;
