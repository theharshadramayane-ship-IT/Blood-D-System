// ============================================================
//  BLOODLINK PRO — EditProfile.jsx
//  Quick profile editor — connected to backend via authAPI
//  SAVE AS: src/EditProfile.jsx
// ============================================================

import React, { useState, useEffect } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";
import { authAPI } from "./api";
import { useNavigate } from "react-router-dom";
import {
  FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaTint, FaLock, FaSave, FaSpinner,
} from "react-icons/fa";

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const CITIES = [
  "Mumbai","Delhi","Bangalore","Hyderabad","Chennai",
  "Kolkata","Pune","Ahmedabad","Jaipur","Surat","Nashik","Nagpur",
];

function EditProfile() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [user, setUser]         = useState(null);

  const [form, setForm] = useState({
    name:"", phone:"", city:"", bloodGroup:"", address:"",
    gender:"", emergencyContact:"", emergencyPhone:"",
  });

  const [pwForm, setPwForm] = useState({
    currentPassword:"", newPassword:"", confirmPassword:"",
  });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme === "true") setDarkMode(true);

    const currentUser =
      JSON.parse(localStorage.getItem("blCurrentUser")) ||
      JSON.parse(localStorage.getItem("user"));

    if (currentUser) {
      setUser(currentUser);
      setForm({
        name:             currentUser.name             || "",
        phone:            currentUser.phone            || "",
        city:             currentUser.city             || "",
        bloodGroup:       currentUser.bloodGroup       || "",
        address:          currentUser.address          || "",
        gender:           currentUser.gender           || "",
        emergencyContact: currentUser.emergencyContact || "",
        emergencyPhone:   currentUser.emergencyPhone   || "",
      });
    }
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ── Save profile ────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }

    setLoading(true);
    try {
      const data    = await authAPI.updateProfile(form);
      const updated = data.user;

      localStorage.setItem("blCurrentUser", JSON.stringify(updated));
      localStorage.setItem("user",           JSON.stringify(updated));
      setUser(updated);

      toast.success("Profile updated successfully! ✅");
    } catch (err) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // ── Change password ─────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword) { toast.error("Enter current password"); return; }
    if (pwForm.newPassword.length < 6) { toast.error("New password min 6 chars"); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error("Passwords do not match"); return; }

    setPwLoading(true);
    try {
      await authAPI.changePassword(pwForm.currentPassword, pwForm.newPassword);
      toast.success("Password changed successfully! ✅");
      setPwForm({ currentPassword:"", newPassword:"", confirmPassword:"" });
    } catch (err) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className={darkMode ? "dashboard-container dark" : "dashboard-container"}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => {
        const n = !darkMode;
        setDarkMode(n);
        localStorage.setItem("darkMode", String(n));
      }} />

      <div className="main-content">
        <div className="admin-header">
          <div>
            <h1 style={{ margin:0 }}>✏️ Edit Profile</h1>
            <p style={{ color:"#888", fontSize:14, margin:"4px 0 0" }}>
              Logged in as: <strong>{user?.name}</strong> ({user?.role})
            </p>
          </div>
          <button className="pdf-btn" onClick={() => navigate("/profile")}>
            ← Back to Profile
          </button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>

          {/* ── UPDATE PROFILE FORM ─────────────────────── */}
          <div className="form-container" style={{ margin:0 }}>
            <h2 style={{ marginBottom:20 }}>
              <FaUser color="#c0392b" /> Update Information
            </h2>

            <form onSubmit={handleUpdate}>
              {[
                { label:"Full Name *",    name:"name",  type:"text",  icon:<FaUser />,        placeholder:"Your full name" },
                { label:"Phone",          name:"phone", type:"tel",   icon:<FaPhone />,       placeholder:"10-digit mobile", maxLength:10 },
              ].map((f) => (
                <div key={f.name} style={{ marginBottom:14 }}>
                  <label style={{ display:"block", marginBottom:6, fontWeight:600, fontSize:13 }}>{f.label}</label>
                  <div style={{ position:"relative" }}>
                    <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }}>{f.icon}</span>
                    <input type={f.type} name={f.name} placeholder={f.placeholder}
                      value={form[f.name]} onChange={handleChange} maxLength={f.maxLength}
                      style={{ paddingLeft:32, width:"100%", boxSizing:"border-box" }}
                    />
                  </div>
                </div>
              ))}

              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", marginBottom:6, fontWeight:600, fontSize:13 }}>City</label>
                <div style={{ position:"relative" }}>
                  <FaMapMarkerAlt style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }} />
                  <select name="city" value={form.city} onChange={handleChange}
                    style={{ paddingLeft:32, width:"100%", height:40, borderRadius:8, border:"1px solid #ddd", boxSizing:"border-box" }}>
                    <option value="">Select City</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {user?.role === "DONOR" && (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", marginBottom:6, fontWeight:600, fontSize:13 }}>Blood Group</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {BLOOD_GROUPS.map((bg) => (
                      <button key={bg} type="button"
                        onClick={() => setForm({ ...form, bloodGroup:bg })}
                        style={{
                          padding:"6px 14px", borderRadius:8, border:"2px solid",
                          borderColor: form.bloodGroup===bg ? "#c0392b" : "#ddd",
                          background:  form.bloodGroup===bg ? "#c0392b" : "white",
                          color:       form.bloodGroup===bg ? "white"   : "#333",
                          cursor:"pointer", fontWeight:700,
                        }}>
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", marginBottom:6, fontWeight:600, fontSize:13 }}>Gender</label>
                <select name="gender" value={form.gender} onChange={handleChange}
                  style={{ width:"100%", height:40, borderRadius:8, border:"1px solid #ddd", padding:"0 12px", boxSizing:"border-box" }}>
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", marginBottom:6, fontWeight:600, fontSize:13 }}>Emergency Contact Name</label>
                <input type="text" name="emergencyContact" placeholder="Contact person"
                  value={form.emergencyContact} onChange={handleChange}
                  style={{ width:"100%", boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ display:"block", marginBottom:6, fontWeight:600, fontSize:13 }}>Emergency Phone</label>
                <input type="tel" name="emergencyPhone" placeholder="Emergency number"
                  value={form.emergencyPhone} onChange={handleChange} maxLength={10}
                  style={{ width:"100%", boxSizing:"border-box" }} />
              </div>

              <button type="submit" disabled={loading}
                style={{
                  width:"100%", padding:"12px", background:"#c0392b", color:"white",
                  border:"none", borderRadius:10, fontSize:15, fontWeight:700,
                  cursor:"pointer", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8,
                }}>
                {loading
                  ? <><FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> Saving...</>
                  : <><FaSave /> Save Changes</>}
              </button>
            </form>
          </div>

          {/* ── CHANGE PASSWORD FORM ────────────────────── */}
          <div className="form-container" style={{ margin:0 }}>
            <h2 style={{ marginBottom:20 }}>
              <FaLock color="#c0392b" /> Change Password
            </h2>

            <form onSubmit={handleChangePassword}>
              {[
                { label:"Current Password", key:"currentPassword", placeholder:"Enter current password" },
                { label:"New Password",     key:"newPassword",     placeholder:"Minimum 6 characters" },
                { label:"Confirm Password", key:"confirmPassword", placeholder:"Re-enter new password" },
              ].map((f) => (
                <div key={f.key} style={{ marginBottom:14 }}>
                  <label style={{ display:"block", marginBottom:6, fontWeight:600, fontSize:13 }}>{f.label}</label>
                  <div style={{ position:"relative" }}>
                    <FaLock style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }} />
                    <input type="password" placeholder={f.placeholder}
                      value={pwForm[f.key]}
                      onChange={(e) => setPwForm({ ...pwForm, [f.key]:e.target.value })}
                      style={{ paddingLeft:32, width:"100%", boxSizing:"border-box" }} />
                  </div>
                </div>
              ))}

              <div style={{
                background:"#f8f9fa", borderRadius:8, padding:12, marginBottom:20,
                fontSize:13, color:"#666",
              }}>
                ⚠️ After changing password, you will need to log in again.
              </div>

              <button type="submit" disabled={pwLoading}
                style={{
                  width:"100%", padding:"12px", background:"#2980b9", color:"white",
                  border:"none", borderRadius:10, fontSize:15, fontWeight:700,
                  cursor:"pointer", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8,
                }}>
                {pwLoading
                  ? <><FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> Changing...</>
                  : <><FaLock /> Change Password</>}
              </button>
            </form>
          </div>

        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

export default EditProfile;