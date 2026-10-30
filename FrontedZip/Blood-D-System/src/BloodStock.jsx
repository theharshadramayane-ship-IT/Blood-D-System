// ============================================================
//  BLOODLINK PRO — BloodStock.jsx  (Module 4)
//  Fully connected to backend via stockAPI
//  SAVE AS: src/BloodStock.jsx
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import "./assets/Style.css";
import "./assets/Module4_BloodStock.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { stockAPI } from "./api";
import {
  FaTint, FaExclamationTriangle, FaCheckCircle, FaClock,
  FaPlus, FaFilePdf, FaTrash, FaBoxOpen, FaChartBar,
  FaHistory, FaBell, FaSpinner,
} from "react-icons/fa";

const BLOOD_GROUPS  = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const LEVEL_CONFIG  = {
  CRITICAL: { label:"⚠️ Critical", color:"#e74c3c", bg:"#fdf0f0" },
  LOW:      { label:"🟠 Low",      color:"#e67e22", bg:"#fdf6ec" },
  GOOD:     { label:"✅ Good",     color:"#27ae60", bg:"#eafaf1" },
};
const today = () => new Date().toISOString().split("T")[0];
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));

function BloodStock() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  // ── API data ──────────────────────────────────────────────
  const [stocks, setStocks]         = useState([]);
  const [summary, setSummary]       = useState({});
  const [lowAlerts, setLowAlerts]   = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);

  // ── Filters ───────────────────────────────────────────────
  const [filterGroup, setFilterGroup]   = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const emptyForm = { bloodGroup:"A+", units:"", expiryDate:"", hospital:"", source:"DONATION" };
  const [form, setForm] = useState(emptyForm);

  // ── Load data from backend ────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stockRes, summaryRes, alertRes] = await Promise.allSettled([
        stockAPI.list({ limit:100 }),
        stockAPI.summary(),
        stockAPI.alerts(),
      ]);

      if (stockRes.status   === "fulfilled") setStocks(stockRes.value.stocks     || []);
      if (summaryRes.status === "fulfilled") setSummary(summaryRes.value.summary  || {});
      if (alertRes.status   === "fulfilled") {
        setLowAlerts(alertRes.value.lowAlerts    || []);
        setExpiringSoon(alertRes.value.expiringSoon || []);
      }
    } catch (err) {
      toast.error("Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Add new stock ─────────────────────────────────────────
  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!form.units || !form.expiryDate || !form.hospital.trim()) {
      toast.error("Please fill all required fields"); return;
    }
    if (Number(form.units) <= 0)               { toast.error("Units must be greater than 0"); return; }
    if (new Date(form.expiryDate) <= new Date()) { toast.error("Expiry date must be in the future"); return; }

    setSaving(true);
    try {
      await stockAPI.add({
        bloodGroup: form.bloodGroup,
        units:      Number(form.units),
        expiryDate: form.expiryDate,
        hospital:   form.hospital.trim(),
        source:     form.source,
      });
      toast.success(`✅ ${form.units} units of ${form.bloodGroup} added!`);
      setForm(emptyForm);
      setActiveTab("overview");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to add stock");
    } finally {
      setSaving(false);
    }
  };

  // ── Dispatch ──────────────────────────────────────────────
  const handleDispatch = async (id) => {
    try {
      await stockAPI.update(id, { status:"DISPATCHED" });
      toast.success("🚀 Unit dispatched successfully (FIFO)");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to dispatch");
    }
  };

  // ── Mark Expired ──────────────────────────────────────────
  const handleMarkExpired = async (id) => {
    try {
      await stockAPI.update(id, { status:"EXPIRED" });
      toast.warning("⚠️ Unit marked as expired");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to update");
    }
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this stock record permanently?")) return;
    try {
      await stockAPI.delete(id);
      toast.info("Record deleted");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  // ── Derived values ────────────────────────────────────────
  const totalAvailable = stocks
    .filter((s) => s.status === "AVAILABLE")
    .reduce((sum, s) => sum + Number(s.units), 0);

  const getGroupInfo = (bg) => summary[bg] || { total:0, level:"CRITICAL" };

  // ── PDF Report ────────────────────────────────────────────
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(192, 57, 43);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("BloodLink Pro — Blood Stock Report", 14, 12);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 32,
      head: [["Blood Group","Available Units","Status"]],
      body: BLOOD_GROUPS.map((g) => {
        const info = getGroupInfo(g);
        return [g, info.total, info.level];
      }),
      theme: "grid",
      headStyles: { fillColor:[192,57,43], textColor:255 },
    });

    const avail = stocks.filter((s) => s.status === "AVAILABLE")
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 12,
      head: [["Blood Group","Units","Expiry","Source","Added On"]],
      body: avail.map((s) => [
        s.bloodGroup, s.units,
        new Date(s.expiryDate).toLocaleDateString(),
        s.hospital, new Date(s.createdAt).toLocaleDateString(),
      ]),
      theme: "striped",
      headStyles: { fillColor:[44,62,80], textColor:255 },
      styles: { fontSize:9 },
    });

    doc.save(`BloodLink_StockReport_${today()}.pdf`);
    toast.success("📄 PDF report downloaded!");
  };

  // ── Tabs config ───────────────────────────────────────────
  const alertCount = lowAlerts.length + expiringSoon.length;
  const TABS = [
    { id:"overview", label:"📊 Overview"   },
    { id:"add",      label:"➕ Add Stock"  },
    { id:"expiry",   label:`⏰ Expiry Tracker${expiringSoon.length>0?` (${expiringSoon.length})`:""}`   },
    { id:"alerts",   label:`🔔 Alerts${alertCount>0?` (${alertCount})`:""}`    },
    { id:"history",  label:"📋 Full History" },
  ];

  // ── Loading state ─────────────────────────────────────────
  if (loading) {
    return (
      <div className={`dashboard-container${darkMode?" dark":""}`}>
        <Sidebar darkMode={darkMode} toggleDarkMode={() => { const n=!darkMode; setDarkMode(n); localStorage.setItem("darkMode",String(n)); }} />
        <div className="main-content" style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"70vh", flexDirection:"column", gap:12 }}>
          <FaSpinner size={36} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
          <p style={{ color:"#888" }}>Loading blood stock inventory...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  // ── Tab: Overview ─────────────────────────────────────────
  const renderOverview = () => (
    <div className="bs-overview">
      <div className="bs-kpi-row">
        {[
          { icon:<FaTint />,               color:"#c0392b", value:totalAvailable,   label:"Total Available Units" },
          { icon:<FaExclamationTriangle />, color:"#e74c3c", value:lowAlerts.filter(a=>a.level==="CRITICAL").length, label:"Critical Blood Groups" },
          { icon:<FaClock />,              color:"#e67e22", value:expiringSoon.length, label:"Expiring in 7 Days" },
          { icon:<FaCheckCircle />,        color:"#27ae60", value:BLOOD_GROUPS.filter(g=>getGroupInfo(g).level==="GOOD").length, label:"Groups Well Stocked" },
        ].map((kpi, i) => (
          <div key={i} className="bs-kpi-card">
            <div className="bs-kpi-icon" style={{ color:kpi.color }}>{kpi.icon}</div>
            <div className="bs-kpi-value">{kpi.value}</div>
            <div className="bs-kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      <h3 className="bs-section-title"><FaChartBar style={{ color:"#c0392b" }} /> Blood Group Inventory</h3>
      <div className="bs-blood-grid">
        {BLOOD_GROUPS.map((group) => {
          const info = getGroupInfo(group);
          const cfg  = LEVEL_CONFIG[info.level] || LEVEL_CONFIG.CRITICAL;
          const pct  = Math.min(Math.round((info.total / 30) * 100), 100);
          return (
            <div key={group} className="bs-blood-card" style={{ "--card-accent":cfg.color }}>
              <div className="bs-blood-top">
                <span className="bs-blood-group-label">{group}</span>
                <span className="bs-blood-level-badge" style={{ background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
              </div>
              <div className="bs-blood-units-num" style={{ color:cfg.color }}>{info.total}</div>
              <div className="bs-blood-units-sub">units available</div>
              <div className="bs-blood-bar-bg">
                <div className="bs-blood-bar-fill" style={{ width:`${pct}%`, background:cfg.color }} />
              </div>
              <div className="bs-blood-bar-pct" style={{ color:cfg.color }}>{pct}% of target (30 units)</div>
            </div>
          );
        })}
      </div>

      {lowAlerts.filter(a=>a.level==="CRITICAL").length > 0 && (
        <div className="bs-inline-alert bs-inline-critical">
          <FaExclamationTriangle />
          <strong>Action Required:</strong>{" "}
          {lowAlerts.filter(a=>a.level==="CRITICAL").map(a=>a.bloodGroup).join(", ")}{" "}
          blood groups are critically low. Please add stock immediately.
        </div>
      )}

      <div className="bs-pdf-row">
        <button className="bs-pdf-btn" onClick={generatePDF}><FaFilePdf /> Download Full Stock Report (PDF)</button>
        <button className="bs-add-quick-btn" onClick={() => setActiveTab("add")}><FaPlus /> Add New Stock</button>
      </div>
    </div>
  );

  // ── Tab: Add Stock ────────────────────────────────────────
  const renderAddStock = () => (
    <div className="bs-add-wrap">
      <h3 className="bs-section-title"><FaPlus style={{ color:"#c0392b" }} /> Add New Blood Stock Entry</h3>
      <form className="bs-add-form" onSubmit={handleAddStock}>
        <div className="bs-form-grid">
          <div className="bs-form-group">
            <label>Blood Group <span className="bs-required">*</span></label>
            <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup:e.target.value })}>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="bs-form-group">
            <label>Units (bags) <span className="bs-required">*</span></label>
            <input type="number" min="1" placeholder="e.g. 10"
              value={form.units} onChange={(e) => setForm({ ...form, units:e.target.value })} />
          </div>
          <div className="bs-form-group">
            <label>Expiry Date <span className="bs-required">*</span></label>
            <input type="date" min={today()}
              value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate:e.target.value })} />
          </div>
          <div className="bs-form-group">
            <label>Source / Hospital <span className="bs-required">*</span></label>
            <input type="text" placeholder="e.g. City Hospital, Donation Camp #5"
              value={form.hospital} onChange={(e) => setForm({ ...form, hospital:e.target.value })} />
          </div>
          <div className="bs-form-group">
            <label>Source Type</label>
            <select value={form.source} onChange={(e) => setForm({ ...form, source:e.target.value })}>
              <option value="DONATION">Donation Camp</option>
              <option value="WALK_IN">Walk-in Donation</option>
              <option value="TRANSFER">Inter-Bank Transfer</option>
              <option value="PURCHASE">Emergency Purchase</option>
            </select>
          </div>
        </div>

        {form.units && form.bloodGroup && form.expiryDate && (
          <div className="bs-preview-card">
            <strong>Preview:</strong> Adding{" "}
            <span className="bs-inline-group">{form.bloodGroup}</span> × {form.units} units — expires{" "}
            {new Date(form.expiryDate).toLocaleDateString()} — from {form.hospital || "…"}
          </div>
        )}

        <div className="bs-form-actions">
          <button type="submit" className="bs-submit-btn" disabled={saving}>
            {saving
              ? <><FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> Adding...</>
              : <><FaPlus /> Add to Inventory</>}
          </button>
          <button type="button" className="bs-reset-btn" onClick={() => setForm(emptyForm)}>Reset</button>
        </div>
      </form>

      {/* Recent stock table */}
      <h3 className="bs-section-title" style={{ marginTop:36 }}><FaHistory /> Recent Stock Entries</h3>
      <div className="bs-table-scroll">
        <table className="bs-table">
          <thead>
            <tr><th>Blood Group</th><th>Units</th><th>Expiry Date</th><th>Source</th><th>Type</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {stocks.length === 0 ? (
              <tr><td colSpan={7} className="bs-table-empty">No stock records yet.</td></tr>
            ) : (
              [...stocks]
                .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))
                .slice(0,20)
                .map((s) => (
                  <tr key={s._id} className={s.status==="EXPIRED"?"bs-row-expired":""}>
                    <td><span className="bs-group-chip bs-chip-sm">{s.bloodGroup}</span></td>
                    <td>{s.units}</td>
                    <td>{new Date(s.expiryDate).toLocaleDateString()}</td>
                    <td className="bs-td-source">{s.hospital}</td>
                    <td><span className="bs-source-tag">{s.source}</span></td>
                    <td><span className={`bs-status-chip bs-status-${s.status.toLowerCase()}`}>{s.status}</span></td>
                    <td className="bs-td-actions">
                      {s.status === "AVAILABLE" && (
                        <>
                          <button className="bs-btn-sm bs-btn-dispatch" onClick={() => handleDispatch(s._id)}>Dispatch</button>
                          <button className="bs-btn-sm bs-btn-expire"   onClick={() => handleMarkExpired(s._id)}>Expire</button>
                        </>
                      )}
                      <button className="bs-btn-sm bs-btn-delete" onClick={() => handleDelete(s._id)}><FaTrash /></button>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Tab: Expiry Tracker ───────────────────────────────────
  const renderExpiryTracker = () => {
    const expired = stocks.filter((s) => s.status === "EXPIRED");
    return (
      <div className="bs-expiry-wrap">
        <h3 className="bs-section-title">
          <FaClock style={{ color:"#e67e22" }} /> Units Expiring Within 7 Days
          {expiringSoon.length > 0 && <span className="bs-count-badge bs-badge-warn">{expiringSoon.length}</span>}
        </h3>

        {expiringSoon.length === 0 ? (
          <div className="bs-empty-state">
            <FaCheckCircle className="bs-empty-icon bs-empty-green" />
            <p>No units expiring in the next 7 days.</p>
          </div>
        ) : (
          <div className="bs-expiry-cards">
            {expiringSoon.map((s) => {
              const d   = daysUntil(s.expiryDate);
              const urg = d <= 2 ? "urgent" : "warn";
              return (
                <div key={s._id} className={`bs-expiry-card bs-expiry-${urg}`}>
                  <div className="bs-expiry-top">
                    <span className="bs-group-chip bs-chip-lg">{s.bloodGroup}</span>
                    <span className={`bs-days-pill bs-days-${urg}`}>{d} day{d!==1?"s":""} left</span>
                  </div>
                  <div className="bs-expiry-meta">
                    <div><strong>Units:</strong> {s.units}</div>
                    <div><strong>Expires:</strong> {new Date(s.expiryDate).toLocaleDateString()}</div>
                    <div><strong>Source:</strong> {s.hospital}</div>
                  </div>
                  <div className="bs-expiry-actions">
                    <button className="bs-btn-dispatch-full" onClick={() => handleDispatch(s._id)}>🚀 Dispatch Now (FIFO)</button>
                    <button className="bs-btn-expire-sm"     onClick={() => handleMarkExpired(s._id)}>Mark Expired</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bs-fifo-note">
          <strong>ℹ️ FIFO Rule:</strong> Oldest expiry dates should be dispatched first to minimise wastage.
        </div>

        <h3 className="bs-section-title" style={{ marginTop:32 }}>Expired Units Archive</h3>
        <div className="bs-table-scroll">
          <table className="bs-table">
            <thead><tr><th>Blood Group</th><th>Units</th><th>Expired On</th><th>Source</th></tr></thead>
            <tbody>
              {expired.length === 0
                ? <tr><td colSpan={4} className="bs-table-empty">No expired units on record</td></tr>
                : expired.map((s) => (
                    <tr key={s._id} className="bs-row-expired">
                      <td><span className="bs-group-chip bs-chip-sm">{s.bloodGroup}</span></td>
                      <td>{s.units}</td>
                      <td>{new Date(s.expiryDate).toLocaleDateString()}</td>
                      <td>{s.hospital}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ── Tab: Alerts ───────────────────────────────────────────
  const renderAlerts = () => {
    const critical = lowAlerts.filter((a) => a.level === "CRITICAL");
    const low      = lowAlerts.filter((a) => a.level === "LOW");

    return (
      <div className="bs-alerts-wrap">
        <h3 className="bs-section-title"><FaBell style={{ color:"#c0392b" }} /> Active Stock Alerts</h3>

        {alertCount === 0 ? (
          <div className="bs-empty-state">
            <FaCheckCircle className="bs-empty-icon bs-empty-green" />
            <p>All blood groups are well-stocked. No alerts at this time!</p>
          </div>
        ) : (
          <>
            {critical.length > 0 && (
              <section className="bs-alert-section">
                <div className="bs-alert-section-header bs-header-critical">
                  🚨 Critical Shortages — Immediate Action Required
                  <span className="bs-count-badge">{critical.length}</span>
                </div>
                {critical.map((a, i) => (
                  <div key={i} className="bs-alert-row bs-alert-critical">
                    <span className="bs-group-chip bs-chip-alert">{a.bloodGroup}</span>
                    <div className="bs-alert-text"><strong>CRITICAL SHORTAGE</strong> — Only {a.total} units remaining</div>
                    <button className="bs-alert-action" onClick={() => setActiveTab("add")}>+ Add Stock</button>
                  </div>
                ))}
              </section>
            )}

            {low.length > 0 && (
              <section className="bs-alert-section">
                <div className="bs-alert-section-header bs-header-low">
                  ⚠️ Low Stock Warnings
                  <span className="bs-count-badge bs-badge-orange">{low.length}</span>
                </div>
                {low.map((a, i) => (
                  <div key={i} className="bs-alert-row bs-alert-low">
                    <span className="bs-group-chip bs-chip-alert">{a.bloodGroup}</span>
                    <div className="bs-alert-text"><strong>LOW STOCK</strong> — {a.total} units remaining</div>
                    <button className="bs-alert-action bs-action-orange" onClick={() => setActiveTab("add")}>+ Add Stock</button>
                  </div>
                ))}
              </section>
            )}

            {expiringSoon.length > 0 && (
              <section className="bs-alert-section">
                <div className="bs-alert-section-header bs-header-expiry">
                  🕐 Expiry Warnings (within 7 days)
                  <span className="bs-count-badge bs-badge-blue">{expiringSoon.length}</span>
                </div>
                {expiringSoon.map((s, i) => (
                  <div key={i} className="bs-alert-row bs-alert-expiry">
                    <span className="bs-group-chip bs-chip-alert">{s.bloodGroup}</span>
                    <div className="bs-alert-text">
                      <strong>EXPIRY ALERT</strong> — {s.bloodGroup} ({s.units} units) expires in {daysUntil(s.expiryDate)} days
                    </div>
                    <button className="bs-alert-action bs-action-blue" onClick={() => setActiveTab("expiry")}>View Units</button>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    );
  };

  // ── Tab: History ──────────────────────────────────────────
  const renderHistory = () => {
    const filtered = stocks.filter((s) => {
      const g = filterGroup  === "ALL" || s.bloodGroup === filterGroup;
      const t = filterStatus === "ALL" || s.status     === filterStatus;
      return g && t;
    });

    return (
      <div className="bs-history-wrap">
        <h3 className="bs-section-title"><FaHistory style={{ color:"#c0392b" }} /> Complete Stock History</h3>
        <div className="bs-filter-bar">
          <div className="bs-filter-group">
            <label>Blood Group</label>
            <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
              <option value="ALL">All Groups</option>
              {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="bs-filter-group">
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
          <div className="bs-filter-result">
            Showing <strong>{filtered.length}</strong> of {stocks.length} records
          </div>
          <button className="bs-pdf-btn-sm" onClick={generatePDF}><FaFilePdf /> Export PDF</button>
        </div>

        <div className="bs-table-scroll">
          <table className="bs-table">
            <thead>
              <tr><th>Blood Group</th><th>Units</th><th>Expiry Date</th><th>Source</th><th>Source Type</th><th>Added On</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={7} className="bs-table-empty">No records match the selected filters.</td></tr>
                : [...filtered]
                    .sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))
                    .map((s) => (
                      <tr key={s._id} className={s.status==="EXPIRED"?"bs-row-expired":""}>
                        <td><span className="bs-group-chip bs-chip-sm">{s.bloodGroup}</span></td>
                        <td>{s.units}</td>
                        <td>{new Date(s.expiryDate).toLocaleDateString()}</td>
                        <td className="bs-td-source">{s.hospital}</td>
                        <td><span className="bs-source-tag">{s.source||"DONATION"}</span></td>
                        <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td><span className={`bs-status-chip bs-status-${s.status.toLowerCase()}`}>{s.status}</span></td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className={`dashboard-container${darkMode?" dark":""}`}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => { const n=!darkMode; setDarkMode(n); localStorage.setItem("darkMode",String(n)); }} />
      <div className="main-content">
        <div className="bs-page-header">
          <div className="bs-page-header-left">
            <h2 className="bs-page-title"><FaTint className="bs-title-icon" /> Blood Stock &amp; Inventory</h2>
            <p className="bs-page-sub">Module 4 — Real-time inventory management, expiry tracking &amp; FIFO dispatch</p>
          </div>
          <div className="bs-page-header-right">
            {alertCount > 0 && (
              <div className="bs-header-alert-pill" onClick={() => setActiveTab("alerts")}>
                <FaBell /> {alertCount} Active Alert{alertCount!==1?"s":""}
              </div>
            )}
          </div>
        </div>

        <div className="bs-tab-bar">
          {TABS.map((t) => (
            <button key={t.id} className={`bs-tab${activeTab===t.id?" bs-tab-active":""}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bs-content">
          {activeTab === "overview" && renderOverview()}
          {activeTab === "add"      && renderAddStock()}
          {activeTab === "expiry"   && renderExpiryTracker()}
          {activeTab === "alerts"   && renderAlerts()}
          {activeTab === "history"  && renderHistory()}
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}

export default BloodStock;