import React, { useState } from 'react';
import axios from 'axios';
import { FaPlus, FaTrash, FaTimes } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const statusColors = {
  'Created': 'bg-blue-100 text-blue-700',
  'Ongoing': 'bg-yellow-100 text-yellow-700',
  'Completed': 'bg-green-100 text-green-700'
};

export default function RoundList({ jobId, rounds, loading, error, ...props }) {
  const navigate = useNavigate();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignRound, setAssignRound] = useState(null);
  const [assignCandidates, setAssignCandidates] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState(null);
  const [allCandidates, setAllCandidates] = useState([]);
  const [selectedAssignIds, setSelectedAssignIds] = useState([]);

  const getRoundStatus = (round) => {
    // Logic to determine round status based on candidates and results
    return 'Created'; // Default for now
  };

  const openAssignModal = async (round) => {
    setAssignRound(round);
    setAssignError(null);
    setAssignLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/candidates?jobId=${jobId}`);
      // Filter candidates by cutoff if defined
      let filtered = res.data;
      if (round.cutoff !== undefined && round.cutoff !== null) {
        filtered = filtered.filter(c => typeof c.match_score === 'number' && c.match_score >= round.cutoff);
      }
      setAllCandidates(filtered);
      setSelectedAssignIds([]);
      setShowAssignModal(true);
    } catch (err) {
      setAssignError('Failed to fetch candidates');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!assignRound || selectedAssignIds.length === 0) return;
    setAssignLoading(true);
    setAssignError(null);
    try {
      await axios.post(`http://localhost:5000/api/rounds/${assignRound._id}/assign`, {
        candidateIds: selectedAssignIds
      });
      setShowAssignModal(false);
      setAssignRound(null);
      // Optionally, trigger a refresh in parent
      props.onRefresh && props.onRefresh();
    } catch (err) {
      setAssignError('Failed to assign candidates');
    } finally {
      setAssignLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading rounds...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-8">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-8">
      {/* Header with Create Round button */}
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Rounds</h2>
        <button
          onClick={props.onCreateRound}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <FaPlus /> Create Round
        </button>
      </div>
      {rounds.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">No rounds have been created yet.</p>
          <p className="text-gray-400 text-sm mt-2">Create a round to start evaluating candidates.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {rounds.map((round) => {
            const status = getRoundStatus(round);
            return (
              <div
                key={round._id}
                className="bg-white rounded-2xl shadow-lg p-8 hover:bg-blue-50 border border-blue-100 transition text-left w-full min-h-[120px] cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between"
                onClick={() => navigate(`/jobs/${jobId}/rounds/${round._id}`)}
              >
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-2xl font-bold text-blue-900 truncate">{round.name}</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-sm font-bold border ${statusColors[status]}`}>{status}</span>
                  </div>
                  <div className="text-blue-800 text-base mb-2 truncate">{round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round</div>
                  {round.date_time && (
                    <div className="text-blue-500 text-sm">Scheduled: {new Date(round.date_time).toLocaleString()}</div>
                  )}
                  
                  {/* Round Type Specific Information */}
                  {round.type === 'interview' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Interview Round
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Schedule Interviews
                      </span>
                    </div>
                  )}
                  
                  {round.type === 'aptitude' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Aptitude Test
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Upload Results
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4">
                  {round.type === 'interview' && (
                    <button
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-full transition"
                      title="Schedule Interview"
                      onClick={e => {
                        e.stopPropagation();
                        props.onScheduleInterview && props.onScheduleInterview(round);
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                  
                  {round.type === 'aptitude' && (
                    <button
                      className="text-green-600 hover:text-green-800 p-2 rounded-full transition"
                      title="Upload Results"
                      onClick={e => {
                        e.stopPropagation();
                        props.onUploadResults && props.onUploadResults(round);
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </button>
                  )}
                  
                  <button
                    className="text-red-600 hover:text-red-800 p-2 rounded-full transition"
                    title="Delete Round"
                    onClick={e => {
                      e.stopPropagation();
                      props.onDeleteRound && props.onDeleteRound(round);
                    }}
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for assigning candidates */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Assign Candidates to {assignRound?.name}</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700"><FaTimes /></button>
            </div>
            {assignError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{assignError}</div>}
            {assignLoading ? (
              <div className="text-center py-4">Loading candidates...</div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg p-4 mb-6">
                {allCandidates.length === 0 ? (
                  <div className="text-center py-4">No candidates found</div>
                ) : allCandidates.map((candidate, index) => (
                  <label key={candidate._id} className="flex items-center p-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedAssignIds.includes(candidate._id)}
                      onChange={e => {
                        const newSelected = e.target.checked
                          ? [...selectedAssignIds, candidate._id]
                          : selectedAssignIds.filter(id => id !== candidate._id);
                        setSelectedAssignIds(newSelected);
                      }}
                      className="mr-3"
                    />
                    <span>{candidate.full_name || `Candidate ${index + 1}`}{candidate.email && ` (${candidate.email})`}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={handleAssign}
                disabled={assignLoading || selectedAssignIds.length === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:bg-purple-400"
              >
                {assignLoading ? 'Assigning...' : 'Assign Candidates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 