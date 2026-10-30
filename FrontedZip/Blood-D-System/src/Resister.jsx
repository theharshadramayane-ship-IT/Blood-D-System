// ============================================================
//  BLOODLINK PRO — Resister.jsx  (Register Page)
//  Fully connected to Node.js + MongoDB backend via authAPI
//  SAVE AS: src/Resister.jsx
// ============================================================

import React, { useState } from "react";
import "./assets/Style.css";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { authAPI } from "./api";
import {
  FaUser, FaHospital, FaFlagCheckered, FaTint,
  FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt,
  FaCalendarAlt, FaVenusMars, FaIdCard, FaBuilding,
  FaBriefcase, FaArrowRight, FaArrowLeft,
  FaCheckCircle, FaShieldAlt, FaSpinner,
} from "react-icons/fa";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
  "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
  "Nashik", "Nagpur", "Lucknow", "Kanpur", "Indore",
];

const ROLES = [
  {
    key: "DONOR",
    label: "Donor",
    icon: <FaUser size={32} />,
    desc: "Register as a blood donor to save lives",
    color: "#C0392B",
  },
  {
    key: "HOSPITAL",
    label: "Hospital",
    icon: <FaHospital size={32} />,
    desc: "Register your hospital to request blood",
    color: "#2980B9",
  },
  {
    key: "CAMP_ORGANIZER",
    label: "Camp Organizer",
    icon: <FaFlagCheckered size={32} />,
    desc: "Organize blood donation camps",
    color: "#27AE60",
  },
];

function Register() {
  const navigate = useNavigate();

  // Steps: 1=Role, 2=Form, 3=Success
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", city: "",
    password: "", confirmPassword: "",
    // Donor
    bloodGroup: "", dob: "", gender: "",
    // Hospital
    hospitalName: "", licenseNumber: "", address: "", contactPerson: "",
    // Camp Organizer
    organizationName: "", designation: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setStep(2);
  };

  // ── Validate form before submit ───────────────────────────
  const validateForm = () => {
    const { name, email, phone, city, password, confirmPassword } = formData;

    if (!name.trim())                          { toast.error("Name is required");               return false; }
    if (!email.trim() || !email.includes("@")) { toast.error("Valid email required");           return false; }
    if (!phone.trim() || phone.length < 10)    { toast.error("Valid 10-digit phone required");  return false; }
    if (!city)                                 { toast.error("Please select your city");        return false; }
    if (password.length < 6)                   { toast.error("Password min 6 characters");      return false; }
    if (password !== confirmPassword)          { toast.error("Passwords do not match");         return false; }

    if (selectedRole === "DONOR") {
      if (!formData.bloodGroup) { toast.error("Please select blood group"); return false; }
      if (!formData.dob)        { toast.error("Date of birth is required"); return false; }
      if (!formData.gender)     { toast.error("Please select gender");      return false; }
    }

    if (selectedRole === "HOSPITAL") {
      if (!formData.hospitalName.trim())   { toast.error("Hospital name required");    return false; }
      if (!formData.licenseNumber.trim())  { toast.error("License number required");   return false; }
      if (!formData.contactPerson.trim())  { toast.error("Contact person required");   return false; }
    }

    if (selectedRole === "CAMP_ORGANIZER") {
      if (!formData.organizationName.trim()) { toast.error("Organization name required"); return false; }
      if (!formData.designation.trim())      { toast.error("Designation required");       return false; }
    }

    return true;
  };

  // ── Submit to backend ─────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Build payload — only send relevant fields
      const payload = {
        name:     formData.name.trim(),
        email:    formData.email.trim().toLowerCase(),
        password: formData.password,
        phone:    formData.phone.trim(),
        city:     formData.city,
        role:     selectedRole,
      };

      if (selectedRole === "DONOR") {
        payload.bloodGroup = formData.bloodGroup;
        payload.dob        = formData.dob;
        payload.gender     = formData.gender;
      }

      if (selectedRole === "HOSPITAL") {
        payload.hospitalName   = formData.hospitalName.trim();
        payload.licenseNumber  = formData.licenseNumber.trim();
        payload.contactPerson  = formData.contactPerson.trim();
        payload.address        = formData.address.trim();
      }

      if (selectedRole === "CAMP_ORGANIZER") {
        payload.organizationName = formData.organizationName.trim();
        payload.designation      = formData.designation.trim();
      }

      // POST /api/auth/register
      await authAPI.register(payload);

      toast.success("Registration successful! Please login ✅");
      setStep(3); // Show success screen

    } catch (err) {
      // Backend sends clear errors: "Email already registered", etc.
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  //  STEP 1 — Role Selection
  // ══════════════════════════════════════════════════════════
  if (step === 1) {
    return (
      <div className="auth-page">
        <div className="auth-brand-panel">
          <div className="auth-brand-logo">
            <FaTint size={40} />
            <span>BloodLink <strong>Pro</strong></span>
          </div>
          <div className="auth-brand-content">
            <h2>Join BloodLink Pro</h2>
            <p>Choose your role to get started and help save lives every day.</p>
          </div>
          <div className="auth-brand-stats">
            <div><strong>50,000+</strong><span>Donors</span></div>
            <div><strong>200+</strong><span>Hospitals</span></div>
            <div><strong>1000+</strong><span>Camps</span></div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="auth-step-content">
              <h2 className="auth-title">Create Account</h2>
              <p className="auth-subtitle">Select your role to continue</p>

              <div className="role-selection-grid" style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
                {ROLES.map((role) => (
                  <button
                    key={role.key}
                    onClick={() => handleRoleSelect(role.key)}
                    className="role-card-btn"
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "20px 24px", borderRadius: 12,
                      border: `2px solid ${role.color}20`,
                      background: `${role.color}08`,
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${role.color}15`;
                      e.currentTarget.style.borderColor = role.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `${role.color}08`;
                      e.currentTarget.style.borderColor = `${role.color}20`;
                    }}
                  >
                    <span style={{ color: role.color, fontSize: 32 }}>{role.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#2c3e50" }}>
                        {role.label}
                      </div>
                      <div style={{ fontSize: 13, color: "#7f8c8d", marginTop: 2 }}>
                        {role.desc}
                      </div>
                    </div>
                    <FaArrowRight style={{ marginLeft: "auto", color: role.color }} />
                  </button>
                ))}
              </div>

              <div className="auth-divider" style={{ marginTop: 24 }}>
                <span>Already have an account?</span>
              </div>
              <Link to="/login" className="auth-register-btn">Sign In Instead</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  STEP 3 — Success Screen
  // ══════════════════════════════════════════════════════════
  if (step === 3) {
    return (
      <div className="auth-page">
        <div className="auth-brand-panel">
          <div className="auth-brand-logo">
            <FaTint size={40} />
            <span>BloodLink <strong>Pro</strong></span>
          </div>
        </div>
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="auth-step-content" style={{ textAlign: "center" }}>
              <FaCheckCircle size={64} color="#27ae60" style={{ marginBottom: 16 }} />
              <h2 className="auth-title">Account Created!</h2>
              <p className="auth-subtitle" style={{ marginBottom: 32 }}>
                Your <strong>{selectedRole.replace("_", " ")}</strong> account has been
                created successfully. You can now login.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="auth-submit-btn"
                style={{ width: "100%" }}
              >
                Go to Login <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  STEP 2 — Registration Form
  // ══════════════════════════════════════════════════════════
  const roleConfig = ROLES.find((r) => r.key === selectedRole);

  return (
    <div className="auth-page">
      {/* LEFT PANEL */}
      <div className="auth-brand-panel">
        <div className="auth-brand-logo">
          <FaTint size={40} />
          <span>BloodLink <strong>Pro</strong></span>
        </div>
        <div className="auth-brand-content">
          <h2>Almost There!</h2>
          <p>Fill in your details to complete registration as a <strong>{roleConfig?.label}</strong>.</p>
        </div>
        <div style={{
          background: "rgba(255,255,255,0.1)", borderRadius: 12,
          padding: "20px 24px", marginTop: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#fff" }}>
            <FaShieldAlt size={20} />
            <span style={{ fontSize: 14 }}>Your data is secured with MongoDB + JWT encryption</span>
          </div>
        </div>
        <div className="auth-brand-stats">
          <div><strong>50,000+</strong><span>Donors</span></div>
          <div><strong>200+</strong><span>Hospitals</span></div>
          <div><strong>1000+</strong><span>Camps</span></div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-step-content">
            {/* Back button */}
            <button
              onClick={() => setStep(1)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
                color: "#7f8c8d", marginBottom: 16, padding: 0,
              }}
            >
              <FaArrowLeft /> Back to role selection
            </button>

            <h2 className="auth-title">
              {roleConfig?.icon} {roleConfig?.label} Registration
            </h2>
            <p className="auth-subtitle">Fill all required fields to create your account</p>

            <form onSubmit={handleFormSubmit} className="auth-form">

              {/* ── COMMON FIELDS ─────────────────────────────── */}
              <div className="auth-input-group full-width">
                <label>Full Name *</label>
                <div className="auth-input-wrapper">
                  <FaUser className="auth-input-icon" />
                  <input
                    name="name" type="text" placeholder="Enter your full name"
                    value={formData.name} onChange={handleChange}
                    required disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-input-group full-width">
                <label>Email Address *</label>
                <div className="auth-input-wrapper">
                  <FaEnvelope className="auth-input-icon" />
                  <input
                    name="email" type="email" placeholder="Enter your email"
                    value={formData.email} onChange={handleChange}
                    required disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-input-group full-width">
                <label>Phone Number *</label>
                <div className="auth-input-wrapper">
                  <FaPhone className="auth-input-icon" />
                  <input
                    name="phone" type="tel" placeholder="10-digit mobile number"
                    value={formData.phone} onChange={handleChange}
                    maxLength={10} required disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-input-group full-width">
                <label>City *</label>
                <div className="auth-input-wrapper">
                  <FaMapMarkerAlt className="auth-input-icon" />
                  <select
                    name="city" value={formData.city}
                    onChange={handleChange} required disabled={loading}
                    style={{ paddingLeft: 36 }}
                  >
                    <option value="">Select your city</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* ── DONOR SPECIFIC FIELDS ─────────────────────── */}
              {selectedRole === "DONOR" && (
                <>
                  <div className="auth-input-group full-width">
                    <label>Blood Group *</label>
                    <div className="auth-input-wrapper">
                      <FaTint className="auth-input-icon" />
                      <select
                        name="bloodGroup" value={formData.bloodGroup}
                        onChange={handleChange} required disabled={loading}
                        style={{ paddingLeft: 36 }}
                      >
                        <option value="">Select blood group</option>
                        {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="auth-input-group full-width">
                    <label>Date of Birth *</label>
                    <div className="auth-input-wrapper">
                      <FaCalendarAlt className="auth-input-icon" />
                      <input
                        name="dob" type="date"
                        value={formData.dob} onChange={handleChange}
                        required disabled={loading}
                        max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000)
                          .toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  <div className="auth-input-group full-width">
                    <label>Gender *</label>
                    <div className="auth-input-wrapper">
                      <FaVenusMars className="auth-input-icon" />
                      <select
                        name="gender" value={formData.gender}
                        onChange={handleChange} required disabled={loading}
                        style={{ paddingLeft: 36 }}
                      >
                        <option value="">Select gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ── HOSPITAL SPECIFIC FIELDS ──────────────────── */}
              {selectedRole === "HOSPITAL" && (
                <>
                  <div className="auth-input-group full-width">
                    <label>Hospital Name *</label>
                    <div className="auth-input-wrapper">
                      <FaHospital className="auth-input-icon" />
                      <input
                        name="hospitalName" type="text"
                        placeholder="Official hospital name"
                        value={formData.hospitalName} onChange={handleChange}
                        required disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="auth-input-group full-width">
                    <label>License Number *</label>
                    <div className="auth-input-wrapper">
                      <FaIdCard className="auth-input-icon" />
                      <input
                        name="licenseNumber" type="text"
                        placeholder="Hospital license number"
                        value={formData.licenseNumber} onChange={handleChange}
                        required disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="auth-input-group full-width">
                    <label>Contact Person *</label>
                    <div className="auth-input-wrapper">
                      <FaUser className="auth-input-icon" />
                      <input
                        name="contactPerson" type="text"
                        placeholder="Name of contact person"
                        value={formData.contactPerson} onChange={handleChange}
                        required disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="auth-input-group full-width">
                    <label>Hospital Address</label>
                    <div className="auth-input-wrapper">
                      <FaBuilding className="auth-input-icon" />
                      <input
                        name="address" type="text"
                        placeholder="Full address"
                        value={formData.address} onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── CAMP ORGANIZER SPECIFIC FIELDS ────────────── */}
              {selectedRole === "CAMP_ORGANIZER" && (
                <>
                  <div className="auth-input-group full-width">
                    <label>Organization Name *</label>
                    <div className="auth-input-wrapper">
                      <FaBuilding className="auth-input-icon" />
                      <input
                        name="organizationName" type="text"
                        placeholder="Name of your organization"
                        value={formData.organizationName} onChange={handleChange}
                        required disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="auth-input-group full-width">
                    <label>Your Designation *</label>
                    <div className="auth-input-wrapper">
                      <FaBriefcase className="auth-input-icon" />
                      <input
                        name="designation" type="text"
                        placeholder="e.g. Event Manager, Coordinator"
                        value={formData.designation} onChange={handleChange}
                        required disabled={loading}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── PASSWORD FIELDS ───────────────────────────── */}
              <div className="auth-input-group full-width">
                <label>Password * (min 6 characters)</label>
                <div className="auth-input-wrapper">
                  <FaLock className="auth-input-icon" />
                  <input
                    name="password" type="password"
                    placeholder="Create a strong password"
                    value={formData.password} onChange={handleChange}
                    required minLength={6} disabled={loading}
                  />
                </div>
              </div>

              <div className="auth-input-group full-width">
                <label>Confirm Password *</label>
                <div className="auth-input-wrapper">
                  <FaLock className="auth-input-icon" />
                  <input
                    name="confirmPassword" type="password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword} onChange={handleChange}
                    required minLength={6} disabled={loading}
                  />
                </div>
              </div>

              {/* ── SUBMIT ────────────────────────────────────── */}
              <button
                type="submit"
                className={`auth-submit-btn ${loading ? "loading" : ""}`}
                disabled={loading}
                style={{ width: "100%", marginTop: 8 }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                    <FaSpinner className="spin" /> Creating Account...
                  </span>
                ) : (
                  <> Create Account <FaArrowRight /> </>
                )}
              </button>

            </form>

            <div className="auth-divider" style={{ marginTop: 16 }}>
              <span>Already have an account?</span>
            </div>
            <Link to="/login" className="auth-register-btn">Sign In Instead</Link>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Register; 