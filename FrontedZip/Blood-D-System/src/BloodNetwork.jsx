// ============================================================
//  BLOODLINK PRO — BloodNetwork.jsx  (Module 7)
//  Fully connected to backend via networkAPI
//  SAVE AS: src/BloodNetwork.jsx
// ============================================================

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FaNetworkWired, FaHospital, FaTint, FaExchangeAlt, FaHistory,
  FaChartBar, FaPlus, FaEdit, FaCheckCircle, FaTimesCircle,
  FaTruck, FaBoxOpen, FaSearch, FaFilePdf, FaCity, FaPhone,
  FaEnvelope, FaBolt, FaTimes, FaMapMarkerAlt, FaUserShield,
  FaSyncAlt, FaArrowRight, FaSpinner,
} from "react-icons/fa";
import "./assets/Module7_BloodNetwork.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { networkAPI } from "./api";

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const TRANSFER_STATUSES = ["REQUESTED","APPROVED","DISPATCHED","RECEIVED","REJECTED"];
const CITIES = ["Mumbai","Delhi","Bengaluru","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad","Jaipur","Nashik","Nagpur","Surat"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
function getUser() {
  try { return JSON.parse(localStorage.getItem("blCurrentUser") || "{}"); } catch { return {}; }
}

export default function BloodNetwork() {
  const darkMode = localStorage.getItem("darkMode") === "true";
  const currentUser = useMemo(() => getUser(), []);
  const role = currentUser?.role || "DONOR";

  const [activeTab, setActiveTab]   = useState("overview");
  const [banks, setBanks]           = useState([]);
  const [stocks, setStocks]         = useState({});   // { bankId: { "A+": units, ... } }
  const [transfers, setTransfers]   = useState([]);
  const [loading, setLoading]       = useState(true);

  const [showBankModal, setShowBankModal]         = useState(false);
  const [editBank, setEditBank]                   = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showActionModal, setShowActionModal]     = useState(null);

  // ── Load all data from backend ────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [banksRes, networkStocksRes, transfersRes] = await Promise.allSettled([
        networkAPI.getBanks(),
        networkAPI.getNetworkStocks(),
        networkAPI.getTransfers({ limit:200 }),
      ]);

      if (banksRes.status === "fulfilled") {
        setBanks(banksRes.value.banks || []);
      }

      if (networkStocksRes.status === "fulfilled") {
        // Transform: [{ bank, stocks: { "A+": { total, level } } }] → { bankId: { "A+": units } }
        const transformed = {};
        (networkStocksRes.value.networkStocks || []).forEach(item => {
          transformed[item.bank._id] = {};
          BLOOD_GROUPS.forEach(bg => {
            transformed[item.bank._id][bg] = item.stocks[bg]?.total || 0;
          });
        });
        setStocks(transformed);
      }

      if (transfersRes.status === "fulfilled") {
        setTransfers(transfersRes.value.transfers || []);
      }
    } catch (err) {
      toast.error("Failed to load network data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Tabs ──────────────────────────────────────────────────
  const visibleTabs = [
    { id:"overview",  label:"Overview",    icon:<FaNetworkWired />, show: true },
    { id:"banks",     label:"Blood Banks", icon:<FaHospital />,     show: ["BB_ADMIN","SUPER_ADMIN"].includes(role) },
    { id:"stock",     label:"Stock View",  icon:<FaTint />,         show: true },
    { id:"transfers", label:"Transfers",   icon:<FaExchangeAlt />,  show: ["BB_ADMIN","SUPER_ADMIN"].includes(role) },
    { id:"history",   label:"History",     icon:<FaHistory />,      show: ["BB_ADMIN","SUPER_ADMIN"].includes(role) },
    { id:"analytics", label:"Analytics",   icon:<FaChartBar />,     show: role === "SUPER_ADMIN" },
  ].filter(t => t.show);

  // ── KPI ───────────────────────────────────────────────────
  const totalBanks    = banks.length;
  const activeBanks   = banks.filter(b => b.isActive).length;
  const pendingXfers  = transfers.filter(t => t.status === "REQUESTED").length;
  const unitsXferred  = transfers.filter(t => t.status === "RECEIVED").reduce((s,t) => s + (t.units||0), 0);
  const totalStockUnits = Object.values(stocks).reduce((sum, bankStock) =>
    sum + Object.values(bankStock).reduce((s,v) => s + v, 0), 0);

  // ── Bank CRUD ─────────────────────────────────────────────
  const handleSaveBank = async (bankData) => {
    try {
      if (editBank) {
        await networkAPI.updateBank(editBank._id, bankData);
        toast.success("Blood bank updated successfully!");
      } else {
        await networkAPI.createBank(bankData);
        toast.success("Blood bank registered successfully!");
      }
      setShowBankModal(false);
      setEditBank(null);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to save bank");
    }
  };

  const handleDeleteBank = async (bankId) => {
    if (!window.confirm("Deactivate this blood bank?")) return;
    try {
      await networkAPI.deleteBank(bankId);
      toast.success("Blood bank deleted.");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to delete bank");
    }
  };

  const handleToggleBankStatus = async (bank) => {
    try {
      await networkAPI.updateBank(bank._id, { isActive: !bank.isActive });
      toast.success("Bank status updated.");
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to update bank");
    }
  };

  // ── Transfer CRUD ─────────────────────────────────────────
  const handleCreateTransfer = async (data) => {
    try {
      await networkAPI.createTransfer(data);
      toast.success("Transfer request submitted!");
      setShowTransferModal(false);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to create transfer");
    }
  };

  const handleTransferAction = async (transferId, action, extra = {}) => {
    const statusMap = { APPROVE:"APPROVED", DISPATCH:"DISPATCHED", RECEIVE:"RECEIVED", REJECT:"REJECTED" };
    try {
      await networkAPI.updateTransferStatus(transferId, statusMap[action], extra.reason || extra.dispatchRef);
      toast.success(`Transfer ${action.toLowerCase()}d!`);
      setShowActionModal(null);
      loadData();
    } catch (err) {
      toast.error(err.message || "Action failed");
    }
  };

  // ── PDF ────────────────────────────────────────────────────
  const exportTransferPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BloodLink Pro — Transfer History Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
    autoTable(doc, {
      head: [["Route","Blood Group","Units","Status","Date"]],
      body: transfers.map(t => [
        `${t.fromBankName||t.fromBankId} → ${t.toBankName||t.toBankId}`,
        t.bloodGroup, t.units, t.status, fmtDate(t.createdAt),
      ]),
      startY: 32,
      headStyles: { fillColor:[15,52,96] },
      styles: { fontSize:10 },
    });
    doc.save(`BloodLink_TransferReport_${Date.now()}.pdf`);
    toast.success("PDF report downloaded!");
  };

  if (loading) {
    return (
      <div className={darkMode ? "dark" : ""}>
        <Sidebar darkMode={darkMode} toggleDarkMode={() => localStorage.setItem("darkMode", String(!darkMode))} />
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"70vh", flexDirection:"column", gap:12 }}>
          <FaSpinner size={36} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
          <p style={{ color:"#888" }}>Loading blood bank network...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "dashboard-container dark" : "dashboard-container"}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => { localStorage.setItem("darkMode", String(!darkMode)); window.location.reload(); }} />

      <div className="main-content">
        {/* HERO */}
        <div className="network-hero-banner">
          <div className="network-hero-left">
            <h1 className="network-hero-title"><FaNetworkWired /> Multi-City Blood Bank Network</h1>
            <p className="network-hero-sub">Cross-city coordination, inter-bank transfers & real-time stock visibility</p>
          </div>
          <div className="network-hero-right">
            <div className="network-hero-stat"><span className="network-hero-stat-num">{activeBanks}</span><span className="network-hero-stat-label">Active Banks</span></div>
            <div className="network-hero-stat"><span className="network-hero-stat-num">{totalStockUnits}</span><span className="network-hero-stat-label">Total Units</span></div>
            <div className="network-hero-stat"><span className="network-hero-stat-num">{pendingXfers}</span><span className="network-hero-stat-label">Pending Transfers</span></div>
            <div className="network-hero-stat"><span className="network-hero-stat-num">{unitsXferred}</span><span className="network-hero-stat-label">Units Transferred</span></div>
          </div>
        </div>

        {/* TABS */}
        <div className="network-tabs">
          {visibleTabs.map(tab => (
            <button key={tab.id} className={`network-tab-btn ${activeTab===tab.id?"active":""}`} onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div className="network-kpi-grid">
              {[
                { icon:<FaHospital />,     cls:"kpi-blue",   num:totalBanks,       label:"Total Blood Banks"  },
                { icon:<FaCheckCircle />,  cls:"kpi-green",  num:activeBanks,      label:"Active Banks"       },
                { icon:<FaExchangeAlt />,  cls:"kpi-orange", num:transfers.length, label:"Total Transfers"    },
                { icon:<FaTint />,         cls:"kpi-red",    num:unitsXferred,     label:"Units Transferred"  },
              ].map((k,i) => (
                <div key={i} className="network-kpi-card">
                  <div className={`network-kpi-icon ${k.cls}`}>{k.icon}</div>
                  <div><div className="network-kpi-num">{k.num}</div><div className="network-kpi-label">{k.label}</div></div>
                </div>
              ))}
            </div>

            {/* City stock overview */}
            <div className="network-card" style={{ marginBottom:20 }}>
              <div className="network-card-header"><h3 className="network-card-title"><FaCity /> City-wise Stock Overview</h3></div>
              <div className="stock-legend" style={{ marginBottom:14 }}>
                <div className="stock-legend-item"><div className="stock-legend-dot legend-good" /> Good (≥15)</div>
                <div className="stock-legend-item"><div className="stock-legend-dot legend-low" /> Low (5–14)</div>
                <div className="stock-legend-item"><div className="stock-legend-dot legend-critical" /> Critical (&lt;5)</div>
              </div>
              <div className="city-overview-grid">
               
                {Object.entries(
  banks
    .filter((b) => b.isActive)
    .reduce((acc, bank) => {
      const city = bank.city;

      if (!acc[city]) {
        acc[city] = {
          banks: 0,
          stock: {},
        };
      }

      acc[city].banks++;

      BLOOD_GROUPS.forEach((bg) => {
        acc[city].stock[bg] =
          (acc[city].stock[bg] || 0) +
          (stocks[bank._id]?.[bg] || 0);
      });

      return acc;
    }, {})
).map(([city, data]) => (
                  <div key={city} className="city-overview-card">
                    <p className="city-overview-name"><FaMapMarkerAlt style={{ color:"#c0392b", fontSize:12 }} /> {city}</p>
                    <p className="city-overview-sub">{data.banks} blood bank{data.banks>1?"s":""}</p>
                    <div className="city-blood-pills">
                      {BLOOD_GROUPS.map(bg => {
                        const u = data.stock[bg]||0;
                        const cl = u===0?"empty":u<5?"critical":u<15?"low":"good";
                        return <span key={bg} className="city-blood-pill" style={{ background:cl==="good"?"#eafaf1":cl==="low"?"#fef9e7":cl==="critical"?"#fdedec":"#f5f5f5", color:cl==="good"?"#27ae60":cl==="low"?"#e67e22":cl==="critical"?"#c0392b":"#bdc3c7" }}>{bg}: {u}</span>;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent transfers */}
            <div className="network-card">
              <div className="network-card-header"><h3 className="network-card-title"><FaExchangeAlt /> Recent Transfer Requests</h3></div>
              {transfers.length === 0 ? (
                <div className="network-empty"><div className="network-empty-icon">📦</div><p className="network-empty-title">No transfers yet</p></div>
              ) : (
                <div className="network-table-wrap">
                  <table className="network-table">
                    <thead><tr><th>From</th><th>To</th><th>Blood Group</th><th>Units</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {[...transfers].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5).map(t=>(
                        <tr key={t._id}>
                          <td style={{ fontWeight:600 }}>{t.fromBankName||"—"}</td>
                          <td style={{ fontWeight:600 }}>{t.toBankName||"—"}</td>
                          <td><span style={{ background:"#fdedec", color:"#c0392b", borderRadius:20, padding:"2px 8px", fontSize:12, fontWeight:700 }}>{t.bloodGroup}</span></td>
                          <td>{t.units}</td>
                          <td><span className={`net-status-badge ${t.status}`}>{t.status}</span></td>
                          <td style={{ fontSize:12, color:"#7f8c8d" }}>{fmtDate(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── BANKS ─────────────────────────────────────────── */}
        {activeTab === "banks" && (
          <div className="network-card">
            <div className="network-card-header">
              <h3 className="network-card-title"><FaHospital /> Blood Bank Registry</h3>
              {["BB_ADMIN","SUPER_ADMIN"].includes(role) && (
                <button className="btn-network-primary" onClick={() => { setEditBank(null); setShowBankModal(true); }}><FaPlus /> Register Bank</button>
              )}
            </div>
            {banks.length === 0 ? (
              <div className="network-empty"><div className="network-empty-icon">🏥</div><p className="network-empty-title">No blood banks registered</p></div>
            ) : (
              <div className="banks-list-grid">
                {banks.map(bank=>(
                  <div key={bank._id} className="bank-card">
                    <div className="bank-card-icon"><FaHospital /></div>
                    <div className="bank-card-body">
                      <p className="bank-card-name">{bank.name}</p>
                      <div className="bank-card-meta">
                        <span><FaMapMarkerAlt /> {bank.city}, {bank.state}</span>
                        <span><FaPhone /> {bank.contactPhone}</span>
                        <span><FaEnvelope /> {bank.contactEmail}</span>
                        <span><FaUserShield /> {bank.adminName}</span>
                        <span>Capacity: <strong>{bank.capacity}</strong></span>
                      </div>
                      <span className={`net-status-badge ${bank.isActive?"ACTIVE":"INACTIVE"}`}>{bank.isActive?"Active":"Inactive"}</span>
                    </div>
                    {["BB_ADMIN","SUPER_ADMIN"].includes(role) && (
                      <div className="bank-card-actions">
                        <button className="btn-network-ghost btn-sm" onClick={() => { setEditBank(bank); setShowBankModal(true); }}><FaEdit /></button>
                        <button className={`btn-sm ${bank.isActive?"btn-network-warning":"btn-network-success"}`}
                          style={{ borderRadius:8, border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, padding:"6px 10px", fontSize:12, fontWeight:700 }}
                          onClick={() => handleToggleBankStatus(bank)}>
                          <FaSyncAlt /> {bank.isActive?"Deactivate":"Activate"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STOCK VIEW ─────────────────────────────────────── */}
        {activeTab === "stock" && (
          <>
            <div className="network-card" style={{ marginBottom:16 }}>
              <div className="network-card-header"><h3 className="network-card-title"><FaTint /> Blood Stock Availability</h3></div>
              <div className="stock-legend">
                <div className="stock-legend-item"><div className="stock-legend-dot legend-good" /> Good (≥15)</div>
                <div className="stock-legend-item"><div className="stock-legend-dot legend-low" /> Low (5–14)</div>
                <div className="stock-legend-item"><div className="stock-legend-dot legend-critical" /> Critical (&lt;5)</div>
                <div className="stock-legend-item"><div className="stock-legend-dot legend-empty" /> Empty</div>
              </div>
            </div>
            <div className="availability-grid">
              {banks.filter(b=>b.isActive).map(bank => {
                const bankStock = stocks[bank._id] || {};
                return (
                  <div key={bank._id} className="availability-bank-card">
                    <div className="availability-bank-header">
                      <div>
                        <p className="availability-bank-name">{bank.name}</p>
                        <p className="availability-bank-city"><FaMapMarkerAlt /> {bank.city}, {bank.state}</p>
                      </div>
                      <span className={`net-status-badge ${bank.isActive?"ACTIVE":"INACTIVE"}`}>{bank.isActive?"Active":"Inactive"}</span>
                    </div>
                    <div className="availability-blood-grid">
                      {BLOOD_GROUPS.map(bg => {
                        const u = bankStock[bg]||0;
                        const cls = u===0?"stock-empty":u<5?"stock-critical":u<15?"stock-low":"stock-good";
                        const lbl = u===0?"Empty":u<5?"Critical":u<15?"Low":"Good";
                        return (
                          <div key={bg} className={`availability-blood-cell ${cls}`}>
                            <div className="availability-blood-group">{bg}</div>
                            <div className="availability-blood-units">{u}</div>
                            <div className="availability-blood-label">{lbl}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── TRANSFERS ──────────────────────────────────────── */}
        {activeTab === "transfers" && (
          <div className="network-card">
            <div className="network-card-header">
              <h3 className="network-card-title"><FaExchangeAlt /> Transfer Requests</h3>
              <button className="btn-network-primary" onClick={() => setShowTransferModal(true)}><FaPlus /> New Transfer</button>
            </div>
            {transfers.length === 0 ? (
              <div className="network-empty"><div className="network-empty-icon">📦</div><p className="network-empty-title">No transfer requests</p></div>
            ) : (
              <div className="network-table-wrap">
                <table className="network-table">
                  <thead>
                    <tr><th>Route</th><th>Blood Group</th><th>Units</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {[...transfers].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(t=>(
                      <tr key={t._id}>
                        <td>
                          <span style={{ fontWeight:600 }}>{t.fromBankName}</span>
                          <FaArrowRight style={{ color:"#7f8c8d", margin:"0 6px", fontSize:10 }} />
                          <span style={{ fontWeight:600 }}>{t.toBankName}</span>
                        </td>
                        <td><span style={{ background:"#fdedec", color:"#c0392b", borderRadius:20, padding:"2px 8px", fontSize:12, fontWeight:700 }}>{t.bloodGroup}</span></td>
                        <td style={{ fontWeight:700 }}>{t.units}</td>
                        <td><span className={`net-status-badge ${t.status}`}>{t.status}</span></td>
                        <td style={{ fontSize:12, color:"#7f8c8d" }}>{fmtDate(t.createdAt)}</td>
                        <td>
                          <div style={{ display:"flex", gap:4 }}>
                            {role==="SUPER_ADMIN"  && t.status==="REQUESTED"  && <button className="btn-network-success btn-sm" onClick={()=>setShowActionModal({transfer:t,action:"APPROVE"})}>Approve</button>}
                            {["BB_ADMIN","SUPER_ADMIN"].includes(role) && t.status==="APPROVED"  && <button className="btn-network-primary btn-sm"  onClick={()=>setShowActionModal({transfer:t,action:"DISPATCH"})}>Dispatch</button>}
                            {["BB_ADMIN","SUPER_ADMIN"].includes(role) && t.status==="DISPATCHED" && <button className="btn-network-success btn-sm" onClick={()=>setShowActionModal({transfer:t,action:"RECEIVE"})}>Received</button>}
                            {role==="SUPER_ADMIN"  && ["REQUESTED","APPROVED"].includes(t.status) && <button className="btn-network-danger btn-sm"   onClick={()=>setShowActionModal({transfer:t,action:"REJECT"})}>Reject</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ────────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="network-card">
            <div className="network-card-header">
              <h3 className="network-card-title"><FaHistory /> Transfer History</h3>
              <button className="btn-network-primary" onClick={exportTransferPDF}><FaFilePdf /> Export PDF</button>
            </div>
            {transfers.length === 0 ? (
              <div className="network-empty"><div className="network-empty-icon">📋</div><p className="network-empty-title">No transfers yet</p></div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[...transfers].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(t=>(
                  <div key={t._id} style={{ border:"1px solid #f0f0f0", borderRadius:12, padding:"16px 18px", background:"white" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontFamily:"monospace", fontSize:12, color:"#7f8c8d" }}>{(t._id||"").slice(-12)}</span>
                          <span className={`net-status-badge ${t.status}`}>{t.status}</span>
                        </div>
                        <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:15 }}>
                          {t.fromBankName} <FaArrowRight style={{ fontSize:11, color:"#7f8c8d", margin:"0 4px" }} /> {t.toBankName}
                        </p>
                        <p style={{ margin:"0 0 4px", fontSize:12, color:"#7f8c8d" }}>
                          <span style={{ background:"#fdedec", color:"#c0392b", borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{t.bloodGroup}</span>
                          &nbsp;{t.units} units · Requested: {fmtDateTime(t.createdAt)}
                          {t.approvedAt && ` · Approved: ${fmtDate(t.approvedAt)}`}
                          {t.dispatchedAt && ` · Dispatched: ${fmtDate(t.dispatchedAt)}`}
                          {t.receivedAt && ` · Received: ${fmtDate(t.receivedAt)}`}
                        </p>
                        {t.rejectionReason && <p style={{ fontSize:12, color:"#c0392b" }}>✖ Rejection: {t.rejectionReason}</p>}
                        {t.reason && <p style={{ fontSize:12, color:"#7f8c8d" }}>Note: {t.reason}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS ──────────────────────────────────────── */}
        {activeTab === "analytics" && (
          <>
            <div className="network-kpi-grid" style={{ gridTemplateColumns:"repeat(5,1fr)" }}>
              {TRANSFER_STATUSES.map((s) => {
                const colors = { REQUESTED:"#2980b9",APPROVED:"#27ae60",DISPATCHED:"#e67e22",RECEIVED:"#1e8449",REJECTED:"#c0392b" };
                return (
                  <div key={s} className="network-kpi-card">
                    <div className="network-kpi-icon" style={{ background:`${colors[s]}22`, color:colors[s] }}><FaExchangeAlt /></div>
                    <div><div className="network-kpi-num">{transfers.filter(t=>t.status===s).length}</div><div className="network-kpi-label">{s.charAt(0)+s.slice(1).toLowerCase()}</div></div>
                  </div>
                );
              })}
            </div>

            <div className="analytics-grid">
              {/* Blood group stock bars */}
              <div className="analytics-chart-card">
                <p className="analytics-chart-title"><FaTint /> Stock by Blood Group (All Banks)</p>
                <div className="bg-bar-list">
                  {BLOOD_GROUPS.map((bg, i) => {
                    const total = Object.values(stocks).reduce((s, bankStock) => s + (bankStock[bg]||0), 0);
                    const max   = Math.max(...BLOOD_GROUPS.map(g => Object.values(stocks).reduce((s, bs) => s + (bs[g]||0), 0)), 1);
                    const pct   = Math.round((total/max)*100);
                    const colors = ["#c0392b","#e74c3c","#8e44ad","#9b59b6","#2980b9","#3498db","#27ae60","#2ecc71"];
                    return (
                      <div key={bg} className="bg-bar-item">
                        <span className="bg-bar-label">{bg}</span>
                        <div className="bg-bar-track"><div className="bg-bar-fill" style={{ width:`${pct}%`, background:colors[i] }}>{pct>10&&<span className="bg-bar-count">{total}</span>}</div></div>
                        <span className="bg-bar-pct">{total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bank summary */}
              <div className="analytics-chart-card">
                <p className="analytics-chart-title"><FaHospital /> Blood Bank Status</p>
                {[
                  { label:"Total Banks",   val:banks.length,                         color:"#0f3460" },
                  { label:"Active Banks",  val:banks.filter(b=>b.isActive).length,   color:"#27ae60" },
                  { label:"Inactive",      val:banks.filter(b=>!b.isActive).length,  color:"#c0392b" },
                  { label:"Total Cities",  val:new Set(banks.map(b=>b.city)).size,   color:"#8e44ad" },
                ].map(item=>(
                  <div key={item.label} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <span style={{ fontSize:14, color:"#7f8c8d", fontWeight:600 }}>{item.label}</span>
                    <span style={{ fontSize:22, fontWeight:800, color:item.color }}>{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── MODALS ────────────────────────────────────────── */}
        {showBankModal && <BankModal bank={editBank} cities={CITIES} onSave={handleSaveBank} onClose={() => { setShowBankModal(false); setEditBank(null); }} />}
        {showTransferModal && <TransferModal banks={banks.filter(b=>b.isActive)} stocks={stocks} bloodGroups={BLOOD_GROUPS} role={role} onSave={handleCreateTransfer} onClose={() => setShowTransferModal(false)} />}
        {showActionModal && <TransferActionModal transfer={showActionModal.transfer} action={showActionModal.action} onConfirm={handleTransferAction} onClose={() => setShowActionModal(null)} />}
      </div>
    </div>
  );
}

// ── Bank Modal ────────────────────────────────────────────
function BankModal({ bank, cities, onSave, onClose }) {
  const [form, setForm] = useState({
    name:bank?.name||"", city:bank?.city||"", state:bank?.state||"",
    address:bank?.address||"", adminName:bank?.adminName||"",
    contactPhone:bank?.contactPhone||"", contactEmail:bank?.contactEmail||"",
    capacity:bank?.capacity||200, isActive:bank?.isActive??true,
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <div className="network-modal-overlay" onClick={onClose}>
      <div className="network-modal" onClick={e=>e.stopPropagation()}>
        <div className="network-modal-header">
          <h3 className="network-modal-title">{bank?"Edit Blood Bank":"Register New Blood Bank"}</h3>
          <button className="network-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <form onSubmit={e=>{e.preventDefault();if(!form.name||!form.city||!form.contactPhone){alert("Fill required fields");return;}onSave(form);}}>
          <div className="network-form-group"><label className="network-form-label">Bank Name *</label><input className="network-form-input" value={form.name} onChange={e=>set("name",e.target.value)} required /></div>
          <div className="network-form-row">
            <div className="network-form-group"><label className="network-form-label">City *</label><select className="network-form-select" value={form.city} onChange={e=>set("city",e.target.value)} required><option value="">Select</option>{cities.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="network-form-group"><label className="network-form-label">State *</label><input className="network-form-input" placeholder="e.g. Maharashtra" value={form.state} onChange={e=>set("state",e.target.value)} /></div>
          </div>
          <div className="network-form-group"><label className="network-form-label">Address</label><input className="network-form-input" value={form.address} onChange={e=>set("address",e.target.value)} /></div>
          <div className="network-form-row">
            <div className="network-form-group"><label className="network-form-label">Admin Name</label><input className="network-form-input" value={form.adminName} onChange={e=>set("adminName",e.target.value)} /></div>
            <div className="network-form-group"><label className="network-form-label">Capacity</label><input type="number" className="network-form-input" value={form.capacity} onChange={e=>set("capacity",Number(e.target.value))} /></div>
          </div>
          <div className="network-form-row">
            <div className="network-form-group"><label className="network-form-label">Contact Phone *</label><input className="network-form-input" value={form.contactPhone} onChange={e=>set("contactPhone",e.target.value)} required /></div>
            <div className="network-form-group"><label className="network-form-label">Contact Email</label><input type="email" className="network-form-input" value={form.contactEmail} onChange={e=>set("contactEmail",e.target.value)} /></div>
          </div>
          <div className="network-modal-footer">
            <button type="button" className="btn-network-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-network-primary">{bank?"Save Changes":"Register Bank"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Transfer Modal ────────────────────────────────────────
function TransferModal({ banks, stocks, bloodGroups, role, onSave, onClose }) {
  const [form, setForm] = useState({ fromBankId:"", toBankId:"", bloodGroup:"", units:"", reason:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const avail = form.fromBankId && form.bloodGroup ? (stocks[form.fromBankId]?.[form.bloodGroup]||0) : null;

  return (
    <div className="network-modal-overlay" onClick={onClose}>
      <div className="network-modal" onClick={e=>e.stopPropagation()}>
        <div className="network-modal-header">
          <h3 className="network-modal-title">Create Inter-Bank Transfer Request</h3>
          <button className="network-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <form onSubmit={e=>{e.preventDefault();if(!form.fromBankId||!form.toBankId||!form.bloodGroup||!form.units){alert("Fill all fields");return;}if(form.fromBankId===form.toBankId){alert("Source and destination must be different");return;}onSave({ fromBankId:form.fromBankId, toBankId:form.toBankId, bloodGroup:form.bloodGroup, units:Number(form.units), reason:form.reason });}}>
          <div className="network-form-row">
            <div className="network-form-group">
              <label className="network-form-label">From Bank (Source) *</label>
              <select className="network-form-select" value={form.fromBankId} onChange={e=>set("fromBankId",e.target.value)} required>
                <option value="">Select source bank</option>
                {banks.map(b=><option key={b._id} value={b._id}>{b.name} ({b.city})</option>)}
              </select>
            </div>
            <div className="network-form-group">
              <label className="network-form-label">To Bank (Destination) *</label>
              <select className="network-form-select" value={form.toBankId} onChange={e=>set("toBankId",e.target.value)} required>
                <option value="">Select destination bank</option>
                {banks.filter(b=>b._id!==form.fromBankId).map(b=><option key={b._id} value={b._id}>{b.name} ({b.city})</option>)}
              </select>
            </div>
          </div>
          <div className="network-form-row">
            <div className="network-form-group">
              <label className="network-form-label">Blood Group *</label>
              <select className="network-form-select" value={form.bloodGroup} onChange={e=>set("bloodGroup",e.target.value)} required>
                <option value="">Select blood group</option>
                {bloodGroups.map(bg=><option key={bg}>{bg}</option>)}
              </select>
              {avail!==null && <p style={{ margin:"4px 0 0", fontSize:12, fontWeight:600, color:avail<5?"#c0392b":avail<15?"#e67e22":"#27ae60" }}>Available at source: {avail} units</p>}
            </div>
            <div className="network-form-group">
              <label className="network-form-label">Units Requested *</label>
              <input type="number" className="network-form-input" placeholder="e.g. 10" min={1} value={form.units} onChange={e=>set("units",e.target.value)} required />
            </div>
          </div>
          <div className="network-form-group">
            <label className="network-form-label">Reason / Notes</label>
            <textarea className="network-form-textarea" placeholder="Reason for transfer..." value={form.reason} onChange={e=>set("reason",e.target.value)} />
          </div>
          <div className="network-modal-footer">
            <button type="button" className="btn-network-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-network-primary"><FaPlus /> Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Transfer Action Modal ─────────────────────────────────
function TransferActionModal({ transfer, action, onConfirm, onClose }) {
  const [dispatchRef, setDispatchRef] = useState("");
  const [reason, setReason]           = useState("");

  const cfg = {
    APPROVE:  { title:"Approve Transfer",  color:"#27ae60", icon:<FaCheckCircle />, btn:"Approve" },
    DISPATCH: { title:"Confirm Dispatch",  color:"#e67e22", icon:<FaTruck />,        btn:"Mark as Dispatched" },
    RECEIVE:  { title:"Confirm Receipt",   color:"#27ae60", icon:<FaBoxOpen />,      btn:"Mark as Received" },
    REJECT:   { title:"Reject Transfer",   color:"#c0392b", icon:<FaTimesCircle />,  btn:"Reject Transfer" },
  };
  const c = cfg[action] || cfg.APPROVE;

  return (
    <div className="network-modal-overlay" onClick={onClose}>
      <div className="network-modal" style={{ maxWidth:460 }} onClick={e=>e.stopPropagation()}>
        <div className="network-modal-header">
          <h3 className="network-modal-title" style={{ color:c.color }}>{c.icon} {c.title}</h3>
          <button className="network-modal-close" onClick={onClose}><FaTimes /></button>
        </div>
        <div style={{ marginBottom:18 }}>
          <div style={{ background:"#f8f9fa", borderRadius:8, padding:"12px 14px", fontSize:13 }}>
            <p style={{ margin:"0 0 4px" }}><strong>Route:</strong> {transfer.fromBankName} → {transfer.toBankName}</p>
            <p style={{ margin:"0 0 4px" }}><strong>Blood Group:</strong> {transfer.bloodGroup}</p>
            <p style={{ margin:0 }}><strong>Units:</strong> {transfer.units}</p>
          </div>
        </div>
        {action==="DISPATCH" && (
          <div className="network-form-group"><label className="network-form-label">Dispatch Reference</label><input className="network-form-input" placeholder="e.g. MH-12-AB-1234" value={dispatchRef} onChange={e=>setDispatchRef(e.target.value)} /></div>
        )}
        {action==="REJECT" && (
          <div className="network-form-group"><label className="network-form-label">Rejection Reason *</label><textarea className="network-form-textarea" value={reason} onChange={e=>setReason(e.target.value)} /></div>
        )}
        <div className="network-modal-footer">
          <button className="btn-network-ghost" onClick={onClose}>Cancel</button>
          <button style={{ background:`linear-gradient(135deg,${c.color},${c.color}cc)`, color:"white", border:"none", borderRadius:8, padding:"10px 18px", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}
            onClick={() => {
              if(action==="REJECT"&&!reason.trim()){alert("Enter rejection reason");return;}
              onConfirm(transfer._id, action, { dispatchRef, reason });
            }}>
            {c.icon} {c.btn}
          </button>
        </div>
      </div>
    </div>
  );
}