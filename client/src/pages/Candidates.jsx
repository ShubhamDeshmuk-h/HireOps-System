import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaUser, FaEnvelope, FaPhone, FaStar, FaCheckCircle, FaTimesCircle, FaEye, FaDownload, FaFileAlt, FaLinkedin, FaGithub, FaGraduationCap, FaBriefcase, FaProjectDiagram } from 'react-icons/fa';

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:5000/api/candidates')
      .then(res => {
        setCandidates(res.data);
        setError(null);
      })
      .catch(() => setError('Failed to fetch candidates.'))
      .finally(() => setLoading(false));
  }, []);

  // Calculate summary statistics
  const totalCandidates = candidates.length;
  const hiredCandidates = candidates.filter(c => c.status === 'Hired').length;
  const shortlistedCandidates = candidates.filter(c => c.status === 'Shortlisted').length;
  const rejectedCandidates = candidates.filter(c => c.status === 'Rejected').length;
  const newCandidates = candidates.filter(c => c.status === 'New' || !c.status).length;
  
  // Calculate average match score
  const validScores = candidates.filter(c => c.match_score !== null && c.match_score !== undefined);
  const avgMatchScore = validScores.length > 0 
    ? Math.round((validScores.reduce((sum, c) => sum + (parseFloat(c.match_score) || 0), 0) / validScores.length))
    : 0;

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Hired': 'bg-green-100 text-green-800 border-green-200',
      'Shortlisted': 'bg-blue-100 text-blue-800 border-blue-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200',
      'New': 'bg-gray-100 text-gray-800 border-gray-200',
      'Interviewed': 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return statusStyles[status] || statusStyles['New'];
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="pl-0 sm:pl-2 md:pl-4 pt-8 w-full max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-900 mb-4">All Candidates</h1>
      {/* Section Title for Summary */}
      <h2 className="text-lg font-semibold text-blue-800 mb-2">Candidates Overview</h2>
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-blue-50">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-blue-600">{totalCandidates}</div>
          <div className="text-sm text-gray-600">Total Candidates</div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-green-50">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-2xl font-bold text-green-600">{hiredCandidates}</div>
          <div className="text-sm text-gray-600">Hired</div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-blue-50">
          <div className="text-3xl mb-2">⭐</div>
          <div className="text-2xl font-bold text-blue-600">{shortlistedCandidates}</div>
          <div className="text-sm text-gray-600">Shortlisted</div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-red-50">
          <div className="text-3xl mb-2">❌</div>
          <div className="text-2xl font-bold text-red-600">{rejectedCandidates}</div>
          <div className="text-sm text-gray-600">Rejected</div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-purple-50">
          <div className="text-3xl mb-2">📊</div>
          <div className="text-2xl font-bold text-purple-600">{avgMatchScore}%</div>
          <div className="text-sm text-gray-600">Avg Match Score</div>
        </div>
      </div>
      {/* Section Title for List */}
      <h2 className="text-lg font-semibold text-blue-800 mb-4">All Candidates</h2>
      {/* Candidates List */}
      <div className="bg-transparent">
        <div className="flex flex-col gap-6">
              {candidates.map(candidate => (
            <div key={candidate._id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex items-start space-x-4 w-full md:w-auto">
                {/* Profile Avatar */}
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold uppercase">
                  {candidate.full_name ? candidate.full_name[0] : <FaUser className="text-blue-600" />}
                </div>
                {/* Candidate Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-1 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{candidate.full_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(candidate.status || 'New')}`}>{candidate.status || 'New'}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-1">
                    <div className="flex items-center space-x-2">
                      <FaEnvelope className="text-gray-400" />
                      <span className="truncate">{candidate.email}</span>
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center space-x-2">
                        <FaPhone className="text-gray-400" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <FaStar className="text-gray-400" />
                      <span className={`font-semibold ${getScoreColor(candidate.match_score)}`}>Match Score: {candidate.match_score || 0}%</span>
                    </div>
                  </div>
                  {/* Skills Preview */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 3).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">{skill}</span>
                      ))}
                      {candidate.skills.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-full">+{candidate.skills.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Actions */}
              <div className="flex space-x-2 mt-4 md:mt-0">
                    <button
                      onClick={() => setSelected(candidate)}
                  className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                  <FaEye className="text-sm" />
                  <span>View Details</span>
                    </button>
              </div>
            </div>
              ))}
        </div>
      </div>
      {/* Enhanced Candidate Profile Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <FaUser className="text-blue-600 text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selected.full_name}</h2>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadge(selected.status || 'New')}`}>
                        {selected.status || 'New'}
                      </span>
                      <span className={`text-sm font-semibold ${getScoreColor(selected.match_score)}`}>
                        Match Score: {selected.match_score || 0}%
                      </span>
                    </div>
                  </div>
                </div>
            <button
              onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                  <FaTimesCircle className="w-6 h-6" />
            </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <FaEnvelope className="text-blue-600" />
                      <span className="text-gray-700">{selected.email}</span>
                    </div>
                    {selected.phone && (
                      <div className="flex items-center space-x-3">
                        <FaPhone className="text-blue-600" />
                        <span className="text-gray-700">{selected.phone}</span>
                      </div>
                    )}
                    {selected.linkedin && selected.linkedin.length > 0 && (
                      <div className="flex items-center space-x-3">
                        <FaLinkedin className="text-blue-600" />
                        <a href={selected.linkedin[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                    {selected.github && selected.github.length > 0 && (
                      <div className="flex items-center space-x-3">
                        <FaGithub className="text-blue-600" />
                        <a href={selected.github[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          GitHub Profile
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {selected.skills && selected.skills.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.skills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
              </div>
            )}
              </div>

              {/* Summary */}
              {selected.summary && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{selected.summary}</p>
                </div>
              )}

              {/* Education */}
              {selected.education && selected.education.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <FaGraduationCap className="mr-2 text-blue-600" />
                    Education
                  </h3>
                  <div className="space-y-3">
                    {selected.education.map((edu, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="font-semibold text-gray-900">{edu.degree}</div>
                        <div className="text-gray-600">{edu.institute}</div>
                        {edu.year && <div className="text-sm text-gray-500">{edu.year}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {selected.experience && selected.experience.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <FaBriefcase className="mr-2 text-blue-600" />
                    Experience
                  </h3>
                  <div className="space-y-3">
                    {selected.experience.map((exp, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="font-semibold text-gray-900">{exp.role}</div>
                        <div className="text-gray-600">{exp.company}</div>
                        {exp.period && <div className="text-sm text-gray-500">{exp.period}</div>}
                        {exp.description && <div className="text-sm text-gray-700 mt-2">{exp.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {selected.projects && selected.projects.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <FaProjectDiagram className="mr-2 text-blue-600" />
                    Projects
                  </h3>
                  <div className="space-y-3">
                    {selected.projects.map((proj, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="font-semibold text-gray-900">{proj.title}</div>
                        {proj.description && <div className="text-sm text-gray-700 mt-1">{proj.description}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resume */}
              {selected.resume_id && selected.resume_id.file_path && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <FaFileAlt className="mr-2 text-blue-600" />
                    Resume
                  </h3>
                  <a 
                    href={selected.resume_id.file_path} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaDownload />
                    <span>Download Resume</span>
                  </a>
              </div>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 