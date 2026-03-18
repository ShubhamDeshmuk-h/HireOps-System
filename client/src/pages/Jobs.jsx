import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const statusStyles = {
  active: "bg-green-100 text-green-700 border-green-300",
  draft: "bg-yellow-100 text-yellow-700 border-yellow-300",
  closed: "bg-red-100 text-red-700 border-red-300",
};

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Drafted", value: "draft" },
  { label: "Closed", value: "closed" },
];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get("http://localhost:5000/api/jobs")
      .then(res => {
        setJobs(res.data);
        setError(null);
      })
      .catch(() => {
        setError("Failed to fetch jobs.");
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateJob = () => {
    navigate('/create-job');
  };

  const filteredJobs =
    filter === "all" ? jobs : jobs.filter((job) => (job.status || '').toLowerCase() === filter);

  return (
    <div className="pl-0 sm:pl-2 md:pl-4 pt-8 w-full max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex justify-end">
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold shadow hover:bg-blue-700 transition"
            onClick={handleCreateJob}
          >
            Create Job
          </button>
        </div>
        <h1 className="text-3xl font-bold text-blue-900 mb-0">All Jobs</h1>
        <div className="flex gap-2 flex-wrap mt-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              className={`px-4 py-2 rounded-lg font-semibold border transition text-base focus:outline-none
                ${filter === option.value ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-200 hover:bg-blue-100"}
              `}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-blue-700">Loading...</div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-red-600">{error}</div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-blue-900 text-lg mb-4">No jobs found.</p>
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold shadow hover:bg-blue-700 transition"
            onClick={handleCreateJob}
          >
            Create Job
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {filteredJobs.map((job) => {
            const status = (job.status || "unknown").toLowerCase();
            const badgeStyle = statusStyles[status] || "bg-gray-100 text-gray-700 border-gray-300";
            return (
              <button
                key={job._id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-2xl shadow-lg p-8 hover:bg-blue-50 border border-blue-100 transition text-left w-full min-h-[120px]"
                onClick={() => navigate(`/jobs/${job._id}`)}
              >
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-2xl font-bold text-blue-900 truncate">{job.title}</span>
                    <span className={`ml-2 px-3 py-1 rounded-full text-sm font-bold border ${badgeStyle}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                  <div className="text-blue-800 text-base mb-2 truncate">{job.description}</div>
                  <div className="text-blue-500 text-sm">{job.location} &bull; Created: {job.created || job.createdOn}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
