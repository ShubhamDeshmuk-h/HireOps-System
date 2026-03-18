import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const currentUser = JSON.parse(localStorage.getItem('user'));

const CreateJob = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const isEditing = !!jobId;

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    type: 'Full-Time',
    description: '',
    requirements: '',
    skills: '',
    keywords: '',
    cutoff_score: 70,
    status: 'Draft',
  });

  const [loading, setLoading] = useState(false);

  // Load job data if editing
  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      axios.get(`http://localhost:5000/api/jobs/${jobId}`)
        .then(res => {
          const job = res.data.job;
          setFormData({
            title: job.title || '',
            department: job.department || '',
            location: job.location || '',
            type: job.type || 'Full-Time',
            description: job.description || '',
            requirements: job.requirements || '',
            skills: job.skills || '',
            keywords: job.keywords || '',
            cutoff_score: job.cutoff_score || 70,
            status: job.status || 'Draft',
          });
        })
        .catch(err => {
          console.error(err);
          alert('Error loading job data');
        })
        .finally(() => setLoading(false));
    }
  }, [jobId, isEditing]);

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      department: '',
      location: '',
      type: 'Full-Time',
      description: '',
      requirements: '',
      skills: '',
      keywords: '',
      cutoff_score: 70,
      status: 'Draft',
    });
  };

  const handleSubmit = async (isDraft = false) => {
    const jobData = {
      ...formData,
      status: isDraft ? 'Draft' : formData.status,
      createdBy: currentUser?.email || 'guest@ats.com',
      createdOn: new Date().toISOString(),
    };

    try {
      let res;
      if (isEditing) {
        res = await axios.put(`http://localhost:5000/api/jobs/${jobId}`, jobData);
        alert('Job updated successfully!');
      } else {
        res = await axios.post('http://localhost:5000/api/jobs', jobData);
        const newJobId = res?.data?.job?._id;
        if (isDraft) {
          alert('Job saved as draft.');
          resetForm();
        } else {
          alert('Job created successfully!');
          if (newJobId) {
            navigate(`/jobs/${newJobId}`);
          }
        }
      }
      
      if (isEditing && !isDraft) {
        navigate(`/jobs/${jobId}`);
      }
    } catch (err) {
      console.error(err);
      alert(isEditing ? 'Error updating job' : 'Error creating job');
    }
  };

  if (loading) {
    return (
      <div className="sm:ml-64 bg-blue-50 min-h-screen items-left justify-left p-4">
        <div className="text-center text-blue-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="sm:ml-64 bg-blue-50 min-h-screen items-left justify-left p-4">
      <div className="m:ml-64 bg-blue-50 min-h-screen items-left justify-left p-4">
        <h2 className="text-3xl font-bold text-blue-700 mb-10 text-center">
          {isEditing ? 'Edit Job' : 'Create a New Job'}
        </h2>

        <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Job Title</label>
            <input name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Software Engineer" className="input-field" />
          </div>

          {/* Department */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Department</label>
            <input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Engineering" className="input-field" />
          </div>

          {/* Location */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Location</label>
            <input name="location" value={formData.location} onChange={handleChange} placeholder="e.g. Mumbai, India" className="input-field" />
          </div>

          {/* Type */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Job Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className="input-field">
              <option>Full-Time</option>
              <option>Part-Time</option>
              <option>Internship</option>
              <option>Contract</option>
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm text-gray-600 mb-1">Job Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Brief job overview" className="input-field" />
          </div>

          {/* Requirements */}
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm text-gray-600 mb-1">Requirements</label>
            <textarea name="requirements" value={formData.requirements} onChange={handleChange} rows="3" placeholder="Required experience, tools, etc." className="input-field" />
          </div>

          {/* Skills */}
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm text-gray-600 mb-1">Skills</label>
            <textarea name="skills" value={formData.skills} onChange={handleChange} rows="2" placeholder="e.g. React, Node.js, MongoDB" className="input-field" />
          </div>

          {/* Keywords */}
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm text-gray-600 mb-1">Keywords</label>
            <textarea name="keywords" value={formData.keywords} onChange={handleChange} rows="2" placeholder="e.g. developer, backend, frontend" className="input-field" />
          </div>

          {/* Cutoff Score */}
          <div className="flex flex-col">
            <label className="text-sm text-gray-600 mb-1">Shortlisting Cutoff Score (%)</label>
            <input 
              name="cutoff_score" 
              onChange={handleChange} 
              type="number" 
              min="0" 
              max="100" 
              value={formData.cutoff_score} 
              className="input-field" 
              placeholder="70"
            />
            <small className="text-gray-500 mt-1">Candidates with match score ≥ this value will be shortlisted</small>
          </div>

          {/* Status */}
          <div className="flex flex-col md:col-span-2">
            <label className="text-sm text-gray-600 mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="input-field">
              <option>Draft</option>
              <option>Active</option>
              <option>Closed</option>
            </select>
          </div>
        </form>

        {/* Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row justify-center sm:justify-end gap-4">
          <button onClick={() => handleSubmit(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-xl transition">
            {isEditing ? 'Update' : 'Save'}
          </button>
          {!isEditing && (
            <button onClick={() => handleSubmit(true)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-2 rounded-xl transition">
              Save as Draft
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateJob;
