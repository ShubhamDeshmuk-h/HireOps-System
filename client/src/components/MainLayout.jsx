import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { FaBars } from "react-icons/fa";

export default function MainLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  let active = "Dashboard";
  if (location.pathname.startsWith("/jobs") || location.pathname.startsWith("/create-job") || location.pathname.startsWith("/edit-job")) active = "Jobs";
  if (location.pathname.startsWith("/logs")) active = "Logs";


  return (
    <div className="h-screen overflow-hidden flex">
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-40 sm:hidden bg-blue-600 text-white p-2 rounded-lg shadow-lg focus:outline-none"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <FaBars className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <Sidebar
        active={active}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Scrollable content area */}
      <main
        className={`
          flex-1 overflow-y-auto bg-blue-50
          transition-all duration-300 p- sm:p-8
          ${collapsed ? "sm:ml-20" : "sm:ml-64"}
        `}
	      style={{ maxWidth: '130vw', marginLeft: 0 }}
      >
        <Outlet />
      </main>
    </div>
  );
}
