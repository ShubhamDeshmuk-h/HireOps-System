import React, { useState } from 'react';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';

export default function CreateRoundModal({ jobId, onClose, onSuccess, onCandidatesAssigned }) {
  const [step, setStep] = useState(1); // 1: Round Details, 2: Select Candidates
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [roundData, setRoundData] = useState({
    name: '',
    type: 'aptitude',
    description: '',
    date_time: '',
    cutoff: 70
  });

  const [candidateSelection, setCandidateSelection] = useState({
    method: 'range', // 'range' or 'checkbox'
    startIndex: '',
    endIndex: '',
    selectedIds: []
  });

  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Fetch candidates for the job (all, as in Candidates page)
  const fetchCandidates = async () => {
    try {
      setLoadingCandidates(true);
      // Fetch all candidates for the job, as in Candidates page
      const response = await axios.get(`http://localhost:5000/api/candidates?jobId=${jobId}`);
      setCandidates(response.data);
    } catch (err) {
      setError('Failed to fetch candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Handle round details form submission
  const handleRoundDetailsSubmit = async (e) => {
    e.preventDefault();
    if (!roundData.name || !roundData.type) {
      setError('Please fill in all required fields');
      return;
    }
    // If it's an aptitude round, ensure cutoff is set
    if (roundData.type === 'aptitude' && (!roundData.cutoff || roundData.cutoff < 0 || roundData.cutoff > 100)) {
      setError('Please set a valid cutoff score (0-100)');
      return;
    }
    setError(null);
    await fetchCandidates();
    setStep(2);
  };

  // Handle candidate selection and round creation
  const handleCreateRound = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create the round
      const roundResponse = await axios.post('http://localhost:5000/api/rounds', {
        ...roundData,
        job_id: jobId
      });

      const roundId = roundResponse.data._id;

      // Get selected candidate IDs based on selection method
      let selectedCandidateIds = [];
      if (candidateSelection.method === 'range') {
        const start = parseInt(candidateSelection.startIndex) - 1;
        const end = parseInt(candidateSelection.endIndex);
        selectedCandidateIds = candidates.slice(start, end).map(c => c._id);
      } else {
        selectedCandidateIds = candidateSelection.selectedIds;
      }

      // Assign candidates to the round
      if (selectedCandidateIds.length > 0) {
        await axios.post(`http://localhost:5000/api/rounds/${roundId}/assign`, {
          candidateIds: selectedCandidateIds
        });
        if (onCandidatesAssigned) onCandidatesAssigned();
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create round');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {step === 1 ? 'Create New Round' : 'Select Candidates'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {step === 1 ? (
          /* Round Details Form */
          <form onSubmit={handleRoundDetailsSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Round Name*
                </label>
                <input
                  type="text"
                  value={roundData.name}
                  onChange={(e) => setRoundData({ ...roundData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Technical Interview Round 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Round Type*
                </label>
                <select
                  value={roundData.type}
                  onChange={(e) => setRoundData({ ...roundData, type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="aptitude">Aptitude</option>
                  <option value="interview">Interview</option>
                </select>
              </div>

              {roundData.type === 'aptitude' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Passing Score (Cutoff)*
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={roundData.cutoff}
                    onChange={(e) => setRoundData({ ...roundData, cutoff: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={roundData.date_time}
                  onChange={(e) => setRoundData({ ...roundData, date_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={roundData.description}
                  onChange={(e) => setRoundData({ ...roundData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Add any additional details about the round..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Next
              </button>
            </div>
          </form>
        ) : (
          /* Candidate Selection */
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selection Method
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={candidateSelection.method === 'range'}
                    onChange={() => setCandidateSelection({ ...candidateSelection, method: 'range' })}
                    className="mr-2"
                  />
                  Select by Range
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={candidateSelection.method === 'checkbox'}
                    onChange={() => setCandidateSelection({ ...candidateSelection, method: 'checkbox' })}
                    className="mr-2"
                  />
                  Select Individually
                </label>
              </div>
            </div>

            {candidateSelection.method === 'range' ? (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={candidates.length}
                    value={candidateSelection.startIndex}
                    onChange={(e) => setCandidateSelection({
                      ...candidateSelection,
                      startIndex: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={candidates.length}
                    value={candidateSelection.endIndex}
                    onChange={(e) => setCandidateSelection({
                      ...candidateSelection,
                      endIndex: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
                {loadingCandidates ? (
                  <div className="text-center py-4">Loading candidates...</div>
                ) : candidates.length === 0 ? (
                  <div className="text-center py-4">No candidates found</div>
                ) : (
                  candidates.map((candidate, index) => (
                    <label key={candidate._id} className="flex items-center p-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={candidateSelection.selectedIds.includes(candidate._id)}
                        onChange={(e) => {
                          const newSelected = e.target.checked
                            ? [...candidateSelection.selectedIds, candidate._id]
                            : candidateSelection.selectedIds.filter(id => id !== candidate._id);
                          setCandidateSelection({
                            ...candidateSelection,
                            selectedIds: newSelected
                          });
                        }}
                        className="mr-3"
                      />
                      <span>
                        {candidate.full_name || `Candidate ${index + 1}`}
                        {candidate.email && ` (${candidate.email})`}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleCreateRound}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400"
              >
                {loading ? 'Creating...' : 'Create Round'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 