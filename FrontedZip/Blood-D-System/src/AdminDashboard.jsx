// ============================================================
//  BLOODLINK PRO — AdminDashboard.jsx
//  Fully connected to backend APIs
//  SAVE AS: src/AdminDashboard.jsx
// ============================================================

import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { useNavigate } from "react-router-dom";
import { adminAPI, stockAPI, requestsAPI } from "./api";
import {
  FaUsers, FaTint, FaHospital, FaCampground,
  FaExclamationTriangle, FaCheckCircle, FaClock,
  FaBell, FaDownload, FaArrowRight, FaSpinner,
} from "react-icons/fa";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend);

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];

function AdminDashboard() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading]   = useState(true);

  // ── API Data ─────────────────────────────────────────────
  const [dashStats, setDashStats]         = useState(null);
  const [stockSummary, setStockSummary]   = useState({});
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [expiringSoon, setExpiringSoon]   = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentDonations, setRecentDonations] = useState([]);
  const [monthlyChart, setMonthlyChart]   = useState([]);
  const [user, setUser]                   = useState(null);

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
      const [dashRes, alertsRes] = await Promise.allSettled([
        adminAPI.dashboard(),
        stockAPI.alerts(),
      ]);

      if (dashRes.status === "fulfilled") {
        const d = dashRes.value;
        setDashStats(d.stats);
        setStockSummary(d.stockSummary || {});
        setRecentRequests(d.recentRequests || []);
        setRecentDonations(d.recentDonations || []);
        setMonthlyChart(d.monthlyChart || []);
      }

      if (alertsRes.status === "fulfilled") {
        setLowStockAlerts(alertsRes.value.lowAlerts || []);
        setExpiringSoon(alertsRes.value.expiringSoon || []);
      }
    } catch (err) {
      console.error("Admin dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Charts ─────────────────────────────────────────────
  const stockBarData = {
    labels: BLOOD_GROUPS,
    datasets: [{
      label: "Units in Stock",
      data: BLOOD_GROUPS.map((bg) => stockSummary[bg]?.total || 0),
      backgroundColor: BLOOD_GROUPS.map((bg) => {
        const level = stockSummary[bg]?.level;
        return level === "CRITICAL" ? "#e74c3c" : level === "LOW" ? "#e67e22" : "#27ae60";
      }),
      borderRadius: 6,
    }],
  };

  const pieData = {
    labels: ["Donors", "Requests", "Camps"],
    datasets: [{
      data: [dashStats?.totalDonors || 0, dashStats?.pendingRequests || 0, dashStats?.activeCamps || 0],
      backgroundColor: ["#c0392b", "#e74c3c", "#2980b9"],
      borderWidth: 2,
    }],
  };

  const lineLabels = monthlyChart.map(
    (m) => `${["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m._id.month]} ${String(m._id.year).slice(2)}`
  );
  const lineData = {
    labels: lineLabels,
    datasets: [{
      label: "Donations",
      data: monthlyChart.map((m) => m.count),
      borderColor: "#c0392b",
      backgroundColor: "rgba(192,57,43,0.15)",
      tension: 0.4, fill: true,
      pointBackgroundColor: "#c0392b",
    }],
  };

  // ── PDF Report ─────────────────────────────────────────
  const downloadReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BloodLink Pro — Admin Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [["Metric", "Value"]],
      body: [
        ["Total Donors",        dashStats?.totalDonors      || 0],
        ["Total Hospitals",     dashStats?.totalHospitals   || 0],
        ["Organizers",          dashStats?.totalOrganizers  || 0],
        ["Pending Requests",    dashStats?.pendingRequests  || 0],
        ["Total Donations",     dashStats?.totalDonations   || 0],
        ["Active Camps",        dashStats?.activeCamps      || 0],
        ["Low Stock Alerts",    lowStockAlerts.length],
        ["Expiring Soon",       expiringSoon.length],
      ],
    });

    doc.save("admin-report.pdf");
  };

  const stats = dashStats;

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
            <p style={{ color: "#888" }}>Loading admin dashboard...</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="admin-header">
              <div>
                <h1 style={{ margin: 0 }}>
                  {user?.role === "SUPER_ADMIN" ? "🛡️ Super Admin" : "🏥 Admin"} Dashboard
                </h1>
                <p style={{ margin: "4px 0 0", color: "#888", fontSize: 14 }}>
                  {user?.name} • {user?.city}
                </p>
              </div>
              <button className="pdf-btn" onClick={downloadReport}>
                <FaDownload /> Download Report
              </button>
            </div>

            {/* LOW STOCK ALERTS */}
            {lowStockAlerts.length > 0 && (
              <div style={{
                background: "#fdf0f0", border: "1px solid #f5c6c6",
                borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <FaBell color="#e74c3c" />
                <strong style={{ color: "#e74c3c" }}>
                  {lowStockAlerts.length} Blood Group{lowStockAlerts.length > 1 ? "s" : ""} at Critical/Low Level:
                </strong>
                {lowStockAlerts.map((a, i) => (
                  <span key={i} style={{
                    background: a.level === "CRITICAL" ? "#e74c3c" : "#e67e22",
                    color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 12,
                  }}>
                    {a.bloodGroup} ({a.total} units)
                  </span>
                ))}
              </div>
            )}

            {/* EXPIRING SOON */}
            {expiringSoon.length > 0 && (
              <div style={{
                background: "#fff9e6", border: "1px solid #f9d67a",
                borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <FaExclamationTriangle color="#e67e22" />
                <strong style={{ color: "#e67e22" }}>
                  {expiringSoon.length} stock entries expiring within 7 days
                </strong>
                <button className="view-all-btn" style={{ marginLeft: "auto" }} onClick={() => navigate("/stock")}>
                  View Stock <FaArrowRight />
                </button>
              </div>
            )}

            {/* KPI STATS */}
            <div className="stats">
              <div className="stat-card">
                <FaUsers size={22} />
                <h3>{stats?.totalDonors || 0}</h3>
                <p>Total Donors</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#2980b9,#1a5276)" }}>
                <FaHospital size={22} />
                <h3>{stats?.totalHospitals || 0}</h3>
                <p>Hospitals</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#e67e22,#d35400)" }}>
                <FaClock size={22} />
                <h3>{stats?.pendingRequests || 0}</h3>
                <p>Pending Requests</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#27ae60,#1e8449)" }}>
                <FaTint size={22} />
                <h3>{stats?.totalDonations || 0}</h3>
                <p>Total Donations</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#8e44ad,#6c3483)" }}>
                <FaCampground size={22} />
                <h3>{stats?.activeCamps || 0}</h3>
                <p>Active Camps</p>
              </div>
              <div className="stat-card" style={{ background: "linear-gradient(to right,#e74c3c,#c0392b)" }}>
                <FaExclamationTriangle size={22} />
                <h3>{lowStockAlerts.length}</h3>
                <p>Stock Alerts</p>
              </div>
            </div>

            {/* BLOOD STOCK GRID */}
            <div className="chart-container" style={{ marginBottom: 24 }}>
              <h2>Blood Stock Levels</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {BLOOD_GROUPS.map((bg) => {
                  const info  = stockSummary[bg] || { total: 0, level: "CRITICAL" };
                  const color = info.level === "CRITICAL" ? "#e74c3c" : info.level === "LOW" ? "#e67e22" : "#27ae60";
                  return (
                    <div key={bg} style={{
                      background: `${color}15`, border: `2px solid ${color}40`,
                      borderRadius: 10, padding: "14px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color }}>{bg}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#2c3e50" }}>{info.total}</div>
                      <div style={{ fontSize: 11, color, fontWeight: 600 }}>{info.level}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RECENT REQUESTS + DONATIONS */}
            <div className="charts-wrapper" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="chart-container">
                <h2><FaClock color="#c0392b" /> Recent Requests</h2>
                {recentRequests.length === 0 ? (
                  <p style={{ color: "#888", textAlign: "center" }}>No requests yet.</p>
                ) : (
                  recentRequests.map((r, i) => (
                    <div key={i} className="activity-item">
                      <p>
                        <span style={{
                          background: "#c0392b", color: "#fff",
                          borderRadius: 10, padding: "1px 8px", fontSize: 12, marginRight: 8,
                        }}>
                          {r.bloodGroup}
                        </span>
                        {r.hospitalName} — {r.units} units
                        <span style={{
                          marginLeft: 8, fontSize: 11,
                          color: r.urgency === "CRITICAL" ? "#e74c3c" : r.urgency === "URGENT" ? "#e67e22" : "#2980b9",
                        }}>
                          [{r.urgency}]
                        </span>
                      </p>
                      <small style={{
                        color: r.status === "PENDING" ? "#e67e22" : r.status === "APPROVED" ? "#27ae60" : "#888",
                      }}>
                        {r.status} • {new Date(r.createdAt).toLocaleDateString("en-IN")}
                      </small>
                    </div>
                  ))
                )}
                <button className="view-all-btn" onClick={() => navigate("/request")}>
                  Manage Requests <FaArrowRight />
                </button>
              </div>

              <div className="activity-box" style={{ margin: 0 }}>
                <h2>Recent Donations</h2>
                {recentDonations.length === 0 ? (
                  <p style={{ color: "#888", textAlign: "center" }}>No donations yet.</p>
                ) : (
                  recentDonations.map((d, i) => (
                    <div key={i} className="activity-item">
                      <p>🩸 {d.donorId?.name || "Donor"} donated at {d.campName || d.bankName || "—"}</p>
                      <small>{new Date(d.donationDate).toLocaleDateString("en-IN")}</small>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CHARTS */}
            <div className="charts-wrapper">
              <div className="chart-container">
                <h2>Blood Stock by Group</h2>
                <Bar data={stockBarData} options={{ responsive: true }} />
              </div>
              <div className="chart-container">
                <h2>Monthly Donations Trend</h2>
                {monthlyChart.length > 0
                  ? <Line data={lineData} options={{ responsive: true }} />
                  : <p style={{ textAlign: "center", color: "#888" }}>No donation data yet.</p>}
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <h2>Quick Actions</h2>
            <div className="dashboard">
              <div className="dash-card" onClick={() => navigate("/donor")}><FaUsers size={32} /><p>Manage Donors</p></div>
              <div className="dash-card" onClick={() => navigate("/stock")}><FaTint size={32} /><p>Blood Stock</p></div>
              <div className="dash-card" onClick={() => navigate("/request")}><FaHospital size={32} /><p>Blood Requests</p></div>
              <div className="dash-card" onClick={() => navigate("/camps")}><FaCampground size={32} /><p>Camps</p></div>
              <div className="dash-card" onClick={() => navigate("/network")}><FaCheckCircle size={32} /><p>Network</p></div>
              <div className="dash-card" onClick={() => navigate("/thalassemia")}><FaExclamationTriangle size={32} /><p>Thalassemia</p></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;