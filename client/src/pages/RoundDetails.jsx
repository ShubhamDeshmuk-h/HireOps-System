import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import InterviewSchedulingModal from '../components/InterviewSchedulingModal';

const statusColors = {
  'Created': 'bg-blue-100 text-blue-700',
  'Ongoing': 'bg-yellow-100 text-yellow-700',
  'Completed': 'bg-green-100 text-green-700',
};

export default function RoundDetails() {
  const { jobId, roundId } = useParams();
  const navigate = useNavigate();
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailCandidates, setEmailCandidates] = useState([]);
  const [candidateRounds, setCandidateRounds] = useState([]); // Holds CandidateRound info
  const [passedCount, setPassedCount] = useState(0); // Holds Passed count
  const [selectedEmailIds, setSelectedEmailIds] = useState([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState(null);
  const [emailSuccess, setEmailSuccess] = useState(null);
  
  // Selection features for aptitude tests
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [testLink, setTestLink] = useState('');
  const [testDateTime, setTestDateTime] = useState('');
  const [testDuration, setTestDuration] = useState(60);
  const [testInstructions, setTestInstructions] = useState('');
  const [showResultModal, setShowResultModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedCandidateForStatus, setSelectedCandidateForStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Update email message when test details change for aptitude tests
  const updateEmailMessage = () => {
    if (round?.type === 'aptitude') {
      const formattedDateTime = testDateTime ? new Date(testDateTime).toLocaleString() : '[Please select date and time]';
      const linkText = testLink || '[Please add test link]';
      
      const message = `Dear Candidate,

You have been invited to take the ${round.name} aptitude test.

Test Details:
- Test Link: ${linkText}
- Date & Time: ${formattedDateTime}
- Duration: ${testDuration} minutes

Instructions:
${testInstructions}

Please ensure you complete the test within the allocated time. Good luck!

Best regards,
HR Team`;
      
      setEmailMessage(message);
    }
  };
  const [resultFile, setResultFile] = useState(null);
  const [uploadingResult, setUploadingResult] = useState(false);
  const [resultError, setResultError] = useState(null);
  const [resultSuccess, setResultSuccess] = useState(null);
  const [cutoff, setCutoff] = useState(round?.cutoff || 70);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Fetch eligible candidates based on round step
  const fetchEligibleCandidates = async () => {
    setLoading(true);
    try {
      // Get all rounds for this job to understand the flow
      const roundsRes = await axios.get(`http://localhost:5000/api/rounds/job/${jobId}`);
      const allRounds = roundsRes.data.sort((a, b) => (a.step || 0) - (b.step || 0));
      
      // Find current round
      const currentRound = allRounds.find(r => r._id === roundId);
      if (!currentRound) {
        setEmailCandidates([]);
        setCandidateRounds([]);
        setPassedCount(0);
        return;
      }

      let eligibleCandidates = [];
      
      if (currentRound.step === 1) {
        // Step 1: Get shortlisted candidates with match score >= job cutoff
        const jobRes = await axios.get(`http://localhost:5000/api/jobs/${jobId}`);
        const job = jobRes.data;
        const cutoff = job?.cutoff_score || 70;
        
        // Get all candidates for this job
        const candidatesRes = await axios.get(`http://localhost:5000/api/candidates?job_id=${jobId}`);
        
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
          const previousRoundRes = await axios.get(`http://localhost:5000/api/rounds/${previousRound._id}/candidate-rounds`);
          const previousCandidateRounds = previousRoundRes.data.candidateRounds || [];
          
          // Get candidates who passed the previous round
          const passedCandidateIds = previousCandidateRounds
            .filter(cr => cr.round_status === 'Passed' || cr.status === 'Passed')
            .map(cr => cr.candidate_id);
          
          if (passedCandidateIds.length > 0) {
            const candidatesRes = await axios.get(`http://localhost:5000/api/candidates`);
            eligibleCandidates = candidatesRes.data.filter(candidate => 
              passedCandidateIds.includes(candidate._id) || passedCandidateIds.includes(candidate.candidate_id)
            );
          }
        }
      }
      
      setEmailCandidates(eligibleCandidates);
      
      // Fetch CandidateRound info for current round
      const crRes = await axios.get(`http://localhost:5000/api/rounds/${roundId}/candidate-rounds`);
      setCandidateRounds(crRes.data.candidateRounds || []);
      setPassedCount(crRes.data.passedCount || 0);
      
    } catch (err) {
      console.error('Error fetching eligible candidates:', err);
      setEmailCandidates([]);
      setCandidateRounds([]);
      setPassedCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleCandidates();
  }, [roundId, jobId]);

  // Auto-update email message when test details change for aptitude tests
  useEffect(() => {
    if (round?.type === 'aptitude' && (testLink || testDateTime || testDuration || testInstructions)) {
      updateEmailMessage();
    }
  }, [testLink, testDateTime, testDuration, testInstructions, round?.name]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get(`http://localhost:5000/api/rounds/job/${jobId}`)
      .then(res => {
        const found = res.data.find(r => r._id === roundId);
        setRound(found || null);
        if (!found) setError('Round not found.');
      })
      .catch(() => setError('Failed to fetch round.'))
      .finally(() => setLoading(false));
  }, [jobId, roundId]);

  // Fetch candidates assigned to this round (on modal open)
  const openEmailModal = async () => {
    setEmailError(null);
    setEmailSuccess(null);
    setEmailLoading(true);
    try {
      // Use the same logic as fetchEligibleCandidates to get the right candidates
      const roundsRes = await axios.get(`http://localhost:5000/api/rounds/job/${jobId}`);
      const allRounds = roundsRes.data.sort((a, b) => (a.step || 0) - (b.step || 0));
      const currentRound = allRounds.find(r => r._id === roundId);
      
      let eligibleCandidates = [];
      
      if (currentRound.step === 1) {
        const jobRes = await axios.get(`http://localhost:5000/api/jobs/${jobId}`);
        const job = jobRes.data;
        const cutoff = job?.cutoff_score || 70;
        
        const candidatesRes = await axios.get(`http://localhost:5000/api/candidates?job_id=${jobId}`);
        eligibleCandidates = candidatesRes.data.filter(candidate => {
          const isShortlisted = candidate.status === 'Shortlisted' || candidate.status === 'shortlisted';
          const hasGoodMatchScore = (candidate.match_score || 0) >= cutoff;
          return isShortlisted && hasGoodMatchScore;
        });
      } else {
        const previousRound = allRounds.find(r => r.step === currentRound.step - 1);
        if (previousRound) {
          const previousRoundRes = await axios.get(`http://localhost:5000/api/rounds/${previousRound._id}/candidate-rounds`);
          const previousCandidateRounds = previousRoundRes.data.candidateRounds || [];
          
          const passedCandidateIds = previousCandidateRounds
            .filter(cr => cr.round_status === 'Passed' || cr.status === 'Passed')
            .map(cr => cr.candidate_id);
          
          if (passedCandidateIds.length > 0) {
            const candidatesRes = await axios.get(`http://localhost:5000/api/candidates`);
            eligibleCandidates = candidatesRes.data.filter(candidate => 
              passedCandidateIds.includes(candidate._id) || passedCandidateIds.includes(candidate.candidate_id)
            );
          }
        }
      }
      
      setEmailCandidates(eligibleCandidates);
      setSelectedEmailIds(eligibleCandidates.map(c => c.candidate_id));
      
      // Set default values for aptitude test
      if (round?.type === 'aptitude') {
        setEmailSubject(`${round.name} - Aptitude Test Invitation`);
        setTestDateTime('');
        setTestDuration(60);
        setTestInstructions(`Please complete the aptitude test within ${testDuration} minutes. Ensure you have a stable internet connection and a quiet environment.`);
        setEmailMessage(`Dear Candidate,

You have been invited to take the ${round.name} aptitude test.

Test Details:
- Test Link: [Please add test link]
- Date & Time: [Please select date and time]
- Duration: ${testDuration} minutes

Instructions:
${testInstructions}

Please ensure you complete the test within the allocated time. Good luck!

Best regards,
HR Team`);
      } else {
        setEmailSubject(`${round.name} - Interview Invitation`);
        setEmailMessage(`Dear Candidate,

You have been invited for the ${round.name} interview.

Please check your email for further details.

Best regards,
HR Team`);
      }
      
      setShowEmailModal(true);
    } catch (err) {
      setEmailError('Failed to fetch candidates for this round.');
      setShowEmailModal(true);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendInvite = async () => {
    setEmailLoading(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      const hr_email = localStorage.getItem('userEmail');
      
      // Prepare email data with test details for aptitude rounds
      const emailData = {
        candidateIds: selectedEmailIds,
        subject: emailSubject,
        message: emailMessage,
        hr_email,
      };
      
      // Add test-specific data for aptitude rounds
      if (round?.type === 'aptitude') {
        emailData.testLink = testLink;
        emailData.testDateTime = testDateTime;
        emailData.testDuration = testDuration;
        emailData.testInstructions = testInstructions;
      }
      
      await axios.post(`http://localhost:5000/api/rounds/${roundId}/send-invite`, emailData);
      setEmailSuccess('Invites sent successfully!');
      
      // Close modal after successful send
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSuccess(null);
      }, 2000);
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to send invites.');
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle status change for candidates
  const handleStatusChange = (candidate, currentStatus) => {
    setSelectedCandidateForStatus(candidate);
    setNewStatus(currentStatus);
    setStatusNotes('');
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedCandidateForStatus || !newStatus) return;
    
    try {
      await axios.patch(`http://localhost:5000/api/rounds/${roundId}/candidate/${selectedCandidateForStatus.candidate_id}/status`, {
        status: newStatus,
        notes: statusNotes
      });
      
      // Refresh the data
      fetchEligibleCandidates();
      setShowStatusModal(false);
      setSelectedCandidateForStatus(null);
      setNewStatus('');
      setStatusNotes('');
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96">
      <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      <div className="text-blue-700 text-lg">Loading round details...</div>
    </div>
  );
  if (error) return <div className="text-red-600 p-8">{error}</div>;
  if (!round) return null;

  const status = round.status || 'Created';
  const badgeStyle = statusColors[status] || 'bg-gray-100 text-gray-700 border-gray-300';

  return (
    <div className="pl-0 sm:pl-2 md:pl-4 pt-8 w-full max-w-5xl mx-auto">
      <button
        className="mb-4 text-blue-600 hover:underline text-base font-semibold"
        onClick={() => navigate(-1)}
      >
        ← Back to Rounds
      </button>
      <h1 className="text-3xl font-bold text-blue-900 mb-6">
        {round.name} <span className={`ml-2 px-3 py-1 rounded-full text-sm font-bold border ${badgeStyle}`}>{status}</span>
      </h1>
      <div className="text-blue-800 text-base mb-2">{round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round</div>
      {round.date_time && (
        <div className="text-blue-500 text-sm mb-4">Scheduled: {new Date(round.date_time).toLocaleString()}</div>
      )}
      <div className="flex gap-4 mb-8">
        <button
          className={`px-6 py-3 rounded-xl font-semibold transition text-base focus:outline-none whitespace-nowrap ${activeTab === 'details' ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-700 hover:bg-blue-100'}`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        {round.type === 'aptitude' && (
          <button
            className={`px-6 py-3 rounded-xl font-semibold transition text-base focus:outline-none whitespace-nowrap ${activeTab === 'aptitude' ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-700 hover:bg-blue-100'}`}
            onClick={() => setActiveTab('aptitude')}
          >
            Aptitude
          </button>
        )}
        {round.type === 'interview' && (
          <button
            className={`px-6 py-3 rounded-xl font-semibold transition text-base focus:outline-none whitespace-nowrap ${activeTab === 'interview' ? 'bg-blue-600 text-white shadow' : 'bg-white text-blue-700 hover:bg-blue-100'}`}
            onClick={() => setActiveTab('interview')}
          >
            Interview
          </button>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-10 min-h-[250px] w-full text-lg relative flex flex-col">
        {activeTab === 'details' && (
          <div>
            <div className="mb-2 text-blue-700"><b>Description:</b> {round.description || 'No description provided.'}</div>
            {/* Add more round details here if needed */}
          </div>
        )}
        {activeTab === 'aptitude' && (
          <div>
            {/* Candidate Summary */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">Candidate Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{emailCandidates.length}</div>
                  <div className="text-sm text-blue-700">Total Candidates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {candidateRounds.filter(cr => 
                      (cr.status === 'Passed' || cr.round_status === 'Passed')
                    ).length}
                  </div>
                  <div className="text-sm text-green-700">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {candidateRounds.filter(cr => 
                      (cr.status === 'Pending' || cr.round_status === 'Pending') &&
                      !(cr.status === 'Invited' || cr.round_status === 'Invited')
                    ).length}
                  </div>
                  <div className="text-sm text-yellow-700">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {candidateRounds.filter(cr => 
                      (cr.status === 'Invited' || cr.round_status === 'Invited')
                    ).length}
                  </div>
                  <div className="text-sm text-blue-700">Invited</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6 justify-center">
              <button
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
                onClick={() => setShowResultModal(true)}
              >
                Upload Result
              </button>
              <button
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold"
                onClick={openEmailModal}
              >
                Email Invite
              </button>
            </div>

            {/* Candidate List */}
            <div className="mb-6">
              <div className="font-semibold mb-2">
                {round?.step === 1 
                  ? 'Shortlisted Candidates (from job screening):' 
                  : `Eligible Candidates (passed Round ${round?.step - 1}):`
                }
              </div>
              {emailCandidates.length === 0 ? (
                <div className="text-gray-500">No candidates assigned to this round.</div>
              ) : (
                   <div className="overflow-x-auto">
                    {loading ? (
                      <div className="flex justify-center items-center h-32">
                        <svg className="animate-spin h-8 w-8 text-blue-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        <span className="text-blue-700">Loading candidates...</span>
                      </div>
                    ) : (
                      <table className="min-w-full border rounded-xl bg-blue-50">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Email</th>
                            <th className="px-3 py-2 text-left">Score</th>
                            <th className="px-3 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailCandidates.map(candidate => {
                            const cr = candidateRounds.find(
                              c => (c.candidate_id === candidate._id || c.candidate_id === candidate.candidate_id)
                            );
                            const score = cr?.result ?? '-';
                            const status = cr?.round_status ?? 'Pending';
                            let badge;
                            if (status === 'Passed') badge = 'bg-green-200 text-green-800';
                            else if (status === 'Failed' || status === 'Rejected') badge = 'bg-red-200 text-red-800';
                            else if (status === 'Pending' || status === 'Invited') badge = 'bg-yellow-100 text-yellow-700';
                            else badge = 'bg-gray-100 text-gray-700';
                            return (
                              <tr key={candidate.candidate_id}>
                                <td className="px-3 py-2">{candidate.full_name}</td>
                                <td className="px-3 py-2">{candidate.email}</td>
                                <td className="px-3 py-2">{score}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-1 rounded-full text-sm font-semibold ${badge}`}>{status}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'interview' && (
          <div>
            {/* Candidate Summary */}
            <div className="mb-6 p-4 bg-blue-50 rounded-xl">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">Candidate Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{emailCandidates.length}</div>
                  <div className="text-sm text-blue-700">Total Candidates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {candidateRounds.filter(cr => 
                      (cr.status === 'Passed' || cr.round_status === 'Passed')
                    ).length}
                  </div>
                  <div className="text-sm text-green-700">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {candidateRounds.filter(cr => 
                      (cr.status === 'Pending' || cr.round_status === 'Pending') &&
                      !(cr.status === 'Scheduled' || cr.round_status === 'Scheduled')
                    ).length}
                  </div>
                  <div className="text-sm text-yellow-700">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {candidateRounds.filter(cr => 
                      (cr.status === 'Scheduled' || cr.round_status === 'Scheduled')
                    ).length}
                  </div>
                  <div className="text-sm text-blue-700">Scheduled</div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mb-6 flex justify-center">
              <button
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-2"
                onClick={() => setShowScheduleModal(true)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Schedule Interview
              </button>
            </div>

            {/* Header */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {round?.step === 1 
                  ? 'Shortlisted Candidates (from job screening)' 
                  : `Eligible Candidates (passed Round ${round?.step - 1})`
                }
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {emailCandidates.length} candidates eligible for this round
              </p>
            </div>

            {/* Candidates Table */}
            <div className="mb-6">
              {emailCandidates.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">No candidates assigned to this interview round.</p>
                  <p className="text-gray-400 text-sm mt-2">Assign candidates to start scheduling interviews.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border rounded-xl bg-white shadow-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-blue-700 font-semibold">Name</th>
                        <th className="px-4 py-3 text-left text-blue-700 font-semibold">Email</th>
                        <th className="px-4 py-3 text-left text-blue-700 font-semibold">Prev. Round Score</th>
                        <th className="px-4 py-3 text-left text-blue-700 font-semibold">Interview Status</th>
                        <th className="px-4 py-3 text-left text-blue-700 font-semibold">Result</th>
                        <th className="px-4 py-3 text-left text-blue-700 font-semibold">Scheduled At</th>
                        <th className="px-4 py-3 text-left text-blue-700 font-semibold">Meet Link</th>
                        <th className="px-4 py-3 text-left text-blue-700 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {emailCandidates.map(candidate => {
                        const cr = candidateRounds.find(
                          c => (c.candidate_id === candidate._id || c.candidate_id === candidate.candidate_id)
                        );
                        const status = cr?.status || cr?.round_status || 'Pending';
                        const scheduledAt = cr?.interview_scheduled_at;
                        const meetLink = cr?.google_meet_link;
                        const prevScore = cr?.result || candidate.match_score || '-';
                        
                        let statusBadge;
                        if (status === 'Invited') statusBadge = 'bg-blue-100 text-blue-800';
                        else if (status === 'Scheduled') statusBadge = 'bg-yellow-100 text-yellow-800';
                        else if (status === 'Attended') statusBadge = 'bg-green-100 text-green-800';
                        else if (status === 'Passed') statusBadge = 'bg-green-200 text-green-800';
                        else if (status === 'Failed') statusBadge = 'bg-red-100 text-red-800';
                        else if (status === 'Pending') statusBadge = 'bg-blue-100 text-blue-800';
                        else statusBadge = 'bg-gray-100 text-gray-800';

                        return (
                          <tr key={candidate.candidate_id} className="hover:bg-blue-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{candidate.full_name}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-600">{candidate.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium">{prevScore}</div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={status}
                                onChange={(e) => handleStatusChange(candidate, e.target.value)}
                                className={`px-2 py-1 rounded-full text-xs font-semibold border-0 focus:ring-2 focus:ring-blue-500 ${statusBadge}`}
                              >
                                <option value="Pending">Pending</option>
                                <option value="Invited">Invited</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Attended">Attended</option>
                                <option value="Passed">Passed</option>
                                <option value="Failed">Failed</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              {status === 'Attended' ? (
                                <select
                                  value={cr?.result || 'Waiting'}
                                  onChange={(e) => handleStatusChange(candidate, e.target.value)}
                                  className="px-2 py-1 rounded-full text-xs font-semibold border-0 focus:ring-2 focus:ring-blue-500 bg-orange-100 text-orange-800"
                                >
                                  <option value="Waiting">Waiting</option>
                                  <option value="Passed">Passed</option>
                                  <option value="Failed">Failed</option>
                                </select>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {scheduledAt ? (
                                <div>
                                  <div className="font-medium">{new Date(scheduledAt).toLocaleDateString()}</div>
                                  <div className="text-gray-500">{new Date(scheduledAt).toLocaleTimeString()}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {meetLink ? (
                                <a 
                                  href={meetLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  Join Meeting
                                </a>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {!scheduledAt && (
                                  <button
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
                                    onClick={() => {
                                      setSelectedCandidate(candidate);
                                      setShowScheduleModal(true);
                                    }}
                                  >
                                    Schedule Interview
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>


          </div>
        )}
      </div>
      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Schedule {round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round</h2>
              <button onClick={() => setShowScheduleModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes/Instructions</label>
              <textarea
                value={scheduleNotes}
                onChange={e => setScheduleNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any details for the event..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                disabled={!scheduleDate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400"
                // onClick={handleScheduleGoogleCalendar} // To be implemented after approval
              >
                Schedule (Google Calendar)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Email Invite Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {round?.type === 'aptitude' ? 'Send Aptitude Test Invite' : 'Send Email Invite'}
              </h2>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            {emailError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{emailError}</div>}
            {emailSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{emailSuccess}</div>}
            
            {/* Test-specific fields for aptitude rounds */}
            {round?.type === 'aptitude' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Test Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Link *</label>
                    <input
                      type="url"
                      value={testLink}
                      onChange={e => setTestLink(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/test"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={testDateTime}
                      onChange={e => setTestDateTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={testDuration}
                      onChange={e => setTestDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="15"
                      max="180"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email subject"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Instructions</label>
                  <textarea
                    value={testInstructions}
                    onChange={e => setTestInstructions(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Enter test instructions..."
                  />
                </div>
              </div>
            )}
            
            {/* Regular email fields */}
            {round?.type !== 'aptitude' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email subject"
              />
            </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={emailMessage}
                onChange={e => setEmailMessage(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Enter your message (include test/interview link if needed)"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Candidates</label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-4">
                {emailLoading ? (
                  <div className="text-center py-4">Loading candidates...</div>
                ) : emailCandidates.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No candidates assigned to this round.</div>
                ) : emailCandidates.map(candidate => (
                  <label key={candidate.candidate_id} className="flex items-center p-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedEmailIds.includes(candidate.candidate_id)}
                      onChange={() => setSelectedEmailIds(prev => prev.includes(candidate.candidate_id) ? prev.filter(cid => cid !== candidate.candidate_id) : [...prev, candidate.candidate_id])}
                      className="mr-3"
                    />
                    <span>{candidate.full_name} ({candidate.email})</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedEmailIds.length} candidate{selectedEmailIds.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                  disabled={
                    emailLoading || 
                    !emailSubject || 
                    !emailMessage || 
                    selectedEmailIds.length === 0 ||
                    (round?.type === 'aptitude' && (!testLink || !testDateTime))
                  }
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:bg-green-400"
              >
                {emailLoading ? 'Sending...' : 'Send Invite'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Aptitude Result Upload Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Upload Aptitude Results</h2>
              <button onClick={() => setShowResultModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            {resultError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{resultError}</div>}
            {resultSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">{resultSuccess}</div>}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cutoff Score (Threshold)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={cutoff}
                onChange={e => setCutoff(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Result File (CSV or JSON)</label>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await axios.get(`http://localhost:5000/api/rounds/${roundId}/template`, {
                        responseType: 'blob'
                      });
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `aptitude_results_template_${round?.name || 'round'}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    } catch (err) {
                      console.error('Error downloading template:', err);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Download Template
                </button>
              </div>
              <input
                type="file"
                accept=".csv,application/json"
                onChange={e => setResultFile(e.target.files[0])}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                CSV format: email,candidate_id,name,score | JSON format: array of objects with email and score
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!resultFile) {
                    setResultError('Please select a result file.');
                    return;
                  }
                  setUploadingResult(true);
                  setResultError(null);
                  setResultSuccess(null);
                  try {
                    const formData = new FormData();
                    formData.append('resultFile', resultFile);
                    formData.append('cutoff', cutoff);
                    const response = await axios.post(`http://localhost:5000/api/rounds/${roundId}/upload-result`, formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    
                    // Show detailed success message
                    const summary = response.data.summary;
                    setResultSuccess(`Results uploaded successfully!\n\nSummary: ${summary.updated} updated, ${summary.skipped} skipped, ${summary.errors} errors.`);
                    setShowResultModal(false);
                    fetchEligibleCandidates();
                    setLoading(true);
                    setError(null);
                    axios.get(`http://localhost:5000/api/rounds/job/${jobId}`)
                      .then(res => {
                        const found = res.data.find(r => r._id === roundId);
                        setRound(found || null);
                        if (!found) setError('Round not found.');
                      })
                      .catch(() => setError('Failed to fetch round.'))
                      .finally(() => setLoading(false));
                  } catch (err) {
                    console.error('Upload error:', err);
                    const errorMessage = err.response?.data?.message || 'Failed to upload results.';
                    setResultError(errorMessage);
                    
                    // Show detailed error if available
                    if (err.response?.data?.summary) {
                      const summary = err.response.data.summary;
                      setResultError(`${errorMessage}\n\nSummary: ${summary.updated} updated, ${summary.skipped} skipped, ${summary.errors} errors.`);
                    }
                  } finally {
                    setUploadingResult(false);
                  }
                }}
                disabled={uploadingResult}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:bg-purple-400"
              >
                {uploadingResult ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Status Change Confirmation Modal */}
      {showStatusModal && selectedCandidateForStatus && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Update Candidate Status</h2>
              <button 
                onClick={() => setShowStatusModal(false)} 
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Update status for <strong>{selectedCandidateForStatus.full_name}</strong>
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="Invited">Invited</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Attended">Attended</option>
                  <option value="Passed">Passed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any notes about this status change..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Scheduling Modal */}
      {showScheduleModal && round && (
        <InterviewSchedulingModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
          }}
          round={round}
          jobId={jobId}
          onSuccess={() => {
            setShowScheduleModal(false);
            fetchEligibleCandidates(); // Refresh data
          }}
        />
      )}
    </div>
  );
} 