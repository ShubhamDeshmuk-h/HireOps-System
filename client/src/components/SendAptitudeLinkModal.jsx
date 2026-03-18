import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaPaperPlane } from 'react-icons/fa';

export default function SendAptitudeLinkModal({ round, assignedCandidates = [], onClose, onSuccess }) {
  const [candidates, setCandidates] = useState(assignedCandidates);
  const [selectedIds, setSelectedIds] = useState(assignedCandidates.map(c => c._id));
  const [testLink, setTestLink] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Remove useEffect that fetches candidates from backend

  const handleSend = async () => {
    if (!testLink || selectedIds.length === 0) {
      setError('Please provide a test link and select at least one candidate.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Map selectedIds (which are _id) to candidate_id (string)
      const selectedCandidateObjs = candidates.filter(c => selectedIds.includes(c._id));
      const candidateIds = selectedCandidateObjs.map(c => c.candidate_id);
      await axios.post(`http://localhost:5000/api/rounds/${round._id}/send-aptitude`, {
        candidateIds,
        test_link: testLink,
        date_time: dateTime,
        message,
        hr_email: localStorage.getItem('userEmail') || undefined
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send aptitude links');
    } finally {
      setLoading(false);
    }
  };

  const toggleCandidate = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedIds(candidates.map(c => c._id));
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const selectRange = (startIndex, endIndex) => {
    const rangeCandidates = candidates.slice(startIndex, endIndex + 1);
    const rangeIds = rangeCandidates.map(c => c._id);
    setSelectedIds(prev => [...new Set([...prev, ...rangeIds])]);
  };

  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const selectCustomRange = () => {
    const start = parseInt(rangeStart) - 1; // Convert to 0-based index
    const end = parseInt(rangeEnd) - 1;
    
    if (isNaN(start) || isNaN(end) || start < 0 || end >= candidates.length || start > end) {
      alert('Please enter valid range numbers (1 to ' + candidates.length + ')');
      return;
    }
    
    selectRange(start, end);
    setRangeStart('');
    setRangeEnd('');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Send Aptitude Test Link</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes />
          </button>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Aptitude Test Link*</label>
          <input
            type="text"
            value={testLink}
            onChange={e => setTestLink(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={e => setDateTime(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Instructions for the test..."
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Candidates</label>
          
          {/* Selection Controls */}
          {candidates.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Deselect All
                </button>
                <span className="text-sm text-gray-600 ml-2">
                  {selectedIds.length} of {candidates.length} selected
                </span>
              </div>
              
              {/* Custom Range Selection */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Select range:</span>
                <input
                  type="number"
                  min="1"
                  max={candidates.length}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  placeholder="Start"
                  className="w-16 px-2 py-1 border rounded text-center"
                />
                <span className="text-gray-600">to</span>
                <input
                  type="number"
                  min="1"
                  max={candidates.length}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  placeholder="End"
                  className="w-16 px-2 py-1 border rounded text-center"
                />
                <button
                  type="button"
                  onClick={selectCustomRange}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Select Range
                </button>
              </div>
            </div>
          )}

          <div className="max-h-40 overflow-y-auto border rounded-lg p-4">
            {candidates.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No candidates assigned to this round.</div>
            ) : candidates.map((candidate, index) => (
              <label key={candidate._id} className="flex items-center p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(candidate._id)}
                  onChange={() => toggleCandidate(candidate._id)}
                  className="mr-3"
                />
                <span className="flex-1">{candidate.full_name} ({candidate.email})</span>
                {index < candidates.length - 1 && (
                  <button
                    type="button"
                    onClick={() => selectRange(index, Math.min(index + 4, candidates.length - 1))}
                    className="ml-2 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    title="Select next 5 candidates"
                  >
                    +5
                  </button>
                )}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !testLink || selectedIds.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-blue-400 flex items-center gap-2"
          >
            <FaPaperPlane /> {loading ? 'Sending...' : 'Send Link'}
          </button>
        </div>
      </div>
    </div>
  );
} 