import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateRoundsModal from '../components/CreateRoundsModal';
import InterviewSchedulingModal from '../components/InterviewSchedulingModal';

const Rounds = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateRounds, setShowCreateRounds] = useState(false);
  const [roundStats, setRoundStats] = useState({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);

  useEffect(() => {
    fetchJobDetails();
    fetchRounds();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await axios.get(`/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setJob(response.data);
    } catch (err) {
      console.error('Error fetching job details:', err);
      setError('Failed to load job details');
    }
  };

  const fetchRounds = async () => {
    try {
      const response = await axios.get(`/rounds/job/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setRounds(response.data);
      
      // Fetch statistics for each round
      const statsPromises = response.data.map(async (round) => {
        try {
          const statsResponse = await axios.get(`/rounds/${round._id}/candidate-rounds`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          return { roundId: round._id, stats: statsResponse.data };
        } catch (err) {
          console.error(`Error fetching stats for round ${round._id}:`, err);
          return { roundId: round._id, stats: { candidateRounds: [], passedCount: 0 } };
        }
      });
      
      const statsResults = await Promise.all(statsPromises);
      const statsMap = {};
      statsResults.forEach(({ roundId, stats }) => {
        statsMap[roundId] = stats;
      });
      setRoundStats(statsMap);
    } catch (err) {
      console.error('Error fetching rounds:', err);
      setError('Failed to load rounds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRounds = () => {
    setShowCreateRounds(true);
  };

  const handleRoundsCreated = (newRounds) => {
    setRounds(prevRounds => [...prevRounds, ...newRounds]);
    setShowCreateRounds(false);
    // Refresh rounds after creation
    fetchRounds();
  };

  const handleScheduleInterview = (round) => {
    setSelectedRound(round);
    setShowScheduleModal(true);
  };

  const handleViewRoundDetails = (round) => {
    navigate(`/jobs/${jobId}/rounds/${round._id}`);
  };

  const getRoundStats = (round) => {
    const stats = roundStats[round._id] || { candidateRounds: [], passedCount: 0 };
    const candidateRounds = stats.candidateRounds || [];
    
    if (round.type === 'aptitude') {
      const total = candidateRounds.length;
      const passed = candidateRounds.filter(cr => cr.round_status === 'Passed').length;
      const failed = candidateRounds.filter(cr => cr.round_status === 'Failed').length;
      const pending = total - passed - failed;
      
      return { total, passed, failed, pending };
    } else if (round.type === 'interview') {
      const total = candidateRounds.length;
      const invited = candidateRounds.filter(cr => cr.status === 'Invited' || cr.round_status === 'Invited').length;
      const scheduled = candidateRounds.filter(cr => cr.interview_scheduled_at).length;
      const completed = candidateRounds.filter(cr => cr.status === 'Attended' || cr.round_status === 'Attended').length;
      const passed = candidateRounds.filter(cr => cr.status === 'Passed' || cr.round_status === 'Passed').length;
      const failed = candidateRounds.filter(cr => cr.status === 'Failed' || cr.round_status === 'Failed').length;
      const pending = total - invited - scheduled - completed;
      
      return { total, invited, scheduled, completed, passed, failed, pending };
    }
    
    return { total: 0, passed: 0, failed: 0, pending: 0 };
  };

  const handleBackToJob = () => {
    navigate(`/jobs/${jobId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rounds...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={handleBackToJob}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToJob}
            className="text-blue-600 hover:underline text-base font-semibold mb-4"
          >
            ← Back to Job Details
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {job?.title || 'Job'} - Rounds
            </h1>
            <p className="text-gray-600">
              Create and manage interview rounds for this position
            </p>
          </div>
        </div>

        {/* Rounds Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Interview Rounds
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/jobs/${jobId}/final-candidates`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Final Candidates
                </button>
                <button
                  onClick={handleCreateRounds}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Create Rounds
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {rounds.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No rounds created yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Create rounds to start the interview process for this job.
                </p>
                <button
                  onClick={handleCreateRounds}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Create Your First Round
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {rounds
                  .sort((a, b) => (a.step || 0) - (b.step || 0))
                  .map((round, index) => {
                    const stats = getRoundStats(round);
                    const isInterviewRound = round.type === 'interview';
                    
                    return (
                      <div
                        key={round._id}
                        className={`border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 ${
                          isInterviewRound ? 'bg-gradient-to-r from-blue-50 to-indigo-50' : 'bg-white'
                        }`}
                      >
                        {/* Round Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                              isInterviewRound 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {round.step || index + 1}
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-gray-900">
                                {round.name}
                              </h3>
                              <div className="flex items-center space-x-3 mt-1">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  isInterviewRound 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {round.type.charAt(0).toUpperCase() + round.type.slice(1)}
                                </span>
                                <span className="text-sm text-gray-600">
                                  Cutoff: {round.cutoff}%
                                </span>
                              </div>
                              {round.description && (
                                <p className="text-sm text-gray-600 mt-2">
                                  {round.description}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          </div>
                        </div>

                        {/* Aptitude Round Interface */}
                        {!isInterviewRound && (
                          <div className="space-y-4">
                            {/* Statistics Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                <div className="text-sm text-gray-600">Total Candidates</div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                                <div className="text-sm text-gray-600">Passed</div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                                <div className="text-sm text-gray-600">Failed</div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                                <div className="text-sm text-gray-600">Pending</div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={() => handleViewRoundDetails(round)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </button>
                              <button
                                onClick={() => handleViewRoundDetails(round)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Upload Results
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Interview Round Interface */}
                        {isInterviewRound && (
                          <div className="space-y-6">
                            {/* Interview Statistics Dashboard */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                <div className="text-sm text-gray-600">Total</div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-yellow-600">{stats.invited}</div>
                                <div className="text-sm text-gray-600">Invited</div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-purple-600">{stats.scheduled}</div>
                                <div className="text-sm text-gray-600">Scheduled</div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-indigo-600">{stats.completed}</div>
                                <div className="text-sm text-gray-600">Completed</div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                                <div className="text-sm text-gray-600">Passed</div>
                              </div>
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                                <div className="text-sm text-gray-600">Failed</div>
                              </div>
                            </div>

                            {/* Interview Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={() => handleScheduleInterview(round)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Schedule Interview
                              </button>
                              <button
                                onClick={() => handleViewRoundDetails(round)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Send Invites
                              </button>
                              <button
                                onClick={() => handleViewRoundDetails(round)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                Manage Candidates
                              </button>
                              <button
                                onClick={() => handleViewRoundDetails(round)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </button>
                            </div>

                            {/* Quick Status Summary */}
                            {stats.total > 0 && (
                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <h4 className="font-semibold text-gray-900 mb-3">Quick Status Summary</h4>
                                <div className="flex flex-wrap gap-2">
                                  {stats.invited > 0 && (
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                      {stats.invited} Invited
                                    </span>
                                  )}
                                  {stats.scheduled > 0 && (
                                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                                      {stats.scheduled} Scheduled
                                    </span>
                                  )}
                                  {stats.completed > 0 && (
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                                      {stats.completed} Completed
                                    </span>
                                  )}
                                  {stats.passed > 0 && (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                      {stats.passed} Passed
                                    </span>
                                  )}
                                  {stats.failed > 0 && (
                                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                                      {stats.failed} Failed
                                    </span>
                                  )}
                                  {stats.pending > 0 && (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                      {stats.pending} Pending
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            How it works:
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• First round will automatically include all shortlisted candidates</li>
            <li>• Each round is connected by round ID and linked to the job</li>
            <li>• Candidates progress through rounds based on their performance</li>
            <li>• You can manage candidate assignments and results for each round</li>
          </ul>
        </div>
      </div>

      {/* Create Rounds Modal */}
      {showCreateRounds && (
        <CreateRoundsModal
          isOpen={showCreateRounds}
          onClose={() => setShowCreateRounds(false)}
          jobId={jobId}
          onRoundsCreated={handleRoundsCreated}
        />
      )}

      {/* Interview Scheduling Modal */}
      {showScheduleModal && selectedRound && (
        <InterviewSchedulingModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedRound(null);
          }}
          round={selectedRound}
          jobId={jobId}
          onSuccess={() => {
            setShowScheduleModal(false);
            setSelectedRound(null);
            fetchRounds(); // Refresh data
          }}
        />
      )}
    </div>
  );
};

export default Rounds; 