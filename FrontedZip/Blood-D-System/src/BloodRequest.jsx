// ============================================================
//  BLOODLINK PRO — BloodRequest.jsx  (Module 5)
//  Fully connected to backend via requestsAPI
//  SAVE AS: src/BloodRequest.jsx
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import "./assets/Style.css";
import "./assets/Module5_BloodRequest.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { requestsAPI } from "./api";
import {
  FaHospital, FaExclamationTriangle, FaCheckCircle, FaClock,
  FaPlus, FaFilePdf, FaTrash, FaBell, FaTint, FaHistory,
  FaClipboardList, FaStar, FaRegStar, FaTimes, FaChartBar,
  FaShippingFast, FaLock, FaCommentAlt, FaSpinner,
} from "react-icons/fa";

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];

const URGENCY_CONFIG = {
  CRITICAL: { label:"🚨 Critical", color:"#e74c3c", bg:"#fdf0f0", border:"#e74c3c", desc:"Within 2 hours",  badgeClass:"br-urgency-critical" },
  URGENT:   { label:"⚠️ Urgent",   color:"#e67e22", bg:"#fdf6ec", border:"#e67e22", desc:"Within 12 hours", badgeClass:"br-urgency-urgent"   },
  STANDARD: { label:"📋 Standard", color:"#2980b9", bg:"#eaf4fb", border:"#2980b9", desc:"Within 48 hours", badgeClass:"br-urgency-standard" },
};

const STATUS_CONFIG = {
  PENDING:    { label:"⏳ Pending",    color:"#f39c12", bg:"#fef9e7", cls:"br-status-pending"    },
  APPROVED:   { label:"✅ Approved",   color:"#27ae60", bg:"#eafaf1", cls:"br-status-approved"   },
  DISPATCHED: { label:"🚚 Dispatched", color:"#2980b9", bg:"#eaf4fb", cls:"br-status-dispatched" },
  DELIVERED:  { label:"📦 Delivered",  color:"#8e44ad", bg:"#f5eef8", cls:"br-status-delivered"  },
  CLOSED:     { label:"🔒 Closed",     color:"#7f8c8d", bg:"#f2f3f4", cls:"br-status-closed"     },
  REJECTED:   { label:"❌ Rejected",   color:"#e74c3c", bg:"#fdf0f0", cls:"br-status-rejected"   },
};

function StarRating({ value, onChange, readonly }) {
  return (
    <div className="br-stars">
      {[1,2,3,4,5].map((n) => (
        <span key={n} className={`br-star${n<=(value||0)?" br-star-filled":""}`}
          onClick={() => !readonly && onChange && onChange(n)}
          style={{ cursor:readonly?"default":"pointer" }}>
          {n <= (value||0) ? <FaStar /> : <FaRegStar />}
        </span>
      ))}
    </div>
  );
}

const getUser = () =>
  JSON.parse(localStorage.getItem("blCurrentUser")) ||
  JSON.parse(localStorage.getItem("user")) || {};

const today = () => new Date().toISOString().split("T")[0];

function BloodRequest() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const user     = getUser();
  const role     = user?.role || "DONOR";
  const isAdmin  = ["BB_ADMIN","SUPER_ADMIN"].includes(role);
  const isHospital = role === "HOSPITAL";
  const isDonor  = role === "DONOR";

  const [activeTab, setActiveTab] = useState("overview");
  const [requests, setRequests]   = useState([]);

  const emptyForm = { bloodGroup:"A+", units:"", urgency:"STANDARD", patientName:"", contactPerson:"", contactPhone:"", city:"" };
  const [form, setForm] = useState(emptyForm);

  // Admin action modal
  const [selectedReq, setSelectedReq]         = useState(null);
  const [adminNotes, setAdminNotes]           = useState("");
  const [rejectReason, setRejectReason]       = useState("");
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType]           = useState("");
  const [actionLoading, setActionLoading]     = useState(false);

  // Feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackReq, setFeedbackReq]             = useState(null);
  const [feedbackRating, setFeedbackRating]       = useState(0);
  const [feedbackText, setFeedbackText]           = useState("");

  // Filters
  const [filterUrgency, setFilterUrgency] = useState("ALL");
  const [filterStatus, setFilterStatus]   = useState("ALL");
  const [filterGroup, setFilterGroup]     = useState("ALL");

  // ── Load requests from backend ────────────────────────────
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestsAPI.list({ limit:100 });
      setRequests(data.requests || []);
    } catch (err) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── Submit new request ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.units || Number(form.units) <= 0) { toast.error("Please enter valid unit count."); return; }

    setSaving(true);
    try {
      await requestsAPI.create({
        bloodGroup:    form.bloodGroup,
        units:         Number(form.units),
        urgency:       form.urgency,
        patientName:   form.patientName.trim(),
        contactPerson: form.contactPerson.trim(),
        contactPhone:  form.contactPhone.trim(),
        city:          form.city || user.city,
        hospitalName:  user.hospitalName || user.name,
      });
      toast.success(`✅ Emergency request raised for ${form.bloodGroup} (${form.units} units)!`);
      setForm(emptyForm);
      setActiveTab("my-requests");
      loadRequests();
    } catch (err) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSaving(false);
    }
  };

  // ── Admin: open action modal ───────────────────────────────
  const openAction = (req, type) => {
    setSelectedReq(req);
    setActionType(type);
    setAdminNotes("");
    setRejectReason("");
    setShowActionModal(true);
  };

  // ── Admin: confirm action ──────────────────────────────────
  const confirmAction = async () => {
    if (!selectedReq) return;
    if (actionType === "approve" && !adminNotes.trim()) { toast.error("Please add an approval note."); return; }
    if (actionType === "reject"  && !rejectReason.trim()) { toast.error("Please enter a rejection reason."); return; }

    setActionLoading(true);
    try {
      const statusMap = { approve:"APPROVED", reject:"REJECTED", dispatch:"DISPATCHED", deliver:"DELIVERED" };
      const extras    = {};
      if (actionType === "approve") extras.adminNotes       = adminNotes;
      if (actionType === "reject")  extras.rejectionReason  = rejectReason;

      await requestsAPI.updateStatus(selectedReq._id, statusMap[actionType], extras);

      const msgs = { approve:"✅ Request approved!", reject:"Request rejected.", dispatch:"🚚 Blood dispatched!", deliver:"📦 Delivery confirmed!" };
      toast.success(msgs[actionType]);

      setShowActionModal(false);
      setSelectedReq(null);
      loadRequests();
    } catch (err) {
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Hospital: confirm delivery ─────────────────────────────
  const confirmDelivery = async (id) => {
    try {
      await requestsAPI.updateStatus(id, "DELIVERED");
      toast.success("📦 Delivery confirmed! Please leave feedback.");
      loadRequests();
    } catch (err) {
      toast.error(err.message || "Failed to confirm delivery");
    }
  };

  // ── Feedback ───────────────────────────────────────────────
  const openFeedback = (req) => {
    setFeedbackReq(req);
    setFeedbackRating(req.rating?.score || 0);
    setFeedbackText(req.rating?.comment || "");
    setShowFeedbackModal(true);
  };

  const submitFeedback = async () => {
    if (!feedbackRating) { toast.error("Please select a rating."); return; }
    try {
      await requestsAPI.rate(feedbackReq._id, feedbackRating, feedbackText);
      toast.success("⭐ Feedback submitted!");
      setShowFeedbackModal(false);
      loadRequests();
    } catch (err) {
      toast.error(err.message || "Failed to submit feedback");
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this request permanently?")) return;
    try {
      await requestsAPI.delete(id);
      toast.info("Request deleted.");
      loadRequests();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  // ── PDF ────────────────────────────────────────────────────
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(192,57,43); doc.rect(0,0,210,28,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(18);
    doc.text("BloodLink Pro — Blood Request Report", 14, 12);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    autoTable(doc, {
      startY:34,
      head:[["Hospital","Blood Group","Units","Urgency","Status","Date"]],
      body: requests.map((r) => [
        r.hospitalName, r.bloodGroup, r.units, r.urgency, r.status,
        new Date(r.createdAt).toLocaleDateString(),
      ]),
      headStyles:{ fillColor:[192,57,43], textColor:255 },
      styles:{ fontSize:9 },
    });
    doc.save(`BloodLink_Requests_${today()}.pdf`);
    toast.success("📄 PDF report downloaded!");
  };

  // ── Derived ────────────────────────────────────────────────
  const myRequests  = isHospital
    ? requests.filter((r) => r.hospitalId === user._id)
    : requests;
  const pendingCount  = requests.filter((r) => r.status === "PENDING").length;
  const criticalCount = requests.filter((r) => r.urgency === "CRITICAL" && r.status === "PENDING").length;
  const filteredHistory = requests.filter((r) => {
    const u = filterUrgency === "ALL" || r.urgency    === filterUrgency;
    const s = filterStatus  === "ALL" || r.status     === filterStatus;
    const g = filterGroup   === "ALL" || r.bloodGroup === filterGroup;
    return u && s && g;
  });

  const TABS = [
    { id:"overview",    label:"📊 Overview",     hidden:false },
    { id:"new",         label:"➕ New Request",   hidden:!isHospital },
    { id:"my-requests", label:`📋 My Requests`,  hidden:isDonor },
    { id:"admin",       label:`⚙️ Admin Panel${pendingCount>0?` (${pendingCount})`:""} `, hidden:!isAdmin },
    { id:"history",     label:"📁 History",      hidden:false },
  ].filter((t) => !t.hidden);

  if (loading) {
    return (
      <div className={`dashboard-container${darkMode?" dark":""}`}>
        <Sidebar darkMode={darkMode} toggleDarkMode={() => { const n=!darkMode; setDarkMode(n); localStorage.setItem("darkMode",String(n)); }} />
        <div className="main-content" style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"70vh", flexDirection:"column", gap:12 }}>
          <FaSpinner size={36} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
          <p style={{ color:"#888" }}>Loading blood requests...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  // ── Overview Tab ──────────────────────────────────────────
  const renderOverview = () => (
    <div className="br-overview">
      <div className="br-kpi-row">
        {[
          { icon:<FaClipboardList />, color:"#c0392b", value:requests.length,  label:"Total Requests"  },
          { icon:<FaClock />,         color:"#f39c12", value:pendingCount,     label:"Pending"          },
          { icon:<FaCheckCircle />,   color:"#27ae60", value:requests.filter(r=>r.status==="CLOSED").length, label:"Fulfilled" },
          { icon:<FaExclamationTriangle />, color:"#e74c3c", value:criticalCount, label:"Critical Pending" },
        ].map((k,i) => (
          <div key={i} className="br-kpi-card">
            <div className="br-kpi-icon" style={{ color:k.color }}>{k.icon}</div>
            <div className="br-kpi-value">{k.value}</div>
            <div className="br-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {criticalCount > 0 && (
        <div className="br-inline-alert br-alert-critical">
          <FaExclamationTriangle />
          <strong>Action Required:</strong> {criticalCount} CRITICAL request{criticalCount!==1?"s":""} pending immediate response.
          {isAdmin && <button className="br-alert-goto-btn" onClick={() => setActiveTab("admin")}>Go to Admin Panel</button>}
        </div>
      )}

      <h3 className="br-section-title"><FaChartBar style={{ color:"#c0392b" }} /> Active Requests Summary</h3>
      <div className="br-active-list">
        {requests.filter((r) => !["CLOSED","REJECTED"].includes(r.status)).length === 0 ? (
          <div className="br-empty-state">
            <FaCheckCircle className="br-empty-icon br-empty-green" />
            <p>No active requests right now.</p>
          </div>
        ) : (
          requests
            .filter((r) => !["CLOSED","REJECTED"].includes(r.status))
            .sort((a,b) => { const o={CRITICAL:0,URGENT:1,STANDARD:2}; return o[a.urgency]-o[b.urgency]; })
            .slice(0,8)
            .map((r) => (
              <div key={r._id} className={`br-active-card br-active-${r.urgency.toLowerCase()}`}>
                <div className="br-active-top">
                  <span className="br-group-chip">{r.bloodGroup}</span>
                  <span className={`br-urgency-badge ${URGENCY_CONFIG[r.urgency].badgeClass}`}>{URGENCY_CONFIG[r.urgency].label}</span>
                  <span className={`br-status-chip ${STATUS_CONFIG[r.status]?.cls}`}>{STATUS_CONFIG[r.status]?.label}</span>
                  <span className="br-active-hospital">{r.hospitalName}</span>
                </div>
                <div className="br-active-meta">
                  <span>{r.units} units needed</span>
                  <span>·</span><span>{URGENCY_CONFIG[r.urgency].desc}</span>
                  <span>·</span><span>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
        )}
      </div>

      <div className="br-pdf-row">
        <button className="br-pdf-btn" onClick={generatePDF}><FaFilePdf /> Download Full Report (PDF)</button>
        {isHospital && (
          <button className="br-add-btn" onClick={() => setActiveTab("new")}><FaPlus /> Raise New Request</button>
        )}
      </div>
    </div>
  );

  // ── New Request Tab ───────────────────────────────────────
  const renderNewRequest = () => {
    if (!isHospital) {
      return (
        <div className="br-empty-state">
          <FaLock className="br-empty-icon" style={{ color:"#c0392b" }} />
          <p>Access Restricted</p><small>Only Hospital accounts can raise blood requests.</small>
        </div>
      );
    }
    return (
      <div className="br-new-wrap">
        <h3 className="br-section-title"><FaPlus style={{ color:"#c0392b" }} /> Raise Emergency Blood Request</h3>
        <form className="br-form" onSubmit={handleSubmit}>
          <div className="br-form-grid">
            <div className="br-form-group">
              <label>Blood Group <span className="br-required">*</span></label>
              <select value={form.bloodGroup} onChange={(e) => setForm({...form,bloodGroup:e.target.value})}>
                {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="br-form-group">
              <label>Units Required <span className="br-required">*</span></label>
              <input type="number" min="1" placeholder="e.g. 4"
                value={form.units} onChange={(e) => setForm({...form,units:e.target.value})} />
            </div>
            <div className="br-form-group br-form-group-wide">
              <label>Urgency Level <span className="br-required">*</span></label>
              <div className="br-urgency-selector">
                {["CRITICAL","URGENT","STANDARD"].map((u) => (
                  <button key={u} type="button"
                    className={`br-urgency-opt${form.urgency===u?" br-urgency-selected":""}`}
                    style={form.urgency===u?{background:URGENCY_CONFIG[u].bg,borderColor:URGENCY_CONFIG[u].color,color:URGENCY_CONFIG[u].color}:{}}
                    onClick={() => setForm({...form,urgency:u})}>
                    {URGENCY_CONFIG[u].label}
                    <small>{URGENCY_CONFIG[u].desc}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="br-form-group">
              <label>Patient Name <span className="br-optional">(optional)</span></label>
              <input type="text" placeholder="e.g. Ramesh K."
                value={form.patientName} onChange={(e) => setForm({...form,patientName:e.target.value})} />
            </div>
            <div className="br-form-group">
              <label>Contact Person</label>
              <input type="text" placeholder="Contact name"
                value={form.contactPerson} onChange={(e) => setForm({...form,contactPerson:e.target.value})} />
            </div>
            <div className="br-form-group">
              <label>Contact Phone</label>
              <input type="tel" placeholder="Phone number" maxLength={10}
                value={form.contactPhone} onChange={(e) => setForm({...form,contactPhone:e.target.value})} />
            </div>
          </div>

          {form.units && form.bloodGroup && (
            <div className="br-preview-card">
              <strong>Request Preview:</strong>{" "}
              <span className="br-inline-group">{form.bloodGroup}</span> × {form.units} units —{" "}
              <span style={{ color:URGENCY_CONFIG[form.urgency].color, fontWeight:700 }}>
                {URGENCY_CONFIG[form.urgency].label}
              </span>
            </div>
          )}

          <div className="br-form-actions">
            <button type="submit" className="br-submit-btn" disabled={saving}>
              {saving
                ? <><FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> Submitting...</>
                : <><FaHospital /> Submit Emergency Request</>}
            </button>
            <button type="button" className="br-reset-btn" onClick={() => setForm(emptyForm)}>Reset</button>
          </div>
        </form>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  };

  // ── My Requests Tab ───────────────────────────────────────
  const renderMyRequests = () => {
    const list = (isHospital ? myRequests : requests)
      .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));

    return (
      <div className="br-my-wrap">
        <h3 className="br-section-title"><FaHospital style={{ color:"#c0392b" }} /> My Request History &amp; Tracking</h3>
        {list.length === 0 ? (
          <div className="br-empty-state">
            <FaClipboardList className="br-empty-icon" style={{ color:"#c0392b" }} />
            <p>No requests raised yet.</p>
          </div>
        ) : (
          list.map((r) => (
            <div key={r._id} className={`br-request-card br-req-${r.urgency?.toLowerCase()}`}>
              <div className="br-req-header">
                <div className="br-req-header-left">
                  <span className="br-group-chip br-chip-lg">{r.bloodGroup}</span>
                  <div>
                    <div className="br-req-title">{r.hospitalName} — {r.units} units</div>
                    <div className="br-req-meta-row">
                      <span className={`br-urgency-badge ${URGENCY_CONFIG[r.urgency]?.badgeClass}`}>{URGENCY_CONFIG[r.urgency]?.label}</span>
                      <span className={`br-status-chip ${STATUS_CONFIG[r.status]?.cls}`}>{STATUS_CONFIG[r.status]?.label}</span>
                      <code className="br-req-id-sm">{r._id?.slice(-8)}</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="br-timeline">
                {[
                  { key:"createdAt",    label:"Requested",  icon:<FaClipboardList /> },
                  { key:"approvedAt",   label:r.status==="REJECTED"?"Rejected":"Approved", icon:r.status==="REJECTED"?<FaTimes />:<FaCheckCircle /> },
                  { key:"dispatchedAt", label:"Dispatched",  icon:<FaShippingFast /> },
                  { key:"deliveredAt",  label:"Delivered",   icon:<FaHospital /> },
                  { key:"closedAt",     label:"Closed",      icon:<FaLock /> },
                ].map((step,i) => {
                  const done = !!r[step.key];
                  return (
                    <div key={i} className={`br-timeline-step${done?" br-tl-done":""}`}>
                      <div className={`br-tl-icon${done?" br-tl-icon-done":""}`}>{step.icon}</div>
                      <div className="br-tl-label">{step.label}</div>
                      <div className="br-tl-time">{r[step.key]?new Date(r[step.key]).toLocaleDateString():"—"}</div>
                    </div>
                  );
                })}
              </div>

              {r.adminNotes && (
                <div className="br-req-note">
                  <FaCommentAlt style={{ color:"#27ae60" }} /> <strong>Admin note:</strong> {r.adminNotes}
                </div>
              )}
              {r.rejectionReason && (
                <div className="br-req-note br-req-note-danger">
                  <FaTimes style={{ color:"#c0392b" }} /> <strong>Rejection reason:</strong> {r.rejectionReason}
                </div>
              )}

              {r.rating && (
                <div className="br-req-rating">
                  <StarRating value={r.rating.score} readonly />
                  {r.rating.comment && <span className="br-req-feedback-text">"{r.rating.comment}"</span>}
                </div>
              )}

              <div className="br-req-actions">
                {isHospital && r.status === "DISPATCHED" && (
                  <button className="br-btn-action br-btn-deliver" onClick={() => confirmDelivery(r._id)}>
                    📦 Confirm Delivery
                  </button>
                )}
                {isHospital && r.status === "DELIVERED" && !r.rating && (
                  <button className="br-btn-action br-btn-feedback" onClick={() => openFeedback(r)}>
                    <FaStar /> Leave Feedback
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // ── Admin Panel Tab ───────────────────────────────────────
  const renderAdminPanel = () => {
    if (!isAdmin) {
      return (
        <div className="br-empty-state">
          <FaLock className="br-empty-icon" style={{ color:"#c0392b" }} />
          <p>Admin Access Only</p>
        </div>
      );
    }

    const pending    = requests.filter((r) => r.status==="PENDING").sort((a,b)=>({CRITICAL:0,URGENT:1,STANDARD:2}[a.urgency]-({CRITICAL:0,URGENT:1,STANDARD:2}[b.urgency])));
    const approved   = requests.filter((r) => r.status==="APPROVED");
    const dispatched = requests.filter((r) => r.status==="DISPATCHED");

    const AdminReqRow = ({ r }) => (
      <div className={`br-admin-card br-admin-${r.urgency?.toLowerCase()}`}>
        <div className="br-admin-top">
          <span className="br-group-chip br-chip-lg">{r.bloodGroup}</span>
          <div className="br-admin-info">
            <div className="br-admin-hosp">{r.hospitalName}</div>
            <div className="br-admin-meta">
              {r.units} units ·{" "}
              <span className={`br-urgency-badge ${URGENCY_CONFIG[r.urgency]?.badgeClass}`}>{URGENCY_CONFIG[r.urgency]?.label}</span>
              {" · "}{new Date(r.createdAt).toLocaleString()}
            </div>
          </div>
          <span className={`br-status-chip ${STATUS_CONFIG[r.status]?.cls}`}>{STATUS_CONFIG[r.status]?.label}</span>
        </div>
        <div className="br-admin-actions">
          {r.status === "PENDING" && (
            <>
              <button className="br-btn-action br-btn-approve" onClick={() => openAction(r,"approve")}>✅ Approve</button>
              <button className="br-btn-action br-btn-reject"  onClick={() => openAction(r,"reject")}>❌ Reject</button>
            </>
          )}
          {r.status === "APPROVED"   && <button className="br-btn-action br-btn-dispatch" onClick={() => openAction(r,"dispatch")}>🚚 Dispatch</button>}
          {r.status === "DISPATCHED" && <button className="br-btn-action br-btn-deliver"  onClick={() => openAction(r,"deliver")}>📦 Mark Delivered</button>}
          <button className="br-btn-sm br-btn-delete" onClick={() => handleDelete(r._id)}><FaTrash /></button>
        </div>
      </div>
    );

    return (
      <div className="br-admin-wrap">
        <h3 className="br-section-title"><FaClipboardList style={{ color:"#c0392b" }} /> Admin Request Management</h3>

        {[
          { title:"⏳ Pending Approval", list:pending, cls:"br-adm-hdr-pending", badge:"" },
          { title:"✅ Approved — Awaiting Dispatch", list:approved, cls:"br-adm-hdr-approved", badge:"br-badge-green" },
          { title:"🚚 Dispatched — Awaiting Delivery", list:dispatched, cls:"br-adm-hdr-dispatched", badge:"br-badge-blue" },
        ].map(({ title, list, cls, badge }) => (
          <div key={title} className="br-admin-section">
            <div className={`br-admin-section-hdr ${cls}`}>
              {title}
              {list.length > 0 && <span className={`br-count-badge ${badge}`}>{list.length}</span>}
            </div>
            {list.length === 0
              ? <div className="br-admin-empty">No requests in this category.</div>
              : list.map((r) => <AdminReqRow key={r._id} r={r} />)
            }
          </div>
        ))}

        <h3 className="br-section-title" style={{ marginTop:32 }}><FaHistory /> All Requests</h3>
        <div className="br-table-scroll">
          <table className="br-table">
            <thead>
              <tr><th>Hospital</th><th>Blood Group</th><th>Units</th><th>Urgency</th><th>Status</th><th>Date</th><th>Rating</th><th>Action</th></tr>
            </thead>
            <tbody>
              {requests.length === 0
                ? <tr><td colSpan={8} className="br-table-empty">No requests on record.</td></tr>
                : [...requests].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map((r) => (
                    <tr key={r._id}>
                      <td>{r.hospitalName}</td>
                      <td><span className="br-group-chip br-chip-sm">{r.bloodGroup}</span></td>
                      <td>{r.units}</td>
                      <td><span className={`br-urgency-badge ${URGENCY_CONFIG[r.urgency]?.badgeClass}`}>{URGENCY_CONFIG[r.urgency]?.label}</span></td>
                      <td><span className={`br-status-chip ${STATUS_CONFIG[r.status]?.cls}`}>{STATUS_CONFIG[r.status]?.label}</span></td>
                      <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td>{r.rating ? <StarRating value={r.rating.score} readonly /> : <span style={{ color:"#bbb" }}>—</span>}</td>
                      <td><button className="br-btn-sm br-btn-delete" onClick={() => handleDelete(r._id)}><FaTrash /></button></td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── History Tab ───────────────────────────────────────────
  const renderHistory = () => (
    <div className="br-history-wrap">
      <h3 className="br-section-title"><FaHistory style={{ color:"#c0392b" }} /> Full Request History</h3>
      <div className="br-filter-bar">
        {[
          { label:"Urgency", val:filterUrgency, set:setFilterUrgency, options:[["ALL","All"],["CRITICAL","Critical"],["URGENT","Urgent"],["STANDARD","Standard"]] },
          { label:"Status",  val:filterStatus,  set:setFilterStatus,  options:[["ALL","All Statuses"],...Object.keys(STATUS_CONFIG).map(s=>[s,s])] },
          { label:"Blood Group", val:filterGroup, set:setFilterGroup, options:[["ALL","All Groups"],...BLOOD_GROUPS.map(g=>[g,g])] },
        ].map(({ label, val, set, options }) => (
          <div key={label} className="br-filter-group">
            <label>{label}</label>
            <select value={val} onChange={(e) => set(e.target.value)}>
              {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        ))}
        <div className="br-filter-result">Showing <strong>{filteredHistory.length}</strong> of {requests.length}</div>
        <button className="br-pdf-btn-sm" onClick={generatePDF}><FaFilePdf /> Export PDF</button>
      </div>

      <div className="br-table-scroll">
        <table className="br-table">
          <thead>
            <tr><th>Hospital</th><th>Blood Group</th><th>Units</th><th>Urgency</th><th>Status</th><th>Requested</th><th>Rating</th></tr>
          </thead>
          <tbody>
            {filteredHistory.length === 0
              ? <tr><td colSpan={7} className="br-table-empty">No records match the filter.</td></tr>
              : [...filteredHistory].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map((r) => (
                  <tr key={r._id}>
                    <td>{r.hospitalName}</td>
                    <td><span className="br-group-chip br-chip-sm">{r.bloodGroup}</span></td>
                    <td>{r.units}</td>
                    <td><span className={`br-urgency-badge ${URGENCY_CONFIG[r.urgency]?.badgeClass}`}>{URGENCY_CONFIG[r.urgency]?.label}</span></td>
                    <td><span className={`br-status-chip ${STATUS_CONFIG[r.status]?.cls}`}>{STATUS_CONFIG[r.status]?.label}</span></td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>{r.rating ? <StarRating value={r.rating.score} readonly /> : <span style={{ color:"#bbb" }}>—</span>}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Admin Action Modal ─────────────────────────────────────
  const AdminActionModal = () => {
    if (!showActionModal || !selectedReq) return null;
    return (
      <div className="br-modal-overlay" onClick={() => setShowActionModal(false)}>
        <div className="br-modal" onClick={(e) => e.stopPropagation()}>
          <div className="br-modal-header">
            <h3>
              {actionType==="approve"  && "✅ Approve Request"}
              {actionType==="reject"   && "❌ Reject Request"}
              {actionType==="dispatch" && "🚚 Confirm Dispatch"}
              {actionType==="deliver"  && "📦 Mark as Delivered"}
            </h3>
            <button className="br-modal-close" onClick={() => setShowActionModal(false)}><FaTimes /></button>
          </div>
          <div className="br-modal-body">
            <div className="br-modal-req-info">
              <span className="br-group-chip br-chip-lg">{selectedReq.bloodGroup}</span>
              <span>{selectedReq.hospitalName} — {selectedReq.units} units</span>
              <span className={`br-urgency-badge ${URGENCY_CONFIG[selectedReq.urgency]?.badgeClass}`}>
                {URGENCY_CONFIG[selectedReq.urgency]?.label}
              </span>
            </div>
            {actionType === "approve" && (
              <div className="br-form-group" style={{ marginTop:16 }}>
                <label>Approval Note <span className="br-required">*</span></label>
                <textarea rows={3} placeholder="e.g. Stock allocated from main bank."
                  value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} className="br-textarea" />
              </div>
            )}
            {actionType === "reject" && (
              <div className="br-form-group" style={{ marginTop:16 }}>
                <label>Rejection Reason <span className="br-required">*</span></label>
                <textarea rows={3} placeholder="e.g. Insufficient stock. Contact partner bank."
                  value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="br-textarea" />
              </div>
            )}
            {(actionType === "dispatch" || actionType === "deliver") && (
              <p className="br-modal-confirm-msg">
                {actionType==="dispatch"
                  ? "Confirm that the blood units have been dispatched to the hospital?"
                  : "Confirm that the hospital has received the blood units?"}
              </p>
            )}
          </div>
          <div className="br-modal-footer">
            <button className="br-btn-modal-confirm" onClick={confirmAction} disabled={actionLoading}>
              {actionLoading ? <FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> : "Confirm"}
            </button>
            <button className="br-btn-modal-cancel" onClick={() => setShowActionModal(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const FeedbackModal = () => {
    if (!showFeedbackModal || !feedbackReq) return null;
    return (
      <div className="br-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
        <div className="br-modal" onClick={(e) => e.stopPropagation()}>
          <div className="br-modal-header">
            <h3>⭐ Rate This Fulfillment</h3>
            <button className="br-modal-close" onClick={() => setShowFeedbackModal(false)}><FaTimes /></button>
          </div>
          <div className="br-modal-body">
            <div className="br-modal-req-info">
              <span className="br-group-chip br-chip-lg">{feedbackReq.bloodGroup}</span>
              <span>{feedbackReq.units} units</span>
            </div>
            <div className="br-feedback-star-wrap">
              <label>Your Rating <span className="br-required">*</span></label>
              <StarRating value={feedbackRating} onChange={setFeedbackRating} />
            </div>
            <div className="br-form-group" style={{ marginTop:12 }}>
              <label>Comments <span className="br-optional">(optional)</span></label>
              <textarea rows={3} placeholder="e.g. Very fast response, blood arrived in time."
                value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="br-textarea" />
            </div>
          </div>
          <div className="br-modal-footer">
            <button className="br-btn-modal-confirm" onClick={submitFeedback}>Submit Feedback</button>
            <button className="br-btn-modal-cancel" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`dashboard-container${darkMode?" dark":""}`}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => { const n=!darkMode; setDarkMode(n); localStorage.setItem("darkMode",String(n)); }} />
      <div className="main-content">
        <div className="br-page-header">
          <div className="br-page-header-left">
            <h2 className="br-page-title"><FaHospital className="br-title-icon" /> Emergency Blood Requests</h2>
            <p className="br-page-sub">Module 5 — Full request lifecycle with priority levels, status tracking &amp; feedback</p>
          </div>
          <div className="br-page-header-right">
            {pendingCount > 0 && isAdmin && (
              <div className="br-header-alert-pill" onClick={() => setActiveTab("admin")}>
                <FaBell /> {pendingCount} Pending Request{pendingCount!==1?"s":""}
              </div>
            )}
          </div>
        </div>

        <div className="br-tab-bar">
          {TABS.map((t) => (
            <button key={t.id} className={`br-tab${activeTab===t.id?" br-tab-active":""}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="br-content">
          {activeTab === "overview"    && renderOverview()}
          {activeTab === "new"         && renderNewRequest()}
          {activeTab === "my-requests" && renderMyRequests()}
          {activeTab === "admin"       && renderAdminPanel()}
          {activeTab === "history"     && renderHistory()}
        </div>
      </div>

      <AdminActionModal />
      <FeedbackModal />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default BloodRequest;