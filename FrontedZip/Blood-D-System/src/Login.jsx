// ============================================================
//  BLOODLINK PRO — Login.jsx
//  Fully connected to Node.js + MongoDB backend via authAPI
//  SAVE AS: src/Login.jsx
// ============================================================

import React, { useState } from "react";
import "./assets/Style.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { authAPI } from "./api";   // ← your backend API service
import {
  FaTint,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaUserShield,
  FaSpinner,
} from "react-icons/fa";

// ── Role → Dashboard redirect map ────────────────────────────
const ROLE_REDIRECT = {
  SUPER_ADMIN:     "/dashboard",
  BB_ADMIN:        "/dashboard",
  DONOR:           "/dashboard",
  HOSPITAL:        "/dashboard",
  CAMP_ORGANIZER:  "/dashboard",
};

function Login() {
  const navigate = useNavigate();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);

  // ── Main login handler — calls real backend ───────────────
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      // authAPI.login() calls POST /api/auth/login
      // On success it saves token + user to localStorage automatically
      const data = await authAPI.login(email.trim(), password.trim());

      toast.success(`Welcome back, ${data.user.name}! ✅`);

      // Redirect based on role
      const redirectPath = ROLE_REDIRECT[data.user.role] || "/dashboard";
      navigate(redirectPath, { replace: true });

    } catch (err) {
      // Backend sends meaningful messages like:
      // "Invalid email or password" | "Account suspended. Contact admin."
      toast.error(err.message || "Login failed. Please try again ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* ── LEFT BRAND PANEL ────────────────────────────────── */}
      <div className="auth-brand-panel">

        <div className="auth-brand-logo">
          <FaTint size={40} />
          <span>BloodLink <strong>Pro</strong></span>
        </div>

        <div className="auth-brand-content">
          <h2>Welcome Back.</h2>
          <p>
            Log in to manage donations, requests, camps, and more —
            all from one powerful platform.
          </p>
        </div>

        {/* ── Demo Credentials Box ─────────────────────────── */}
        <div className="demo-creds-box">
          <h4><FaUserShield /> Demo Admin Accounts</h4>
          <div className="demo-cred-item">
            <span className="demo-role super">Super Admin</span>
            <code>superadmin@bloodlink.com / admin123</code>
          </div>
          <div className="demo-cred-item">
            <span className="demo-role bb">BB Admin</span>
            <code>bbadmin@bloodlink.com / admin123</code>
          </div>
          <small>Or use your registered Donor / Hospital / Organizer account</small>
        </div>

        <div className="auth-brand-stats">
          <div><strong>50,000+</strong><span>Donors</span></div>
          <div><strong>200+</strong><span>Hospitals</span></div>
          <div><strong>1000+</strong><span>Camps</span></div>
        </div>

      </div>

      {/* ── RIGHT FORM PANEL ────────────────────────────────── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-step-content">

            <h2 className="auth-title">Sign In</h2>
            <p className="auth-subtitle">
              Enter your credentials to access your dashboard
            </p>

            <form onSubmit={handleLogin} className="auth-form">

              {/* Email */}
              <div className="auth-input-group full-width">
                <label htmlFor="login-email">Email Address</label>
                <div className="auth-input-wrapper">
                  <FaEnvelope className="auth-input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-input-group full-width">
                <label htmlFor="login-password">Password</label>
                <div className="auth-input-wrapper">
                  <FaLock className="auth-input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div className="auth-forgot-row">
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`auth-submit-btn ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-loading" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FaSpinner className="spin" />
                    Signing in...
                  </span>
                ) : (
                  <>Sign In <FaArrowRight /></>
                )}
              </button>

            </form>

            {/* Divider */}
            <div className="auth-divider">
              <span>New to BloodLink Pro?</span>
            </div>

            <Link to="/resister" className="auth-register-btn">
              Create an Account
            </Link>

          </div>
        </div>
      </div>

    </div>
  );
}

export default Login;