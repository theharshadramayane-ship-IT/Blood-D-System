// ============================================================
//  BLOODLINK PRO — ThalassemiaManagement.jsx  (Module 8)
//  Fully connected to backend via thalassemiaAPI
//  SAVE AS: src/ThalassemiaManagement.jsx
// ============================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-toastify";
import {
  FaUserInjured, FaPlus, FaEdit, FaEye, FaTimes, FaSearch,
  FaCalendarAlt, FaCheckCircle, FaExclamationTriangle,
  FaFileMedicalAlt, FaUsers, FaClock, FaHeartbeat, FaSyringe,
  FaBell, FaTimesCircle, FaInfoCircle, FaTint, FaUserFriends,
  FaSpinner,
} from "react-icons/fa";
import Sidebar from "./Sidebar";
import "./assets/Module8_Thalassemia.css";
import { thalassemiaAPI, networkAPI } from "./api";

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const FREQ_LABELS  = { WEEKLY:"Weekly", BIWEEKLY:"Bi-Weekly", MONTHLY:"Monthly" };

function getUser() {
  return JSON.parse(localStorage.getItem("blCurrentUser")) ||
         JSON.parse(localStorage.getItem("user")) || {};
}
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
}
function calcAge(dob) {
  if (!dob) return "—";
  return Math.floor((Date.now()-new Date(dob).getTime())/(1000*60*60*24*365.25));
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / (1000*60*60*24));
}
function scheduleStatus(nextDue) {
  const d = daysUntil(nextDue);
  if (d===null) return "upcoming";
  if (d<0)   return "overdue";
  if (d<=3)  return "due-soon";
  return "upcoming";
}

// ── Main Component ─────────────────────────────────────────
export default function ThalassemiaManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [patients, setPatients]   = useState([]);
  const [history, setHistory]     = useState([]);   // all transfusion history (aggregated)
  const [banks, setBanks]         = useState([]);
  const [darkMode, setDarkMode]   = useState(localStorage.getItem("darkMode")==="true");
  const [loading, setLoading]     = useState(true);

  const currentUser = useMemo(() => getUser(), []);
  const role = (currentUser?.role||"DONOR").toUpperCase();

  const [patientModal, setPatientModal] = useState(false);
  const [editPatient,  setEditPatient]  = useState(null);
  const [viewPatient,  setViewPatient]  = useState(null);
  const [viewHistory,  setViewHistory]  = useState([]);

  const canManage = ["SUPER_ADMIN","BB_ADMIN"].includes(role);
  const canRecord = ["SUPER_ADMIN","BB_ADMIN","HOSPITAL"].includes(role);
  const canViewAll = role !== "DONOR";

  // ── Load data from backend ─────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [patientsRes, banksRes] = await Promise.allSettled([
        thalassemiaAPI.list({ limit:200 }),
        networkAPI.getBanks(),
      ]);

      if (patientsRes.status === "fulfilled") {
        const patientList = patientsRes.value.patients || [];
        setPatients(patientList);

        // Load history for all patients (batch)
        const allHistory = [];
        await Promise.allSettled(
          patientList.slice(0, 20).map(async (p) => {
            try {
              const histRes = await thalassemiaAPI.history(p._id);
              allHistory.push(...(histRes.history || []));
            } catch {}
          })
        );
        setHistory(allHistory.sort((a,b) => new Date(b.transfusionDate||b.createdAt) - new Date(a.transfusionDate||a.createdAt)));
      }

      if (banksRes.status === "fulfilled") {
        setBanks(banksRes.value.banks || []);
      }
    } catch (err) {
      toast.error("Failed to load thalassemia data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!canViewAll) {
    return (
      <div className={`app-layout${darkMode?" dark":""}`}>
        <Sidebar />
        <main className="main-content">
          <div className="thal-empty" style={{ marginTop:80 }}>
            <div className="thal-empty-icon">🚫</div>
            <p className="thal-empty-title">Access Restricted</p>
            <p className="thal-empty-sub">Donors do not have access to Thalassemia Management.</p>
          </div>
        </main>
      </div>
    );
  }

  // ── KPIs ──────────────────────────────────────────────────
  const activePatients = patients.filter(p => p.status==="ACTIVE").length;
  const overdueCount   = patients.filter(p => scheduleStatus(p.nextDueDate)==="overdue").length;
  const dueSoonCount   = patients.filter(p => scheduleStatus(p.nextDueDate)==="due-soon").length;

  const TABS = [
    { id:"overview", label:"Overview",          icon:<FaHeartbeat /> },
    { id:"patients", label:"Patients",           icon:<FaUsers /> },
    { id:"schedule", label:"Schedule",           icon:<FaCalendarAlt /> },
    { id:"record",   label:"Record Transfusion", icon:<FaSyringe />, show:canRecord },
    { id:"history",  label:"History",            icon:<FaFileMedicalAlt /> },
    { id:"family",   label:"Family Portal",      icon:<FaUserFriends /> },
  ].filter(t => t.show !== false);

  if (loading) {
    return (
      <div className={`app-layout${darkMode?" dark":""}`}>
        <Sidebar darkMode={darkMode} toggleDarkMode={() => { const n=!darkMode; setDarkMode(n); localStorage.setItem("darkMode",String(n)); }} />
        <main className="main-content" style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"70vh", flexDirection:"column", gap:12 }}>
          <FaSpinner size={36} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
          <p style={{ color:"#888" }}>Loading patient data...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-layout${darkMode?" dark":""}`}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => { const n=!darkMode; setDarkMode(n); localStorage.setItem("darkMode",String(n)); }} />
      <main className="main-content">
        <div className="thal-page">
          {/* HERO */}
          <div className="thal-hero-banner">
            <div className="thal-hero-left">
              <h1 className="thal-hero-title"><FaUserInjured /> Thalassemia Patient Management</h1>
              <p className="thal-hero-subtitle">Manage transfusion schedules, blood reservations and patient care</p>
            </div>
            <div className="thal-hero-right">
              <div className="thal-hero-stat"><div className="thal-hero-stat-num">{patients.length}</div><div className="thal-hero-stat-label">Total</div></div>
              <div className="thal-hero-stat"><div className="thal-hero-stat-num">{activePatients}</div><div className="thal-hero-stat-label">Active</div></div>
              <div className="thal-hero-stat"><div className="thal-hero-stat-num" style={{ color:overdueCount>0?"#ff7675":"white" }}>{overdueCount}</div><div className="thal-hero-stat-label">Overdue</div></div>
              <div className="thal-hero-stat"><div className="thal-hero-stat-num">{history.length}</div><div className="thal-hero-stat-label">Transfusions</div></div>
            </div>
          </div>

          {/* TABS */}
          <div className="thal-tabs">
            {TABS.map(t=>(
              <button key={t.id} className={`thal-tab-btn${activeTab===t.id?" active":""}`} onClick={() => setActiveTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ────────────────────────────────────── */}
          {activeTab === "overview" && (
            <>
              <div className="thal-kpi-grid">
                {[
                  { icon:<FaUsers />,      cls:"purple", num:patients.length, label:"Total Patients"     },
                  { icon:<FaCheckCircle />,cls:"green",  num:activePatients,  label:"Active Patients"    },
                  { icon:<FaBell />,       cls:"orange", num:dueSoonCount+overdueCount, label:"Due / Overdue" },
                  { icon:<FaSyringe />,    cls:"purple", num:history.length,  label:"Transfusions Done"  },
                ].map((k,i)=>(
                  <div key={i} className="thal-kpi-card">
                    <div className={`thal-kpi-icon ${k.cls}`}>{k.icon}</div>
                    <div><div className="thal-kpi-num">{k.num}</div><div className="thal-kpi-label">{k.label}</div></div>
                  </div>
                ))}
              </div>

              {overdueCount>0 && <div className="thal-alert danger"><FaExclamationTriangle /><span>{overdueCount} patient(s) are overdue for transfusion.</span></div>}
              {dueSoonCount>0 && <div className="thal-alert warning"><FaBell /><span>{dueSoonCount} patient(s) have transfusion due within 3 days.</span></div>}

              <div className="thal-overview-grid">
                <div className="thal-section-card">
                  <div className="thal-section-header"><h3 className="thal-section-title"><FaCalendarAlt /> Upcoming Transfusions</h3></div>
                  {patients.filter(p=>p.status==="ACTIVE").sort((a,b)=>new Date(a.nextDueDate)-new Date(b.nextDueDate)).slice(0,8).map(p=>{
                    const d=daysUntil(p.nextDueDate);
                    const st=scheduleStatus(p.nextDueDate);
                    const label=d<0?`${Math.abs(d)}d overdue`:d===0?"Today":`In ${d} day${d!==1?"s":""}`;
                    const color=st==="overdue"?"#c0392b":st==="due-soon"?"#e67e22":"#27ae60";
                    return (
                      <div key={p._id} className={`thal-today-item${st==="overdue"?" overdue":""}`}>
                        <div className="thal-today-avatar">{getInitials(p.name)}</div>
                        <div className="thal-today-info">
                          <p className="thal-today-name">{p.name}</p>
                          <p className="thal-today-meta"><span className="thal-bg-chip">{p.bloodGroup}</span>&nbsp;&nbsp;{FREQ_LABELS[p.transfusionFrequency]}</p>
                        </div>
                        <span style={{ fontSize:12, fontWeight:800, color, whiteSpace:"nowrap" }}>{label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="thal-section-card">
                  <div className="thal-section-header"><h3 className="thal-section-title"><FaFileMedicalAlt /> Recent Transfusions</h3></div>
                  {history.slice(0,5).map((h,i)=>(
                    <div key={i} className="thal-timeline-item">
                      <div className="thal-timeline-dot upcoming" />
                      <div className="thal-timeline-date">{formatDate(h.transfusionDate||h.createdAt)}</div>
                      <div className="thal-timeline-title">{h.patientId?.name || h.conductedBy || "Patient"}</div>
                      <div className="thal-timeline-sub">
                        <span className="thal-bg-chip" style={{ fontSize:11 }}>{h.bloodGroup}</span>
                        &nbsp;· {h.unitsDonated||1} unit(s) · HB: {h.hemoglobinBefore||"—"} → {h.hemoglobinAfter||"—"} g/dL
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Blood group dist */}
              <div className="thal-section-card">
                <div className="thal-section-header"><h3 className="thal-section-title"><FaTint /> Patient Blood Group Distribution</h3></div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {BLOOD_GROUPS.map(bg=>{
                    const count = patients.filter(p=>p.bloodGroup===bg&&p.status==="ACTIVE").length;
                    return (
                      <div key={bg} style={{ background:count>0?"linear-gradient(135deg,#c0392b,#96281b)":"#f5f5f5", color:count>0?"white":"#bdc3c7", borderRadius:10, padding:"10px 18px", textAlign:"center", minWidth:70 }}>
                        <div style={{ fontSize:20, fontWeight:800 }}>{bg}</div>
                        <div style={{ fontSize:13, marginTop:2 }}>{count} patient{count!==1?"s":""}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── PATIENTS ──────────────────────────────────────── */}
          {activeTab === "patients" && (
            <PatientsTab
              patients={patients} canManage={canManage}
              onAdd={() => { setEditPatient(null); setPatientModal(true); }}
              onEdit={p => { setEditPatient(p); setPatientModal(true); }}
              onView={async p => {
                setViewPatient(p);
                try { const r = await thalassemiaAPI.history(p._id); setViewHistory(r.history||[]); } catch {}
              }}
              onToggleActive={async p => {
                try {
                  await thalassemiaAPI.update(p._id, { status: p.status==="ACTIVE" ? "INACTIVE" : "ACTIVE" });
                  toast.success(p.status==="ACTIVE" ? "Patient deactivated." : "Patient activated.");
                  loadData();
                } catch(err) { toast.error(err.message||"Failed to update"); }
              }}
            />
          )}

          {/* ── SCHEDULE ──────────────────────────────────────── */}
          {activeTab === "schedule" && (
            <ScheduleTab patients={patients} />
          )}

          {/* ── RECORD TRANSFUSION ────────────────────────────── */}
          {activeTab === "record" && canRecord && (
            <RecordTab patients={patients} history={history} onSaved={loadData} currentUser={currentUser} />
          )}

          {/* ── HISTORY ───────────────────────────────────────── */}
          {activeTab === "history" && (
            <div className="thal-section-card">
              <div className="thal-section-header"><h3 className="thal-section-title"><FaFileMedicalAlt /> Transfusion History ({history.length})</h3></div>
              {history.length === 0 ? (
                <div className="thal-empty"><div className="thal-empty-icon">📜</div><p className="thal-empty-title">No records found</p></div>
              ) : (
                <div className="thal-table-wrap">
                  <table className="thal-table">
                    <thead><tr><th>Patient</th><th>Date</th><th>Blood Group</th><th>Units</th><th>HB Before</th><th>HB After</th><th>Notes</th></tr></thead>
                    <tbody>
                      {history.map((h,i)=>(
                        <tr key={i}>
                          <td style={{ fontWeight:700 }}>{h.patientId?.name || h.conductedBy || "—"}</td>
                          <td>{formatDate(h.transfusionDate||h.createdAt)}</td>
                          <td><span className="thal-bg-chip">{h.bloodGroup||"—"}</span></td>
                          <td style={{ fontWeight:700 }}>{h.unitsDonated||1}</td>
                          <td style={{ color:"#c0392b", fontWeight:700 }}>{h.hemoglobinBefore||"—"} g/dL</td>
                          <td style={{ color:"#27ae60", fontWeight:700 }}>{h.hemoglobinAfter||"—"} g/dL</td>
                          <td style={{ fontSize:12, color:"#7f8c8d" }}>{h.reactions||h.notes||"—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── FAMILY PORTAL ─────────────────────────────────── */}
          {activeTab === "family" && (
            <>
              <div className="thal-family-banner">
                <div className="thal-family-banner-icon">👨‍👩‍👧</div>
                <div className="thal-family-banner-text">
                  <h3>Family Portal</h3>
                  <p>View upcoming transfusion schedules and medical history for your family member.</p>
                </div>
              </div>
              {patients.filter(p=>p.status==="ACTIVE").map(p=>{
                const d=daysUntil(p.nextDueDate);
                const st=scheduleStatus(p.nextDueDate);
                return (
                  <div key={p._id} className="thal-patient-card">
                    <div className="thal-patient-card-header">
                      <div className="thal-patient-card-avatar">{getInitials(p.name)}</div>
                      <div style={{ flex:1 }}>
                        <p className="thal-patient-card-name">{p.name}</p>
                        <p className="thal-patient-card-meta">
                          <span className="thal-bg-chip">{p.bloodGroup}</span>
                          &nbsp;· Age {calcAge(p.dob)}&nbsp;· {p.gender}
                        </p>
                      </div>
                      <span className={`thal-badge ${st==="overdue"?"bg-red":st==="due-soon"?"bg-orange":"bg-green"}`}>
                        {st==="overdue"?`${Math.abs(d)}d Overdue`:st==="due-soon"?`Due in ${d}d`:"On Schedule"}
                      </span>
                    </div>
                    <div className="thal-patient-card-body">
                      {[
                        ["Next Transfusion", formatDate(p.nextDueDate)],
                        ["Frequency",        FREQ_LABELS[p.transfusionFrequency]],
                        ["Preferred Bank",   p.preferredBankName||"—"],
                      ].map(([lbl,val])=>(
                        <div key={lbl} className="thal-info-item">
                          <div className="thal-info-label">{lbl}</div>
                          <div className="thal-info-value">{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* MODALS */}
        {patientModal && (
          <PatientModal existing={editPatient} banks={banks}
            onClose={() => setPatientModal(false)}
            onSave={async data => {
              try {
                if (data._id) {
                  await thalassemiaAPI.update(data._id, data);
                  toast.success("Patient updated!");
                } else {
                  await thalassemiaAPI.create(data);
                  toast.success("Patient registered!");
                }
                setPatientModal(false);
                loadData();
              } catch(err) { toast.error(err.message||"Failed to save patient"); }
            }}
          />
        )}

        {viewPatient && (
          <PatientViewModal patient={viewPatient} history={viewHistory} onClose={() => setViewPatient(null)} />
        )}
      </main>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Patients Tab ──────────────────────────────────────────
function PatientsTab({ patients, canManage, onAdd, onEdit, onView, onToggleActive }) {
  const [search, setSearch]       = useState("");
  const [filterBG, setFilterBG]   = useState("");
  const [filterSt, setFilterSt]   = useState("");

  const filtered = useMemo(() => patients.filter(p => {
    const q = search.toLowerCase();
    return (
      (!q || p.name.toLowerCase().includes(q) || (p.patientId||"").toLowerCase().includes(q)) &&
      (!filterBG || p.bloodGroup===filterBG) &&
      (!filterSt || (filterSt==="active" ? p.status==="ACTIVE" : p.status!=="ACTIVE"))
    );
  }), [patients, search, filterBG, filterSt]);

  return (
    <div className="thal-section-card">
      <div className="thal-section-header">
        <h3 className="thal-section-title"><FaUsers /> All Patients ({filtered.length})</h3>
        {canManage && <button className="btn-thal-primary" onClick={onAdd}><FaPlus /> Register Patient</button>}
      </div>
      <div className="thal-filters">
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <FaSearch style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#bdc3c7", fontSize:13 }} />
          <input className="thal-filter-input" style={{ paddingLeft:30 }} placeholder="Search patient, ID..."
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="thal-filter-select" value={filterBG} onChange={e=>setFilterBG(e.target.value)}>
          <option value="">All Blood Groups</option>{BLOOD_GROUPS.map(bg=><option key={bg}>{bg}</option>)}
        </select>
        <select className="thal-filter-select" value={filterSt} onChange={e=>setFilterSt(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="thal-empty"><div className="thal-empty-icon">👥</div><p className="thal-empty-title">No patients found</p></div>
      ) : (
        <div className="thal-table-wrap">
          <table className="thal-table">
            <thead><tr><th>Patient</th><th>Blood Group</th><th>Age</th><th>Frequency</th><th>Next Due</th><th>Status</th>{canManage&&<th>Actions</th>}</tr></thead>
            <tbody>
              {filtered.map(p=>{
                const st=scheduleStatus(p.nextDueDate);
                const d=daysUntil(p.nextDueDate);
                const dueLbl=d===null?"—":d<0?`${Math.abs(d)}d overdue`:d===0?"Today":`${d}d`;
                const dueColor=st==="overdue"?"#c0392b":st==="due-soon"?"#e67e22":"#27ae60";
                return (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#8e44ad,#6c3483)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                          <div style={{ fontSize:11, color:"#7f8c8d" }}>{p.patientId||p._id?.slice(-8)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="thal-bg-chip">{p.bloodGroup}</span></td>
                    <td>{calcAge(p.dob)} yrs</td>
                    <td><span className="thal-badge bg-purple">{FREQ_LABELS[p.transfusionFrequency]||"Monthly"}</span></td>
                    <td style={{ fontWeight:700, color:dueColor, fontSize:13 }}>
                      {dueLbl}<br/>
                      <span style={{ fontWeight:400, fontSize:11, color:"#7f8c8d" }}>{formatDate(p.nextDueDate)}</span>
                    </td>
                    <td><span className={`thal-badge ${p.status==="ACTIVE"?"bg-green":"bg-gray"}`}>{p.status==="ACTIVE"?"Active":"Inactive"}</span></td>
                    {canManage && (
                      <td>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          <button className="btn-thal-sm view"  onClick={()=>onView(p)}><FaEye /> View</button>
                          <button className="btn-thal-sm edit"  onClick={()=>onEdit(p)}><FaEdit /> Edit</button>
                          <button className="btn-thal-sm deact" onClick={()=>onToggleActive(p)}>
                            {p.status==="ACTIVE"?<><FaTimesCircle /> Deactivate</>:<><FaCheckCircle /> Activate</>}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Schedule Tab ──────────────────────────────────────────
function ScheduleTab({ patients }) {
  const sorted = [...patients].filter(p=>p.status==="ACTIVE").sort((a,b)=>new Date(a.nextDueDate)-new Date(b.nextDueDate));

  return (
    <div className="thal-section-card">
      <div className="thal-section-header"><h3 className="thal-section-title"><FaCalendarAlt /> Transfusion Schedule</h3></div>
      {sorted.length === 0 ? (
        <div className="thal-empty"><div className="thal-empty-icon">📆</div><p className="thal-empty-title">No scheduled transfusions</p></div>
      ) : (
        <div className="thal-schedule-grid">
          {sorted.map(p=>{
            const st=scheduleStatus(p.nextDueDate);
            const d=daysUntil(p.nextDueDate);
            const label=d<0?`${Math.abs(d)} day(s) overdue`:d===0?"Due today":d<=3?`Due in ${d} day(s)`:`Due ${formatDate(p.nextDueDate)}`;
            return (
              <div key={p._id} className={`thal-schedule-card ${st}`}>
                <div className="thal-schedule-date-badge">{label}</div>
                <p className="thal-schedule-patient-name">{p.name}</p>
                <p className="thal-schedule-meta">
                  <span className="thal-bg-chip">{p.bloodGroup}</span>&nbsp;· {FREQ_LABELS[p.transfusionFrequency]||"Monthly"}
                </p>
                <p className="thal-schedule-meta" style={{ marginBottom:10 }}>
                  Bank: {p.preferredBankName||"—"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Record Tab ────────────────────────────────────────────
function RecordTab({ patients, history, onSaved, currentUser }) {
  const activePatients = patients.filter(p=>p.status==="ACTIVE");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm]   = useState({ transfusionDate:new Date().toISOString().split("T")[0], units:2, hbBefore:"", hbAfter:"", notes:"" });
  const [saving, setSaving] = useState(false);

  const selectedPatient = activePatients.find(p=>p._id===selectedId);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedId)     { toast.error("Please select a patient."); return; }
    if (!form.hbBefore || !form.hbAfter) { toast.error("HB readings are required."); return; }

    setSaving(true);
    try {
      await thalassemiaAPI.recordTransfusion(selectedId, {
        bloodGroup:       selectedPatient.bloodGroup,
        unitsDonated:     Number(form.units),
        hemoglobinBefore: Number(form.hbBefore),
        hemoglobinAfter:  Number(form.hbAfter),
        reactions:        form.notes,
        conductedBy:      currentUser?.name || "Admin",
        transfusionDate:  form.transfusionDate,
      });
      toast.success("Transfusion recorded successfully!");
      setSelectedId("");
      setForm({ transfusionDate:new Date().toISOString().split("T")[0], units:2, hbBefore:"", hbAfter:"", notes:"" });
      onSaved();
    } catch(err) {
      toast.error(err.message || "Failed to record transfusion");
    } finally {
      setSaving(false);
    }
  };

  const patientHistory = history.filter(h => {
    const hPatientId = h.patientId?._id || h.patientId;
    return hPatientId === selectedId;
  }).slice(0,3);

  return (
    <div className="thal-record-panel">
      <div className="thal-section-card" style={{ marginBottom:0 }}>
        <div className="thal-section-header"><h3 className="thal-section-title"><FaSyringe /> Record New Transfusion</h3></div>
        <form onSubmit={handleSave}>
          <div className="thal-form-group">
            <label className="thal-form-label">Select Patient *</label>
            <select className="thal-form-select" value={selectedId} onChange={e=>setSelectedId(e.target.value)} required>
              <option value="">— Choose patient —</option>
              {activePatients.map(p=><option key={p._id} value={p._id}>{p.name} ({p.bloodGroup}) — {p.patientId||p._id?.slice(-6)}</option>)}
            </select>
          </div>

          {selectedPatient && (
            <div style={{ background:"#f3e5f5", borderRadius:10, padding:"12px 14px", marginBottom:14, display:"flex", gap:14, flexWrap:"wrap" }}>
              <div><span style={{ fontSize:12, color:"#7f8c8d", fontWeight:700 }}>Blood Group</span><br/><span className="thal-bg-chip">{selectedPatient.bloodGroup}</span></div>
              <div><span style={{ fontSize:12, color:"#7f8c8d", fontWeight:700 }}>Frequency</span><br/><span style={{ fontSize:13, fontWeight:700 }}>{FREQ_LABELS[selectedPatient.transfusionFrequency]}</span></div>
              <div><span style={{ fontSize:12, color:"#7f8c8d", fontWeight:700 }}>Bank</span><br/><span style={{ fontSize:13, fontWeight:700 }}>{selectedPatient.preferredBankName||"—"}</span></div>
            </div>
          )}

          <div className="thal-form-row">
            <div className="thal-form-group">
              <label className="thal-form-label">Transfusion Date *</label>
              <input type="date" className="thal-form-input" value={form.transfusionDate}
                onChange={e=>set("transfusionDate",e.target.value)} max={new Date().toISOString().split("T")[0]} required />
            </div>
            <div className="thal-form-group">
              <label className="thal-form-label">Units Used *</label>
              <input type="number" className="thal-form-input" min={1} max={10} value={form.units}
                onChange={e=>set("units",e.target.value)} required />
            </div>
          </div>

          <div className="thal-form-row">
            <div className="thal-form-group">
              <label className="thal-form-label">HB Before (g/dL) *</label>
              <input type="number" step="0.1" className="thal-form-input" placeholder="e.g. 6.8"
                value={form.hbBefore} onChange={e=>set("hbBefore",e.target.value)} required />
            </div>
            <div className="thal-form-group">
              <label className="thal-form-label">HB After (g/dL) *</label>
              <input type="number" step="0.1" className="thal-form-input" placeholder="e.g. 10.2"
                value={form.hbAfter} onChange={e=>set("hbAfter",e.target.value)} required />
            </div>
          </div>

          {form.hbBefore && form.hbAfter && (
            <div className="thal-hb-display">
              <div className="thal-hb-stat"><div className="thal-hb-num">{form.hbBefore}</div><div className="thal-hb-label">Before</div></div>
              <div className="thal-hb-arrow">→</div>
              <div className="thal-hb-stat"><div className="thal-hb-num" style={{ color:"#27ae60" }}>{form.hbAfter}</div><div className="thal-hb-label">After</div></div>
              <div className="thal-hb-stat">
                <div className="thal-hb-num" style={{ color:(form.hbAfter-form.hbBefore)>0?"#27ae60":"#c0392b" }}>
                  {(Number(form.hbAfter)-Number(form.hbBefore))>=0?"+":""}{(Number(form.hbAfter)-Number(form.hbBefore)).toFixed(1)}
                </div>
                <div className="thal-hb-label">Change</div>
              </div>
            </div>
          )}

          <div className="thal-form-group" style={{ marginTop:14 }}>
            <label className="thal-form-label">Notes / Observations</label>
            <textarea className="thal-form-textarea" placeholder="Post-transfusion observations, reactions..."
              value={form.notes} onChange={e=>set("notes",e.target.value)} />
          </div>

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button type="submit" className="btn-thal-primary" disabled={saving}>
              {saving ? <><FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> Saving...</> : <><FaSyringe /> Record Transfusion</>}
            </button>
            <button type="button" className="btn-thal-ghost" onClick={() => { setSelectedId(""); setForm({ transfusionDate:new Date().toISOString().split("T")[0], units:2, hbBefore:"", hbAfter:"", notes:"" }); }}>
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="thal-section-card" style={{ marginBottom:0 }}>
        <div className="thal-section-header">
          <h3 className="thal-section-title"><FaFileMedicalAlt /> {selectedPatient ? `${selectedPatient.name}'s History` : "Select a Patient"}</h3>
        </div>
        {!selectedPatient ? (
          <div className="thal-empty"><div className="thal-empty-icon">👆</div><p className="thal-empty-sub">Select a patient to view recent history.</p></div>
        ) : patientHistory.length === 0 ? (
          <div className="thal-empty"><div className="thal-empty-icon">📋</div><p className="thal-empty-sub">No previous transfusions recorded.</p></div>
        ) : (
          <div className="thal-timeline">
            {patientHistory.map((h,i)=>(
              <div key={i} className="thal-timeline-item">
                <div className="thal-timeline-dot upcoming" />
                <div className="thal-timeline-date">{formatDate(h.transfusionDate||h.createdAt)}</div>
                <div className="thal-timeline-title">{h.unitsDonated||1} unit(s) · HB {h.hemoglobinBefore||"—"} → {h.hemoglobinAfter||"—"} g/dL</div>
                {h.reactions && <div className="thal-timeline-sub" style={{ fontStyle:"italic" }}>{h.reactions}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Patient Modal ─────────────────────────────────────────
const EMPTY_FORM = {
  name:"", bloodGroup:"", dob:"", gender:"Male", contactPhone:"",
  address:"", transfusionFrequency:"BIWEEKLY",
  preferredBankName:"", preferredBank:"",
  thalassemiaType:"MAJOR", notes:"",
};

function PatientModal({ existing, banks, onClose, onSave }) {
  const [form, setForm] = useState(existing ? { ...existing } : { ...EMPTY_FORM });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <div className="thal-modal-overlay" onClick={onClose}>
      <div className="thal-modal" style={{ maxWidth:680 }} onClick={e=>e.stopPropagation()}>
        <div className="thal-modal-header">
          <h3 className="thal-modal-title"><FaUserInjured /> {existing?"Edit Patient":"Register Patient"}</h3>
          <button className="thal-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <form onSubmit={e=>{e.preventDefault();if(!form.name||!form.bloodGroup){toast.error("Fill required fields");return;}onSave(form);}}>
          <div className="thal-modal-body">
            <p style={{ fontSize:12, color:"#7f8c8d", margin:"0 0 16px", fontWeight:600 }}>PERSONAL INFORMATION</p>
            <div className="thal-form-row">
              <div className="thal-form-group"><label className="thal-form-label">Full Name *</label><input className="thal-form-input" value={form.name} onChange={e=>set("name",e.target.value)} required /></div>
              <div className="thal-form-group"><label className="thal-form-label">Date of Birth *</label><input type="date" className="thal-form-input" value={form.dob?form.dob.slice(0,10):""} onChange={e=>set("dob",e.target.value)} /></div>
            </div>
            <div className="thal-form-row">
              <div className="thal-form-group"><label className="thal-form-label">Blood Group *</label><select className="thal-form-select" value={form.bloodGroup} onChange={e=>set("bloodGroup",e.target.value)} required><option value="">Select</option>{BLOOD_GROUPS.map(bg=><option key={bg}>{bg}</option>)}</select></div>
              <div className="thal-form-group"><label className="thal-form-label">Gender</label><select className="thal-form-select" value={form.gender} onChange={e=>set("gender",e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></div>
            </div>
            <div className="thal-form-row">
              <div className="thal-form-group"><label className="thal-form-label">Phone</label><input className="thal-form-input" value={form.contactPhone||form.phone||""} onChange={e=>set("contactPhone",e.target.value)} /></div>
              <div className="thal-form-group"><label className="thal-form-label">Address</label><input className="thal-form-input" value={form.address||""} onChange={e=>set("address",e.target.value)} /></div>
            </div>
            <p style={{ fontSize:12, color:"#7f8c8d", margin:"10px 0 14px", fontWeight:600 }}>MEDICAL INFORMATION</p>
            <div className="thal-form-row">
              <div className="thal-form-group">
                <label className="thal-form-label">Preferred Blood Bank</label>
                {banks.length > 0 ? (
                  <select className="thal-form-select" value={form.preferredBank||""} onChange={e=>{const b=banks.find(b=>b._id===e.target.value);set("preferredBank",e.target.value);if(b)set("preferredBankName",b.name);}}>
                    <option value="">Select bank</option>
                    {banks.map(b=><option key={b._id} value={b._id}>{b.name} ({b.city})</option>)}
                  </select>
                ) : (
                  <input className="thal-form-input" value={form.preferredBankName||""} onChange={e=>set("preferredBankName",e.target.value)} />
                )}
              </div>
              <div className="thal-form-group">
                <label className="thal-form-label">Transfusion Frequency</label>
                <select className="thal-form-select" value={form.transfusionFrequency} onChange={e=>set("transfusionFrequency",e.target.value)}>
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>
            <div className="thal-form-group"><label className="thal-form-label">Medical Notes</label><textarea className="thal-form-textarea" value={form.notes||""} onChange={e=>set("notes",e.target.value)} /></div>
          </div>
          <div className="thal-modal-footer">
            <button type="button" className="btn-thal-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-thal-primary"><FaCheckCircle /> {existing?"Save Changes":"Register Patient"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── View Patient Modal ────────────────────────────────────
function PatientViewModal({ patient: p, history, onClose }) {
  return (
    <div className="thal-modal-overlay" onClick={onClose}>
      <div className="thal-modal" style={{ maxWidth:620 }} onClick={e=>e.stopPropagation()}>
        <div className="thal-modal-header">
          <h3 className="thal-modal-title"><FaUserInjured /> Patient Profile</h3>
          <button className="thal-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="thal-modal-body">
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, padding:"14px 16px", background:"#f3e5f5", borderRadius:12 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#8e44ad,#6c3483)", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:20 }}>
              {getInitials(p.name)}
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:"0 0 4px", fontWeight:800, fontSize:17 }}>{p.name}</p>
              <p style={{ margin:0, fontSize:12, color:"#7f8c8d" }}>
                <span className="thal-bg-chip">{p.bloodGroup}</span>
                &nbsp;Age {calcAge(p.dob)}&nbsp;· {p.gender}&nbsp;· {p.patientId||p._id?.slice(-8)}
              </p>
            </div>
          </div>
          {[
            ["Blood Bank",   p.preferredBankName||"—"],
            ["Frequency",    FREQ_LABELS[p.transfusionFrequency]||"—"],
            ["Next Due",     formatDate(p.nextDueDate)],
            ["Last Transfusion", formatDate(p.lastTransfusionDate)],
            ["Contact",      p.contactPhone||p.phone||"—"],
            ["Address",      p.address||"—"],
          ].map(([lbl,val])=>(
            <div key={lbl} className="thal-info-item" style={{ marginBottom:10 }}>
              <div className="thal-info-label">{lbl}</div>
              <div className="thal-info-value" style={{ fontSize:13 }}>{val}</div>
            </div>
          ))}

          {p.notes && <div className="thal-alert info" style={{ marginBottom:12 }}><FaInfoCircle /><span>{p.notes}</span></div>}

          <p style={{ fontSize:13, fontWeight:800, color:"#2c3e50", margin:"0 0 10px" }}>Transfusion History ({history.length})</p>
          {history.length === 0 ? (
            <p style={{ color:"#7f8c8d", fontSize:13 }}>No records yet.</p>
          ) : (
            <div className="thal-table-wrap" style={{ maxHeight:200, overflowY:"auto" }}>
              <table className="thal-table" style={{ fontSize:12 }}>
                <thead><tr><th>Date</th><th>Units</th><th>HB Before</th><th>HB After</th></tr></thead>
                <tbody>
                  {history.map((h,i)=>(
                    <tr key={i}>
                      <td>{formatDate(h.transfusionDate||h.createdAt)}</td>
                      <td>{h.unitsDonated||1}</td>
                      <td style={{ color:"#c0392b", fontWeight:700 }}>{h.hemoglobinBefore||"—"}</td>
                      <td style={{ color:"#27ae60", fontWeight:700 }}>{h.hemoglobinAfter||"—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="thal-modal-footer">
          <button className="btn-thal-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}