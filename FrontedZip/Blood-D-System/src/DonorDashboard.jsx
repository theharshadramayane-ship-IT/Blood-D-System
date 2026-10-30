// ============================================================
//  BLOODLINK PRO — DonorDashboard.jsx
//  Fully connected to backend APIs
//  SAVE AS: src/DonorDashboard.jsx
// ============================================================

import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { useNavigate } from "react-router-dom";
import { rewardsAPI, campsAPI, screeningAPI } from "./api";
import {
  FaTint, FaHeartbeat, FaHospital, FaCampground, FaGift,
  FaMedal, FaCheckCircle, FaTimesCircle, FaFire,
  FaCalendarAlt, FaArrowRight, FaSpinner,
} from "react-icons/fa";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, ArcElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const BADGE_LEVELS = {
  NEWCOMER: { color: "#95a5a6", min: 0,    next: 100,  label: "Newcomer" },
  BRONZE:   { color: "#cd7f32", min: 100,  next: 300,  label: "Bronze"   },
  SILVER:   { color: "#a8a9ad", min: 300,  next: 600,  label: "Silver"   },
  GOLD:     { color: "#f39c12", min: 600,  next: 1000, label: "Gold"     },
  PLATINUM: { color: "#8e44ad", min: 1000, next: 2000, label: "Platinum" },
  LEGEND:   { color: "#c0392b", min: 2000, next: 2000, label: "Legend"   },
};

function getBadgeLevel(points) {
  const levels = Object.entries(BADGE_LEVELS);
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i][1].min) return levels[i][1];
  }
  return BADGE_LEVELS.NEWCOMER;
}

function DonorDashboard() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode]         = useState(false);
  const [loading, setLoading]           = useState(true);

  // ── API data states ─────────────────────────────────────
  const [user, setUser]                 = useState(null);
  const [rewardStats, setRewardStats]   = useState(null);
  const [donations, setDonations]       = useState([]);
  const [upcomingCamps, setUpcomingCamps] = useState([]);
  const [eligibility, setEligibility]   = useState({ eligible: true, reason: "", nextDate: null });

  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme === "true") setDarkMode(true);

    // Get user from localStorage (set during login)
    const currentUser =
      JSON.parse(localStorage.getItem("blCurrentUser")) ||
      JSON.parse(localStorage.getItem("user"));
    setUser(currentUser);

    loadDashboardData(currentUser);
  }, []);

  const loadDashboardData = async (currentUser) => {
    setLoading(true);
    try {
      // ── Fetch rewards + donations from backend ─────────
      const [rewardsData, campsData, screenData] = await Promise.allSettled([
        rewardsAPI.me(),
        campsAPI.list({ status: "REGISTRATION_OPEN", limit: 3 }),
        screeningAPI.status(),
      ]);

      if (rewardsData.status === "fulfilled") {
        setRewardStats(rewardsData.value.stats);
        setDonations(rewardsData.value.donations || []);
      }

      if (campsData.status === "fulfilled") {
        setUpcomingCamps(campsData.value.camps?.slice(0, 3) || []);
      }

      if (screenData.status === "fulfilled" && screenData.value.status === "DEFERRED") {
        setEligibility({
          eligible: false,
          reason: "Deferred based on health screening",
          nextDate: screenData.value.nextEligibleDate
            ? new Date(screenData.value.nextEligibleDate).toLocaleDateString("en-IN")
            : null,
        });
      } else {
        // Local age check
        if (currentUser?.dob) {
          const age = Math.floor((Date.now() - new Date(currentUser.dob)) / (365.25 * 24 * 60 * 60 * 1000));
          if (age < 18) {
            setEligibility({ eligible: false, reason: "Age below 18", nextDate: null });
          }
        }
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const points     = rewardStats?.points       || user?.points       || 0;
  const totalDonations = rewardStats?.totalDonations || user?.totalDonations || 0;
  const badge      = getBadgeLevel(points);
  const progress   = badge.min === badge.next
    ? 100
    : Math.min(100, Math.round(((points - badge.min) / (badge.next - badge.min)) * 100));

  // ── Charts ─────────────────────────────────────────────
  const donationsByMonth = {};
  donations.forEach((d) => {
    const month = new Date(d.donationDate).toLocaleString("en-IN", { month: "short", year: "2-digit" });
    donationsByMonth[month] = (donationsByMonth[month] || 0) + 1;
  });

  const barData = {
    labels: Object.keys(donationsByMonth).slice(-6),
    datasets: [{
      label: "My Donations",
      data: Object.values(donationsByMonth).slice(-6),
      backgroundColor: "#c0392b",
      borderRadius: 6,
    }],
  };

  const doughnutData = {
    labels: ["Donations", "Points Earned", "Camps Joined"],
    datasets: [{
      data: [totalDonations || 1, Math.floor(points / 10) || 1, upcomingCamps.length || 1],
      backgroundColor: ["#c0392b", "#e74c3c", "#f1948a"],
      borderWidth: 2,
    }],
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
            <p style={{ color: "#888" }}>Loading your dashboard...</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* HERO WELCOME */}
            <div className="donor-hero">
              <div className="donor-hero-left">
                <div className="donor-avatar">
                  {user?.name?.charAt(0)?.toUpperCase() || "D"}
                </div>
                <div>
                  <h2 className="donor-welcome">Welcome back, {user?.name || "Donor"} 👋</h2>
                  <p className="donor-meta">
                    <FaTint style={{ color: "#c0392b" }} /> {user?.bloodGroup || "—"} &nbsp;|&nbsp;
                    <FaCalendarAlt /> {user?.city || "—"}
                  </p>
                </div>
              </div>
              <div className="badge-display">
                <FaMedal size={28} style={{ color: badge.color }} />
                <div>
                  <div className="badge-label" style={{ color: badge.color }}>{badge.label} Badge</div>
                  <div className="badge-points">{points} pts</div>
                </div>
              </div>
            </div>

            {/* ELIGIBILITY BANNER */}
            <div className={`eligibility-banner ${eligibility.eligible ? "eligible" : "ineligible"}`}>
              {eligibility.eligible ? (
                <>
                  <FaCheckCircle size={22} />
                  <span>You are <strong>ELIGIBLE</strong> to donate blood today!</span>
                  <button className="donate-cta-btn" onClick={() => navigate("/camps")}>
                    Find a Camp <FaArrowRight />
                  </button>
                </>
              ) : (
                <>
                  <FaTimesCircle size={22} />
                  <span>
                    <strong>NOT ELIGIBLE</strong>: {eligibility.reason}
                    {eligibility.nextDate && ` — Next eligible: ${eligibility.nextDate}`}
                  </span>
                </>
              )}
            </div>

            {/* STATS ROW */}
            <div className="stats">
              <div className="stat-card">
                <h3>{totalDonations}</h3>
                <p>My Donations</p>
              </div>
              <div className="stat-card">
                <h3>{points}</h3>
                <p>Points Earned</p>
              </div>
              <div className="stat-card">
                <h3>{badge.label}</h3>
                <p>Badge Level</p>
              </div>
              <div className="stat-card">
                <h3>{eligibility.eligible ? "✔" : "✖"}</h3>
                <p>Eligibility</p>
              </div>
            </div>

            {/* BADGE PROGRESS */}
            <div className="badge-progress-card">
              <div className="badge-progress-header">
                <span>Progress to next badge</span>
                <span style={{ color: badge.color, fontWeight: "bold" }}>{progress}%</span>
              </div>
              <div className="badge-progress-track">
                <div className="badge-progress-fill" style={{ width: `${progress}%`, background: badge.color }} />
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="quick-actions-title">Quick Actions</div>
            <div className="dashboard">
              <div className="dash-card" onClick={() => navigate("/screening")}><FaHeartbeat size={32} /><p>Health Screening</p></div>
              <div className="dash-card" onClick={() => navigate("/camps")}><FaCampground size={32} /><p>Find a Camp</p></div>
              <div className="dash-card" onClick={() => navigate("/request")}><FaHospital size={32} /><p>Blood Request</p></div>
              <div className="dash-card" onClick={() => navigate("/rewards")}><FaGift size={32} /><p>My Rewards</p></div>
              <div className="dash-card" onClick={() => navigate("/certificates")}><FaFire size={32} /><p>Certificates</p></div>
              <div className="dash-card" onClick={() => navigate("/profile")}><FaMedal size={32} /><p>My Profile</p></div>
            </div>

            {/* UPCOMING CAMPS + RECENT DONATIONS */}
            <div className="charts-wrapper" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="chart-container">
                <h2>Upcoming Camps</h2>
                {upcomingCamps.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#888", marginTop: 20 }}>No upcoming camps found.</p>
                ) : (
                  upcomingCamps.map((c, i) => (
                    <div key={i} className="mini-camp-card">
                      <div>
                        <strong>{c.title}</strong>
                        <p style={{ margin: "2px 0", fontSize: 13, color: "#888" }}>{c.venue}, {c.city}</p>
                      </div>
                      <div className="mini-camp-date">
                        <FaCalendarAlt size={12} /> {new Date(c.date).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                  ))
                )}
                <button className="view-all-btn" onClick={() => navigate("/camps")}>
                  View All Camps <FaArrowRight />
                </button>
              </div>

              <div className="activity-box" style={{ margin: 0 }}>
                <h2>Recent Donations</h2>
                {donations.length === 0 ? (
                  <p style={{ color: "#888", textAlign: "center", marginTop: 20 }}>No donations yet.</p>
                ) : (
                  donations.slice(0, 5).map((d, i) => (
                    <div key={i} className="activity-item">
                      <p>🩸 Donated at {d.campName || d.bankName || "—"}</p>
                      <small>{new Date(d.donationDate).toLocaleDateString("en-IN")}</small>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* CHARTS */}
            <div className="charts-wrapper">
              <div className="chart-container">
                <h2>My Donation History (Monthly)</h2>
                {donations.length > 0
                  ? <Bar data={barData} options={{ responsive: true }} />
                  : <p style={{ textAlign: "center", color: "#888", marginTop: 20 }}>No donation data yet.</p>}
              </div>
              <div className="chart-container">
                <h2>My Stats Overview</h2>
                <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} style={{ maxHeight: 260 }} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DonorDashboard;