// ============================================================
//  BLOODLINK PRO — Donor.jsx
//  Admin: View & Manage all registered donors from backend
//  SAVE AS: src/Donor.jsx
// ============================================================

import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";
import { donorsAPI } from "./api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FaSearch, FaDownload, FaUserSlash, FaUserCheck,
  FaSpinner, FaTint, FaFilter,
} from "react-icons/fa";

const BLOOD_GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
const CITIES = [
  "Mumbai","Delhi","Bangalore","Hyderabad","Chennai",
  "Kolkata","Pune","Ahmedabad","Jaipur","Surat","Nashik","Nagpur",
];

function Donor() {
  const [darkMode, setDarkMode]     = useState(false);
  const [donors, setDonors]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState(null); // which donor is being updated

  // ── Filters ───────────────────────────────────────────────
  const [search, setSearch]         = useState("");
  const [filterBlood, setFilterBlood] = useState("");
  const [filterCity, setFilterCity]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // ── Pagination ────────────────────────────────────────────
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 15;

  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme === "true") setDarkMode(true);
    loadDonors();
  }, [page, filterBlood, filterCity, filterStatus]);

  const loadDonors = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filterBlood)  params.bloodGroup = filterBlood;
      if (filterCity)   params.city       = filterCity;
      if (filterStatus) params.status     = filterStatus;
      if (search.trim()) params.search    = search.trim();

      const data = await donorsAPI.list(params);
      setDonors(data.donors || []);
      setTotal(data.total   || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load donors");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadDonors();
  };

  // ── Suspend / Activate ────────────────────────────────────
  const toggleStatus = async (donor) => {
    const newStatus = donor.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirm   = window.confirm(`${newStatus === "SUSPENDED" ? "Suspend" : "Activate"} ${donor.name}?`);
    if (!confirm) return;

    setActionId(donor._id);
    try {
      await donorsAPI.updateStatus(donor._id, newStatus);
      toast.success(`${donor.name} ${newStatus === "SUSPENDED" ? "suspended" : "activated"} ✅`);
      setDonors((prev) =>
        prev.map((d) => d._id === donor._id ? { ...d, status: newStatus } : d)
      );
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setActionId(null);
    }
  };

  // ── PDF Download ──────────────────────────────────────────
  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("BloodLink Pro — Donor Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${total}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["#","Name","Blood Group","City","Phone","Status","Donations"]],
      body: donors.map((d, i) => [
        i + 1, d.name, d.bloodGroup || "—", d.city,
        d.phone || "—", d.status, d.totalDonations || 0,
      ]),
    });

    doc.save("donors-report.pdf");
    toast.success("PDF Downloaded ✅");
  };

  const totalPages = Math.ceil(total / LIMIT);

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
            <h1 style={{ margin:0 }}>🩸 Donor Management</h1>
            <p style={{ color:"#888", fontSize:14, margin:"4px 0 0" }}>
              Total registered donors: <strong>{total}</strong>
            </p>
          </div>
          <button className="pdf-btn" onClick={downloadPDF}>
            <FaDownload /> Download PDF
          </button>
        </div>

        {/* ── SEARCH + FILTERS ──────────────────────────── */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
          <form onSubmit={handleSearch} style={{ display:"flex", gap:8, flex:1 }}>
            <div style={{ position:"relative", flex:1 }}>
              <FaSearch style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"#aaa" }} />
              <input
                type="text" placeholder="Search by name, email..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft:32, width:"100%", height:38, borderRadius:8, border:"1px solid #ddd", boxSizing:"border-box" }}
              />
            </div>
            <button type="submit" className="pdf-btn">Search</button>
          </form>

          <select value={filterBlood} onChange={(e) => { setFilterBlood(e.target.value); setPage(1); }}
            style={{ padding:"0 12px", borderRadius:8, border:"1px solid #ddd", height:38 }}>
            <option value="">All Blood Groups</option>
            {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
          </select>

          <select value={filterCity} onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}
            style={{ padding:"0 12px", borderRadius:8, border:"1px solid #ddd", height:38 }}>
            <option value="">All Cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            style={{ padding:"0 12px", borderRadius:8, border:"1px solid #ddd", height:38 }}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {/* ── TABLE ─────────────────────────────────────── */}
        {loading ? (
          <div style={{ display:"flex", justifyContent:"center", padding:60, flexDirection:"column", alignItems:"center", gap:12 }}>
            <FaSpinner size={32} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
            <p style={{ color:"#888" }}>Loading donors from database...</p>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : donors.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:"#888" }}>
            <FaTint size={48} style={{ opacity:0.3, marginBottom:12 }} />
            <p>No donors found matching your filters.</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Blood Group</th>
                  <th>City</th>
                  <th>Phone</th>
                  <th>Donations</th>
                  <th>Points</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {donors.map((d, i) => (
                  <tr key={d._id}>
                    <td>{(page - 1) * LIMIT + i + 1}</td>
                    <td>
                      <strong>{d.name}</strong>
                      <div style={{ fontSize:11, color:"#aaa" }}>{d.email}</div>
                    </td>
                    <td>
                      <span className="blood-badge sm">{d.bloodGroup || "—"}</span>
                    </td>
                    <td>{d.city || "—"}</td>
                    <td>{d.phone || "—"}</td>
                    <td style={{ textAlign:"center" }}>{d.totalDonations || 0}</td>
                    <td style={{ textAlign:"center", color:"#27ae60", fontWeight:700 }}>{d.points || 0}</td>
                    <td>
                      <span style={{
                        padding:"3px 10px", borderRadius:12, fontSize:11, fontWeight:700,
                        background: d.status === "ACTIVE" ? "#d5f5e3" : "#fde8e8",
                        color:      d.status === "ACTIVE" ? "#1e8449" : "#c0392b",
                      }}>
                        {d.status || "ACTIVE"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleStatus(d)}
                        disabled={actionId === d._id}
                        style={{
                          display:"flex", alignItems:"center", gap:4,
                          padding:"5px 10px", borderRadius:6, border:"none",
                          cursor:"pointer", fontSize:12, fontWeight:600,
                          background: d.status === "ACTIVE" ? "#fde8e8" : "#d5f5e3",
                          color:      d.status === "ACTIVE" ? "#c0392b" : "#1e8449",
                        }}
                      >
                        {actionId === d._id
                          ? <FaSpinner style={{ animation:"spin 0.8s linear infinite" }} />
                          : d.status === "ACTIVE"
                            ? <><FaUserSlash /> Suspend</>
                            : <><FaUserCheck /> Activate</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── PAGINATION ──────────────────────────────── */}
            {totalPages > 1 && (
              <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:20 }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding:"6px 14px", borderRadius:8, border:"1px solid #ddd", cursor:"pointer" }}>
                  ← Prev
                </button>
                <span style={{ padding:"6px 14px", fontWeight:600 }}>
                  Page {page} of {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding:"6px 14px", borderRadius:8, border:"1px solid #ddd", cursor:"pointer" }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Donor;