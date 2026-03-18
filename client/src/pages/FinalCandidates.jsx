import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaUser, FaEnvelope, FaPhone, FaStar, FaCheckCircle, FaTimesCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

const FinalCandidates = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchFinalCandidates();
  }, [jobId]);

  const fetchFinalCandidates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch job details
      const jobRes = await axios.get(`http://localhost:5000/api/jobs/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setJob(jobRes.data);

      // Fetch all rounds for this job
      const roundsRes = await axios.get(`http://localhost:5000/api/rounds/job/${jobId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allRounds = roundsRes.data.sort((a, b) => (a.step || 0) - (b.step || 0));

      if (allRounds.length === 0) {
        setCandidates([]);
        return;
      }

      // Find the last round
      const lastRound = allRounds[allRounds.length - 1];

      // Fetch candidates who passed the last round
      const candidateRoundsRes = await axios.get(`http://localhost:5000/api/rounds/${lastRound._id}/candidate-rounds`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const passedCandidateRounds = candidateRoundsRes.data.candidateRounds.filter(
        cr => cr.round_status === 'Passed' || cr.status === 'Passed'
      );

      if (passedCandidateRounds.length === 0) {
        setCandidates([]);
        return;
      }

      // Fetch full candidate details
      const candidateIds = passedCandidateRounds.map(cr => cr.candidate_id);
      const candidatesRes = await axios.get(`http://localhost:5000/api/candidates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const finalCandidates = candidatesRes.data.filter(candidate => 
        candidateIds.includes(candidate._id) || candidateIds.includes(candidate.candidate_id)
      );

      // Enrich candidates with their round data
      const enrichedCandidates = finalCandidates.map(candidate => {
        const candidateRound = passedCandidateRounds.find(
          cr => cr.candidate_id === candidate._id || cr.candidate_id === candidate.candidate_id
        );
        return {
          ...candidate,
          finalRoundData: candidateRound,
          finalRound: lastRound
        };
      });

      setCandidates(enrichedCandidates);
    } catch (err) {
      console.error('Error fetching final candidates:', err);
      setError('Failed to fetch final candidates');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidateDetails = async (candidate) => {
    try {
      const token = localStorage.getItem('token');
      
      // Use the new efficient endpoint to get all candidate performance data
      const performanceRes = await axios.get(
        `http://localhost:5000/api/rounds/job/${jobId}/candidate/${candidate.candidate_id || candidate._id}/performance`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      setCandidateDetails(performanceRes.data);
    } catch (err) {
      console.error('Error fetching candidate details:', err);
    }
  };

  const handleViewDetails = async (candidate) => {
    setSelectedCandidate(candidate);
    await fetchCandidateDetails(candidate);
    setShowDetails(true);
  };

  const handleHireCandidate = async (candidate) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/candidates/${candidate.candidate_id}/status`, {
        status: 'Hired'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Refresh the list
      fetchFinalCandidates();
    } catch (err) {
      console.error('Error hiring candidate:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Hired':
        return 'bg-green-100 text-green-800';
      case 'Passed':
        return 'bg-blue-100 text-blue-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score, cutoff) => {
    if (!score) return 'text-gray-500';
    const numScore = parseInt(score);
    const numCutoff = parseInt(cutoff || 70);
    
    if (numScore >= numCutoff + 10) return 'text-green-600';
    if (numScore >= numCutoff) return 'text-blue-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/jobs/${jobId}/rounds`)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Back to Rounds
          </button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Final Candidates
              </h1>
              {job && (
                <p className="text-gray-600">
                  {job.title} - {candidates.length} candidates passed all rounds
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <FaUser className="text-blue-600 text-xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Total Candidates</p>
                <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <FaCheckCircle className="text-green-600 text-xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Hired</p>
                <p className="text-2xl font-bold text-gray-900">
                  {candidates.filter(c => c.status === 'Hired').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <FaStar className="text-yellow-600 text-xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Pending Decision</p>
                <p className="text-2xl font-bold text-gray-900">
                  {candidates.filter(c => c.status !== 'Hired').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <FaEnvelope className="text-purple-600 text-xl mr-3" />
              <div>
                <p className="text-sm text-gray-600">Avg Match Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {candidates.length > 0 
                    ? Math.round(candidates.reduce((sum, c) => sum + (c.match_score || 0), 0) / candidates.length)
                    : 0
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        {candidates.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <FaUser className="text-gray-400 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Final Candidates</h3>
            <p className="text-gray-500">
              No candidates have passed all rounds yet. Check back later when rounds are completed.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Final Candidates List</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {candidates.map((candidate) => (
                <div key={candidate.candidate_id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <FaUser className="text-blue-600 text-xl" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {candidate.full_name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(candidate.status)}`}>
                            {candidate.status || 'Passed'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center">
                            <FaEnvelope className="mr-1" />
                            {candidate.email}
                          </span>
                          {candidate.phone && (
                            <span className="flex items-center">
                              <FaPhone className="mr-1" />
                              {candidate.phone}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`text-sm font-medium ${getScoreColor(candidate.match_score, job?.cutoff_score)}`}>
                            Match Score: {candidate.match_score || 'N/A'}%
                          </span>
                          {candidate.finalRoundData?.result && (
                            <span className="text-sm text-gray-600">
                              Final Score: {candidate.finalRoundData.result}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleViewDetails(candidate)}
                        className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                      >
                        <FaEye className="mr-1" />
                        View Details
                      </button>
                      
                      {candidate.status !== 'Hired' && (
                        <button
                          onClick={() => handleHireCandidate(candidate)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
                        >
                          Hire
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Candidate Details Modal */}
        {showDetails && selectedCandidate && candidateDetails && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {candidateDetails.candidate.full_name}
                  </h2>
                  <p className="text-gray-600">{candidateDetails.candidate.email}</p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Candidate Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Candidate Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium">{candidateDetails.candidate.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{candidateDetails.candidate.email}</p>
                    </div>
                    {candidateDetails.candidate.phone && (
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{candidateDetails.candidate.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Match Score</p>
                      <p className={`font-medium ${getScoreColor(candidateDetails.candidate.match_score, job?.cutoff_score)}`}>
                        {candidateDetails.candidate.match_score || 'N/A'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Current Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(candidateDetails.candidate.status)}`}>
                        {candidateDetails.candidate.status || 'Passed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Statistics */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Overall Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Rounds</p>
                      <p className="text-xl font-bold text-gray-900">{candidateDetails.overallStats.totalRounds}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-xl font-bold text-blue-600">{candidateDetails.overallStats.completedRounds}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-xl font-bold text-green-600">{candidateDetails.overallStats.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Score</p>
                      <p className="text-xl font-bold text-purple-600">{candidateDetails.overallStats.averageScore}</p>
                    </div>
                  </div>
                </div>

                {/* Round Performance */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Round Performance</h3>
                  <div className="space-y-4">
                    {candidateDetails.performance.map(({ round, performance }, index) => (
                      <div key={round._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Round {round.step}: {round.name}
                            </h4>
                            <p className="text-sm text-gray-600">{round.type}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(performance?.status)}`}>
                            {performance?.status || 'Not Started'}
                          </span>
                        </div>
                        
                        {performance ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {performance.result && (
                              <div>
                                <p className="text-gray-600">Score</p>
                                <p className="font-medium">{performance.result}</p>
                              </div>
                            )}
                            {performance.interviewer_notes && (
                              <div>
                                <p className="text-gray-600">Interviewer Notes</p>
                                <p className="font-medium">{performance.interviewer_notes}</p>
                              </div>
                            )}
                            {performance.hr_notes && (
                              <div>
                                <p className="text-gray-600">HR Notes</p>
                                <p className="font-medium">{performance.hr_notes}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No performance data available</p>
                        )}
                        
                        {performance?.interview_scheduled_at && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              Scheduled: {new Date(performance.interview_scheduled_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Assessment */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Final Assessment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Final Round</p>
                      <p className="font-medium">{selectedCandidate.finalRound?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Final Status</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(selectedCandidate.finalRoundData?.round_status || selectedCandidate.finalRoundData?.status)}`}>
                        {selectedCandidate.finalRoundData?.round_status || selectedCandidate.finalRoundData?.status || 'Passed'}
                      </span>
                    </div>
                    {selectedCandidate.finalRoundData?.result && (
                      <div>
                        <p className="text-sm text-gray-600">Final Score</p>
                        <p className="font-medium">{selectedCandidate.finalRoundData.result}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
                {selectedCandidate.status !== 'Hired' && (
                  <button
                    onClick={() => {
                      handleHireCandidate(selectedCandidate);
                      setShowDetails(false);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    Hire Candidate
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalCandidates; 