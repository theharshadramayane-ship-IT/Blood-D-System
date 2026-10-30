// ============================================================
//  BLOODLINK PRO — DonorProfile.jsx
//  Fully connected to backend APIs
//  SAVE AS: src/DonorProfile.jsx
// ============================================================

import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import "./assets/Module2_DonorProfile.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { authAPI, donorsAPI } from "./api";
import {
  FaUser, FaTint, FaHeartbeat, FaHistory, FaIdCard,
  FaEdit, FaCheckCircle, FaTimesCircle, FaExclamationCircle,
  FaMapMarkerAlt, FaPhone, FaEnvelope, FaCalendarAlt,
  FaVenusMars, FaArrowRight, FaArrowLeft, FaSave,
  FaDownload, FaShare, FaPrint, FaInfoCircle,
  FaShieldAlt, FaMedal, FaSpinner,
} from "react-icons/fa";

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const CITIES = [
  "Mumbai","Delhi","Bangalore","Hyderabad","Chennai",
  "Kolkata","Pune","Ahmedabad","Jaipur","Surat",
  "Nashik","Nagpur","Lucknow","Kanpur","Indore",
];
const CHRONIC_CONDITIONS = [
  "Diabetes","Hypertension","Heart Disease","Asthma",
  "HIV/AIDS","Hepatitis B","Hepatitis C","Thyroid Disorder",
  "Cancer (current)","Epilepsy","Kidney Disease","Sickle Cell",
];
const TABS = [
  { id: "view",    label: "My Profile",   icon: <FaUser />      },
  { id: "edit",    label: "Edit Profile", icon: <FaEdit />      },
  { id: "medical", label: "Medical Info", icon: <FaHeartbeat /> },
  { id: "history", label: "Donations",    icon: <FaHistory />   },
  { id: "idcard",  label: "ID Card",      icon: <FaIdCard />    },
];

const calcCompleteness = (user, medical) => {
  const fields = [
    user?.name, user?.email, user?.phone, user?.city,
    user?.bloodGroup, user?.dob, user?.gender,
    user?.emergencyContact, user?.address,
    medical?.allergies || medical?.medications,
  ];
  return Math.round((fields.filter((f) => f && String(f).trim() !== "").length / fields.length) * 100);
};

function DonorProfile() {
  const [darkMode, setDarkMode]   = useState(false);
  const [activeTab, setActiveTab] = useState("view");
  const [wizardStep, setWizardStep] = useState(1);
  const [user, setUser]           = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const [editForm, setEditForm] = useState({
    name:"", email:"", phone:"", city:"", address:"",
    bloodGroup:"", dob:"", gender:"",
    emergencyContact:"", emergencyPhone:"",
  });

  const [medical, setMedical] = useState({
    conditions:[], allergies:"", medications:"",
    recentSurgeries:"", notes:"", lastCheckup:"",
    weight:"", height:"",
  });

  const [eligibility, setEligibility] = useState({ eligible: true, checks: [] });

  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme === "true") setDarkMode(true);

    const currentUser =
      JSON.parse(localStorage.getItem("blCurrentUser")) ||
      JSON.parse(localStorage.getItem("user"));
    setUser(currentUser);

    if (currentUser) {
      setEditForm({
        name:             currentUser.name             || "",
        email:            currentUser.email            || "",
        phone:            currentUser.phone            || "",
        city:             currentUser.city             || "",
        address:          currentUser.address          || "",
        bloodGroup:       currentUser.bloodGroup       || "",
        dob:              currentUser.dob ? currentUser.dob.slice(0,10) : "",
        gender:           currentUser.gender           || "",
        emergencyContact: currentUser.emergencyContact || "",
        emergencyPhone:   currentUser.emergencyPhone   || "",
      });
    }

    loadBackendData(currentUser);
  }, []);

  const loadBackendData = async (currentUser) => {
    if (!currentUser?._id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [medRes, donRes] = await Promise.allSettled([
        donorsAPI.getMedical(currentUser._id),
        donorsAPI.getDonations(currentUser._id),
      ]);

      if (medRes.status === "fulfilled" && medRes.value.medical) {
        const m = medRes.value.medical;
        setMedical({
          conditions:     m.conditions     || [],
          allergies:      m.allergies      || "",
          medications:    m.medications    || "",
          recentSurgeries:m.recentSurgeries|| "",
          notes:          m.notes          || "",
          lastCheckup:    m.lastCheckup ? m.lastCheckup.slice(0,10) : "",
          weight:         m.weight         || "",
          height:         m.height         || "",
        });
        checkEligibility(currentUser, [], m);
      }

      if (donRes.status === "fulfilled") {
        const myDonations = donRes.value.donations || [];
        setDonations(myDonations);
        checkEligibility(currentUser, myDonations, medical);
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Eligibility checks ──────────────────────────────────
  const checkEligibility = (u, donationsList, med) => {
    const checks = [];
    let allPass = true;

    if (u?.dob) {
      const age = Math.floor((Date.now() - new Date(u.dob)) / (365.25 * 24 * 60 * 60 * 1000));
      const pass = age >= 18 && age <= 65;
      if (!pass) allPass = false;
      checks.push({ label: "Age (18–65 years)", pass, detail: `Your age: ${age} years` });
    } else {
      checks.push({ label: "Age (18–65 years)", pass: null, detail: "DOB not set" });
    }

    const weight = parseFloat(med?.weight || 0);
    if (weight > 0) {
      const pass = weight >= 45;
      if (!pass) allPass = false;
      checks.push({ label: "Weight (≥ 45 kg)", pass, detail: `Your weight: ${weight} kg` });
    } else {
      checks.push({ label: "Weight (≥ 45 kg)", pass: null, detail: "Not provided" });
    }

    if (donationsList.length > 0) {
      const last = donationsList[0];
      if (last?.donationDate) {
        const days = Math.floor((Date.now() - new Date(last.donationDate)) / (24 * 60 * 60 * 1000));
        const pass = days >= 56;
        if (!pass) allPass = false;
        checks.push({ label: "Donation Gap (56 days)", pass, detail: `Last donation: ${days} days ago` });
      }
    } else {
      checks.push({ label: "Donation Gap (56 days)", pass: true, detail: "No previous donations" });
    }

    const hasCritical = (med?.conditions || []).some((c) =>
      ["HIV/AIDS","Hepatitis B","Hepatitis C","Cancer (current)","Sickle Cell"].includes(c)
    );
    if (hasCritical) allPass = false;
    checks.push({
      label: "No Permanent Disqualifying Conditions",
      pass: !hasCritical,
      detail: hasCritical ? "Critical condition flagged" : "No disqualifying conditions",
    });

    setEligibility({ eligible: allPass, checks });
  };

  const completeness = calcCompleteness(user, medical);

  // ── Save profile to backend ─────────────────────────────
  const saveStep1 = () => {
    if (!editForm.name.trim())  { toast.error("Name is required");  return; }
    if (!editForm.email.trim()) { toast.error("Email is required"); return; }
    if (!editForm.phone.trim()) { toast.error("Phone is required"); return; }
    setWizardStep(2);
  };

  const saveProfile = async () => {
    if (!editForm.bloodGroup) { toast.error("Please select blood group"); return; }
    if (!editForm.dob)        { toast.error("Date of birth required");    return; }

    setSaving(true);
    try {
      const data = await authAPI.updateProfile(editForm);
      const updated = data.user;

      // Sync localStorage
      localStorage.setItem("blCurrentUser", JSON.stringify(updated));
      localStorage.setItem("user",           JSON.stringify(updated));
      setUser(updated);

      toast.success("Profile updated successfully! ✅");
      setActiveTab("view");
      setWizardStep(1);
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // ── Save medical to backend ─────────────────────────────
  const saveMedical = async () => {
    if (!user?._id) { toast.error("User not found"); return; }
    setSaving(true);
    try {
      await donorsAPI.updateMedical(user._id, medical);
      toast.success("Medical history saved! ✅");
      checkEligibility(user, donations, medical);
    } catch (err) {
      toast.error(err.message || "Failed to save medical info");
    } finally {
      setSaving(false);
    }
  };

  const toggleCondition = (cond) => {
    setMedical((prev) => {
      const list = prev.conditions || [];
      return list.includes(cond)
        ? { ...prev, conditions: list.filter((c) => c !== cond) }
        : { ...prev, conditions: [...list, cond] };
    });
  };

  // ── PDF ID Card ─────────────────────────────────────────
  const downloadIdCard = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 55] });
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, 90, 55, "F");
    doc.setFillColor(192, 57, 43);
    doc.rect(0, 0, 90, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("BloodLink Pro", 4, 9);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text("Donor Identification Card", 4, 13);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(user?.name || "Donor", 4, 24);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text(`Blood Group: ${user?.bloodGroup || "—"}`, 4, 30);
    doc.text(`City: ${user?.city || "—"}`, 4, 35);
    doc.text(`Phone: ${user?.phone || "—"}`, 4, 40);
    doc.text(`ID: BL-${(user?._id || "XXXXXXXX").slice(0, 8).toUpperCase()}`, 4, 45);
    doc.setTextColor(39, 174, 96);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("VERIFIED DONOR", 4, 51);
    doc.save(`BloodLink_ID_${user?.name || "Donor"}.pdf`);
    toast.success("ID Card downloaded! ✅");
  };

  const handleEditChange = (e) =>
    setEditForm({ ...editForm, [e.target.name]: e.target.value });

  // ── Render ──────────────────────────────────────────────
  return (
    <div className={darkMode ? "dashboard-container dark" : "dashboard-container"}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => {
        const n = !darkMode;
        setDarkMode(n);
        localStorage.setItem("darkMode", String(n));
      }} />

      <div className="main-content profile-page">

        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"60vh", flexDirection:"column", gap:12 }}>
            <FaSpinner size={32} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
            <p style={{ color:"#888" }}>Loading your profile...</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            {/* ── HERO BANNER ─────────────────────────────── */}
            <div className="profile-hero-banner">
              <div className="profile-hero-left">
                <div className="profile-avatar-large">
                  {user?.name?.charAt(0)?.toUpperCase() || "D"}
                </div>
                <div>
                  <h2 className="profile-hero-name">{user?.name || "Donor"}</h2>
                  <div className="profile-hero-meta">
                    <span className="profile-hero-chip">
                      <FaTint style={{ color:"#f87171" }} /> {user?.bloodGroup || "—"}
                    </span>
                    <span className="profile-hero-chip">
                      <FaMapMarkerAlt /> {user?.city || "—"}
                    </span>
                    <span className="profile-hero-chip">
                      <FaMedal style={{ color:"#f39c12" }} /> {user?.totalDonations || 0} Donations
                    </span>
                    <span className="profile-hero-chip"
                      style={{ background: eligibility.eligible ? "rgba(39,174,96,0.25)" : "rgba(231,76,60,0.25)" }}>
                      {eligibility.eligible
                        ? <><FaCheckCircle style={{ color:"#27ae60" }} /> Eligible</>
                        : <><FaTimesCircle style={{ color:"#e74c3c" }} /> Not Eligible</>}
                    </span>
                  </div>
                </div>
              </div>
              <div className="profile-hero-right">
                <div className="completeness-ring">
                  <div className="completeness-circle" style={{ "--pct": `${completeness * 3.6}deg` }}>
                    <span className="completeness-pct">{completeness}%</span>
                  </div>
                  <div>
                    <div className="completeness-label">Profile Complete</div>
                    <div className="completeness-sublabel">
                      {completeness < 100 ? "Add more info →" : "All done! ✓"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── TABS ──────────────────────────────────────── */}
            <div className="profile-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`profile-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => { setActiveTab(tab.id); setWizardStep(1); }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* ================================================================
                TAB 1 — PROFILE VIEW
            ================================================================ */}
            {activeTab === "view" && (
              <div className="profile-info-grid">
                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <div className="profile-section-icon"><FaUser size={16} /></div>
                    <h3 className="profile-section-title">Personal Information</h3>
                  </div>
                  {[
                    { label:"Full Name",    value: user?.name    || "—" },
                    { label:"Email",        value: user?.email   || "—" },
                    { label:"Phone",        value: user?.phone   || "—" },
                    { label:"City",         value: user?.city    || "—" },
                    { label:"Address",      value: user?.address || "—" },
                    { label:"Gender",       value: user?.gender  || "—" },
                    { label:"Date of Birth",value: user?.dob ? new Date(user.dob).toLocaleDateString("en-IN") : "—" },
                    { label:"Role",         value: user?.role    || "DONOR" },
                  ].map((row, i) => (
                    <div key={i} className="profile-field-row">
                      <span className="profile-field-label">{row.label}</span>
                      <span className="profile-field-value">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="profile-section-card">
                  <div className="profile-section-header">
                    <div className="profile-section-icon"><FaTint size={16} /></div>
                    <h3 className="profile-section-title">Donor Details</h3>
                  </div>
                  {[
                    { label:"Blood Group",      value: user?.bloodGroup || "—", cls: "blood-tag" },
                    { label:"Eligibility",      value: eligibility.eligible ? "✔ ELIGIBLE" : "✖ NOT ELIGIBLE", cls: eligibility.eligible ? "eligible-tag" : "ineligible-tag" },
                    { label:"Total Donations",  value: donations.length || user?.totalDonations || 0 },
                    { label:"Points Earned",    value: user?.points || 0 },
                    { label:"Emergency Contact",value: user?.emergencyContact || "—" },
                    { label:"Emergency Phone",  value: user?.emergencyPhone   || "—" },
                    { label:"Member Since",     value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "—" },
                  ].map((row, i) => (
                    <div key={i} className="profile-field-row">
                      <span className="profile-field-label">{row.label}</span>
                      <span className={`profile-field-value ${row.cls || ""}`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* ELIGIBILITY CHECKER */}
                <div className="profile-section-card" style={{ gridColumn:"1 / -1" }}>
                  <div className="profile-section-header">
                    <div className="profile-section-icon"><FaShieldAlt size={16} /></div>
                    <h3 className="profile-section-title">Eligibility Checker</h3>
                  </div>
                  {eligibility.checks.map((chk, i) => (
                    <div key={i} className="elig-check-row">
                      {chk.pass === true  && <FaCheckCircle    size={16} className="elig-icon-pass" />}
                      {chk.pass === false && <FaTimesCircle    size={16} className="elig-icon-fail" />}
                      {chk.pass === null  && <FaExclamationCircle size={16} className="elig-icon-warn" />}
                      <span className="elig-check-label">{chk.label}</span>
                      <span className="elig-check-detail">{chk.detail}</span>
                    </div>
                  ))}
                  {eligibility.checks.length === 0 && (
                    <p style={{ color:"#888", fontSize:14 }}>Complete your profile to run eligibility check.</p>
                  )}
                </div>
              </div>
            )}

            {/* ================================================================
                TAB 2 — EDIT PROFILE (2-Step Wizard)
            ================================================================ */}
            {activeTab === "edit" && (
              <div className="edit-wizard">
                <div className="wizard-steps">
                  <div className="wizard-step">
                    <div className={`wizard-step-dot ${wizardStep===1?"active":wizardStep>1?"done":""}`}>
                      {wizardStep > 1 ? <FaCheckCircle size={14} /> : "1"}
                    </div>
                    <span className={`wizard-step-label ${wizardStep===1?"active":wizardStep>1?"done":""}`}>Personal Info</span>
                  </div>
                  <div className={`wizard-step-line ${wizardStep>1?"done":""}`} />
                  <div className="wizard-step">
                    <div className={`wizard-step-dot ${wizardStep===2?"active":""}`}>2</div>
                    <span className={`wizard-step-label ${wizardStep===2?"active":""}`}>Donor Details</span>
                  </div>
                </div>

                {wizardStep === 1 && (
                  <>
                    <div className="form-section-title"><FaUser color="#c0392b" /> Personal Information</div>
                    <div className="edit-form-grid">
                      {[
                        { label:"Full Name *",   name:"name",   type:"text",  placeholder:"Your full name"  },
                        { label:"Email *",        name:"email",  type:"email", placeholder:"Your email"       },
                        { label:"Phone *",        name:"phone",  type:"tel",   placeholder:"10-digit mobile", maxLength:10 },
                      ].map((f) => (
                        <div key={f.name} className="edit-input-group">
                          <label>{f.label}</label>
                          <div className="edit-input-wrap">
                            <FaUser className="edit-input-icon" />
                            <input type={f.type} name={f.name} placeholder={f.placeholder}
                              value={editForm[f.name]} onChange={handleEditChange}
                              maxLength={f.maxLength} />
                          </div>
                        </div>
                      ))}
                      <div className="edit-input-group">
                        <label>City</label>
                        <div className="edit-input-wrap">
                          <FaMapMarkerAlt className="edit-input-icon" />
                          <select name="city" value={editForm.city} onChange={handleEditChange}>
                            <option value="">Select City</option>
                            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="edit-input-group">
                        <label>Emergency Contact Name</label>
                        <div className="edit-input-wrap">
                          <FaUser className="edit-input-icon" />
                          <input type="text" name="emergencyContact" placeholder="Contact person name"
                            value={editForm.emergencyContact} onChange={handleEditChange} />
                        </div>
                      </div>
                      <div className="edit-input-group">
                        <label>Emergency Phone</label>
                        <div className="edit-input-wrap">
                          <FaPhone className="edit-input-icon" />
                          <input type="tel" name="emergencyPhone" placeholder="Emergency phone"
                            value={editForm.emergencyPhone} onChange={handleEditChange} maxLength={10} />
                        </div>
                      </div>
                    </div>
                    <div className="edit-form-grid full">
                      <div className="edit-input-group">
                        <label>Address</label>
                        <div className="edit-input-wrap">
                          <FaMapMarkerAlt className="edit-input-icon" />
                          <textarea name="address" placeholder="Your full address"
                            value={editForm.address} onChange={handleEditChange} rows={2} />
                        </div>
                      </div>
                    </div>
                    <div className="wizard-nav">
                      <button className="wizard-btn-back" onClick={() => setActiveTab("view")}>
                        <FaArrowLeft /> Cancel
                      </button>
                      <button className="wizard-btn-next" onClick={saveStep1}>
                        Next: Donor Details <FaArrowRight />
                      </button>
                    </div>
                  </>
                )}

                {wizardStep === 2 && (
                  <>
                    <div className="form-section-title"><FaTint color="#c0392b" /> Donor Details</div>
                    <div className="edit-input-group" style={{ marginBottom:16 }}>
                      <label>Blood Group *</label>
                      <div className="blood-group-selector">
                        {BLOOD_GROUPS.map((bg) => (
                          <button key={bg} type="button"
                            className={`blood-group-btn ${editForm.bloodGroup===bg?"selected":""}`}
                            onClick={() => setEditForm({ ...editForm, bloodGroup:bg })}>
                            {bg}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="edit-form-grid">
                      <div className="edit-input-group">
                        <label>Date of Birth *</label>
                        <div className="edit-input-wrap">
                          <FaCalendarAlt className="edit-input-icon" />
                          <input type="date" name="dob" value={editForm.dob} onChange={handleEditChange}
                            max={new Date(Date.now()-18*365.25*24*60*60*1000).toISOString().split("T")[0]} />
                        </div>
                      </div>
                      <div className="edit-input-group">
                        <label>Gender</label>
                        <div className="edit-input-wrap">
                          <FaVenusMars className="edit-input-icon" />
                          <select name="gender" value={editForm.gender} onChange={handleEditChange}>
                            <option value="">Select</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="wizard-nav">
                      <button className="wizard-btn-back" onClick={() => setWizardStep(1)}>
                        <FaArrowLeft /> Back
                      </button>
                      <button className="wizard-btn-next" onClick={saveProfile} disabled={saving}>
                        {saving
                          ? <><FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> Saving...</>
                          : <><FaSave /> Save Profile</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ================================================================
                TAB 3 — MEDICAL HISTORY
            ================================================================ */}
            {activeTab === "medical" && (
              <>
                <div className="medical-section">
                  <div className="medical-section-header">
                    <div className="medical-section-icon" style={{ background:"#fdedec" }}>
                      <FaHeartbeat color="#c0392b" size={16} />
                    </div>
                    <h3 className="profile-section-title">Chronic Conditions</h3>
                  </div>
                  <p style={{ fontSize:13, color:"#888", marginBottom:14 }}>
                    Select any conditions you currently have or have had:
                  </p>
                  <div className="condition-grid">
                    {CHRONIC_CONDITIONS.map((cond) => (
                      <div key={cond}
                        className={`condition-check-item ${medical.conditions.includes(cond)?"selected":""}`}
                        onClick={() => toggleCondition(cond)}>
                        <div className="condition-check-box">
                          {medical.conditions.includes(cond) && <FaCheckCircle size={10} />}
                        </div>
                        <span className="condition-label">{cond}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="medical-section">
                  <div className="medical-section-header">
                    <div className="medical-section-icon" style={{ background:"#eaf5fb" }}>
                      <FaInfoCircle color="#2980b9" size={16} />
                    </div>
                    <h3 className="profile-section-title">Additional Medical Information</h3>
                  </div>
                  <div className="edit-form-grid">
                    {[
                      { label:"Weight (kg)", key:"weight", type:"number", placeholder:"Weight in kg" },
                      { label:"Height (cm)", key:"height", type:"number", placeholder:"Height in cm" },
                    ].map((f) => (
                      <div key={f.key} className="edit-input-group">
                        <label>{f.label}</label>
                        <div className="edit-input-wrap">
                          <FaUser className="edit-input-icon" />
                          <input type={f.type} placeholder={f.placeholder}
                            value={medical[f.key]}
                            onChange={(e) => setMedical({ ...medical, [f.key]:e.target.value })} />
                        </div>
                      </div>
                    ))}
                    <div className="edit-input-group">
                      <label>Last Health Checkup</label>
                      <div className="edit-input-wrap">
                        <FaCalendarAlt className="edit-input-icon" />
                        <input type="date" value={medical.lastCheckup}
                          onChange={(e) => setMedical({ ...medical, lastCheckup:e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="medical-textarea-group">
                    {[
                      { label:"Known Allergies",           key:"allergies",       placeholder:"List any known allergies" },
                      { label:"Current Medications",        key:"medications",     placeholder:"List current medications" },
                      { label:"Recent Surgeries",           key:"recentSurgeries", placeholder:"Any surgeries in last 6 months" },
                      { label:"Additional Notes",           key:"notes",           placeholder:"Anything else to mention" },
                    ].map((f) => (
                      <div key={f.key} className="medical-textarea-item">
                        <label>{f.label}</label>
                        <textarea placeholder={f.placeholder} value={medical[f.key]}
                          onChange={(e) => setMedical({ ...medical, [f.key]:e.target.value })} />
                      </div>
                    ))}
                  </div>
                  <button className="medical-save-btn" onClick={saveMedical} disabled={saving}>
                    {saving
                      ? <><FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> Saving...</>
                      : <><FaSave /> Save Medical Information</>}
                  </button>
                </div>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              </>
            )}

            {/* ================================================================
                TAB 4 — DONATION HISTORY (from backend)
            ================================================================ */}
            {activeTab === "history" && (
              <>
                {donations.length === 0 ? (
                  <div className="donation-history-empty">
                    <FaHistory size={48} color="#ddd" />
                    <h3 style={{ color:"#888", marginTop:12 }}>No Donations Yet</h3>
                    <p style={{ color:"#aaa", fontSize:14 }}>
                      Your donation history will appear here after your first donation.
                    </p>
                  </div>
                ) : (
                  <div className="donation-history-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th><th>Date</th><th>Camp / Location</th>
                          <th>Blood Group</th><th>Units</th><th>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {donations.map((d, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{new Date(d.donationDate).toLocaleDateString("en-IN")}</td>
                            <td>{d.campName || d.bankName || "—"}</td>
                            <td><span className="blood-badge sm">{d.bloodGroup || "—"}</span></td>
                            <td>{d.units || 1}</td>
                            <td><span style={{ color:"#27ae60", fontWeight:700 }}>+{d.pointsAwarded || 100}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {/* ================================================================
                TAB 5 — DONOR ID CARD
            ================================================================ */}
            {activeTab === "idcard" && (
              <div className="id-card-container">
                <div className="donor-id-card" id="donor-id-card-print">
                  <div className="id-card-header">
                    <FaTint size={22} color="#e74c3c" />
                    <div className="id-card-logo-text">
                      <h3>BloodLink Pro</h3>
                      <span>Official Donor ID Card</span>
                    </div>
                  </div>
                  <div className="id-card-body">
                    <div className="id-card-avatar-row">
                      <div className="id-card-avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || "D"}
                      </div>
                      <div>
                        <div className="id-card-name">{user?.name || "Donor"}</div>
                        <span className="id-card-role-tag">Blood Donor</span>
                      </div>
                    </div>
                    <div className="id-card-divider" />
                    {[
                      { label:"Blood Group", value: user?.bloodGroup || "—", cls:"blood" },
                      { label:"City",        value: user?.city    || "—" },
                      { label:"Phone",       value: user?.phone   || "—" },
                      { label:"Email",       value: user?.email   || "—" },
                      { label:"Donations",   value: donations.length || user?.totalDonations || 0 },
                      { label:"Points",      value: user?.points || 0 },
                    ].map((row, i) => (
                      <div key={i} className="id-card-detail-row">
                        <span className="id-card-detail-label">{row.label}</span>
                        <span className={`id-card-detail-value ${row.cls||""}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="id-card-footer">
                    <div>
                      <div className="id-card-cert-no">
                        ID: BL-{(user?._id || "XXXXXXXX").slice(0,8).toUpperCase()}
                      </div>
                      <div className="id-card-cert-no" style={{ marginTop:3 }}>
                        Issued: {new Date().toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="id-card-qr">
                      <FaShieldAlt size={24} />
                      <div style={{ fontSize:9, marginTop:4 }}>QR Verify</div>
                    </div>
                    <span className="id-card-valid">VALID</span>
                  </div>
                </div>

                <div className="id-card-actions">
                  <h3>Download & Share</h3>
                  <button className="id-action-btn primary" onClick={downloadIdCard}>
                    <FaDownload /> Download PDF ID Card
                  </button>
                  <button className="id-action-btn secondary" onClick={() => window.print()}>
                    <FaPrint /> Print ID Card
                  </button>
                  <button className="id-action-btn secondary" onClick={() => {
                    const text = `BloodLink Pro Donor ID\nName: ${user?.name}\nBlood Group: ${user?.bloodGroup}\nCity: ${user?.city}`;
                    navigator.clipboard.writeText(text).then(() => toast.success("ID details copied! ✅"));
                  }}>
                    <FaShare /> Copy Info
                  </button>
                  <div className="id-card-info-note">
                    <FaInfoCircle size={16} style={{ flexShrink:0, marginTop:2 }} />
                    <span>Show this ID at donation camps for quick check-in.</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DonorProfile;