import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaCalendar, FaUser, FaClock, FaMapMarkerAlt } from 'react-icons/fa';

export default function InterviewSchedulingModal({ 
  isOpen, 
  onClose, 
  round, 
  jobId, 
  onSuccess 
}) {
  const [candidates, setCandidates] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60); // minutes
  const [interviewType, setInterviewType] = useState('online'); // online/offline
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [interviewersLoading, setInterviewersLoading] = useState(false);

  useEffect(() => {
    if (isOpen && round) {
      fetchCandidates();
      fetchInterviewers();
      
      // Set default values for interview scheduling
      setEmailSubject(`${round.name} - Interview Invitation`);
      setEmailMessage(`Dear Candidate,

You have been invited for the ${round.name} interview.

Interview Details:
- Date & Time: [Please select date and time]
- Duration: ${duration} minutes
- Type: ${interviewType === 'online' ? 'Online (Google Meet)' : 'Offline'}

Meeting Link: [Meeting link will be added automatically]

Please ensure you are available at the scheduled time.

Best regards,
HR Team`);
    }
  }, [isOpen, round, duration, interviewType]);

  const fetchCandidates = async () => {
    try {
      setCandidatesLoading(true);
      console.log('Fetching eligible candidates for round:', round._id);
      const token = localStorage.getItem('token');
      
      // Get all rounds for this job to understand the flow
      const roundsRes = await axios.get(`http://localhost:5000/api/rounds/job/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allRounds = roundsRes.data.sort((a, b) => (a.step || 0) - (b.step || 0));
      
      // Find current round
      const currentRound = allRounds.find(r => r._id === round._id);
      if (!currentRound) {
        setCandidates([]);
        return;
      }

      let eligibleCandidates = [];
      
      if (currentRound.step === 1) {
        // Step 1: Get shortlisted candidates with match score >= job cutoff
        const jobRes = await axios.get(`http://localhost:5000/api/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const job = jobRes.data;
        const cutoff = job?.cutoff_score || 70;
        
        // Get all candidates for this job
        const candidatesRes = await axios.get(`http://localhost:5000/api/candidates?job_id=${jobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Filter candidates who are shortlisted AND have match score >= cutoff
        eligibleCandidates = candidatesRes.data.filter(candidate => {
          const isShortlisted = candidate.status === 'Shortlisted' || candidate.status === 'shortlisted';
          const hasGoodMatchScore = (candidate.match_score || 0) >= cutoff;
          return isShortlisted && hasGoodMatchScore;
        });
      } else {
        // Step 2+: Get candidates who passed the previous round
        const previousRound = allRounds.find(r => r.step === currentRound.step - 1);
        if (previousRound) {
          const previousRoundRes = await axios.get(`http://localhost:5000/api/rounds/${previousRound._id}/candidate-rounds`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const previousCandidateRounds = previousRoundRes.data.candidateRounds || [];
          
          // Get candidates who passed the previous round
          const passedCandidateIds = previousCandidateRounds
            .filter(cr => cr.round_status === 'Passed' || cr.status === 'Passed')
            .map(cr => cr.candidate_id);
          
          if (passedCandidateIds.length > 0) {
            const candidatesRes = await axios.get(`http://localhost:5000/api/candidates`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            eligibleCandidates = candidatesRes.data.filter(candidate => 
              passedCandidateIds.includes(candidate._id) || passedCandidateIds.includes(candidate.candidate_id)
            );
          }
        }
      }
      
      console.log('Eligible candidates fetched:', eligibleCandidates);
      setCandidates(eligibleCandidates);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const fetchInterviewers = async () => {
    try {
      setInterviewersLoading(true);
      console.log('Fetching interviewers...');
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/interviewers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Interviewers fetched:', res.data);
      setInterviewers(res.data);
    } catch (err) {
      console.error('Failed to fetch interviewers:', err);
      setInterviewers([]);
    } finally {
      setInterviewersLoading(false);
    }
  };

  const handleScheduleInterviews = async () => {
    if (!selectedCandidates.length || !selectedInterviewer || !scheduledDate || !scheduledTime) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const hr_email = localStorage.getItem('userEmail');
      
      // Prepare interview data
      const interviewData = {
        candidateIds: selectedCandidates,
        interviewerId: selectedInterviewer,
        scheduledAt: scheduledDateTime.toISOString(),
        duration,
        interviewType,
        location: interviewType === 'offline' ? location : '',
        meetingLink: interviewType === 'online' ? meetingLink : '',
        notes,
        subject: emailSubject,
        message: emailMessage,
        hr_email
      };
      
      // Schedule interviews and send invites
      await axios.post(`http://localhost:5000/api/rounds/${round._id}/schedule-interviews`, interviewData);
      
      setSuccess(`Successfully scheduled ${selectedCandidates.length} interview(s) and sent invites`);
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose();
      }, 2000);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule interviews');
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateToggle = (candidateId) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  // Removed advanced selection features - keeping only individual selection for interview scheduling

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Schedule Interview Round</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FaTimes className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Candidate Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FaUser className="w-4 h-4 mr-2 text-blue-600" />
                Select Candidates *
              </label>
              {candidatesLoading ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                  <svg className="animate-spin h-4 w-4 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span className="text-gray-600">Loading candidates...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {selectedCandidates.length} of {candidates.length} selected
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                    {candidates.map(candidate => (
                      <label key={candidate.candidate_id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate.candidate_id)}
                          onChange={() => handleCandidateToggle(candidate.candidate_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          {candidate.full_name} ({candidate.email})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {!candidatesLoading && candidates.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No eligible candidates available</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {candidatesLoading ? 'Loading...' : `Found ${candidates.length} candidates`}
              </p>
            </div>

            {/* Interviewer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FaUser className="w-4 h-4 mr-2 text-blue-600" />
                Choose Interviewer *
              </label>
              {interviewersLoading ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center">
                  <svg className="animate-spin h-4 w-4 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  <span className="text-gray-600">Loading interviewers...</span>
                </div>
              ) : (
                <select
                  value={selectedInterviewer}
                  onChange={(e) => setSelectedInterviewer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose an interviewer...</option>
                  {interviewers.map(interviewer => (
                    <option key={interviewer._id} value={interviewer._id}>
                      {interviewer.name} - {interviewer.specialization}
                    </option>
                  ))}
                </select>
              )}
              {!interviewersLoading && interviewers.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No interviewers available</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {interviewersLoading ? 'Loading...' : `Found ${interviewers.length} interviewers`}
              </p>
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FaCalendar className="w-4 h-4 mr-2 text-blue-600" />
                Date & Time *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="dd-mm-yyyy"
                  />
                </div>
                <div>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="--:--"
                  />
                </div>
              </div>
            </div>

            {/* Interview Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interview Type</label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="online">Online (Google Meet)</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {/* Location/Meeting Link */}
            {interviewType === 'offline' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FaMapMarkerAlt className="w-4 h-4 mr-2 text-blue-600" />
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter interview location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Link (Optional)</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="15"
                max="180"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="60"
              />
              <p className="text-sm text-gray-500 mt-1">Minimum 15 minutes, maximum 3 hours</p>
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter email subject"
              />
            </div>

            {/* Email Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Message</label>
              <textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your message"
              />
            </div>

            {/* Notes/Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes/Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any details for the event..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleScheduleInterviews}
            disabled={loading || !selectedCandidates.length || !selectedInterviewer || !scheduledDate || !scheduledTime}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Scheduling...' : 'Schedule (Google Calendar)'}
          </button>
        </div>
      </div>
    </div>
  );
}