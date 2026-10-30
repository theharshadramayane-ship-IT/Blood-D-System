// ============================================================
//  BLOODLINK PRO — Sidebar.jsx
//  Role-based navigation — backend logout connected
//  SAVE AS: src/Sidebar.jsx
// ============================================================

import { Link, useNavigate, useLocation } from "react-router-dom";
import { authAPI } from "./api";
import {
  FaHome, FaUser, FaHeartbeat, FaTint, FaHospital,
  FaCampground, FaGift, FaMoon, FaSun, FaSignOutAlt,
  FaIdCard, FaClipboardList, FaNetworkWired, FaCertificate,
} from "react-icons/fa";

// ── Get current user role from localStorage ───────────────
function getCurrentUser() {
  try {
    return (
      JSON.parse(localStorage.getItem("blCurrentUser")) ||
      JSON.parse(localStorage.getItem("user")) ||
      {}
    );
  } catch { return {}; }
}

// ── Nav items with role access control ────────────────────
const NAV_ITEMS = [
  { to: "/dashboard",   icon: <FaHome />,          label: "Dashboard",       roles: ["DONOR","BB_ADMIN","SUPER_ADMIN","HOSPITAL","CAMP_ORGANIZER"] },
  { to: "/profile",     icon: <FaIdCard />,         label: "My Profile",      roles: ["DONOR","BB_ADMIN","SUPER_ADMIN","HOSPITAL","CAMP_ORGANIZER"] },
  { to: "/screening",   icon: <FaClipboardList />,  label: "Health Screening",roles: ["DONOR"] },
  { to: "/donor",       icon: <FaUser />,           label: "Donor List",      roles: ["BB_ADMIN","SUPER_ADMIN"] },
  { to: "/stock",       icon: <FaTint />,           label: "Blood Stock",     roles: ["BB_ADMIN","SUPER_ADMIN"] },
  { to: "/request",     icon: <FaHospital />,       label: "Blood Request",   roles: ["HOSPITAL","BB_ADMIN","SUPER_ADMIN"] },
  { to: "/camps",       icon: <FaCampground />,     label: "Camps",           roles: ["DONOR","BB_ADMIN","SUPER_ADMIN","CAMP_ORGANIZER"] },
  { to: "/network",     icon: <FaNetworkWired />,   label: "Blood Network",   roles: ["BB_ADMIN","SUPER_ADMIN","HOSPITAL"] },
  { to: "/thalassemia", icon: <FaHeartbeat />,      label: "Thalassemia",     roles: ["BB_ADMIN","SUPER_ADMIN","HOSPITAL"] },
  { to: "/rewards",     icon: <FaGift />,           label: "Rewards",         roles: ["DONOR"] },
  { to: "/certificates",icon: <FaCertificate />,   label: "Certificates",    roles: ["DONOR","BB_ADMIN","SUPER_ADMIN"] },
];

const ROLE_LABELS = {
  DONOR:          "🩸 Donor",
  BB_ADMIN:       "🏥 BB Admin",
  SUPER_ADMIN:    "🛡️ Super Admin",
  HOSPITAL:       "🏨 Hospital",
  CAMP_ORGANIZER: "⛺ Camp Organizer",
};

function Sidebar({ darkMode, toggleDarkMode }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = getCurrentUser();
  const role      = (user.role || "DONOR").toUpperCase();
  const roleLabel = ROLE_LABELS[role] || "User";

  // ── Logout — clears token + localStorage via authAPI ──
  const handleLogout = () => {
    authAPI.logout(); // removes blToken, blCurrentUser, blIsLoggedIn, user, isLogin
    navigate("/login");
  };

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      <style>{`
        .sidebar {
          width: 250px !important;
          box-sizing: border-box !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
        }
        .main-content {
          margin-left: 250px !important;
          width: calc(100% - 250px) !important;
          box-sizing: border-box !important;
        }
        @media (max-width: 768px) {
          .sidebar { width: 100% !important; height: auto !important; position: relative !important; }
          .main-content { margin-left: 0 !important; width: 100% !important; }
        }
      `}</style>

      <div className="sidebar">
        {/* Brand */}
        <h2 style={{ marginBottom: 4, fontSize: 18, letterSpacing: 0.5 }}>
          ❤️ BloodLink Pro
        </h2>

        {/* User name */}
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
          {user.name || "User"}
        </div>

        {/* Role badge */}
        <div style={{
          fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.25)", borderRadius: 20,
          padding: "4px 10px", marginBottom: 18, display: "inline-block",
          color: "rgba(255,255,255,0.9)", letterSpacing: 0.3,
        }}>
          {roleLabel}
        </div>

        {/* Nav links */}
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                color: "white", textDecoration: "none",
                margin: "4px 0", padding: "10px 12px",
                borderRadius: 8, fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                background:  isActive ? "rgba(255,255,255,0.25)" : "transparent",
                borderLeft:  isActive ? "3px solid rgba(255,255,255,0.9)" : "3px solid transparent",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background   = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.paddingLeft  = "18px";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background   = "transparent";
                  e.currentTarget.style.paddingLeft  = "12px";
                }
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div style={{ flex: 1, minHeight: 24 }} />

        {/* Dark mode */}
        <button className="dark-btn" onClick={toggleDarkMode} style={{ marginTop: 12 }}>
          {darkMode ? <><FaMoon className="side-icon" /> Dark Mode</> : <><FaSun className="side-icon" /> Light Mode</>}
        </button>

        {/* Logout — calls authAPI.logout() */}
        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt className="side-icon" /> Logout
        </button>
      </div>
    </>
  );
}

export default Sidebar;