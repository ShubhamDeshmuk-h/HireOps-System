import React, { useState } from "react";
import axios from "axios";

const ResumeUploadInline = ({ jobId }) => {
  const [singleFile, setSingleFile] = useState(null);
  const [singleStatus, setSingleStatus] = useState("Pending");
  const [singleResult, setSingleResult] = useState(null);

  const handleSingleUpload = async () => {
    if (!singleFile) {
      alert("Please select a file first.");
      return;
    }

    setSingleStatus("Uploading...");
    setSingleResult(null);

    try {
      const formData = new FormData();
      formData.append("file", singleFile);
      formData.append("jobId", jobId);

      const res = await axios.post("http://localhost:5000/api/upload/single", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSingleStatus(res.data.result || "Shortlisted");
      setSingleResult(res.data);
    } catch (error) {
      setSingleStatus("Rejected");
      setSingleResult({
        error: error?.response?.data?.message || "Upload failed",
      });
    }
  };

  return (
    <div className="bg-blue-50 rounded-xl p-6 flex flex-col gap-4">
      <h3 className="text-xl font-semibold text-blue-900 mb-2">Upload Resume</h3>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setSingleFile(e.target.files[0])}
        className="block w-full text-sm text-gray-700 bg-white rounded border border-gray-300 cursor-pointer focus:outline-none"
      />

      <button
        onClick={handleSingleUpload}
        className="w-fit bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
      >
        Upload & Parse
      </button>

      {singleStatus !== 'Pending' && (
        <div className="mt-2 text-base text-blue-800">
          Status:{" "}
          <span
            className={
              singleStatus === "Shortlisted"
                ? "text-green-600"
                : singleStatus === "Rejected"
                ? "text-red-600"
                : "text-yellow-600"
            }
          >
            {singleStatus}
          </span>
        </div>
      )}

      {singleResult && !singleResult.error && (
        <div className="mt-4 p-4 bg-white rounded shadow text-sm space-y-1">
          <div>Resume ID: <code>{singleResult.id}</code></div>
          <div>Timestamp: <code>{singleResult.timestamp}</code></div>
          <div>Match Score: <strong>{singleResult.score}%</strong></div>
          <div>Result: <strong>{singleResult.score >= 85 ? 'Shortlisted' : 'Rejected'}</strong></div>
        </div>
      )}

      {singleResult?.error && (
        <div className="text-red-600 mt-2 text-sm">Error: {singleResult.error}</div>
      )}
    </div>
  );
};

export default ResumeUploadInline;
