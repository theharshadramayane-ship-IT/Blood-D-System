// ============================================================
//  BLOODLINK PRO — OrganizerDashboard.jsx
//  Fully connected to backend APIs
//  SAVE AS: src/OrganizerDashboard.jsx
// ============================================================

import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { useNavigate } from "react-router-dom";
import { campsAPI, donorsAPI } from "./api";
import {
  FaCampground, FaUsers, FaCheckCircle,
  FaCalendarAlt, FaMapMarkerAlt, FaPlus,
  FaArrowRight, FaClipboardList, FaTint, FaSpinner,
} from "react-icons/fa";

function OrganizerDashboard() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [user, setUser]           = useState(null);
  const [camps, setCamps]         = useState([]);
  const [donors, setDonors]       = useState([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme === "true") setDarkMode(true);

    const currentUser =
      JSON.parse(localStorage.getItem("blCurrentUser")) ||
      JSON.parse(localStorage.getItem("user"));
    setUser(currentUser);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campsRes, donorsRes] = await Promise.allSettled([
        campsAPI.list({ limit: 50 }),     // backend auto-filters by organizer role
        donorsAPI.list({ limit: 6 }),
      ]);

      if (campsRes.status  === "fulfilled") setCamps(campsRes.value.camps   || []);
      if (donorsRes.status === "fulfilled") setDonors(donorsRes.value.donors || []);
    } catch (err) {
      console.error("Organizer dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const today         = new Date();
  const upcomingCamps = camps.filter((c) => c.date && new Date(c.date) > today);
  const pastCamps     = camps.filter((c) => c.date && new Date(c.date) <= today);
  const todayCamps    = camps.filter((c) => {
    if (!c.date) return false;
    const d = new Date(c.date);
    return d.toDateString() === today.toDateString();
  });
  const sortedCamps   = [...camps].sort((a, b) => new Date(a.date) - new Date(b.date));

  const getStatusInfo = (c) => {
    if (c.status === "CANCELLED")  return { label: "CANCELLED",  color: "#e74c3c" };
    if (c.status === "COMPLETED")  return { label: "COMPLETED",  color: "#27ae60" };
    if (c.status === "ONGOING")    return { label: "ONGOING",    color: "#f39c12" };
    if (c.status === "REGISTRATION_OPEN") return { label: "OPEN", color: "#8e44ad" };
    return { label: "UPCOMING", color: "#2980b9" };
  };

  return (
    <div className={darkMode ? "dashboard-container dark" : "dashboard-container"}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => {
        const n = !darkMode;
        setDarkMode(n);
        localStorage.setItem("darkMode", String(n));
      }} />

      <div className="main-content">

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
            <FaSpinner size={32} color="#c0392b" style={{ animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#888" }}>Loading organizer dashboard...</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="admin-header">
              <div>
                <h1 style={{ margin: 0 }}>🏕️ Organizer Dashboard</h1>
                <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>
                  {user?.organizationName || user?.name || "Organizer"} • {user?.designation || ""} • {user?.city || "—"}
                </p>
              </div>
              <button className="pdf-btn" onClick={() => navigate("/camps")}>
                <FaPlus /> Manage Camps
              </button>
            </div>

            {/* KPI STATS */}
            <div className="stats">
              <div className="stat-card">
                <FaCampground size={22} /><h3>{camps.length}</h3><p>My Camps</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#2980b9,#1a5276)" }}>
                <FaCalendarAlt size={22} /><h3>{upcomingCamps.length}</h3><p>Upcoming</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#f39c12,#e67e22)" }}>
                <FaTint size={22} /><h3>{todayCamps.length}</h3><p>Today's Camps</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#27ae60,#1e8449)" }}>
                <FaCheckCircle size={22} /><h3>{pastCamps.length}</h3><p>Completed</p>
              </div>
            </div>

            {/* TODAY'S CAMPS BANNER */}
            {todayCamps.length > 0 && (
              <div className="today-camps-banner">
                <FaCalendarAlt size={20} />
                <strong>Today's Camps ({todayCamps.length}):</strong>
                {todayCamps.map((c, i) => (
                  <span key={i} className="today-camp-chip">{c.title} — {c.venue}</span>
                ))}
              </div>
            )}

            {/* CAMPS TABLE + ACTIVITIES */}
            <div className="charts-wrapper" style={{ gridTemplateColumns: "3fr 2fr" }}>
              <div className="chart-container">
                <h2><FaClipboardList color="#c0392b" /> My Camps</h2>
                {sortedCamps.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30 }}>
                    <p style={{ color: "#888" }}>No camps created yet.</p>
                    <button className="pdf-btn" onClick={() => navigate("/camps")}>
                      <FaPlus /> Add a Camp
                    </button>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Camp Name</th>
                        <th>Location</th>
                        <th>Date</th>
                        <th>Capacity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCamps.slice(0, 8).map((c, i) => {
                        const s = getStatusInfo(c);
                        return (
                          <tr key={i}>
                            <td><strong>{c.title}</strong></td>
                            <td><FaMapMarkerAlt size={11} color="#c0392b" /> {c.city}</td>
                            <td>{new Date(c.date).toLocaleDateString("en-IN")}</td>
                            <td>{c.registrations?.length || 0} / {c.capacity}</td>
                            <td>
                              <span className="status-pill" style={{
                                background: `${s.color}22`, color: s.color,
                                border: `1px solid ${s.color}`,
                              }}>
                                {s.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <button className="view-all-btn" onClick={() => navigate("/camps")}>
                  Manage All Camps <FaArrowRight />
                </button>
              </div>

              {/* REGISTERED DONORS */}
              <div className="chart-container">
                <h2><FaUsers color="#c0392b" /> Registered Donors</h2>
                {donors.length === 0 ? (
                  <p style={{ color: "#888", textAlign: "center" }}>No donors registered yet.</p>
                ) : (
                  <table>
                    <thead><tr><th>#</th><th>Name</th><th>Blood</th><th>City</th></tr></thead>
                    <tbody>
                      {donors.slice(0, 6).map((d, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{d.name}</td>
                          <td><span className="blood-badge sm">{d.bloodGroup}</span></td>
                          <td>{d.city}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <h2>Quick Actions</h2>
            <div className="dashboard">
              <div className="dash-card" onClick={() => navigate("/camps")}><FaCampground size={32} /><p>My Camps</p></div>
              <div className="dash-card" onClick={() => navigate("/donor")}><FaUsers size={32} /><p>Donors List</p></div>
              <div className="dash-card" onClick={() => navigate("/health")}><FaClipboardList size={32} /><p>Health Screening</p></div>
              <div className="dash-card" onClick={() => navigate("/stock")}><FaTint size={32} /><p>Blood Stock</p></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OrganizerDashboard;