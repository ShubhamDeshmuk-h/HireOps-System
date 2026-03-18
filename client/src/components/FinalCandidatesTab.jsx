import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaEnvelope, FaPhone, FaStar, FaCheckCircle, FaEye, FaTimesCircle, FaDownload, FaFileAlt, FaEnvelopeOpenText, FaPrint, FaEyeSlash, FaUpload } from 'react-icons/fa';

const FinalCandidatesTab = () => {
  const { jobId } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateDetails, setCandidateDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [offerLetterFile, setOfferLetterFile] = useState(null);
  const [offerDetails, setOfferDetails] = useState({
    position: '',
    department: '',
    location: '',
    salary: '',
    startDate: '',
    reportingTo: '',
    terms: ''
  });
  const [welcomeDetails, setWelcomeDetails] = useState({
    startDate: '',
    location: '',
    department: '',
    managerName: '',
    hrContact: '',
    hrPhone: '',
    welcomeMessage: '',
    onboardingDetails: '',
    companyCulture: '',
    nextSteps: ''
  });

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
      // Use candidate_id (UUID) as the primary identifier
      const candidateId = candidate.candidate_id || candidate._id;
      console.log('Fetching performance for candidate ID:', candidateId);
      
      const performanceRes = await axios.get(
        `http://localhost:5000/api/rounds/job/${jobId}/candidate/${candidateId}/performance`,
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
    console.log('View Details clicked for candidate:', candidate);
    setSelectedCandidate(candidate);
    try {
      await fetchCandidateDetails(candidate);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching candidate details:', error);
      // Show a simple modal with basic info if API fails
      setCandidateDetails({
        candidate: candidate,
        performance: [],
        overallStats: {
          totalRounds: 0,
          completedRounds: 0,
          passedRounds: 0,
          failedRounds: 0,
          successRate: 0,
          averageScore: 0
        }
      });
      setShowDetails(true);
    }
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

  const handleViewResume = async (candidate) => {
    try {
      console.log('🔍 Viewing resume for candidate:', candidate);
      console.log('🔍 Using candidate_id:', candidate.candidate_id);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/candidates/${candidate.candidate_id}/resume`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create blob with correct MIME type
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('❌ Error viewing resume:', err);
      console.error('❌ Error response:', err.response?.data);
      alert('Resume not available for viewing');
    }
  };

  const handleDownloadResume = async (candidate) => {
    try {
      console.log('🔍 Downloading resume for candidate:', candidate);
      console.log('🔍 Using candidate_id:', candidate.candidate_id);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/candidates/${candidate.candidate_id}/resume`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create blob with correct MIME type
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${candidate.full_name}_Resume.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('❌ Error downloading resume:', err);
      console.error('❌ Error response:', err.response?.data);
      alert('Resume not available for download');
    }
  };

  const handleSendEmail = async (candidate, emailType) => {
    try {
      const token = localStorage.getItem('token');
      let subject = '';
      let message = '';
      
      switch (emailType) {
        case 'offer':
          subject = `Offer Letter - ${job?.title} Position`;
          message = `Dear ${candidate.full_name},\n\nWe are pleased to offer you the position of ${job?.title} at our company.\n\nPlease review the attached offer letter and respond within 7 days.\n\nBest regards,\nHR Team`;
          break;
        case 'welcome':
          subject = `🎉 Welcome to the Team - ${welcomeDetails.department || job?.title} Position`;
          message = `Dear ${candidate.full_name},

🎉 Congratulations and Welcome to Our Team!

${welcomeDetails.welcomeMessage || `We are absolutely thrilled to welcome you aboard as our new ${job?.title}! Your journey with us is about to begin, and we couldn't be more excited to have you as part of our growing family.`}

🌟 What's Next?

${welcomeDetails.onboardingDetails || `Your onboarding process will begin shortly, and you'll receive detailed information about:
• Your first day schedule and orientation
• Company policies and procedures
• Team introductions and workspace setup
• IT access and equipment details
• Benefits and payroll information`}

📅 Important Details:
• Start Date: ${welcomeDetails.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
• Location: ${welcomeDetails.location || job?.location || 'Office Location'}
• Department: ${welcomeDetails.department || job?.department || 'Your Department'}
• Manager: ${welcomeDetails.managerName || 'To be introduced during orientation'}

💼 Your Role:
• Position: ${job?.title}
• Department: ${welcomeDetails.department || job?.department || 'To be confirmed'}

🎯 Next Steps:
${welcomeDetails.nextSteps || `Our HR team will reach out to you within the next 24-48 hours with your complete onboarding package, including:
• Welcome kit and company materials
• IT setup instructions
• Employee handbook
• Benefits enrollment forms
• First week schedule`}

📞 Contact Information:
If you have any questions before your start date, please don't hesitate to reach out to our HR team at ${welcomeDetails.hrContact || 'hr@company.com'} or call us at ${welcomeDetails.hrPhone || '+91-XXXXXXXXXX'}.

🏢 Company Culture:
${welcomeDetails.companyCulture || `We believe in fostering a collaborative, innovative, and inclusive work environment where every team member can thrive and grow. We're excited to see the unique perspective and skills you'll bring to our team.`}

🎊 Welcome Celebration:
We're planning a special welcome lunch for your first week to help you get to know your new colleagues and feel at home in our organization.

Once again, welcome aboard! We're excited to see what we'll accomplish together.

Best regards,
The HR Team
${process.env.COMPANY_NAME || 'Your Company Name'}

P.S. Don't forget to follow us on LinkedIn for company updates and team highlights!`;
          break;
        default:
          subject = `Update - ${job?.title} Application`;
          message = `Dear ${candidate.full_name},\n\nThank you for your interest in the ${job?.title} position.\n\nBest regards,\nHR Team`;
      }
      
      await axios.post(`http://localhost:5000/api/candidates/${candidate.candidate_id}/send-email`, {
        subject,
        message,
        emailType,
        welcomeDetails: emailType === 'welcome' ? welcomeDetails : null
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      alert('Email sent successfully!');
      if (emailType === 'welcome') {
        setShowWelcomeModal(false);
        setWelcomeDetails({
          startDate: '',
          location: '',
          department: '',
          managerName: '',
          hrContact: '',
          hrPhone: '',
          welcomeMessage: '',
          onboardingDetails: '',
          companyCulture: '',
          nextSteps: ''
        });
      }
    } catch (err) {
      console.error('Error sending email:', err);
      alert('Failed to send email');
    }
  };

  const handleSendOfferLetter = async (candidate) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!offerLetterFile) {
        alert('Please upload an offer letter PDF');
        return;
      }

      const formData = new FormData();
      formData.append('offerLetter', offerLetterFile);
      formData.append('offerDetails', JSON.stringify(offerDetails));
      formData.append('candidateId', candidate.candidate_id);

      await axios.post(`http://localhost:5000/api/candidates/${candidate.candidate_id}/send-offer`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Offer letter sent successfully!');
      setShowOfferModal(false);
      setOfferLetterFile(null);
      setOfferDetails({
        position: '',
        department: '',
        location: '',
        salary: '',
        startDate: '',
        reportingTo: '',
        terms: ''
      });
    } catch (err) {
      console.error('Error sending offer letter:', err);
      alert('Failed to send offer letter');
    }
  };

  const handleOfferFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setOfferLetterFile(file);
    } else {
      alert('Please upload a PDF file');
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow-md mt-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center">
            <FaUser className="text-blue-600 text-xl mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Candidates</p>
              <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
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
        
        <div className="bg-gray-50 rounded-lg p-4">
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
        
        <div className="bg-gray-50 rounded-lg p-4">
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
        <div className="text-center py-8">
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
              {/* Candidate Information */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border border-blue-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FaUser className="mr-2 text-blue-600" />
                  Candidate Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Full Name</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{candidateDetails.candidate.full_name}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email Address</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{candidateDetails.candidate.email}</p>
                  </div>
                  {candidateDetails.candidate.phone && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Phone Number</p>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{candidateDetails.candidate.phone}</p>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Match Score</p>
                    <p className={`text-lg font-semibold mt-1 ${getScoreColor(candidateDetails.candidate.match_score, job?.cutoff_score)}`}>
                      {candidateDetails.candidate.match_score || 'N/A'}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Current Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${getStatusBadge(candidateDetails.candidate.status)}`}>
                      {candidateDetails.candidate.status || 'Passed'}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Application Date</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {candidateDetails.candidate.created_at 
                        ? new Date(candidateDetails.candidate.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Job Details */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-6 border border-green-100">
                <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <FaFileAlt className="mr-2 text-green-600" />
                  Position Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Position Title</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{job?.title || 'Not Specified'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Department</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{job?.department || 'Not Specified'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Location</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{job?.location || 'Not Specified'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Salary Range</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{job?.salary || 'Not Specified'}</p>
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
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200">
              <div className="flex gap-3">
                {/* Resume Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewResume(selectedCandidate)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition border border-blue-200"
                    title="View Resume"
                  >
                    <FaEye className="mr-2" />
                    View Resume
                  </button>
                  
                  <button
                    onClick={() => handleDownloadResume(selectedCandidate)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition border border-blue-300"
                    title="Download Resume"
                  >
                    <FaDownload className="mr-2" />
                    Download Resume
                  </button>
                </div>

                {/* Email Actions */}
                <div className="relative group">
                  <button
                    className="flex items-center px-4 py-2 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition border border-green-200"
                    title="Send Email"
                  >
                    <FaEnvelopeOpenText className="mr-2" />
                    Send Email
                  </button>
                  <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-48">
                    <button
                      onClick={() => setShowWelcomeModal(true)}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg border-b border-gray-100"
                    >
                      <div className="font-medium">Send Welcome Email</div>
                      <div className="text-xs text-gray-500">Customize and send welcome email</div>
                    </button>
                    <button
                      onClick={() => setShowOfferModal(true)}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                    >
                      <div className="font-medium">Send Offer Letter</div>
                      <div className="text-xs text-gray-500">Upload and send offer letter PDF</div>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
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
        </div>
      )}

      {/* Offer Letter Modal */}
      {showOfferModal && selectedCandidate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Send Offer Letter
                </h2>
                <p className="text-gray-600">Send offer letter to {selectedCandidate.full_name}</p>
              </div>
              <button
                onClick={() => setShowOfferModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Upload Offer Letter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Offer Letter PDF *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <FaUpload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="offer-letter-file"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="offer-letter-file"
                          name="offer-letter-file"
                          type="file"
                          className="sr-only"
                          accept=".pdf"
                          onChange={handleOfferFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF up to 10MB</p>
                  </div>
                </div>
                {offerLetterFile && (
                  <div className="mt-2 flex items-center text-sm text-green-600">
                    <FaFileAlt className="mr-1" />
                    {offerLetterFile.name}
                  </div>
                )}
              </div>

              {/* Offer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position Title
                  </label>
                  <input
                    type="text"
                    value={offerDetails.position}
                    onChange={(e) => setOfferDetails({...offerDetails, position: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={offerDetails.department}
                    onChange={(e) => setOfferDetails({...offerDetails, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={offerDetails.location}
                    onChange={(e) => setOfferDetails({...offerDetails, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Mumbai, India"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Salary
                  </label>
                  <input
                    type="text"
                    value={offerDetails.salary}
                    onChange={(e) => setOfferDetails({...offerDetails, salary: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., ₹15,00,000 - ₹20,00,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={offerDetails.startDate}
                    onChange={(e) => setOfferDetails({...offerDetails, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reporting To
                  </label>
                  <input
                    type="text"
                    value={offerDetails.reportingTo}
                    onChange={(e) => setOfferDetails({...offerDetails, reportingTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Engineering Manager"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Terms & Conditions
                </label>
                <textarea
                  value={offerDetails.terms}
                  onChange={(e) => setOfferDetails({...offerDetails, terms: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter any additional terms, conditions, or special notes..."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowOfferModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendOfferLetter(selectedCandidate)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Send Offer Letter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Email Modal */}
      {showWelcomeModal && selectedCandidate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Customize Welcome Email
                </h2>
                <p className="text-gray-600">Personalize welcome email for {selectedCandidate.full_name}</p>
              </div>
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={welcomeDetails.startDate}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={welcomeDetails.location}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Mumbai, India"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={welcomeDetails.department}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Engineering"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager Name
                    </label>
                    <input
                      type="text"
                      value={welcomeDetails.managerName}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, managerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., John Smith"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HR Contact Email
                    </label>
                    <input
                      type="email"
                      value={welcomeDetails.hrContact}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, hrContact: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., hr@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HR Contact Phone
                    </label>
                    <input
                      type="text"
                      value={welcomeDetails.hrPhone}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, hrPhone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., +91-XXXXXXXXXX"
                    />
                  </div>
                </div>

                {/* Email Content */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Email Content</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Welcome Message
                    </label>
                    <textarea
                      value={welcomeDetails.welcomeMessage}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, welcomeMessage: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Custom welcome message (optional - will use default if empty)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Onboarding Details
                    </label>
                    <textarea
                      value={welcomeDetails.onboardingDetails}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, onboardingDetails: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Custom onboarding information (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Culture
                    </label>
                    <textarea
                      value={welcomeDetails.companyCulture}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, companyCulture: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Custom company culture message (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Next Steps
                    </label>
                    <textarea
                      value={welcomeDetails.nextSteps}
                      onChange={(e) => setWelcomeDetails({...welcomeDetails, nextSteps: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Custom next steps information (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Email Preview:</h4>
                <div className="text-xs text-gray-600 bg-white p-3 rounded border">
                  <div className="font-medium">Subject: 🎉 Welcome to the Team - {welcomeDetails.department || job?.title} Position</div>
                  <div className="mt-2">
                    Dear {selectedCandidate.full_name},<br/><br/>
                    🎉 Congratulations and Welcome to Our Team!<br/><br/>
                    {welcomeDetails.welcomeMessage || `We are absolutely thrilled to welcome you aboard as our new ${job?.title}! Your journey with us is about to begin, and we couldn't be more excited to have you as part of our growing family.`}<br/><br/>
                    <strong>Start Date:</strong> {welcomeDetails.startDate || 'To be confirmed'}<br/>
                    <strong>Location:</strong> {welcomeDetails.location || job?.location || 'Office Location'}<br/>
                    <strong>Department:</strong> {welcomeDetails.department || job?.department || 'Your Department'}<br/>
                    <strong>Manager:</strong> {welcomeDetails.managerName || 'To be introduced during orientation'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendEmail(selectedCandidate, 'welcome')}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                Send Welcome Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinalCandidatesTab; 