import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const JobAnalysis = ({ job, candidates, analysis, candidatesLoading }) => {
  const generatePDF = async () => {
    const analysisElement = document.getElementById('analysis-section');
    if (!analysisElement) return;
    
    // Load logo as base64
    let logoImgData = null;
    try {
      const response = await fetch('/logo192.png');
      const blob = await response.blob();
      logoImgData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      logoImgData = null;
    }
    
    const canvas = await html2canvas(analysisElement, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let y = 30;
    
    // Add logo if available
    if (logoImgData) {
      const logoWidth = 60;
      const logoHeight = 60;
      pdf.addImage(logoImgData, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
      y += logoHeight + 10;
    }
    
    // Add job title and subtitle
    pdf.setFontSize(20);
    pdf.setTextColor('#2563eb');
    pdf.text(job?.title || 'Job', pageWidth / 2, y + 20, { align: 'center' });
    pdf.setFontSize(13);
    pdf.setTextColor('#333');
    pdf.setFont(undefined, 'bold');
    pdf.text('Comprehensive Analysis Report', pageWidth / 2, y + 40, { align: 'center' });
    pdf.setFont(undefined, 'normal');
    y += 60;
    
    // Calculate image dimensions to fit A4
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    if (imgHeight < pageHeight - y - 20) {
      pdf.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight);
    } else {
      // If content is longer than one page, split
      let position = 0;
      let remainingHeight = imgHeight;
      let pageY = y;
      while (remainingHeight > 0) {
        pdf.addImage(imgData, 'PNG', 20, pageY, imgWidth, imgHeight, undefined, 'FAST');
        position -= pageHeight - 40;
        remainingHeight -= pageHeight - 40;
        if (remainingHeight > 0) {
          pdf.addPage();
          pageY = 20;
        }
      }
    }
    pdf.save(`${job?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'job'}-analysis-report.pdf`);
  };

  const getQualityAssessment = () => {
    if (analysis.avgScore >= 80) {
      return "Excellent candidate pool with high average match scores. Consider raising the cutoff threshold to focus on top performers.";
    } else if (analysis.avgScore >= 60) {
      return "Good candidate pool with moderate match scores. Current cutoff appears appropriate for this position.";
    } else {
      return "Candidate pool shows lower match scores. Consider reviewing job requirements or expanding the search criteria.";
    }
  };

  const getShortlistingStrategy = () => {
    if (analysis.shortlisted > analysis.total * 0.3) {
      return "High shortlisting rate suggests strong candidate pool. Consider additional screening rounds.";
    } else {
      return "Conservative shortlisting approach. May want to review candidates with scores near the cutoff.";
    }
  };

  const getSkillsAnalysis = () => {
    if (analysis.topSkills.length > 0) {
      const topSkills = analysis.topSkills.slice(0, 3).map(s => s.split(' (')[0]).join(', ');
      const additional = analysis.topSkills.length > 3 ? "Consider if missing skills can be trained." : "Skills align well with requirements.";
      return `Top skills in candidate pool: ${topSkills}. ${additional}`;
    } else {
      return "Skills data not available. Consider enhancing resume parsing for better skill extraction.";
    }
  };

  const getExperienceLevels = () => {
    const experienceLevels = {};
    (candidates || []).forEach(c => {
      if (c.experience && c.experience.length > 0) {
        const totalYears = c.experience.reduce((sum, exp) => {
          const period = exp.period || '';
          const years = period.match(/(\d+)/);
          return sum + (years ? parseInt(years[1]) : 0);
        }, 0);
        const level = totalYears < 2 ? 'Junior' : totalYears < 5 ? 'Mid-level' : 'Senior';
        experienceLevels[level] = (experienceLevels[level] || 0) + 1;
      }
    });
    return Object.entries(experienceLevels).map(([level, count]) => ({
      level,
      count,
      percentage: ((count / analysis.total) * 100).toFixed(1)
    }));
  };

  const getEducationLevels = () => {
    const educationLevels = {};
    (candidates || []).forEach(c => {
      if (c.education && c.education.length > 0) {
        const degrees = c.education.map(edu => edu.degree || '').join(' ');
        const level = degrees.toLowerCase().includes('phd') ? 'PhD' :
                    degrees.toLowerCase().includes('master') ? 'Masters' :
                    degrees.toLowerCase().includes('bachelor') ? 'Bachelors' : 'Other';
        educationLevels[level] = (educationLevels[level] || 0) + 1;
      }
    });
    return Object.entries(educationLevels).map(([level, count]) => ({
      level,
      count,
      percentage: ((count / analysis.total) * 100).toFixed(1)
    }));
  };

  const getRecentApplications = () => {
    return (candidates || []).filter(c => {
      const created = new Date(c.created_at || c.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created > weekAgo;
    }).length;
  };

  const getHighPerformers = () => {
    const highScorers = (candidates || []).filter(c => (c.match_score || 0) >= 80).length;
    return analysis.total > 0 ? ((highScorers / analysis.total) * 100).toFixed(1) : 0;
  };

  if (candidatesLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-blue-700 text-lg">Loading comprehensive analysis...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Analysis Data Available</h3>
        <p className="text-gray-600">Upload resumes to generate comprehensive analysis insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold mb-2">Job Analysis Report</h2>
            <p className="text-blue-100 text-lg">{job?.title} • {job?.department}</p>
            <p className="text-blue-200">Generated on {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
          <button
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-xl font-semibold transition duration-300 flex items-center gap-2"
            onClick={generatePDF}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Report
          </button>
        </div>
      </div>

      <div id="analysis-section" className="space-y-8">
        {/* Executive Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Executive Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-blue-900 mb-2">{analysis.total}</div>
              <div className="text-blue-700 font-semibold">Total Candidates</div>
              <div className="text-blue-600 text-sm mt-1">Applied for this position</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-green-900 mb-2">{analysis.shortlisted}</div>
              <div className="text-green-700 font-semibold">Shortlisted</div>
              <div className="text-green-600 text-sm mt-1">{((analysis.shortlisted / analysis.total) * 100).toFixed(1)}% of total</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-purple-900 mb-2">{analysis.avgScore}</div>
              <div className="text-purple-700 font-semibold">Avg Match Score</div>
              <div className="text-purple-600 text-sm mt-1">AI-powered assessment</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-orange-900 mb-2">{analysis.topSkills.length}</div>
              <div className="text-orange-700 font-semibold">Key Skills</div>
              <div className="text-orange-600 text-sm mt-1">Most common in pool</div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Key Insights & Recommendations
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-6">
                <h4 className="font-bold text-blue-900 mb-2">📊 Candidate Quality Assessment</h4>
                <p className="text-blue-800">{getQualityAssessment()}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-6">
                <h4 className="font-bold text-green-900 mb-2">🎯 Shortlisting Strategy</h4>
                <p className="text-green-800">{getShortlistingStrategy()}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-xl p-6">
                <h4 className="font-bold text-purple-900 mb-2">🔍 Skills Gap Analysis</h4>
                <p className="text-purple-800">{getSkillsAnalysis()}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-6">
                <h4 className="font-bold text-orange-900 mb-2">⚡ Action Items</h4>
                <ul className="text-orange-800 space-y-1">
                  <li>• Review candidates with scores 70-80% for potential</li>
                  <li>• Schedule interviews for top 20% performers</li>
                  <li>• Consider additional screening for technical roles</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Match Score Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-blue-900 mb-6">Match Score Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={(() => {
                const buckets = Array(11).fill(0);
                (candidates || []).forEach(c => {
                  const score = Math.round(c.match_score || 0);
                  const idx = Math.min(Math.floor(score / 10), 10);
                  buckets[idx]++;
                });
                return buckets.map((count, i) => ({ 
                  range: `${i * 10}-${i === 10 ? 100 : (i + 1) * 10 - 1}`, 
                  count,
                  percentage: ((count / analysis.total) * 100).toFixed(1)
                }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" stroke="#6b7280" />
                <YAxis allowDecimals={false} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [value, 'Candidates']}
                  labelFormatter={(label) => `Score Range: ${label}%`}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600 text-center">
              Distribution of AI match scores across all candidates
            </div>
          </div>

          {/* Candidate Status Distribution */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-blue-900 mb-6">Candidate Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={(() => {
                    const statusCounts = {};
                    (candidates || []).forEach(c => { 
                      statusCounts[c.status || 'New'] = (statusCounts[c.status || 'New'] || 0) + 1; 
                    });
                    return Object.entries(statusCounts).map(([status, value]) => ({ 
                      name: status, 
                      value,
                      percentage: ((value / analysis.total) * 100).toFixed(1)
                    }));
                  })()}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#2563eb"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {(() => {
                    const COLORS = ['#2563eb', '#22c55e', '#f59e42', '#ef4444', '#a855f7', '#06b6d4'];
                    const statusCounts = {};
                    (candidates || []).forEach(c => { 
                      statusCounts[c.status || 'New'] = (statusCounts[c.status || 'New'] || 0) + 1; 
                    });
                    return Object.keys(statusCounts).map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ));
                  })()}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name) => [value, 'Candidates']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills Analysis */}
        {analysis.topSkills.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Skills Analysis
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-blue-900 mb-4">Top Skills in Candidate Pool</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analysis.topSkills.map(s => { 
                    const [skill, count] = s.split(' ('); 
                    return { 
                      skill, 
                      count: parseInt(count), 
                      percentage: ((parseInt(count) / analysis.total) * 100).toFixed(1)
                    }; 
                  })}>
                    <XAxis dataKey="skill" stroke="#6b7280" />
                    <YAxis allowDecimals={false} stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      formatter={(value, name) => [value, 'Candidates']}
                      labelFormatter={(label) => `Skill: ${label}`}
                    />
                    <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-blue-900 mb-4">Skills Breakdown</h4>
                <div className="space-y-3">
                  {analysis.topSkills.slice(0, 8).map((skill, index) => {
                    const [skillName, count] = skill.split(' (');
                    const percentage = ((parseInt(count) / analysis.total) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{skillName}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-12 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Experience & Education Analysis */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
            </svg>
            Experience & Education Insights
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-blue-900 mb-4">Experience Level Distribution</h4>
              <div className="space-y-3">
                {getExperienceLevels().map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{item.level}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{item.count} candidates</span>
                      <span className="text-sm text-blue-600 font-medium">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-blue-900 mb-4">Education Background</h4>
              <div className="space-y-3">
                {getEducationLevels().map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{item.level}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{item.count} candidates</span>
                      <span className="text-sm text-blue-600 font-medium">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-2xl font-bold text-blue-900 mb-2">
                {analysis.total > 0 ? ((analysis.shortlisted / analysis.total) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-blue-700 font-semibold">Shortlisting Rate</div>
              <div className="text-blue-600 text-sm mt-1">Candidates shortlisted</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="text-2xl font-bold text-green-900 mb-2">
                {getHighPerformers()}%
              </div>
              <div className="text-green-700 font-semibold">High Performers</div>
              <div className="text-green-600 text-sm mt-1">Score ≥ 80%</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="text-2xl font-bold text-purple-900 mb-2">
                {getRecentApplications()}
              </div>
              <div className="text-purple-700 font-semibold">Recent Applications</div>
              <div className="text-purple-600 text-sm mt-1">Last 7 days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobAnalysis; 