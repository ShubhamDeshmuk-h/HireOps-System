import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { formatUtcToLocal } from '../utils/formatDate';
import RoundList from '../components/RoundList';
import CreateRoundsModal from '../components/CreateRoundsModal';
import UploadResultModal from '../components/UploadResultModal';
import InterviewFeedbackModal from '../components/InterviewFeedbackModal';
import SendAptitudeLinkModal from '../components/SendAptitudeLinkModal';
import InterviewSchedulingModal from '../components/InterviewSchedulingModal';
import FinalCandidatesTab from '../components/FinalCandidatesTab';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const statusStyles = {
  active: "bg-green-100 text-green-700 border-green-300",
  drafted: "bg-yellow-100 text-yellow-700 border-yellow-300",
  closed: "bg-red-100 text-red-700 border-red-300",
};

const sections = [
  { label: "Details", value: "details" },
  { label: "Upload CV", value: "upload" },
  { label: "Candidates", value: "candidates" },
  { label: "Rounds", value: "rounds" },
  { label: "Final Candidates", value: "final" },
  { label: "Analysis", value: "analysis" },
];

const candidateStatusOptions = ['New', 'Shortlisted', 'Interviewed', 'Rejected', 'Hired'];

const roundTypeOptions = [
  { value: 'aptitude', label: 'Aptitude' },
  { value: 'interview', label: 'Interview' },
];

export default function JobDetails() {
  const { jobId } = useParams();
  const [activeSection, setActiveSection] = useState("details");
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState(null);

  const [rounds, setRounds] = useState([]);
  const [roundsLoading, setRoundsLoading] = useState(false);
  const [roundsError, setRoundsError] = useState(null);

  const [candidateRounds, setCandidateRounds] = useState({});
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  const [files, setFiles] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const userEmail = localStorage.getItem('userEmail') || 'unknown';
  const [jd, setJd] = useState(''); // Add JD input state

  // Add state for rounds management
  const [showCreateRound, setShowCreateRound] = useState(false);
  const [showUploadResult, setShowUploadResult] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);

  // Add handlers for round actions
  const handleCreateRound = () => {
    setShowCreateRound(true);
  };

  const handleEditRound = (round) => {
    setSelectedRound(round);
    setShowCreateRound(true);
  };

  const handleUploadResult = (round) => {
    setSelectedRound(round);
    setShowUploadResult(true);
  };

  const handleCreateNextRound = (round) => {
    setSelectedRound(round);
    setShowCreateRound(true);
  };

  const handleRoundSuccess = () => {
    // Refresh rounds data
    fetchRounds();
  };

  const handleDeleteRound = async (round) => {
    if (!window.confirm(`Are you sure you want to delete the round "${round.name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/rounds/${round._id}`);
      fetchRounds();
    } catch (err) {
      alert('Failed to delete round.');
    }
  };

  const [assigningCandidates, setAssigningCandidates] = useState(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [assignTestLink, setAssignTestLink] = useState('');
  const [assignSending, setAssignSending] = useState(false);

  const [aptitudeLink, setAptitudeLink] = useState('');
  const [sendingAptitude, setSendingAptitude] = useState(false);
  const [selectedAptitudeCandidates, setSelectedAptitudeCandidates] = useState({});

  const [roundsTab, setRoundsTab] = useState('aptitude'); // 'aptitude' or 'interview'
  const [candidateRoundsAptitude, setCandidateRoundsAptitude] = useState([]);
  const [selectedInterviewCandidates, setSelectedInterviewCandidates] = useState({});
  const [candidateRoundsInterview, setCandidateRoundsInterview] = useState([]);

  // Add state for interview feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRound, setFeedbackRound] = useState(null);
  const [feedbackCandidateRound, setFeedbackCandidateRound] = useState(null);

  // Handler to open feedback modal
  const handleOpenFeedback = (round, candidateRound) => {
    setFeedbackRound(round);
    setFeedbackCandidateRound(candidateRound);
    setShowFeedbackModal(true);
  };

  // Handler for feedback success
  const handleFeedbackSuccess = () => {
    setShowFeedbackModal(false);
    setFeedbackRound(null);
    setFeedbackCandidateRound(null);
    // Optionally refresh candidate rounds or rounds
    fetchRounds && fetchRounds();
  };

  // Add state for send aptitude link modal
  const [showSendAptitudeModal, setShowSendAptitudeModal] = useState(false);
  const [sendAptitudeRound, setSendAptitudeRound] = useState(null);

  // Add state for interview scheduling modal
  const [showInterviewSchedulingModal, setShowInterviewSchedulingModal] = useState(false);
  const [schedulingRound, setSchedulingRound] = useState(null);

  const handleSendAptitudeLink = (round) => {
    setSendAptitudeRound(round);
    setShowSendAptitudeModal(true);
  };

  const handleSendAptitudeSuccess = () => {
    setShowSendAptitudeModal(false);
    setSendAptitudeRound(null);
    // Optionally refresh rounds or candidate rounds
    fetchRounds && fetchRounds();
  };

  // Handler for interview scheduling
  const handleScheduleInterview = (round) => {
    setSchedulingRound(round);
    setShowInterviewSchedulingModal(true);
  };

  const handleInterviewSchedulingSuccess = () => {
    setShowInterviewSchedulingModal(false);
    setSchedulingRound(null);
    // Refresh rounds data
    fetchRounds && fetchRounds();
  };

  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios
      .get(`http://localhost:5000/api/jobs/${jobId}`)
      .then((res) => {
        setJob(res.data.job);
      })
      .catch(() => {
        setError("Job not found.");
        setJob(null);
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  // Extracted candidate fetching logic
  const fetchCandidates = () => {
    setCandidatesLoading(true);
    console.log('Fetching candidates for jobId:', jobId);
    axios.get(`http://localhost:5000/api/candidates?jobId=${jobId}`)
      .then(res => {
        console.log('Candidates API response:', res.data);
        console.log('Number of candidates received:', res.data.length);
        setCandidates(res.data);
        setCandidatesError(null);
      })
      .catch((error) => {
        console.error('Error fetching candidates:', error);
        setCandidatesError('Failed to fetch candidates.');
      })
      .finally(() => setCandidatesLoading(false));
  };

  useEffect(() => {
    if (activeSection === "candidates") {
      fetchCandidates();
    }
  }, [activeSection, jobId]);

  // Fetch rounds for this job
  useEffect(() => {
    if (activeSection === 'rounds') {
      setRoundsLoading(true);
      axios.get(`http://localhost:5000/api/rounds/job/${jobId}`)
        .then(res => {
          setRounds(res.data);
          setRoundsError(null);
        })
        .catch(() => setRoundsError('Failed to fetch rounds.'))
        .finally(() => setRoundsLoading(false));
    }
  }, [activeSection, jobId]);

  // Fetch candidate rounds for each round
  useEffect(() => {
    if (activeSection === 'rounds' && rounds.length > 0) {
      rounds.forEach(round => {
        axios.get(`http://localhost:5000/api/candidates?jobId=${jobId}`)
          .then(res => {
            // For each candidate, fetch their CandidateRound for this round
            Promise.all(res.data.map(candidate =>
              axios.get(`http://localhost:5000/api/rounds/${round._id}/candidate/${candidate.candidate_id}`)
                .then(r => ({ ...candidate, candidateRound: r.data }))
                .catch(() => ({ ...candidate, candidateRound: null }))
            )).then(candidatesWithRounds => {
              setCandidateRounds(prev => ({ ...prev, [round._id]: candidatesWithRounds }));
            });
          });
      });
    }
  }, [activeSection, rounds, jobId]);

  // Fetch analysis data when 'analysis' section is active
  useEffect(() => {
    if (activeSection === 'analysis') {
      setCandidatesLoading(true);
      console.log('Fetching analysis data for jobId:', jobId);
      
      axios.get(`http://localhost:5000/api/candidates?jobId=${jobId}`)
        .then(res => {
          console.log('Analysis candidates response:', res.data);
          const candidates = res.data;
          
          if (!candidates || candidates.length === 0) {
            console.log('No candidates found for analysis');
            setAnalysis(null);
            setCandidatesLoading(false);
            return;
          }
          
          // Calculate comprehensive analysis
          const total = candidates.length;
          const shortlisted = candidates.filter(c => c.status === 'Shortlisted').length;
          const interviewed = candidates.filter(c => c.status === 'Interviewed').length;
          const rejected = candidates.filter(c => c.status === 'Rejected').length;
          const hired = candidates.filter(c => c.status === 'Hired').length;
          
          // Calculate average match score
          const validScores = candidates.filter(c => c.match_score !== null && c.match_score !== undefined);
          const avgScore = validScores.length > 0 
            ? (validScores.reduce((sum, c) => sum + (parseFloat(c.match_score) || 0), 0) / validScores.length).toFixed(1)
            : '0.0';
          
          // Calculate top skills with better handling
          const skillCounts = {};
          candidates.forEach(c => {
            if (c.skills && Array.isArray(c.skills)) {
              c.skills.forEach(skill => {
                if (skill && typeof skill === 'string' && skill.trim()) {
                  const cleanSkill = skill.trim().toLowerCase();
                  skillCounts[cleanSkill] = (skillCounts[cleanSkill] || 0) + 1;
                }
              });
            }
          });
          
          const topSkills = Object.entries(skillCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([skill, count]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)} (${count})`);
          
          // Calculate experience levels
          const experienceLevels = {};
          candidates.forEach(c => {
            if (c.experience && Array.isArray(c.experience) && c.experience.length > 0) {
              let totalYears = 0;
              c.experience.forEach(exp => {
                if (exp.period) {
                  const years = exp.period.match(/(\d+)/);
                  if (years) totalYears += parseInt(years[1]);
                }
              });
              const level = totalYears < 2 ? 'Junior' : totalYears < 5 ? 'Mid-level' : 'Senior';
              experienceLevels[level] = (experienceLevels[level] || 0) + 1;
            }
          });
          
          // Calculate education levels
          const educationLevels = {};
          candidates.forEach(c => {
            if (c.education && Array.isArray(c.education) && c.education.length > 0) {
              const degrees = c.education.map(edu => edu.degree || '').join(' ').toLowerCase();
              const level = degrees.includes('phd') ? 'PhD' :
                          degrees.includes('master') ? 'Masters' :
                          degrees.includes('bachelor') ? 'Bachelors' : 'Other';
              educationLevels[level] = (educationLevels[level] || 0) + 1;
            }
          });
          
          const analysisData = {
            total,
            shortlisted,
            interviewed,
            rejected,
            hired,
            avgScore,
            topSkills,
            experienceLevels,
            educationLevels,
            candidates: candidates // Store candidates for detailed analysis
          };
          
          console.log('Calculated analysis data:', analysisData);
          setAnalysis(analysisData);
          setCandidates(candidates); // Also update candidates state
          setCandidatesLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching analysis data:', error);
          setAnalysis(null);
          setCandidatesLoading(false);
        });
    }
  }, [activeSection, jobId]);

  const status = job?.status || "unknown";
  const badgeStyle = statusStyles[status] || "bg-gray-100 text-gray-700 border-gray-300";

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await axios.delete(`http://localhost:5000/api/jobs/${jobId}`);
      navigate("/jobs");
    } catch (err) {
      setDeleteError("Failed to delete job.");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/edit-job/${jobId}`);
  };

  const handleRecalculateShortlisting = async () => {
    try {
      console.log('🔄 Starting shortlisting recalculation for job:', jobId);
      // Try Python backend first
      try {
        const response = await axios.post(`http://localhost:8000/api/job/${jobId}/recalculate-shortlisting`);
        console.log('✅ Python backend recalculation successful:', response.data);
        alert(`Shortlisting recalculated! ${response.data.updated_count} candidates updated.`);
        // Refresh candidate data
        fetchCandidates();
        return;
      } catch (pythonError) {
        console.warn('⚠️ Python backend failed, trying Node.js fallback:', pythonError);
        // Fallback to Node.js backend
        const nodeResponse = await axios.post(`http://localhost:5000/api/jobs/${jobId}/recalculate-shortlisting`);
        console.log('✅ Node.js backend recalculation successful:', nodeResponse.data);
        alert(`Shortlisting recalculated! ${nodeResponse.data.updated_count || 'All'} candidates updated.`);
        // Refresh candidate data
        fetchCandidates();
      }
    } catch (error) {
      console.error('❌ Error recalculating shortlisting:', error);
      alert('Error recalculating shortlisting. Please ensure both backends are running and try again.');
    }
  };

  // Upload logic
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setStatuses(selectedFiles.map(file => ({ name: file.name, status: "Pending", result: null, error: null })));
  };

  const handleBulkUpload = async () => {
    if (!files.length) return;
    setUploadLoading(true);
    const newStatuses = [...statuses];
    // Create a comprehensive JD for matching
    const jdParts = [];
    if (job?.requirements) jdParts.push(job.requirements);
    if (job?.skills) jdParts.push(job.skills);
    if (job?.keywords) jdParts.push(job.keywords);
    if (job?.description) jdParts.push(job.description);
    if (job?.title) jdParts.push(job.title);
    if (job?.department) jdParts.push(job.department);
    
    const jd = jdParts.filter(Boolean).join(' | ');
    console.log('JD for matching:', jd);
    
    for (let i = 0; i < files.length; i++) {
      newStatuses[i].status = "Uploading...";
      setStatuses([...newStatuses]);
    try {
      const formData = new FormData();
        formData.append("resume", files[i]);
        formData.append("jobId", jobId);
        formData.append("uploadedBy", userEmail);
        formData.append("jd", jd);
        const res = await axios.post("http://localhost:5000/api/resume/upload/single", formData, {
          headers: { "Content-Type": "multipart/form-data" },
      });
        newStatuses[i].status = "Success";
        newStatuses[i].result = res.data;
        newStatuses[i].error = null;
      } catch (err) {
        newStatuses[i].status = "Failed";
        newStatuses[i].result = null;
        newStatuses[i].error = err?.response?.data?.message || "Upload failed";
      }
      setStatuses([...newStatuses]);
    }
    setUploadLoading(false);
  };

  // Assign candidates to a round
  const handleAssignCandidates = async (roundId) => {
    try {
      await axios.post(`http://localhost:5000/api/rounds/${roundId}/assign`, {
        candidateIds: selectedCandidateIds,
      });
      setAssigningCandidates(null);
      setSelectedCandidateIds([]);
      // Refresh candidate rounds
      setCandidateRounds({});
    } catch (err) {
      alert('Failed to assign candidates.');
    }
  };

  // Send aptitude test link to all assigned candidates for the round
  const handleSendAptitude = async (roundId) => {
    setSendingAptitude(true);
    try {
      const assignedCandidates = selectedAptitudeCandidates[roundId] || [];
      if (assignedCandidates.length === 0) {
        alert('Please select at least one candidate to send the aptitude link.');
        setSendingAptitude(false);
      return;
    }
      await axios.post(`http://localhost:5000/api/rounds/${roundId}/send-aptitude`, {
        candidateIds: assignedCandidates,
        test_link: aptitudeLink,
      });
      setAptitudeLink('');
      alert('Aptitude test links sent!');
    } catch (err) {
      alert('Failed to send aptitude test links.');
    } finally {
      setSendingAptitude(false);
    }
  };

  // Update candidate round result/status
  const handleUpdateCandidateRound = async (roundId, candidateRoundId, status, result, candidateId) => {
    try {
      let crId = candidateRoundId;
      // If candidateRound does not exist, assign first
      if (!crId) {
        const assignRes = await axios.post(`http://localhost:5000/api/rounds/${roundId}/assign`, {
          candidateIds: [candidateId],
        });
        crId = assignRes.data[0]._id;
      }
      await axios.patch(`http://localhost:5000/api/rounds/${roundId}/candidate/${crId}`, { status, result });
      setCandidateRounds({}); // Refresh
    } catch (err) {
      alert('Failed to update result.');
    }
  };

  // Filtered candidates
  const filteredCandidates = candidates.filter(candidate => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      candidate.full_name?.toLowerCase().includes(searchLower) ||
      candidate.email?.toLowerCase().includes(searchLower) ||
      (candidate.skills && candidate.skills.join(", ").toLowerCase().includes(searchLower));
    const matchesStatus = statusFilter ? candidate.status === statusFilter : true;
    const matchesMin = minScore ? candidate.match_score >= parseInt(minScore) : true;
    const matchesMax = maxScore ? candidate.match_score <= parseInt(maxScore) : true;
    return matchesSearch && matchesStatus && matchesMin && matchesMax;
  });

  console.log('Candidates state:', candidates);
  console.log('Filtered candidates:', filteredCandidates);
  console.log('Search term:', search);
  console.log('Status filter:', statusFilter);

  // Status update handler
  const handleStatusChange = async (candidateId, newStatus) => {
    try {
      const res = await axios.patch(`http://localhost:5000/api/candidates/${candidateId}/status`, { status: newStatus });
      setCandidates(prev => prev.map(c => c.candidate_id === candidateId ? { ...c, status: newStatus } : c));
      setSelectedCandidate(prev => prev && prev.candidate_id === candidateId ? { ...prev, status: newStatus } : prev);
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const openCreateTestModal = () => {
    setShowCreateRound(true);
  };

  const handleSendAptitudeMail = async () => {
    setAssignSending(true);
    try {
      const assignedCandidates = Object.keys(selectedAptitudeCandidates).filter(id => selectedAptitudeCandidates[id]);
      if (assignedCandidates.length === 0) {
        alert('Please select at least one candidate to send the aptitude link.');
        setAssignSending(false);
        return;
      }
      const testLink = aptitudeLink || 'https://example.com/aptitude-test'; // Default link
      await axios.post(`http://localhost:5000/api/rounds/send-aptitude-mail`, {
        candidateIds: assignedCandidates,
        test_link: testLink,
      });
      alert('Aptitude test links sent!');
    } catch (err) {
      alert('Failed to send aptitude test links.');
    } finally {
      setAssignSending(false);
    }
  };

  const handleInterviewAction = async (candidate, action) => {
    const roundId = rounds.find(r => r.type === 'interview')?._id; // Assuming interview round is the first one
    if (!roundId) {
      alert('No interview round found for this job.');
      return;
    }

    try {
      await axios.patch(`http://localhost:5000/api/rounds/${roundId}/candidate/${candidate.candidateRound?._id}`, { status: action });
      setCandidateRoundsInterview(prev => prev.map(c => c.candidate_id === candidate.candidate_id ? { ...c, candidateRound: { ...c.candidateRound, status: action } } : c));
      alert(`Candidate ${candidate.full_name} ${action}ed!`);
    } catch (err) {
      alert('Failed to update candidate status.');
    }
  };

  // Add fetchRounds function to fetch and update rounds
  const fetchRounds = async () => {
    setRoundsLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/rounds/job/${jobId}`);
      setRounds(res.data);
      setRoundsError(null);
    } catch (err) {
      setRoundsError('Failed to fetch rounds.');
    } finally {
      setRoundsLoading(false);
    }
  };

  // Add fetchAssignedCandidates to JobDetails.jsx
  const fetchAssignedCandidates = async (roundId, setEmailCandidates) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/rounds/${roundId}/candidates`);
      setEmailCandidates(res.data);
    } catch (err) {
      setEmailCandidates([]);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm(`Are you sure you want to delete candidate with ID: ${candidateId}? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`http://localhost:5000/api/candidates/${candidateId}`);
      fetchCandidates(); // Refresh the list
      alert('Candidate deleted successfully!');
    } catch (err) {
      alert('Failed to delete candidate.');
    }
  };

  return (
    <div className="pl-0 sm:pl-2 md:pl-4 pt-8 w-full max-w-5xl mx-auto">
      <button
        className="mb-4 text-blue-600 hover:underline text-base font-semibold"
        onClick={() => navigate(-1)}
      >
        ← Back to Jobs
      </button>
      <h1 className="text-3xl font-bold text-blue-900 mb-6">
        {job ? job.title : `Job #${jobId}`} Details
      </h1>
      <nav className="bg-blue-50 rounded-2xl shadow-sm mb-8 overflow-x-auto w-full">
        <ul className="flex gap-3 p-3 min-w-max">
          {sections.map((section) => (
            <li key={section.value} className="flex-shrink-0">
              <button
                className={`px-6 py-3 rounded-xl font-semibold transition text-base focus:outline-none whitespace-nowrap
                  ${
                    activeSection === section.value
                      ? "bg-blue-600 text-white shadow"
                      : "bg-white text-blue-700 hover:bg-blue-100"
                  }
                `}
                onClick={() => setActiveSection(section.value)}
              >
                {section.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="bg-white rounded-2xl shadow-lg p-10 min-h-[250px] w-full text-lg relative flex flex-col">
        {loading && <div className="text-blue-700">Loading...</div>}
        {error && !loading && <div className="text-red-600">{error}</div>}

        {activeSection === "details" && job && !loading && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <p className="text-lg text-gray-600 mb-4">{job.description}</p>
                </div>
                <div className="ml-6">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                    status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                    status === 'draft' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              </div>

              {deleteError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800">{deleteError}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons - Moved to top */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Actions</h3>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handleEdit}
                    className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Job
                  </button>
                  
                  <button
                    onClick={handleRecalculateShortlisting}
                    className="flex items-center px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Recalculate Shortlisting
                  </button>
                  
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {deleting ? "Deleting..." : "Delete Job"}
                  </button>
                </div>
              </div>

              {/* Job Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600">Department</span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{job.department}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600">Type</span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{job.type}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600">Location</span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{job.location}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600">Created</span>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{formatUtcToLocal(job.created || job.createdOn)}</p>
                </div>
              </div>

              {/* Requirements Section */}
              {job.requirements && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Requirements
                  </h3>
                  <div className="bg-blue-50 rounded-xl p-6">
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                </div>
              )}

              {/* Skills Section */}
              {job.skills && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(job.skills) ? job.skills.map((skill, index) => (
                      <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    )) : (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        {job.skills}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Keywords Section */}
              {job.keywords && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    Keywords
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(job.keywords) ? job.keywords.map((keyword, index) => (
                      <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        {keyword}
                      </span>
                    )) : (
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                        {job.keywords}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Shortlisting Cutoff */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Shortlisting Criteria
                </h3>
                <div className="bg-orange-50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800 font-medium">Minimum Match Score</span>
                    <span className="text-2xl font-bold text-orange-600">{job.cutoff_score || 70}%</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Candidates must achieve at least this score to be shortlisted for this position.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === "upload" && (
          <div className="bg-blue-50 rounded-xl p-8 flex flex-col items-center">
            <h3 className="text-2xl font-bold text-blue-900 mb-8 text-center">Upload Resume</h3>
            
            {/* File Input Section */}
            <div className="w-full max-w-md mb-8">
            <input
              type="file"
              accept=".pdf"
              multiple
                className="w-full mb-6 px-4 py-3 border-2 border-dashed border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-colors"
              onChange={handleFileChange}
            />
              
              {/* Selected Files Count */}
              {files.length > 0 && (
                <div className="text-center text-sm text-gray-600 mb-4">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* Centered Upload Button */}
            <div className="flex justify-center mb-8">
                <button
              onClick={handleBulkUpload}
              disabled={uploadLoading || !files.length}
                className={`px-8 py-3 rounded-xl font-semibold transition duration-300 ${
                  uploadLoading || !files.length
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {uploadLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </div>
                ) : (
                  'Upload Resumes'
                )}
            </button>
            </div>

            {/* Simple Status Messages */}
            {files.length > 0 && (
              <div className="text-center">
                {statuses.some(s => s.status === "Success") && (
                  <div className="text-green-600 text-sm font-medium mb-2">
                    ✓ Upload completed successfully
                                </div>
                              )}
                {statuses.some(s => s.status === "Failed") && (
                  <div className="text-red-600 text-sm font-medium mb-2">
                    ⚠ Some uploads failed
                      </div>
                    )}
                {statuses.some(s => s.status === "Uploading...") && (
                  <div className="text-blue-600 text-sm font-medium mb-2">
                    ⏳ Uploading files...
                        </div>
                    )}
                  </div>
            )}
                </div>
              )}
        {activeSection === "candidates" && (
          <div className="min-h-[250px] w-full text-lg relative flex flex-col">
            {candidatesLoading ? (
              <div className="text-blue-700">Loading candidates...</div>
            ) : candidatesError ? (
              <div className="text-red-600">{candidatesError}</div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-blue-900">No candidates found for this job.</div>
            ) : (
              <div className="space-y-6">
                {/* Summary Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-blue-50">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-2xl font-bold text-blue-600">{filteredCandidates.length}</div>
                    <div className="text-sm text-gray-600">Total Candidates</div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-green-50">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-2xl font-bold text-green-600">
                      {filteredCandidates.filter(c => c.status === 'Shortlisted').length}
                    </div>
                    <div className="text-sm text-gray-600">Shortlisted</div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-red-50">
                    <div className="text-3xl mb-2">❌</div>
                    <div className="text-2xl font-bold text-red-600">
                      {filteredCandidates.filter(c => c.status === 'Rejected').length}
                    </div>
                    <div className="text-sm text-gray-600">Rejected</div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-md p-6 text-center border border-purple-50">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {filteredCandidates.length > 0 
                        ? Math.round(filteredCandidates.reduce((sum, c) => sum + (parseFloat(c.match_score) || 0), 0) / filteredCandidates.length)
                        : 0}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Score</div>
                  </div>
                </div>

                {/* Candidates List */}
                <div className="space-y-4">
                  {filteredCandidates.map(candidate => (
                    <div key={candidate.candidate_id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          {/* Avatar */}
                          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                            {candidate.full_name ? candidate.full_name[0].toUpperCase() : '?'}
                          </div>
                          
                          {/* Candidate Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900">{candidate.full_name}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                                candidate.status === 'Shortlisted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                candidate.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                candidate.status === 'Hired' ? 'bg-green-100 text-green-800 border-green-200' :
                                'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {candidate.status || 'New'}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                <span>{candidate.email}</span>
                              </div>
                              {candidate.phone && (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                  </svg>
                                  <span>{candidate.phone}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-600">Match Score:</span>
                                <span className={`font-semibold ${
                                  (candidate.match_score || 0) >= 80 ? 'text-green-600' :
                                  (candidate.match_score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {candidate.match_score || 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => setSelectedCandidate(candidate)}
                            className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span className="text-sm font-medium">View Details</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${candidate.full_name}? This action cannot be undone.`)) {
                                handleDeleteCandidate(candidate.candidate_id);
                              }
                            }}
                            className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="text-sm font-medium">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Candidate Profile Modal */}
            {selectedCandidate && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-2xl relative" style={{ maxHeight: '80vh' }}>
                  <button
                    className="absolute top-4 right-4 text-blue-700 hover:text-blue-900 text-2xl font-bold z-10"
                    onClick={() => setSelectedCandidate(null)}
                  >
                    &times;
                  </button>
                  <div className="overflow-y-auto pr-2" style={{ maxHeight: '70vh' }}>
                    <h2 className="text-2xl font-bold text-blue-900 mb-4">{selectedCandidate.full_name}</h2>
                    <div className="mb-2 text-blue-700"><b>Email:</b> {selectedCandidate.email}</div>
                    <div className="mb-2 text-blue-700"><b>Phone:</b> {selectedCandidate.phone}</div>
                    {/* Resume buttons at the top, robust to both string and object resume_id */}
                    {(selectedCandidate.resume_id) && (
                      <div className="mb-4">
                        <a
                          href={`http://localhost:5000/api/resume/${selectedCandidate.resume_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition font-semibold mr-2"
                        >
                          View Resume
                        </a>
                        <a
                          href={`http://localhost:5000/api/resume/${selectedCandidate.resume_id}?download=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition font-semibold"
                        >
                          Download Resume
                        </a>
                      </div>
                    )}
                    <div className="mb-2 text-blue-700"><b>Summary:</b> {selectedCandidate.summary}</div>
                    <div className="mb-2 text-blue-700"><b>Skills:</b> {selectedCandidate.skills && selectedCandidate.skills.join(', ')}</div>
                    <div className="mb-2 text-blue-700"><b>LinkedIn:</b> {selectedCandidate.linkedin && selectedCandidate.linkedin.map(link => <a key={link} href={link} className="text-blue-500 underline ml-1" target="_blank" rel="noopener noreferrer">{link}</a>)}</div>
                    <div className="mb-2 text-blue-700"><b>GitHub:</b> {selectedCandidate.github && selectedCandidate.github.map(link => <a key={link} href={link} className="text-blue-500 underline ml-1" target="_blank" rel="noopener noreferrer">{link}</a>)}</div>
                    <div className="mb-2 text-blue-700"><b>Education:</b> {selectedCandidate.education && selectedCandidate.education.map((edu, i) => (
                      <div key={i}>{edu.degree} at {edu.institute} ({edu.year})</div>
                    ))}</div>
                    <div className="mb-2 text-blue-700"><b>Experience:</b> {selectedCandidate.experience && selectedCandidate.experience.map((exp, i) => (
                      <div key={i}>{exp.role} at {exp.company} ({exp.period}): {exp.description}</div>
                    ))}</div>
                    <div className="mb-2 text-blue-700"><b>Projects:</b> {selectedCandidate.projects && selectedCandidate.projects.map((proj, i) => (
                      <div key={i}>{proj.title}: {proj.description}</div>
                    ))}</div>
                    {selectedCandidate.uploadDate && (
                      <div className="mt-4 text-blue-700"><b>Uploaded:</b> {formatUtcToLocal(selectedCandidate.uploadDate)}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeSection === "rounds" && (
  <div className="bg-white rounded-xl p-8">
    <RoundList
       jobId={jobId}
       rounds={rounds}
       loading={roundsLoading}
       error={roundsError}
       onCreateRound={handleCreateRound}
       onEditRound={handleEditRound}
       onUploadResult={handleUploadResult}
       onCreateNextRound={handleCreateNextRound}
       onSendAptitudeLink={handleSendAptitudeLink}
       onDeleteRound={handleDeleteRound}
       onOpenFeedback={handleOpenFeedback}
       candidateRounds={candidateRounds}
       onRefresh={fetchRounds}
     />
          </div>
        )}

{/* Modals */}
{showCreateRound && (
  <CreateRoundsModal
    isOpen={showCreateRound}
    onClose={() => {
      setShowCreateRound(false);
      setSelectedRound(null);
    }}
    jobId={jobId}
    onRoundsCreated={handleRoundSuccess}
  />
)}

{showUploadResult && selectedRound && (
  <UploadResultModal
    round={selectedRound}
    onClose={() => {
      setShowUploadResult(false);
      setSelectedRound(null);
    }}
    onSuccess={handleRoundSuccess}
  />
)}

{showSendAptitudeModal && sendAptitudeRound && (
  <SendAptitudeLinkModal
    round={sendAptitudeRound}
    onClose={() => setShowSendAptitudeModal(false)}
    onSuccess={handleSendAptitudeSuccess}
  />
)}

{showFeedbackModal && feedbackRound && feedbackCandidateRound && (
  <InterviewFeedbackModal
    round={feedbackRound}
    candidateRound={feedbackCandidateRound}
    onClose={() => setShowFeedbackModal(false)}
    onSuccess={handleFeedbackSuccess}
  />
)}
        {activeSection === "final" && <FinalCandidatesTab />}
        {activeSection === "analysis" && (
          <div className="space-y-8">
            {/* Debug Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800">Debug Information</h3>
                  <p className="text-yellow-700 text-sm">
                    Job ID: {jobId} | Candidates: {candidates?.length || 0} | Analysis: {analysis ? 'Loaded' : 'Not loaded'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    console.log('=== DEBUG ANALYSIS ===');
                    console.log('Job ID:', jobId);
                    console.log('Candidates:', candidates);
                    console.log('Analysis:', analysis);
                    console.log('Loading:', candidatesLoading);
                    
                    // Test API call
                    axios.get(`http://localhost:5000/api/candidates?jobId=${jobId}`)
                      .then(res => {
                        console.log('API Response:', res.data);
                        alert(`Found ${res.data.length} candidates. Check console for details.`);
                      })
                      .catch(err => {
                        console.error('API Error:', err);
                        alert('API Error. Check console for details.');
                      });
                  }}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-700"
                >
                  Debug Analysis
                </button>
              </div>
            </div>

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
      onClick={async () => {
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
      }}
    >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Report
    </button>
              </div>
            </div>

            <div id="analysis-section" className="space-y-8">
              {/* Analysis Data Debug */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h4 className="font-semibold text-gray-800 mb-2">Analysis Data Status:</h4>
                <div className="text-sm text-gray-600">
                  <p>• Loading: {candidatesLoading ? 'Yes' : 'No'}</p>
                  <p>• Analysis Data: {analysis ? 'Available' : 'Not available'}</p>
                  <p>• Candidates Count: {candidates?.length || 0}</p>
                  {analysis && (
                    <>
                      <p>• Total: {analysis.total}</p>
                      <p>• Shortlisted: {analysis.shortlisted}</p>
                      <p>• Avg Score: {analysis.avgScore}</p>
                      <p>• Top Skills: {analysis.topSkills?.length || 0}</p>
                    </>
                  )}
                </div>
              </div>

              {candidatesLoading ? (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-blue-700 text-lg">Loading comprehensive analysis...</p>
                </div>
              ) : analysis ? (
                <>
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
                          <p className="text-blue-800">
                            {analysis.avgScore >= 80 ? 
                              "Excellent candidate pool with high average match scores. Consider raising the cutoff threshold to focus on top performers." :
                              analysis.avgScore >= 60 ? 
                              "Good candidate pool with moderate match scores. Current cutoff appears appropriate for this position." :
                              "Candidate pool shows lower match scores. Consider reviewing job requirements or expanding the search criteria."
                            }
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-xl p-6">
                          <h4 className="font-bold text-green-900 mb-2">🎯 Shortlisting Strategy</h4>
                          <p className="text-green-800">
                            {analysis.shortlisted > analysis.total * 0.3 ? 
                              "High shortlisting rate suggests strong candidate pool. Consider additional screening rounds." :
                              "Conservative shortlisting approach. May want to review candidates with scores near the cutoff."
                            }
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-purple-50 rounded-xl p-6">
                          <h4 className="font-bold text-purple-900 mb-2">🔍 Skills Gap Analysis</h4>
                          <p className="text-purple-800">
                            {analysis.topSkills.length > 0 ? 
                              `Top skills in candidate pool: ${analysis.topSkills.slice(0, 3).map(s => s.split(' (')[0]).join(', ')}. ` +
                              (analysis.topSkills.length > 3 ? "Consider if missing skills can be trained." : "Skills align well with requirements.") :
                              "Skills data not available. Consider enhancing resume parsing for better skill extraction."
                            }
                          </p>
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
                          {(() => {
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
                          })().map((item, index) => (
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
                          {(() => {
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
                          })().map((item, index) => (
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
                          {(() => {
                            const highScorers = (candidates || []).filter(c => (c.match_score || 0) >= 80).length;
                            return analysis.total > 0 ? ((highScorers / analysis.total) * 100).toFixed(1) : 0;
                          })()}%
                        </div>
                        <div className="text-green-700 font-semibold">High Performers</div>
                        <div className="text-green-600 text-sm mt-1">Score ≥ 80%</div>
                      </div>
                      <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                        <div className="text-2xl font-bold text-purple-900 mb-2">
                          {(() => {
                            const recentCandidates = (candidates || []).filter(c => {
                              const created = new Date(c.created_at || c.createdAt);
                              const weekAgo = new Date();
                              weekAgo.setDate(weekAgo.getDate() - 7);
                              return created > weekAgo;
                            }).length;
                            return recentCandidates;
                          })()}
                        </div>
                        <div className="text-purple-700 font-semibold">Recent Applications</div>
                        <div className="text-purple-600 text-sm mt-1">Last 7 days</div>
                      </div>
                    </div>
          </div>
        </>
      ) : (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Analysis Data Available</h3>
                  <p className="text-gray-600">Upload resumes to generate comprehensive analysis insights.</p>
                </div>
      )}
    </div>
  </div>
)}
      </div>
    </div>
  );
} 


