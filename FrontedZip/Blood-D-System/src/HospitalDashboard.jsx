// ============================================================
//  BLOODLINK PRO — HospitalDashboard.jsx
//  Fully connected to backend APIs
//  SAVE AS: src/HospitalDashboard.jsx
// ============================================================

import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { useNavigate } from "react-router-dom";
import { requestsAPI, stockAPI } from "./api";
import {
  FaHospital, FaTint, FaCheckCircle, FaClock,
  FaTimesCircle, FaPlus, FaArrowRight,
  FaExclamationTriangle, FaSpinner,
} from "react-icons/fa";

const BG_COLORS = {
  "A+":"#e74c3c","A-":"#c0392b","B+":"#e67e22","B-":"#d35400",
  "O+":"#27ae60","O-":"#1e8449","AB+":"#2980b9","AB-":"#1a5276",
};

function HospitalDashboard() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [user, setUser]           = useState(null);
  const [requests, setRequests]   = useState([]);
  const [stockSummary, setStockSummary] = useState({});

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
      const [reqRes, stockRes] = await Promise.allSettled([
        requestsAPI.list({ limit: 10 }),      // backend auto-filters by hospital role
        stockAPI.summary(),
      ]);

      if (reqRes.status   === "fulfilled") setRequests(reqRes.value.requests || []);
      if (stockRes.status === "fulfilled") setStockSummary(stockRes.value.summary || {});
    } catch (err) {
      console.error("Hospital dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount   = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount  = requests.filter((r) => r.status === "APPROVED").length;
  const deliveredCount = requests.filter((r) => r.status === "DELIVERED").length;
  const latestRequests = [...requests].slice(0, 5);

  const getStatusIcon = (status) => {
    if (status === "APPROVED" || status === "DELIVERED") return <FaCheckCircle color="#27ae60" />;
    if (status === "PENDING")  return <FaClock color="#e67e22" />;
    if (status === "REJECTED") return <FaTimesCircle color="#e74c3c" />;
    return <FaClock color="#888" />;
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
            <p style={{ color: "#888" }}>Loading hospital dashboard...</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="admin-header">
              <div>
                <h1 style={{ margin: 0 }}>🏥 Hospital Dashboard</h1>
                <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>
                  {user?.hospitalName || user?.name || "Hospital"} • {user?.city || "—"}
                </p>
              </div>
              <button className="pdf-btn" onClick={() => navigate("/request")}>
                <FaPlus /> New Blood Request
              </button>
            </div>

            {/* KPI STATS */}
            <div className="stats">
              <div className="stat-card">
                <FaClock size={22} />
                <h3>{pendingCount}</h3>
                <p>Pending Requests</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#27ae60,#1e8449)" }}>
                <FaCheckCircle size={22} />
                <h3>{approvedCount}</h3>
                <p>Approved</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#2980b9,#1a5276)" }}>
                <FaTint size={22} />
                <h3>{deliveredCount}</h3>
                <p>Delivered</p>
              </div>
              <div className="stat-card">
                <FaHospital size={22} />
                <h3>{requests.length}</h3>
                <p>Total Requests</p>
              </div>
            </div>

            {/* RECENT REQUESTS + BLOOD AVAILABILITY */}
            <div className="charts-wrapper" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="chart-container">
                <h2><FaClock color="#c0392b" /> My Recent Requests</h2>
                {latestRequests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30 }}>
                    <p style={{ color: "#888" }}>No requests raised yet.</p>
                    <button className="pdf-btn" onClick={() => navigate("/request")}>
                      <FaPlus /> Raise a Request
                    </button>
                  </div>
                ) : (
                  latestRequests.map((r, i) => (
                    <div key={i} className="request-timeline-item">
                      <div className="request-timeline-icon">{getStatusIcon(r.status)}</div>
                      <div className="request-timeline-body">
                        <div className="request-timeline-title">
                          <span className="blood-badge sm">{r.bloodGroup}</span>
                          <strong>{r.patientName || "Patient"}</strong>
                          <span>{r.units} units</span>
                        </div>
                        <div className="request-timeline-meta">
                          <span style={{
                            color: r.urgency === "CRITICAL" ? "#e74c3c" : r.urgency === "URGENT" ? "#e67e22" : "#2980b9",
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {r.urgency}
                          </span>
                          &nbsp;|&nbsp;
                          <span style={{
                            color: r.status === "APPROVED" ? "#27ae60" : r.status === "REJECTED" ? "#e74c3c" : "#e67e22",
                          }}>
                            {r.status}
                          </span>
                          &nbsp;• {new Date(r.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <button className="view-all-btn" onClick={() => navigate("/request")}>
                  View All Requests <FaArrowRight />
                </button>
              </div>

              {/* BLOOD AVAILABILITY */}
              <div className="chart-container">
                <h2><FaTint color="#c0392b" /> Blood Availability</h2>
                <div className="blood-avail-grid">
                  {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((bg) => {
                    const info  = stockSummary[bg] || { total: 0, level: "CRITICAL" };
                    const color = BG_COLORS[bg];
                    return (
                      <div key={bg} className="avail-cell" style={{ borderLeft: `4px solid ${color}` }}>
                        <span className="avail-bg" style={{ color }}>{bg}</span>
                        <span className="avail-units">{info.total} units</span>
                        {info.level === "CRITICAL" && (
                          <span style={{ color: "#e74c3c", fontSize: 11 }}>
                            <FaExclamationTriangle /> LOW
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: "#888", marginTop: 12 }}>
                  * Live data from all registered blood banks
                </p>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <h2>Quick Actions</h2>
            <div className="dashboard">
              <div className="dash-card" onClick={() => navigate("/request")}><FaPlus size={32} /><p>New Request</p></div>
              <div className="dash-card" onClick={() => navigate("/request")}><FaClock size={32} /><p>Track Requests</p></div>
              <div className="dash-card" onClick={() => navigate("/stock")}><FaTint size={32} /><p>Blood Stock</p></div>
              <div className="dash-card" onClick={() => navigate("/camps")}><FaHospital size={32} /><p>Nearby Camps</p></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default HospitalDashboard;