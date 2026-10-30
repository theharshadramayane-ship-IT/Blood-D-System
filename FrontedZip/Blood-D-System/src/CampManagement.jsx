// ============================================================
//  BLOODLINK PRO — CampManagement.jsx  (Module 6)
//  Fully connected to backend via campsAPI
//  SAVE AS: src/CampManagement.jsx
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import "./assets/Module6_CampManagement.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { campsAPI } from "./api";
import {
  FaCampground, FaPlus, FaSearch, FaCalendarAlt, FaMapMarkerAlt,
  FaUsers, FaClock, FaQrcode, FaCheckCircle, FaTimesCircle,
  FaTimes, FaFilePdf, FaEye, FaEdit, FaTrash, FaUserCheck,
  FaChartBar, FaTint, FaLink, FaBan, FaHourglassHalf,
  FaClipboardList, FaSpinner,
} from "react-icons/fa";

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}
function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
function getCapacityColor(reg, cap) {
  const p = (reg / cap) * 100;
  if (p >= 90) return "red";
  if (p >= 70) return "orange";
  return "green";
}
function statusDot(s) {
  const m = { UPCOMING:"🔵", REGISTRATION_OPEN:"🟢", ONGOING:"🟡", COMPLETED:"🟣", CANCELLED:"🔴" };
  return m[s] || "⚪";
}

function getUser() {
  return JSON.parse(localStorage.getItem("blCurrentUser")) ||
         JSON.parse(localStorage.getItem("user")) || {};
}

// ── Main Component ─────────────────────────────────────────
function CampManagement() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [camps, setCamps]       = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPostDonationModal, setShowPostDonationModal] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState(null);
  const [selectedReg, setSelectedReg]   = useState(null);
  const [editCampId, setEditCampId]     = useState(null);

  // Filters
  const [searchTerm, setSearchTerm]   = useState("");
  const [filterCity, setFilterCity]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate]   = useState("");

  // Check-in
  const [checkinSearch, setCheckinSearch] = useState("");
  const [checkinCampId, setCheckinCampId] = useState("");
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinCampData, setCheckinCampData] = useState(null);

  // Report
  const [reportCampId, setReportCampId] = useState("");

  // Cancel
  const [cancelReason, setCancelReason] = useState("");

  // Post-donation
  const [postDonForm, setPostDonForm] = useState({ units:"1", healthNotes:"" });

  // Camp form
  const emptyForm = { title:"", city:"", venue:"", mapsLink:"", date:"", startTime:"", endTime:"", capacity:"", organizerName:"", description:"" };
  const [campForm, setCampForm] = useState(emptyForm);

  useEffect(() => {
    const dm = localStorage.getItem("darkMode") === "true";
    setDarkMode(dm);
    const user = getUser();
    setCurrentUser(user);
    loadCamps();
  }, []);

  // ── Load camps from backend ──────────────────────────────
  const loadCamps = useCallback(async () => {
    setLoading(true);
    try {
      const data = await campsAPI.list({ limit: 200 });
      setCamps(data.camps || []);
    } catch (err) {
      toast.error("Failed to load camps");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Role helpers ─────────────────────────────────────────
  const role = currentUser?.role?.toUpperCase() || "DONOR";
  const isAdmin     = role === "BB_ADMIN" || role === "SUPER_ADMIN";
  const isOrganizer = role === "CAMP_ORGANIZER";
  const isDonor     = role === "DONOR";
  const canManage   = isAdmin || isOrganizer;
  const canCheckin  = isAdmin || isOrganizer;
  const canReport   = isAdmin;

  const visibleTabs = () => {
    const tabs = [{ id:"overview", label:"Overview",           icon:<FaChartBar /> }];
    if (isDonor || isAdmin)   tabs.push({ id:"browse",   label:"Browse Camps",      icon:<FaSearch /> });
    if (isDonor)              tabs.push({ id:"myregs",   label:"My Registrations",  icon:<FaQrcode /> });
    if (canManage)            tabs.push({ id:"manage",   label:"Manage Camps",      icon:<FaEdit /> });
    if (canCheckin)           tabs.push({ id:"checkin",  label:"Check-in",          icon:<FaUserCheck /> });
    if (canReport)            tabs.push({ id:"report",   label:"Camp Report",       icon:<FaFilePdf /> });
    return tabs;
  };

  // ── Stats ────────────────────────────────────────────────
  const stats = {
    total:     camps.length,
    upcoming:  camps.filter(c => ["UPCOMING","REGISTRATION_OPEN"].includes(c.status)).length,
    ongoing:   camps.filter(c => c.status === "ONGOING").length,
    completed: camps.filter(c => c.status === "COMPLETED").length,
    cancelled: camps.filter(c => c.status === "CANCELLED").length,
  };

  // ── Create / Update camp ──────────────────────────────────
  const handleCreateCamp = async () => {
    const { title, city, venue, date, startTime, endTime, capacity } = campForm;
    if (!title || !city || !venue || !date || !startTime || !endTime || !capacity) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title, city, venue, date,
        startTime, endTime,
        capacity: parseInt(capacity),
        description:   campForm.description,
        contactPhone:  campForm.mapsLink,  // reuse field for demo
        organizerName: campForm.organizerName,
      };

      if (editCampId) {
        await campsAPI.update(editCampId, payload);
        toast.success("Camp updated ✅");
      } else {
        await campsAPI.create(payload);
        toast.success("Camp created successfully ✅");
      }

      setCampForm(emptyForm);
      setShowCreateModal(false);
      setEditCampId(null);
      loadCamps();
    } catch (err) {
      toast.error(err.message || "Failed to save camp");
    } finally {
      setSaving(false);
    }
  };

  const handleEditCamp = (camp) => {
    setEditCampId(camp._id);
    setCampForm({
      title:         camp.title || camp.name || "",
      city:          camp.city || "",
      venue:         camp.venue || camp.location || "",
      mapsLink:      camp.contactPhone || "",
      date:          camp.date ? camp.date.slice(0,10) : "",
      startTime:     camp.startTime || "",
      endTime:       camp.endTime || "",
      capacity:      String(camp.capacity || ""),
      organizerName: camp.organizerName || "",
      description:   camp.description || "",
    });
    setShowCreateModal(true);
  };

  const handleDeleteCamp = async (campId) => {
    if (!window.confirm("Delete this camp permanently?")) return;
    try {
      await campsAPI.delete(campId);
      toast.error("Camp deleted ❌");
      loadCamps();
    } catch (err) {
      toast.error(err.message || "Failed to delete camp");
    }
  };

  const handleStatusChange = async (campId, newStatus) => {
    if (newStatus === "CANCELLED") {
      setSelectedCamp(camps.find(c => c._id === campId));
      setShowCancelModal(true);
      return;
    }
    try {
      await campsAPI.update(campId, { status: newStatus });
      toast.success(`Camp status → ${newStatus}`);
      loadCamps();
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleCancelCamp = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }
    try {
      await campsAPI.update(selectedCamp._id, { status:"CANCELLED", description:`Cancelled: ${cancelReason}` });
      toast.error(`Camp cancelled: ${cancelReason}`);
      setShowCancelModal(false);
      setCancelReason("");
      setSelectedCamp(null);
      loadCamps();
    } catch (err) {
      toast.error(err.message || "Failed to cancel camp");
    }
  };

  // ── Donor Registration ─────────────────────────────────────
  const handleRegisterForCamp = async (camp) => {
    if (!currentUser) { toast.error("Please login to register"); return; }
    setSaving(true);
    try {
      const result = await campsAPI.register(camp._id);
      if (result.status === "WAITLISTED") {
        toast.info("Camp is full — added to waitlist 🕐");
      } else {
        toast.success("Registered successfully! ✅");
      }
      loadCamps();
      setActiveTab("myregs");
    } catch (err) {
      toast.error(err.message || "Failed to register");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelRegistration = async (campId, regId) => {
    if (!window.confirm("Cancel your registration?")) return;
    try {
      await campsAPI.updateRegistration(campId, regId, { status:"CANCELLED" });
      toast.info("Registration cancelled");
      loadCamps();
    } catch (err) {
      toast.error(err.message || "Failed to cancel registration");
    }
  };

  // ── Check-in ─────────────────────────────────────────────
  const loadCheckinCamp = async (campId) => {
    try {
      const data = await campsAPI.get(campId);
      setCheckinCampData(data.camp);
    } catch (err) {
      toast.error("Failed to load camp registrations");
    }
  };

  const handleCheckinSearch = () => {
    if (!checkinCampId || !checkinCampData) {
      toast.error("Please select a camp first");
      return;
    }
    const q = checkinSearch.toLowerCase();
    const found = checkinCampData.registrations?.find(r =>
      (r.qrCode?.toLowerCase().includes(q) || r.donorName?.toLowerCase().includes(q)) &&
      r.status !== "CANCELLED"
    );
    if (!found) {
      toast.error("Registration not found");
      setCheckinResult(null);
      return;
    }
    setCheckinResult({ ...found, campId: checkinCampId });
  };

  const handleConfirmCheckin = async () => {
    if (!checkinResult) return;
    try {
      await campsAPI.updateRegistration(checkinResult.campId, checkinResult._id, { status:"CHECKED_IN" });
      setCheckinResult({ ...checkinResult, status:"CHECKED_IN" });
      toast.success(`${checkinResult.donorName} checked in ✅`);
      loadCheckinCamp(checkinResult.campId);
    } catch (err) {
      toast.error(err.message || "Failed to check in");
    }
  };

  const handleSavePostDonation = async () => {
    if (!postDonForm.units) { toast.error("Please enter units donated"); return; }
    try {
      await campsAPI.updateRegistration(selectedReg.campId, selectedReg._id, {
        status: "DONATED",
        unitsDonated: Number(postDonForm.units),
        notes: postDonForm.healthNotes,
      });
      toast.success("Donation recorded ✅");
      setShowPostDonationModal(false);
      setSelectedReg(null);
      if (checkinResult?._id === selectedReg._id) {
        setCheckinResult({ ...checkinResult, status:"DONATED" });
      }
      loadCheckinCamp(selectedReg.campId);
      loadCamps();
    } catch (err) {
      toast.error(err.message || "Failed to record donation");
    }
  };

  // ── PDF Report ────────────────────────────────────────────
  const generateReport = (campId) => {
    const camp = camps.find(c => c._id === campId);
    if (!camp) return;
    const regs = camp.registrations || [];

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("BloodLink Pro — Camp Report", 14, 18);
    doc.setFontSize(12);
    doc.text(`Camp: ${camp.title || camp.name}`, 14, 30);
    doc.text(`City: ${camp.city} | Date: ${formatDate(camp.date)}`, 14, 38);
    doc.text(`Capacity: ${camp.capacity}`, 14, 46);
    doc.text(`Status: ${camp.status}`, 14, 54);

    autoTable(doc, {
      startY: 62,
      head: [["Metric","Count"]],
      body: [
        ["Total Registered",   regs.length],
        ["Checked In",         regs.filter(r=>["CHECKED_IN","DONATED"].includes(r.status)).length],
        ["Donations Recorded", regs.filter(r=>r.status==="DONATED").length],
        ["No Show",            regs.filter(r=>r.status==="NO_SHOW").length],
      ],
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Donor","Blood Group","Status","Units"]],
      body: regs.map(r => [r.donorName, r.bloodGroup||"—", r.status, r.unitsDonated||"—"]),
    });

    doc.save(`CampReport_${(camp.title||camp.name).replace(/\s+/g,"_")}.pdf`);
    toast.success("Report downloaded ✅");
  };

  // ── Filtered data ─────────────────────────────────────────
  const filteredCamps = camps.filter(c => {
    const name = (c.title || c.name || "").toLowerCase();
    const city = (c.city || "").toLowerCase();
    const venue = (c.venue || c.location || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return (
      (!q || name.includes(q) || city.includes(q) || venue.includes(q)) &&
      (!filterCity   || c.city === filterCity) &&
      (!filterStatus || c.status === filterStatus) &&
      (!filterDate   || (c.date && c.date.slice(0,10) === filterDate))
    );
  });

  const uniqueCities = [...new Set(camps.map(c => c.city).filter(Boolean))];

  // My registrations (donor): filter from all camps
  const userId = currentUser?._id || currentUser?.id;
  const myRegistrations = camps.flatMap(c =>
    (c.registrations || [])
      .filter(r => r.donorId === userId || r.donorId?.toString() === userId?.toString())
      .map(r => ({ ...r, camp: c }))
  );

  const campForCheckin = camps.find(c => c._id === checkinCampId);
  const campRegsForCheckin = checkinCampData?.registrations || [];
  const activeCampsForCheckin = camps.filter(c => ["ONGOING","REGISTRATION_OPEN"].includes(c.status));

  const reportCamp = camps.find(c => c._id === reportCampId);
  const reportRegs = reportCamp?.registrations || [];

  if (loading) {
    return (
      <div className={darkMode ? "dashboard-container dark" : "dashboard-container"}>
        <Sidebar darkMode={darkMode} toggleDarkMode={() => { const n=!darkMode; setDarkMode(n); localStorage.setItem("darkMode",String(n)); }} />
        <div className="main-content" style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"70vh", flexDirection:"column", gap:12 }}>
          <FaSpinner size={36} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
          <p style={{ color:"#888" }}>Loading camps...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "dashboard-container dark" : "dashboard-container"}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => { const n=!darkMode; setDarkMode(n); localStorage.setItem("darkMode",String(n)); }} />

      <div className="main-content camp-page-wrap">
        {/* HERO BANNER */}
        <div className="camp-hero-banner">
          <div className="camp-hero-left">
            <h1 className="camp-hero-title"><FaCampground /> Donation Camp Management</h1>
            <p className="camp-hero-subtitle">Module 6 — Manage camps, registrations, check-ins & reports</p>
          </div>
          <div className="camp-hero-right">
            <div className="camp-hero-stat"><span className="camp-hero-stat-num">{stats.total}</span><span className="camp-hero-stat-label">Total</span></div>
            <div className="camp-hero-stat"><span className="camp-hero-stat-num">{stats.upcoming}</span><span className="camp-hero-stat-label">Upcoming</span></div>
            <div className="camp-hero-stat"><span className="camp-hero-stat-num">{stats.completed}</span><span className="camp-hero-stat-label">Completed</span></div>
          </div>
        </div>

        {/* TABS */}
        <div className="camp-tabs">
          {visibleTabs().map(tab => (
            <button key={tab.id} className={`camp-tab-btn ${activeTab===tab.id?"active":""}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div className="camp-kpi-grid">
              {[
                { icon:<FaCampground />, cls:"blue",   num:stats.total,     label:"Total Camps" },
                { icon:<FaCalendarAlt />,cls:"green",  num:stats.upcoming,  label:"Upcoming" },
                { icon:<FaClock />,      cls:"orange", num:stats.ongoing,   label:"Ongoing" },
                { icon:<FaCheckCircle />,cls:"purple", num:stats.completed, label:"Completed" },
              ].map((k,i)=>(
                <div key={i} className="camp-kpi-card">
                  <div className={`camp-kpi-icon ${k.cls}`}>{k.icon}</div>
                  <div><span className="camp-kpi-num">{k.num}</span><span className="camp-kpi-label">{k.label}</span></div>
                </div>
              ))}
            </div>

            <div className="camp-card">
              <div className="camp-card-header">
                <h3 className="camp-card-title"><FaCalendarAlt /> Upcoming Camps</h3>
                <div style={{ display:"flex", gap:10 }}>
                  {canManage && <button className="btn-primary" onClick={() => { setEditCampId(null); setCampForm(emptyForm); setShowCreateModal(true); }}><FaPlus /> New Camp</button>}
                  <button className="btn-secondary" onClick={() => setActiveTab("browse")}>View All</button>
                </div>
              </div>
              {camps.filter(c=>["UPCOMING","REGISTRATION_OPEN"].includes(c.status)).length === 0 ? (
                <div className="camp-empty"><div className="camp-empty-icon">🏕️</div><p className="camp-empty-title">No upcoming camps</p></div>
              ) : (
                <div className="camps-grid">
                  {camps.filter(c=>["UPCOMING","REGISTRATION_OPEN"].includes(c.status)).sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,6).map(camp=>(
                    <MiniCampCard key={camp._id} camp={camp} formatDate={formatDate} formatTime={formatTime} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── BROWSE ───────────────────────────────────────── */}
        {activeTab === "browse" && (
          <div className="camp-card">
            <div className="camp-card-header"><h3 className="camp-card-title"><FaSearch /> Browse Donation Camps</h3></div>
            <div className="camp-filter-bar">
              <div className="camp-search-wrap">
                <FaSearch className="camp-search-icon" />
                <input type="text" className="camp-search-input" placeholder="Search by name, city, location..."
                  value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
              </div>
              <select className="camp-filter-select" value={filterCity} onChange={e=>setFilterCity(e.target.value)}>
                <option value="">All Cities</option>
                {uniqueCities.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <select className="camp-filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                {["UPCOMING","REGISTRATION_OPEN","ONGOING","COMPLETED"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
              </select>
              <input type="date" className="camp-filter-select" value={filterDate} onChange={e=>setFilterDate(e.target.value)} />
            </div>

            {filteredCamps.length === 0 ? (
              <div className="camp-empty"><div className="camp-empty-icon">🔍</div><p className="camp-empty-title">No camps found</p></div>
            ) : (
              <div className="camps-grid">
                {filteredCamps.map(camp => {
                  const regCount = (camp.registrations||[]).filter(r=>!["CANCELLED","NO_SHOW"].includes(r.status)).length;
                  const isFull   = regCount >= camp.capacity;
                  const alreadyRegistered = userId && (camp.registrations||[]).some(r=>r.donorId===userId||r.donorId?.toString()===userId?.toString());
                  const barColor = getCapacityColor(regCount, camp.capacity);
                  const pct = Math.round((regCount / camp.capacity) * 100);
                  const canRegister = isDonor && camp.status === "REGISTRATION_OPEN";

                  return (
                    <div key={camp._id} className="camp-item-card">
                      <div className="camp-item-header">
                        <div>
                          <p className="camp-item-name">{camp.title || camp.name}</p>
                          <p className="camp-item-city"><FaMapMarkerAlt /> {camp.city}</p>
                        </div>
                        <span className={`camp-status-badge ${camp.status}`}>{camp.status?.replace("_"," ")}</span>
                      </div>
                      <div className="camp-item-body">
                        <div className="camp-item-row"><FaCalendarAlt /> {formatDate(camp.date)}</div>
                        <div className="camp-item-row"><FaClock /> {formatTime(camp.startTime)} – {formatTime(camp.endTime)}</div>
                        <div className="camp-item-row"><FaMapMarkerAlt /> {camp.venue || camp.location}</div>
                        {camp.organizerName && <div className="camp-item-row"><FaUsers /> {camp.organizerName}</div>}
                      </div>
                      <div className="camp-item-footer">
                        <div className="capacity-bar-wrap">
                          <div className="capacity-bar-label">
                            <span>{isFull?"Full":"Available"}</span>
                            <span>{regCount}/{camp.capacity}</span>
                          </div>
                          <div className="capacity-bar-track">
                            <div className={`capacity-bar-fill ${barColor}`} style={{ width:`${Math.min(pct,100)}%` }} />
                          </div>
                        </div>
                        {isDonor && (
                          alreadyRegistered ? (
                            <span className="camp-status-badge REGISTRATION_OPEN">Registered ✓</span>
                          ) : canRegister ? (
                            <button className={isFull?"btn-secondary":"btn-primary"} style={{ fontSize:12, padding:"7px 14px" }}
                              onClick={() => handleRegisterForCamp(camp)} disabled={saving}>
                              {saving ? <FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> : isFull ? <><FaHourglassHalf /> Waitlist</> : <><FaCheckCircle /> Register</>}
                            </button>
                          ) : camp.status === "UPCOMING" ? (
                            <span style={{ fontSize:12, color:"#7f8c8d" }}>Opens soon</span>
                          ) : null
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MY REGISTRATIONS ──────────────────────────────── */}
        {activeTab === "myregs" && (
          myRegistrations.length === 0 ? (
            <div className="camp-card">
              <div className="camp-empty"><div className="camp-empty-icon">🎫</div><p className="camp-empty-title">No registrations yet</p></div>
            </div>
          ) : (
            <div>
              {myRegistrations.map(reg => (
                <div key={reg._id} className="my-reg-card">
                  <div>
                    <p className="my-reg-camp-name">{reg.camp?.title || reg.camp?.name || "Camp"}</p>
                    <div className="my-reg-info">
                      <span className="my-reg-info-item"><FaMapMarkerAlt /> {reg.camp?.city}</span>
                      <span className="my-reg-info-item"><FaCalendarAlt /> {formatDate(reg.camp?.date)}</span>
                      <span className="my-reg-info-item"><FaClock /> {formatTime(reg.camp?.startTime)}</span>
                    </div>
                    {(reg.status==="REGISTERED"||reg.status==="CHECKED_IN") && reg.qrCode && (
                      <div style={{ marginTop:12 }}>
                        <div style={{ fontFamily:"monospace", fontSize:12, background:"#f8f9fa", padding:"8px 12px", borderRadius:8, display:"inline-block" }}>
                          QR: {reg.qrCode}
                        </div>
                        <p style={{ fontSize:11, color:"#7f8c8d", marginTop:6 }}>Show this QR at the camp for check-in</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"flex-end" }}>
                    <span className={`reg-status-badge ${reg.status}`}>{reg.status?.replace("_"," ")}</span>
                    {reg.unitsDonated > 0 && (
                      <span style={{ fontSize:13, color:"#27ae60", fontWeight:700 }}>🩸 {reg.unitsDonated} unit(s) donated</span>
                    )}
                    {["REGISTERED","WAITLISTED"].includes(reg.status) && (
                      <button className="btn-danger" onClick={() => handleCancelRegistration(reg.camp._id, reg._id)}>
                        <FaTimes /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── MANAGE CAMPS ──────────────────────────────────── */}
        {activeTab === "manage" && canManage && (
          <div className="camp-card">
            <div className="camp-card-header">
              <h3 className="camp-card-title"><FaEdit /> Manage All Camps</h3>
              <button className="btn-primary" onClick={() => { setEditCampId(null); setCampForm(emptyForm); setShowCreateModal(true); }}>
                <FaPlus /> New Camp
              </button>
            </div>
            <div className="camp-filter-bar">
              <div className="camp-search-wrap">
                <FaSearch className="camp-search-icon" />
                <input className="camp-search-input" placeholder="Search camps..."
                  value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
              </div>
              <select className="camp-filter-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                {["UPCOMING","REGISTRATION_OPEN","ONGOING","COMPLETED","CANCELLED"].map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}
              </select>
            </div>

            {filteredCamps.length === 0 ? (
              <div className="camp-empty"><div className="camp-empty-icon">📋</div><p className="camp-empty-title">No camps found</p></div>
            ) : (
              <div className="camp-table-wrap">
                <table className="camp-table">
                  <thead>
                    <tr><th>Camp Name</th><th>City</th><th>Date</th><th>Capacity</th><th>Registered</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredCamps.map(camp => {
                      const regCount = (camp.registrations||[]).filter(r=>!["CANCELLED","NO_SHOW"].includes(r.status)).length;
                      return (
                        <tr key={camp._id}>
                          <td style={{ fontWeight:600 }}>{camp.title||camp.name}</td>
                          <td>{camp.city}</td>
                          <td>{formatDate(camp.date)}</td>
                          <td>{camp.capacity}</td>
                          <td>{regCount}</td>
                          <td><span className={`camp-status-badge ${camp.status}`}>{camp.status?.replace("_"," ")}</span></td>
                          <td>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <button className="btn-icon" onClick={() => handleEditCamp(camp)}><FaEdit /> Edit</button>
                              {camp.status==="UPCOMING"           && <button className="btn-icon" style={{ color:"#27ae60",borderColor:"#27ae60" }} onClick={() => handleStatusChange(camp._id,"REGISTRATION_OPEN")}>Open Reg</button>}
                              {camp.status==="REGISTRATION_OPEN"  && <button className="btn-icon" style={{ color:"#e67e22",borderColor:"#e67e22" }} onClick={() => handleStatusChange(camp._id,"ONGOING")}>Start</button>}
                              {camp.status==="ONGOING"            && <button className="btn-icon" style={{ color:"#8e44ad",borderColor:"#8e44ad" }} onClick={() => handleStatusChange(camp._id,"COMPLETED")}>Complete</button>}
                              {!["CANCELLED","COMPLETED"].includes(camp.status) && <button className="btn-danger" onClick={() => handleStatusChange(camp._id,"CANCELLED")}><FaBan /></button>}
                              <button className="btn-danger" onClick={() => handleDeleteCamp(camp._id)}><FaTrash /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CHECK-IN ──────────────────────────────────────── */}
        {activeTab === "checkin" && canCheckin && (
          <div>
            <div className="camp-card">
              <div className="camp-card-header"><h3 className="camp-card-title"><FaUserCheck /> QR Check-in</h3></div>

              <div style={{ marginBottom:20 }}>
                <label className="camp-form-label">Select Camp *</label>
                <select className="camp-form-select" style={{ display:"block", marginTop:6, width:"100%" }}
                  value={checkinCampId}
                  onChange={async e => {
                    setCheckinCampId(e.target.value);
                    setCheckinResult(null);
                    if (e.target.value) await loadCheckinCamp(e.target.value);
                  }}>
                  <option value="">— Select a camp —</option>
                  {activeCampsForCheckin.map(c=>(
                    <option key={c._id} value={c._id}>{c.title||c.name} — {c.city} ({formatDate(c.date)})</option>
                  ))}
                </select>
              </div>

              {checkinCampId && (
                <>
                  <div className="checkin-search-box">
                    <input placeholder="Enter QR Code or Donor Name..."
                      value={checkinSearch} onChange={e=>setCheckinSearch(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&handleCheckinSearch()} />
                    <button className="btn-primary" onClick={handleCheckinSearch}><FaSearch /> Find Donor</button>
                  </div>

                  {checkinResult && (
                    <div className={`checkin-result-card ${checkinResult.status==="CANCELLED"?"ineligible":"eligible"}`}>
                      <div className="checkin-donor-info">
                        <h4>{checkinResult.donorName}</h4>
                        <p>Blood Group: {checkinResult.bloodGroup||"—"}</p>
                        <p style={{ marginTop:4 }}>Status: <span className={`reg-status-badge ${checkinResult.status}`}>{checkinResult.status?.replace("_"," ")}</span></p>
                        <p style={{ fontSize:12, color:"#7f8c8d", marginTop:4 }}>QR: {checkinResult.qrCode}</p>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:10, alignItems:"flex-end" }}>
                        {checkinResult.status==="REGISTERED" && (
                          <button className="btn-success" onClick={handleConfirmCheckin}><FaUserCheck /> Confirm Check-in</button>
                        )}
                        {checkinResult.status==="CHECKED_IN" && (
                          <button className="btn-primary" onClick={() => { setSelectedReg({ ...checkinResult }); setPostDonForm({ units:"1", healthNotes:"" }); setShowPostDonationModal(true); }}>
                            <FaTint /> Record Donation
                          </button>
                        )}
                        {checkinResult.status==="DONATED" && (
                          <span style={{ color:"#27ae60", fontWeight:700, fontSize:13 }}>✅ Donation Recorded</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Registrations table */}
                  <div style={{ marginTop:24 }}>
                    <h4 className="camp-card-title" style={{ marginBottom:12 }}>
                      <FaClipboardList /> Registrations ({campRegsForCheckin.length})
                    </h4>
                    {campRegsForCheckin.length === 0 ? (
                      <p style={{ color:"#7f8c8d", fontSize:14 }}>No registrations for this camp yet.</p>
                    ) : (
                      <div className="camp-table-wrap">
                        <table className="camp-table">
                          <thead><tr><th>Donor</th><th>Blood Group</th><th>QR Code</th><th>Status</th><th>Units</th><th>Action</th></tr></thead>
                          <tbody>
                            {campRegsForCheckin.map(r=>(
                              <tr key={r._id}>
                                <td style={{ fontWeight:600 }}>{r.donorName}</td>
                                <td><span className="camp-status-badge ONGOING" style={{ background:"#fdedec", color:"#c0392b" }}>{r.bloodGroup||"—"}</span></td>
                                <td style={{ fontFamily:"monospace", fontSize:11 }}>{(r.qrCode||"").slice(0,24)}…</td>
                                <td><span className={`reg-status-badge ${r.status}`}>{r.status?.replace("_"," ")}</span></td>
                                <td>{r.unitsDonated||"—"}</td>
                                <td>
                                  {r.status==="CHECKED_IN" && (
                                    <button className="btn-primary" style={{ fontSize:12, padding:"6px 12px" }}
                                      onClick={() => { setSelectedReg({ ...r, campId:checkinCampId }); setPostDonForm({ units:"1", healthNotes:"" }); setShowPostDonationModal(true); }}>
                                      Record
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── REPORT ────────────────────────────────────────── */}
        {activeTab === "report" && canReport && (
          <div className="camp-card">
            <div className="camp-card-header">
              <h3 className="camp-card-title"><FaFilePdf /> Camp Summary Report</h3>
              {reportCamp && <button className="btn-primary" onClick={() => generateReport(reportCampId)}><FaFilePdf /> Export PDF</button>}
            </div>

            <div className="camp-form-group" style={{ marginBottom:20 }}>
              <label className="camp-form-label">Select Camp</label>
              <select className="camp-form-select" style={{ display:"block", marginTop:6 }}
                value={reportCampId} onChange={e=>setReportCampId(e.target.value)}>
                <option value="">— Select completed / ongoing camp —</option>
                {camps.filter(c=>["COMPLETED","ONGOING"].includes(c.status)).map(c=>(
                  <option key={c._id} value={c._id}>{c.title||c.name} — {c.city} ({formatDate(c.date)})</option>
                ))}
              </select>
            </div>

            {!reportCamp ? (
              <div className="camp-empty"><div className="camp-empty-icon">📊</div><p className="camp-empty-title">Select a camp to view its report</p></div>
            ) : (
              <>
                <div style={{ marginBottom:20 }}>
                  <h4 style={{ margin:"0 0 4px", fontSize:16, fontWeight:700 }}>{reportCamp.title||reportCamp.name}</h4>
                  <p style={{ color:"#7f8c8d", fontSize:13, margin:0 }}>
                    {reportCamp.city} | {formatDate(reportCamp.date)} | {formatTime(reportCamp.startTime)} – {formatTime(reportCamp.endTime)}
                  </p>
                </div>

                <div className="report-summary-grid">
                  {[
                    { num:reportRegs.length,                                                                 label:"Registered" },
                    { num:reportRegs.filter(r=>["CHECKED_IN","DONATED"].includes(r.status)).length,          label:"Checked In",         color:"#27ae60" },
                    { num:reportRegs.filter(r=>r.status==="DONATED").length,                                 label:"Donations",           color:"#8e44ad" },
                    { num:reportRegs.filter(r=>r.status==="NO_SHOW").length,                                 label:"No Show",             color:"#e74c3c" },
                    { num:reportRegs.reduce((s,r)=>s+(Number(r.unitsDonated)||0),0),                         label:"Units Collected",     color:"#c0392b" },
                  ].map((s,i)=>(
                    <div key={i} className="report-stat-box">
                      <span className="report-stat-num" style={s.color?{color:s.color}:{}}>{s.num}</span>
                      <div className="report-stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="camp-table-wrap">
                  <table className="camp-table">
                    <thead><tr><th>#</th><th>Donor Name</th><th>Blood Group</th><th>Status</th><th>Units</th></tr></thead>
                    <tbody>
                      {reportRegs.length===0 ? (
                        <tr><td colSpan={5} style={{ textAlign:"center", color:"#7f8c8d", padding:20 }}>No registrations for this camp</td></tr>
                      ) : (
                        reportRegs.map((r,i)=>(
                          <tr key={r._id}>
                            <td>{i+1}</td>
                            <td style={{ fontWeight:600 }}>{r.donorName}</td>
                            <td><span className="camp-status-badge ONGOING" style={{ background:"#fdedec", color:"#c0392b" }}>{r.bloodGroup||"—"}</span></td>
                            <td><span className={`reg-status-badge ${r.status}`}>{r.status?.replace("_"," ")}</span></td>
                            <td>{r.unitsDonated||"—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: CREATE / EDIT CAMP ─────────────────────── */}
      {showCreateModal && (
        <div className="camp-modal-overlay" onClick={() => { setShowCreateModal(false); setEditCampId(null); }}>
          <div className="camp-modal" onClick={e=>e.stopPropagation()}>
            <div className="camp-modal-header">
              <h3 className="camp-modal-title">{editCampId ? "✏️ Edit Camp" : "➕ Create New Camp"}</h3>
              <button className="camp-modal-close" onClick={() => { setShowCreateModal(false); setEditCampId(null); }}><FaTimes /></button>
            </div>
            <div className="camp-form-grid">
              <div className="camp-form-group full-width">
                <label className="camp-form-label">Camp Name *</label>
                <input className="camp-form-input" placeholder="e.g. City Blood Drive #12"
                  value={campForm.title} onChange={e=>setCampForm({...campForm,title:e.target.value})} />
              </div>
              <div className="camp-form-group">
                <label className="camp-form-label">City *</label>
                <input className="camp-form-input" placeholder="e.g. Mumbai"
                  value={campForm.city} onChange={e=>setCampForm({...campForm,city:e.target.value})} />
              </div>
              <div className="camp-form-group">
                <label className="camp-form-label">Capacity *</label>
                <input type="number" className="camp-form-input" placeholder="e.g. 100" min="1"
                  value={campForm.capacity} onChange={e=>setCampForm({...campForm,capacity:e.target.value})} />
              </div>
              <div className="camp-form-group full-width">
                <label className="camp-form-label">Venue / Location *</label>
                <input className="camp-form-input" placeholder="e.g. Shivaji Park, Dadar"
                  value={campForm.venue} onChange={e=>setCampForm({...campForm,venue:e.target.value})} />
              </div>
              <div className="camp-form-group">
                <label className="camp-form-label">Date *</label>
                <input type="date" className="camp-form-input"
                  value={campForm.date} onChange={e=>setCampForm({...campForm,date:e.target.value})} />
              </div>
              <div className="camp-form-group">
                <label className="camp-form-label">Organizer Name</label>
                <input className="camp-form-input" placeholder="Organizer full name"
                  value={campForm.organizerName} onChange={e=>setCampForm({...campForm,organizerName:e.target.value})} />
              </div>
              <div className="camp-form-group">
                <label className="camp-form-label">Start Time *</label>
                <input type="time" className="camp-form-input"
                  value={campForm.startTime} onChange={e=>setCampForm({...campForm,startTime:e.target.value})} />
              </div>
              <div className="camp-form-group">
                <label className="camp-form-label">End Time *</label>
                <input type="time" className="camp-form-input"
                  value={campForm.endTime} onChange={e=>setCampForm({...campForm,endTime:e.target.value})} />
              </div>
            </div>
            <div className="camp-form-actions" style={{ marginTop:20 }}>
              <button className="btn-secondary" onClick={() => { setShowCreateModal(false); setEditCampId(null); }}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateCamp} disabled={saving}>
                {saving ? <FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> : editCampId ? "Update Camp" : "Create Camp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CANCEL CAMP ──────────────────────────── */}
      {showCancelModal && selectedCamp && (
        <div className="camp-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="camp-modal" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
            <div className="camp-modal-header">
              <h3 className="camp-modal-title">🚫 Cancel Camp</h3>
              <button className="camp-modal-close" onClick={() => setShowCancelModal(false)}><FaTimes /></button>
            </div>
            <p style={{ color:"#7f8c8d", fontSize:14, marginBottom:14 }}>
              You are cancelling: <strong>{selectedCamp.title||selectedCamp.name}</strong>
            </p>
            <div className="camp-form-group">
              <label className="camp-form-label">Cancellation Reason *</label>
              <textarea className="camp-form-textarea" placeholder="Reason for cancellation..."
                value={cancelReason} onChange={e=>setCancelReason(e.target.value)} />
            </div>
            <div className="camp-form-actions">
              <button className="btn-secondary" onClick={() => setShowCancelModal(false)}>Go Back</button>
              <button className="btn-danger" onClick={handleCancelCamp}><FaBan /> Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: POST-DONATION ─────────────────────────── */}
      {showPostDonationModal && selectedReg && (
        <div className="camp-modal-overlay" onClick={() => setShowPostDonationModal(false)}>
          <div className="camp-modal" style={{ maxWidth:420 }} onClick={e=>e.stopPropagation()}>
            <div className="camp-modal-header">
              <h3 className="camp-modal-title">🩸 Record Donation</h3>
              <button className="camp-modal-close" onClick={() => setShowPostDonationModal(false)}><FaTimes /></button>
            </div>
            <p style={{ color:"#7f8c8d", fontSize:14, marginBottom:14 }}>
              Donor: <strong>{selectedReg.donorName}</strong> ({selectedReg.bloodGroup||"—"})
            </p>
            <div className="camp-form-group">
              <label className="camp-form-label">Units Donated *</label>
              <input type="number" className="camp-form-input" min="1" max="3"
                value={postDonForm.units} onChange={e=>setPostDonForm({...postDonForm,units:e.target.value})} />
            </div>
            <div className="camp-form-group">
              <label className="camp-form-label">Health Notes (optional)</label>
              <textarea className="camp-form-textarea" placeholder="Any health observations..."
                value={postDonForm.healthNotes} onChange={e=>setPostDonForm({...postDonForm,healthNotes:e.target.value})} />
            </div>
            <div className="camp-form-actions">
              <button className="btn-secondary" onClick={() => setShowPostDonationModal(false)}>Cancel</button>
              <button className="btn-success" onClick={handleSavePostDonation}><FaCheckCircle /> Save Donation</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function MiniCampCard({ camp, formatDate, formatTime }) {
  const regCount = (camp.registrations||[]).filter(r=>!["CANCELLED","NO_SHOW"].includes(r.status)).length;
  const pct = Math.round((regCount / camp.capacity) * 100);
  const barColor = regCount/camp.capacity >= 0.9 ? "red" : regCount/camp.capacity >= 0.7 ? "orange" : "green";
  return (
    <div className="camp-item-card">
      <div className="camp-item-header">
        <div>
          <p className="camp-item-name">{camp.title||camp.name}</p>
          <p className="camp-item-city"><FaMapMarkerAlt /> {camp.city}</p>
        </div>
        <span className={`camp-status-badge ${camp.status}`}>{camp.status?.replace("_"," ")}</span>
      </div>
      <div className="camp-item-body">
        <div className="camp-item-row"><FaCalendarAlt /> {formatDate(camp.date)}</div>
        <div className="camp-item-row"><FaClock /> {formatTime(camp.startTime)} – {formatTime(camp.endTime)}</div>
        <div className="camp-item-row"><FaMapMarkerAlt /> {camp.venue||camp.location}</div>
      </div>
      <div className="camp-item-footer">
        <div className="capacity-bar-wrap">
          <div className="capacity-bar-label"><span>Slots</span><span>{regCount}/{camp.capacity}</span></div>
          <div className="capacity-bar-track"><div className={`capacity-bar-fill ${barColor}`} style={{ width:`${Math.min(pct,100)}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

export default CampManagement;