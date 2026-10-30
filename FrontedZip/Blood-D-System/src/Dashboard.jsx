// ============================================================
//  BLOODLINK PRO — Dashboard.jsx
//  Role-based dashboard router — fully backend connected
//  SAVE AS: src/Dashboard.jsx
// ============================================================

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "./api";

import DonorDashboard     from "./DonorDashboard";
import AdminDashboard     from "./AdminDashboard";
import HospitalDashboard  from "./HospitalDashboard";
import OrganizerDashboard from "./OrganizerDashboard";

const ROLE_DASHBOARDS = {
  DONOR:          DonorDashboard,
  HOSPITAL:       HospitalDashboard,
  CAMP_ORGANIZER: OrganizerDashboard,
  BB_ADMIN:       AdminDashboard,
  SUPER_ADMIN:    AdminDashboard,
};

function Dashboard() {
  const navigate = useNavigate();
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Check login
      const isLoggedIn =
        localStorage.getItem("blIsLoggedIn") === "true" ||
        localStorage.getItem("isLogin")      === "true";

      if (!isLoggedIn) {
        navigate("/login");
        return;
      }

      // Get user from localStorage (set during login)
      let currentUser =
        JSON.parse(localStorage.getItem("blCurrentUser")) ||
        JSON.parse(localStorage.getItem("user"));

      // If localStorage is stale, fetch fresh from backend
      if (!currentUser) {
        try {
          const data = await authAPI.me();
          currentUser = data.user;
          localStorage.setItem("blCurrentUser", JSON.stringify(currentUser));
          localStorage.setItem("user", JSON.stringify(currentUser));
        } catch {
          navigate("/login");
          return;
        }
      }

      setRole(currentUser?.role || "DONOR");
      setLoading(false);
    };

    init();
  }, [navigate]);

  if (loading) {
    return (
      <div style={{
        display: "flex", justifyContent: "center",
        alignItems: "center", height: "100vh",
        fontSize: 18, color: "#c0392b", fontFamily: "Nunito, sans-serif",
        flexDirection: "column", gap: 12,
      }}>
        <div style={{
          width: 40, height: 40, border: "4px solid #f3f3f3",
          borderTop: "4px solid #c0392b", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        Loading dashboard...
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const DashboardComponent = ROLE_DASHBOARDS[role] || DonorDashboard;
  return <DashboardComponent />;
}

export default Dashboard;