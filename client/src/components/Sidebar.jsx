import { FaTachometerAlt, FaBriefcase, FaFileAlt, FaSignOutAlt, FaTimes } from "react-icons/fa";
import { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";

const menuItems = [
  { label: "Dashboard", icon: <FaTachometerAlt />, path: "/dashboard" },
  { label: "Jobs", icon: <FaBriefcase />, path: "/jobs" },
  // Logs will be conditionally added below
];

export default function Sidebar({ active = "Dashboard", collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem("userEmail") || "";
  const userName = userEmail.split("@")[0];
  const userRole = localStorage.getItem("userRole") || "";

  // Prevent scrolling when sidebar is open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  // Responsive sidebar classes
  const sidebarBase = `bg-blue-900 text-white h-screen fixed top-0 left-0 flex flex-col transition-all duration-300 z-30`;
  const desktopWidth = collapsed ? "w-20" : "w-64";

  const sidebarMenu = [...menuItems];
  sidebarMenu.push({ label: "Logs", icon: <FaFileAlt />, path: "/logs" });

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-40 z-20 transition-opacity duration-300 ${mobileOpen ? "block" : "hidden"} sm:hidden`}
        onClick={() => setMobileOpen(false)}
      />
      <aside
        className={`
          ${sidebarBase}
          ${mobileOpen ? "w-64" : "w-0"} 
          sm:w-auto sm:${desktopWidth} 
          ${mobileOpen ? "block" : "hidden"} sm:block sm:static
          shadow-md sm:shadow-none rounded-none
          min-h-screen flex flex-col
        `}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-800">
          {!collapsed && (
            <span className="font-bold text-xl tracking-wide">ATS</span>
          )}
          <div className="flex gap-2">
            {/* Close button on mobile */}
            <button
              className="text-white hover:text-blue-300 focus:outline-none sm:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar"
            >
              <FaTimes className="w-6 h-6" />
            </button>
            {/* Collapse button on desktop */}
            <button
              className="text-white hover:text-blue-300 focus:outline-none hidden sm:block"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label="Toggle sidebar"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
        {/* Navigation */}
        <nav className="flex-1 mt-4 overflow-y-auto">
          <ul className="flex flex-col gap-1">
            {sidebarMenu.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.path}
                  title={item.label}
                  className={({ isActive }) => `group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
                    ${isActive ? "bg-blue-100 text-blue-800 font-semibold" : "hover:bg-blue-100 hover:text-blue-800"}
                    ${collapsed ? "justify-center" : ""}
                  `}
                >
                  <span
                    className={`text-lg transition-colors duration-200 ${
                      active === item.label ? "text-blue-800" : "text-white group-hover:text-blue-700"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="transition-all duration-300">{item.label}</span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {/* User/Logout at bottom inside sidebar */}
        <div className="border-t border-blue-800 px-4 py-4 flex items-center gap-3 bg-blue-900">
          <div className="flex items-center justify-center bg-blue-700 rounded-full w-10 h-10 text-lg font-bold uppercase">
            {userName[0]}
          </div>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="truncate font-semibold text-white">{userName}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-blue-200 hover:text-white mt-1 text-left"
                title="Logout"
              >
                <span className="inline-flex items-center gap-1"><FaSignOutAlt /> Logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
