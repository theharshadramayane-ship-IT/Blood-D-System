// ============================================================
//  BLOODLINK PRO — Certificates.jsx  (Module 10)
//  Fully connected to backend via certificatesAPI
//  SAVE AS: src/Certificates.jsx
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { jsPDF } from "jspdf";
import Sidebar from "./Sidebar";
import "./assets/Module10_Certificates.css";
import { certificatesAPI, donorsAPI } from "./api";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";

// ── Helpers ───────────────────────────────────────────────
const BLOOD_STRIP_CLASS = {
  "A+":"bg-aplus","A-":"bg-aminus","B+":"bg-bplus","B-":"bg-bminus",
  "O+":"bg-oplus","O-":"bg-ominus","AB+":"bg-abplus","AB-":"bg-abminus",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });
}

function generateQRData(cert) {
  return cert.qrData || `${window.location.origin}/verify-certificate?cert=${cert.certNumber}`;
}

function getUser() {
  return JSON.parse(localStorage.getItem("blCurrentUser")) ||
         JSON.parse(localStorage.getItem("user")) || {};
}

// ── Certificate Document Component (for modal preview) ─────
function CertDocument({ cert, showQR = true }) {
  const verifyURL = generateQRData(cert);
  return (
    <div className="cert-document" id={`cert-doc-${cert._id||cert.id}`}>
      <div className="cert-doc-header">
        <div className="cert-doc-logo">
          <div className="cert-doc-logo-icon">🩸</div>
          <div>
            <p className="cert-doc-logo-text">BloodLink Pro</p>
            <span className="cert-doc-logo-sub">Blood Donation Management System</span>
          </div>
        </div>
        <div className="cert-doc-badge-wrap">
          <span className="cert-doc-badge-icon">🏅</span>
          <span className="cert-doc-badge-label">Verified Donation</span>
        </div>
      </div>

      <div className="cert-doc-title-section">
        <p className="cert-doc-headline">Official Certificate</p>
        <h2 className="cert-doc-main-title">Certificate of Blood Donation</h2>
        <p className="cert-doc-subtitle">Issued by {cert.bankName}</p>
      </div>

      <div className="cert-doc-donor-section">
        <p className="cert-doc-this-certifies">This is to certify that</p>
        <h3 className="cert-doc-donor-name">{cert.donorName}</h3>
        <span className="cert-doc-blood-group-chip">Blood Group: {cert.bloodGroup}</span>
      </div>

      <div className="cert-doc-details-grid">
        <div className="cert-doc-detail-box">
          <span className="cert-doc-detail-icon">📅</span>
          <span className="cert-doc-detail-label">Donation Date</span>
          <span className="cert-doc-detail-val">{fmtDate(cert.donationDate)}</span>
        </div>
        <div className="cert-doc-detail-box">
          <span className="cert-doc-detail-icon">🏕️</span>
          <span className="cert-doc-detail-label">Camp Name</span>
          <span className="cert-doc-detail-val">{cert.campName}</span>
        </div>
        <div className="cert-doc-detail-box">
          <span className="cert-doc-detail-icon">💉</span>
          <span className="cert-doc-detail-label">Units Donated</span>
          <span className="cert-doc-detail-val">{cert.unitsDonated} Unit{cert.unitsDonated>1?"s":""}</span>
        </div>
      </div>

      <div className="cert-doc-footer">
        <div className="cert-doc-qr-section">
          {showQR && (
            <div className="cert-doc-qr-box">
              <QRCodeCanvas value={verifyURL} size={70} level="M" />
            </div>
          )}
          <div>
            <span className="cert-doc-qr-label">Certificate Number</span>
            <span className="cert-doc-cert-no">{cert.certNumber}</span>
            <span style={{ fontSize:10, color:"#aaa", display:"block", marginTop:3 }}>Scan QR to verify authenticity</span>
          </div>
        </div>
        <div className="cert-doc-signature-section">
          <div className="cert-doc-sig-line" />
          <p className="cert-doc-sig-name">Dr. Meera Pillai</p>
          <p className="cert-doc-sig-title">Medical Director, BloodLink Pro</p>
          <p className="cert-doc-sig-title">Issued: {fmtDate(cert.issuedAt)}</p>
        </div>
      </div>
    </div>
  );
}

// ── PDF Download (pure jsPDF, no backend needed) ───────────
async function downloadCertPDF(cert) {
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setFillColor(255,255,255); doc.rect(0,0,W,H,"F");
  doc.setDrawColor(192,57,43); doc.setLineWidth(1.5); doc.rect(8,8,W-16,H-16,"S");
  doc.setLineWidth(0.3); doc.setDrawColor(220,100,100); doc.rect(12,12,W-24,H-24,"S");
  doc.setFillColor(192,57,43); doc.rect(8,8,W-16,14,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(255,255,255);
  doc.text("🩸 BloodLink Pro — Certificate of Blood Donation", W/2, 17, { align:"center" });
  doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.setTextColor(26,26,46);
  doc.text("Certificate of Blood Donation", W/2, 40, { align:"center" });
  doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(127,140,141);
  doc.text(`Issued by ${cert.bankName}`, W/2, 48, { align:"center" });
  doc.setDrawColor(192,57,43); doc.setLineWidth(0.5); doc.line(30,53,W-30,53);
  doc.setFont("helvetica","italic"); doc.setFontSize(11); doc.setTextColor(127,140,141);
  doc.text("This is to certify that", W/2, 64, { align:"center" });
  doc.setFont("helvetica","bold"); doc.setFontSize(26); doc.setTextColor(192,57,43);
  doc.text(cert.donorName, W/2, 76, { align:"center" });
  doc.setFillColor(192,57,43); doc.roundedRect(W/2-22,80,44,8,2,2,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(255,255,255);
  doc.text(`Blood Group: ${cert.bloodGroup}`, W/2, 85.5, { align:"center" });

  const boxes = [
    { label:"Donation Date",  value:fmtDate(cert.donationDate) },
    { label:"Camp Name",      value:cert.campName              },
    { label:"Units Donated",  value:`${cert.unitsDonated} Unit(s)` },
  ];
  const boxW=60;
  const startX=(W-(boxes.length*boxW+(boxes.length-1)*8))/2;
  boxes.forEach((b,i) => {
    const bx=startX+i*(boxW+8);
    doc.setFillColor(248,249,250); doc.setDrawColor(220,220,220); doc.setLineWidth(0.3);
    doc.roundedRect(bx,96,boxW,22,3,3,"FD");
    doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text(b.label.toUpperCase(), bx+boxW/2, 104, { align:"center" });
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(44,62,80);
    doc.text(b.value, bx+boxW/2, 113, { align:"center" });
  });

  doc.setDrawColor(192,57,43); doc.setLineWidth(0.5); doc.line(30,126,W-30,126);
  doc.setFont("courier","bold"); doc.setFontSize(10); doc.setTextColor(192,57,43);
  doc.text(`Certificate No: ${cert.certNumber}`, 30, 136);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(127,140,141);
  doc.text(`Verify at: ${window.location.origin}/verify-certificate`, 30, 143);
  doc.setDrawColor(44,62,80); doc.setLineWidth(0.5); doc.line(W-70,134,W-20,134);
  doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(44,62,80);
  doc.text("Dr. Meera Pillai", W-45, 139, { align:"center" });
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(127,140,141);
  doc.text("Medical Director, BloodLink Pro", W-45, 145, { align:"center" });
  doc.setFillColor(26,26,46); doc.rect(8,H-20,W-16,12,"F");
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(180,180,200);
  doc.text("BloodLink Pro — Enterprise Blood Donation & Camp Management System", W/2, H-12, { align:"center" });

  doc.save(`BloodLink_Certificate_${cert.certNumber}.pdf`);
}

// ── Main Component ─────────────────────────────────────────
export default function Certificates({ darkMode, toggleDarkMode }) {
  const [certs, setCerts]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [search, setSearch]           = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterYear, setFilterYear]   = useState("all");
  const [previewCert, setPreviewCert] = useState(null);
  const [shareModal, setShareModal]   = useState(null);
  const [downloading, setDownloading] = useState(null);

  const user    = getUser();
  const isAdmin = ["BB_ADMIN","SUPER_ADMIN"].includes(user?.role);

  // ── Load certificates from backend ────────────────────────
  const loadCerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await certificatesAPI.list({ limit:100 });
      setCerts(data.certificates || []);
    } catch (err) {
      toast.error("Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCerts(); }, [loadCerts]);

  // ── Filters ───────────────────────────────────────────────
  const years       = [...new Set(certs.map(c => new Date(c.donationDate||c.issuedAt).getFullYear()))].sort((a,b)=>b-a);
  const bloodGroups = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];

  const filtered = certs.filter(c => {
    const matchSearch = search==="" ||
      (c.certNumber||"").toLowerCase().includes(search.toLowerCase()) ||
      (c.campName||"").toLowerCase().includes(search.toLowerCase()) ||
      (c.donorName||"").toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup==="all" || c.bloodGroup===filterGroup;
    const matchYear  = filterYear==="all"  || String(new Date(c.donationDate||c.issuedAt).getFullYear())===filterYear;
    return matchSearch && matchGroup && matchYear;
  });

  // ── Download PDF ──────────────────────────────────────────
  const handleDownload = async (cert) => {
    setDownloading(cert._id||cert.id);
    try {
      await downloadCertPDF(cert);
      toast.success("Certificate downloaded! ✅");
    } catch {
      toast.error("Download failed. Try again.");
    }
    setDownloading(null);
  };

  // ── Copy cert number ──────────────────────────────────────
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard!"));
  };

  // ── Share ─────────────────────────────────────────────────
  const handleShare = (platform, cert) => {
    const verifyURL = generateQRData(cert);
    const text = `I donated blood on ${fmtDate(cert.donationDate)} at ${cert.campName}! Certificate: ${verifyURL} #BloodDonation #BloodLinkPro`;
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
      twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(verifyURL)}&summary=${encodeURIComponent(text)}`,
    };
    if (platform === "copy") {
      navigator.clipboard.writeText(verifyURL).then(() => toast.success("Link copied!"));
    } else {
      window.open(urls[platform], "_blank", "noopener,noreferrer");
    }
    setShareModal(null);
  };

  // ── Admin: Bulk generate for all eligible donations ────────
  const handleBulkGenerate = async () => {
    setGenerating(true);
    try {
      const res = await certificatesAPI.bulkGenerate({});
      toast.success(`Generated ${res.results?.filter(r=>r.status==="created").length || 0} new certificates!`);
      loadCerts();
    } catch (err) {
      toast.error(err.message || "Bulk generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // ── Admin: Revoke ─────────────────────────────────────────
  const handleRevoke = async (cert) => {
    const reason = prompt("Enter revocation reason:");
    if (!reason) return;
    try {
      await certificatesAPI.revoke(cert._id||cert.id, reason);
      toast.success("Certificate revoked.");
      loadCerts();
    } catch (err) {
      toast.error(err.message || "Failed to revoke");
    }
  };

  if (loading) {
    return (
      <div className={darkMode?"dashboard-container dark":"dashboard-container"}>
        <Sidebar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        <div className="main-content" style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"70vh", flexDirection:"column", gap:12 }}>
          <FaSpinner size={32} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
          <p style={{ color:"#888" }}>Loading certificates...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode?"dashboard-container dark":"dashboard-container"}>
      <Sidebar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <div className="main-content">
        <div className="cert-page">

          {/* HERO */}
          <div className="cert-hero">
            <div className="cert-hero-left">
              <h1>My Certificates</h1>
              <p>Download, share, or verify your official blood donation certificates</p>
            </div>
            <div className="cert-hero-stats">
              <div className="cert-hero-stat">
                <span className="stat-number">{certs.length}</span>
                <span className="stat-label">Total Certs</span>
              </div>
              <div className="cert-hero-stat">
                <span className="stat-number">{certs.filter(c=>c.isValid).length}</span>
                <span className="stat-label">Valid</span>
              </div>
              <div className="cert-hero-stat">
                <span className="stat-number">{user.bloodGroup||"—"}</span>
                <span className="stat-label">Blood Group</span>
              </div>
            </div>
          </div>

          {/* ADMIN PANEL */}
          {isAdmin && (
            <div className="cert-admin-section">
              <div className="cert-admin-header">
                <h3 className="cert-admin-title">⚙️ Admin — Certificate Management</h3>
                <button className="cert-btn cert-btn-download" style={{ flex:"initial", padding:"9px 18px" }}
                  onClick={handleBulkGenerate} disabled={generating}>
                  {generating ? <><span className="cert-spin" /> Generating...</> : "+ Bulk Generate All"}
                </button>
              </div>
              <table className="cert-admin-table">
                <thead>
                  <tr><th>Certificate No.</th><th>Donor</th><th>Blood Group</th><th>Date</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {certs.slice(0,5).map(c=>(
                    <tr key={c._id||c.id}>
                      <td><span className="cert-admin-mono">{c.certNumber}</span></td>
                      <td>{c.donorName}</td>
                      <td>{c.bloodGroup}</td>
                      <td>{fmtDate(c.donationDate)}</td>
                      <td><span className={`cert-valid-tag ${c.isValid?"valid":"revoked"}`}>{c.isValid?"✓ Valid":"✗ Revoked"}</span></td>
                      <td>
                        <div style={{ display:"flex", gap:6 }}>
                          <button className="cert-btn cert-btn-view"     style={{ flex:"initial", padding:"5px 10px", fontSize:12 }} onClick={() => setPreviewCert(c)}>View</button>
                          <button className="cert-btn cert-btn-download" style={{ flex:"initial", padding:"5px 10px", fontSize:12 }} onClick={() => handleDownload(c)} disabled={downloading===(c._id||c.id)}>
                            {downloading===(c._id||c.id) ? <span className="cert-spin" /> : "PDF"}
                          </button>
                          {c.isValid && <button className="cert-btn" style={{ flex:"initial", padding:"5px 10px", fontSize:12, background:"#e74c3c", color:"white" }} onClick={() => handleRevoke(c)}>Revoke</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {certs.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign:"center", color:"#888", padding:20 }}>No certificates yet. Run bulk generate to create from existing donations.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CONTROLS */}
          <div className="cert-controls">
            <div className="cert-search-wrap">
              <span className="cert-search-icon">🔍</span>
              <input className="cert-search-input" type="text"
                placeholder="Search by certificate number or camp name..."
                value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="cert-filter-select" value={filterGroup} onChange={e=>setFilterGroup(e.target.value)}>
              <option value="all">All Blood Groups</option>
              {bloodGroups.map(g=><option key={g} value={g}>{g}</option>)}
            </select>
            <select className="cert-filter-select" value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
              <option value="all">All Years</option>
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* CERTIFICATES GRID */}
          <div className="cert-grid">
            {filtered.length === 0 && (
              <div className="cert-empty">
                <div className="cert-empty-icon">📜</div>
                <h3 className="cert-empty-title">No certificates found</h3>
                <p className="cert-empty-sub">
                  {certs.length === 0
                    ? "Donate blood to receive your first official certificate!"
                    : "Try adjusting your search filters."}
                </p>
              </div>
            )}

            {filtered.map(cert=>(
              <div key={cert._id||cert.id} className="cert-card">
                <div className={`cert-card-strip ${BLOOD_STRIP_CLASS[cert.bloodGroup]||"bg-oplus"}`} />
                <div className="cert-card-body">
                  <div className="cert-card-top">
                    <div className="cert-card-badge">🏅</div>
                    <div className="cert-card-info">
                      <h3 className="cert-card-title">Certificate of Blood Donation</h3>
                      <p className="cert-card-camp">{cert.campName}</p>
                    </div>
                    <span className={`cert-valid-tag ${cert.isValid?"valid":"revoked"}`}>
                      {cert.isValid?"✓ Valid":"✗ Revoked"}
                    </span>
                  </div>

                  <div className="cert-card-details">
                    <div className="cert-detail-item"><span className="cert-detail-label">Blood Group</span><span className="cert-detail-value">{cert.bloodGroup}</span></div>
                    <div className="cert-detail-item"><span className="cert-detail-label">Date</span><span className="cert-detail-value">{fmtDate(cert.donationDate)}</span></div>
                    <div className="cert-detail-item"><span className="cert-detail-label">Units</span><span className="cert-detail-value">{cert.unitsDonated}</span></div>
                    <div className="cert-detail-item"><span className="cert-detail-label">Issued</span><span className="cert-detail-value">{fmtDate(cert.issuedAt)}</span></div>
                  </div>

                  <div className="cert-number-row">
                    <div>
                      <div className="cert-number-label">Certificate Number</div>
                      <div className="cert-number-value">{cert.certNumber}</div>
                    </div>
                    <button className="cert-copy-btn" onClick={() => handleCopy(cert.certNumber)} title="Copy">📋</button>
                  </div>

                  <div className="cert-card-actions">
                    <button className="cert-btn cert-btn-download" disabled={downloading===(cert._id||cert.id)} onClick={() => handleDownload(cert)}>
                      {downloading===(cert._id||cert.id) ? <><span className="cert-spin" /> Generating...</> : "⬇ Download PDF"}
                    </button>
                    <button className="cert-btn cert-btn-share" onClick={() => setShareModal(cert)}>Share</button>
                    <button className="cert-btn cert-btn-view"  onClick={() => setPreviewCert(cert)}>👁 View</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PREVIEW MODAL ─────────────────────────────────── */}
      {previewCert && (
        <div className="cert-modal-overlay" onClick={() => setPreviewCert(null)}>
          <div className="cert-modal" onClick={e=>e.stopPropagation()}>
            <button className="cert-modal-close" onClick={() => setPreviewCert(null)}>✕</button>
            <CertDocument cert={previewCert} showQR />
            <div className="cert-modal-actions">
              <button className="cert-btn cert-btn-download" style={{ flex:"initial", padding:"10px 24px" }}
                disabled={downloading===(previewCert._id||previewCert.id)} onClick={() => handleDownload(previewCert)}>
                {downloading===(previewCert._id||previewCert.id) ? <><span className="cert-spin" /> Generating...</> : "⬇ Download PDF"}
              </button>
              <button className="cert-btn cert-btn-share" style={{ flex:"initial", padding:"10px 24px" }}
                onClick={() => { setPreviewCert(null); setShareModal(previewCert); }}>
                Share Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHARE MODAL ───────────────────────────────────── */}
      {shareModal && (
        <div className="cert-modal-overlay" onClick={() => setShareModal(null)}>
          <div className="cert-share-modal" onClick={e=>e.stopPropagation()}>
            <button className="cert-modal-close" onClick={() => setShareModal(null)}>✕</button>
            <h3 className="cert-share-title">Share Your Certificate 🎉</h3>
            <p style={{ fontSize:13, color:"#7f8c8d", marginBottom:18 }}>
              {shareModal.certNumber} · {shareModal.bloodGroup} · {fmtDate(shareModal.donationDate)}
            </p>
            <div className="cert-share-platforms">
              <button className="cert-share-platform-btn whatsapp" onClick={() => handleShare("whatsapp",shareModal)}>💬 WhatsApp</button>
              <button className="cert-share-platform-btn twitter"  onClick={() => handleShare("twitter", shareModal)}>🐦 Twitter</button>
              <button className="cert-share-platform-btn linkedin" onClick={() => handleShare("linkedin",shareModal)}>💼 LinkedIn</button>
              <button className="cert-share-platform-btn copy"     onClick={() => handleShare("copy",    shareModal)}>📋 Copy Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}