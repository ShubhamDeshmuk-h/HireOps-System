import React, { useEffect, useState } from 'react';
import axios from 'axios';

const actionTypes = [
  'CREATE_JOB', 'UPDATE_JOB', 'DELETE_JOB',
  'UPLOAD_RESUME', 'CANDIDATE_PARSED', 'UPDATE_CANDIDATE_STATUS',
  'CREATE_ROUND', 'ASSIGN_CANDIDATES_TO_ROUND', 'UPDATE_CANDIDATE_ROUND_STATUS',
  'SEND_APTITUDE_LINK'
];

const userRoles = ['hr', 'interviewer', 'admin', 'user'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    actionType: '',
    userRole: '',
    jobId: '',
    candidateId: '',
    roundId: '',
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get('http://localhost:5000/api/logs', { params, headers });
      setLogs(res.data);
    } catch (err) {
      setError('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleFilterChange = e => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleApplyFilters = () => { fetchLogs(); };

  const handleDownload = async (format) => {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      params.format = format;
      const res = await axios.get('http://localhost:5000/api/logs/export', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', format === 'csv' ? 'activity_logs.csv' : 'activity_logs.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download logs');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-blue-900">Activity Logs</h1>
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-blue-700 font-semibold">Action Type</label>
          <select name="actionType" value={filters.actionType} onChange={handleFilterChange} className="border rounded px-2 py-1">
            <option value="">All</option>
            {actionTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-blue-700 font-semibold">User Role</label>
          <select name="userRole" value={filters.userRole} onChange={handleFilterChange} className="border rounded px-2 py-1">
            <option value="">All</option>
            {userRoles.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-blue-700 font-semibold">Job ID</label>
          <input name="jobId" value={filters.jobId} onChange={handleFilterChange} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-blue-700 font-semibold">Candidate ID</label>
          <input name="candidateId" value={filters.candidateId} onChange={handleFilterChange} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-blue-700 font-semibold">Round ID</label>
          <input name="roundId" value={filters.roundId} onChange={handleFilterChange} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-blue-700 font-semibold">Start Date</label>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-blue-700 font-semibold">End Date</label>
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="border rounded px-2 py-1" />
        </div>
        <button onClick={handleApplyFilters} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold ml-2">Apply Filters</button>
        <button onClick={() => handleDownload('csv')} className="bg-green-600 text-white px-4 py-2 rounded font-semibold ml-2">Download CSV</button>
        <button onClick={() => handleDownload('excel')} className="bg-yellow-600 text-white px-4 py-2 rounded font-semibold ml-2">Download Excel</button>
      </div>
      {loading ? (
        <div className="text-blue-700">Loading logs...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow p-4">
          <table className="min-w-full divide-y divide-blue-100">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Timestamp</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">User</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Role</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Action Type</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Description</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Entity</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Entity ID</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Job ID</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Candidate ID</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Round ID</th>
                <th className="px-2 py-1 text-left text-blue-700 font-semibold">Extra Meta</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.logId} className="border-b hover:bg-blue-50">
                  <td className="px-2 py-1">{formatDate(log.timestamp)}</td>
                  <td className="px-2 py-1">{log.userId}</td>
                  <td className="px-2 py-1">{log.userRole}</td>
                  <td className="px-2 py-1">{log.actionType}</td>
                  <td className="px-2 py-1">{log.description}</td>
                  <td className="px-2 py-1">{log.entity}</td>
                  <td className="px-2 py-1">{log.entityId}</td>
                  <td className="px-2 py-1">{log.jobId}</td>
                  <td className="px-2 py-1">{log.candidateId}</td>
                  <td className="px-2 py-1">{log.roundId}</td>
                  <td className="px-2 py-1 text-xs whitespace-pre-wrap">{log.extraMeta ? JSON.stringify(log.extraMeta, null, 2) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <div className="text-blue-700 mt-4">No logs found for selected filters.</div>}
        </div>
      )}
    </div>
  );
} 