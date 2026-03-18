import AnalyticsCard from "../components/AnalyticsCard";
import { FaBriefcase, FaUserFriends, FaUpload, FaUserCheck, FaEnvelopeOpenText, FaPlus, FaClipboardList, FaChartLine } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalCandidates: 0,
    resumesUploaded: 0,
    shortlistedToday: 0,
    offersSentToday: 0,
    recentActions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("http://localhost:5000/api/dashboard/stats");
        setStats({
          totalJobs: res.data.totalJobs,
          totalCandidates: res.data.totalCandidates,
          resumesUploaded: res.data.resumesUploaded,
          shortlistedToday: res.data.shortlistedToday,
          offersSentToday: res.data.offersSentToday,
          recentActions: res.data.recentActions || []
        });
      } catch (err) {
        setError("Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <h1 className="text-3xl sm:text-4xl font-bold text-black mb-6 sm:mb-10 px-2 sm:px-0 text-center sm:text-left">ATS Dashboard</h1>
      {loading ? (
        <div className="text-center text-gray-500">Loading dashboard...</div>
      ) : error ? (
        <div className="text-center text-red-600">{error}</div>
      ) : (
        <>
          {/* Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-8 mb-6 sm:mb-10 px-2 sm:px-0">
            <AnalyticsCard icon={<FaBriefcase />} label="Total Jobs Posted" value={stats.totalJobs} />
            <AnalyticsCard icon={<FaUserFriends />} label="Total Candidates" value={stats.totalCandidates} />
            <AnalyticsCard icon={<FaUpload />} label="Resumes Uploaded" value={stats.resumesUploaded} />
            <AnalyticsCard icon={<FaUserCheck />} label="Shortlisted Today" value={stats.shortlistedToday} />
            <AnalyticsCard icon={<FaEnvelopeOpenText />} label="Offers Sent Today" value={stats.offersSentToday} />
          </div>
          {/* Recent Actions */}
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 w-full max-w-full sm:max-w-2xl mx-auto">
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3 sm:mb-4">Today's Activity</h2>
            <div className="max-h-40 overflow-y-auto pr-1 sm:pr-2">
              <ul className="space-y-2 sm:space-y-3 text-blue-900 text-sm sm:text-base">
                {stats.recentActions.length === 0 ? (
                  <li className="text-gray-500">No recent activity</li>
                ) : (
                  stats.recentActions.map((action, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="w-2 h-2 mt-2 mr-2 sm:mr-3 bg-blue-600 rounded-full flex-shrink-0"></span>
                      <span>{action.description}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </>
      )}
    </>
  );
}