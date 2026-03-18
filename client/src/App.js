// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import all pages and components
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VerifyOtp from './pages/VerifyOtp';
import Jobs from './pages/Jobs';
import MainLayout from './components/MainLayout';
import CreateJob from './pages/CreateJob';
import JobDetails from './pages/JobDetails';
import Logs from './pages/Logs';
import RoundDetails from './pages/RoundDetails';
import FinalCandidates from './pages/FinalCandidates';

function App() {
  const [token, setToken] = React.useState(localStorage.getItem('token'));

  React.useEffect(() => {
    const onStorage = () => setToken(localStorage.getItem('token'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <Router>
      <Routes>
        {/* Default redirect to login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        {/* Remove public /logs route */}

        {/* Protected Routes - Require token */}
        {token ? (
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/create-job" element={<CreateJob />} />
            <Route path="/jobs/:jobId" element={<JobDetails />} />
            <Route path="/jobs/:jobId/rounds/:roundId" element={<RoundDetails />} />
            <Route path="/jobs/:jobId/final-candidates" element={<FinalCandidates />} />
            <Route path="/edit-job/:jobId" element={<CreateJob />} />
            <Route path="/logs" element={<Logs />} />
            {/* Add more protected routes here */}
          </Route>
        ) : (
          // Redirect any other path to login if not authenticated
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
}

export default App;