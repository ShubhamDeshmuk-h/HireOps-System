import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function UploadResume() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]); // Array of files
  const [statuses, setStatuses] = useState([]); // Array of {name, status, result, error}
  const [loading, setLoading] = useState(false);
  const userEmail = localStorage.getItem('userEmail') || 'unknown';

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setStatuses(selectedFiles.map(file => ({ name: file.name, status: "Pending", result: null, error: null })));
  };

  const handleBulkUpload = async () => {
    if (!files.length) return;
    setLoading(true);
    const newStatuses = [...statuses];
    for (let i = 0; i < files.length; i++) {
      newStatuses[i].status = "Uploading...";
      setStatuses([...newStatuses]);
      try {
        const formData = new FormData();
        formData.append("resume", files[i]);
        formData.append("jobId", jobId);
        formData.append("uploadedBy", userEmail);
        const res = await axios.post("/resume/upload/single", formData, {
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
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <button
          className="mb-4 text-blue-600 hover:underline text-base font-semibold"
          onClick={() => navigate(-1)}
        >
          ← Back to Job Details
        </button>
        <h2 className="text-2xl font-bold text-blue-700 text-center mb-8">Upload Resumes</h2>
        
        {/* File Input Section */}
        <div className="mb-8">
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
        <div className="flex justify-center">
        <button
          onClick={handleBulkUpload}
          disabled={loading || !files.length}
            className={`px-8 py-3 rounded-xl font-semibold transition duration-300 ${
              loading || !files.length
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {loading ? (
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
          <div className="mt-6 text-center">
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
    </div>
  );
} 