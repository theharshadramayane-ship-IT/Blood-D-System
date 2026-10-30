// ============================================================
//  BLOODLINK PRO — VerifyCertificate.jsx  (Module 10)
//  PUBLIC PAGE — No login needed
//  Fully connected to backend via certificatesAPI
//  SAVE AS: src/VerifyCertificate.jsx
// ============================================================

import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./assets/Module10_Certificates.css";
import { certificatesAPI } from "./api";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" });
}

export default function VerifyCertificate({ darkMode }) {
  const [inputVal, setInputVal]   = useState("");
  const [result, setResult]       = useState(null); // null | "valid" | "revoked" | "invalid"
  const [certData, setCertData]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [demoCodes, setDemoCodes] = useState([]);

  // ── Read cert from URL param on mount ────────────────────
  useEffect(() => {
    const params   = new URLSearchParams(window.location.search);
    const certParam = params.get("cert");
    if (certParam) {
      setInputVal(certParam);
      verifyCode(certParam);
    }
    // Load some demo codes from API for display
    loadDemoCodes();
  }, []);

  const loadDemoCodes = async () => {
    try {
      const data = await certificatesAPI.list({ limit: 3 });
      setDemoCodes((data.certificates || []).slice(0,3).map(c => c.certNumber));
    } catch {
      // If not logged in, no demo codes shown — that's fine
    }
  };

  // ── Verify certificate via backend public API ─────────────
  const verifyCode = async (code) => {
    const val = (code || inputVal).trim().toUpperCase();
    if (!val) return;

    setLoading(true);
    setResult(null);
    setCertData(null);

    try {
      // certificatesAPI.verify uses public endpoint (no auth header needed)
      const data = await certificatesAPI.verify(val);

      if (data.success && data.certificate) {
        setCertData(data.certificate);
        setResult(data.valid ? "valid" : "revoked");
      } else {
        setCertData(null);
        setResult("invalid");
      }
    } catch {
      setResult("invalid");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") verifyCode();
  };

  const handleReset = () => {
    setInputVal("");
    setResult(null);
    setCertData(null);
  };

  return (
    <div className={`verify-page${darkMode ? " dark" : ""}`}>

      {/* NAV */}
      <div className="verify-nav">
        <div className="verify-nav-logo">
          <div className="verify-nav-logo-icon">🩸</div>
          BloodLink Pro
        </div>
        <a href="/login" style={{ fontSize:13, color:"#c0392b", textDecoration:"none", fontWeight:700 }}>
          Login →
        </a>
      </div>

      {/* HERO */}
      <div className="verify-hero">
        <span className="verify-hero-icon">🔍</span>
        <h1 className="verify-hero-title">Verify Certificate</h1>
        <p className="verify-hero-sub">
          Enter a certificate number to instantly verify its authenticity.
          No login required — powered by BloodLink Pro backend.
        </p>
      </div>

      {/* SEARCH BOX */}
      <div className="verify-search-box">
        <label className="verify-search-label">Certificate Number</label>
        <div className="verify-input-row">
          <input
            className="verify-input"
            type="text"
            placeholder="e.g. CERT-2025-00001001"
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className="verify-btn" onClick={() => verifyCode()} disabled={loading || !inputVal.trim()}>
            {loading ? (
              <><span className="cert-spin" style={{ borderTopColor:"white", borderColor:"rgba(255,255,255,0.3)" }} /> Verifying...</>
            ) : "Verify"}
          </button>
        </div>
        <p className="verify-hint">
          Tip: Scan the QR code on any BloodLink Pro certificate to auto-verify, or enter the cert number above.
        </p>
        {result && (
          <button onClick={handleReset} style={{ marginTop:12, background:"none", border:"none", color:"#7f8c8d", fontSize:13, cursor:"pointer", fontFamily:"Nunito,sans-serif", fontWeight:600 }}>
            ← Search another certificate
          </button>
        )}
      </div>

      {/* RESULT */}
      {result && !loading && (
        <div className="verify-result">

          {/* ✅ VALID */}
          {result === "valid" && certData && (
            <div className="verify-result-valid">
              <div className="verify-result-valid-header">
                <div className="verify-result-valid-icon">✅</div>
                <div>
                  <h2 className="verify-result-valid-title">Certificate is Valid</h2>
                  <p className="verify-result-valid-sub">This is an authentic BloodLink Pro certificate, verified from the database.</p>
                </div>
              </div>
              <div className="verify-result-body">
                <div className="verify-result-field-grid">
                  {[
                    ["Donor Name",    certData.donorName],
                    ["Blood Group",   certData.bloodGroup],
                    ["Donation Date", fmtDate(certData.donationDate)],
                    ["Camp Name",     certData.campName],
                    ["Units Donated", `${certData.unitsDonated} Unit${certData.unitsDonated>1?"s":""}`],
                    ["Issued By",     certData.bankName],
                    ["Issue Date",    fmtDate(certData.issuedAt)],
                  ].map(([label, val]) => (
                    <div key={label} className="verify-result-field">
                      <span className="verify-result-field-label">{label}</span>
                      <span className="verify-result-field-val">{val||"—"}</span>
                    </div>
                  ))}
                </div>

                <div className="verify-result-cert-no-row">
                  <div>
                    <div style={{ fontSize:11, color:"#aaa", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>Certificate Number</div>
                    <span className="verify-result-cert-no">{certData.certNumber}</span>
                  </div>
                  <div style={{ padding:8, background:"white", border:"1.5px solid #eee", borderRadius:8 }}>
                    <QRCodeCanvas
                      value={`${window.location.origin}/verify-certificate?cert=${certData.certNumber}`}
                      size={64}
                      level="M"
                    />
                  </div>
                </div>

                {/* Share valid cert */}
                <div style={{ marginTop:16, display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[
                    { platform:"whatsapp", label:"💬 WhatsApp", color:"#25D366" },
                    { platform:"twitter",  label:"🐦 Twitter",  color:"#1DA1F2" },
                    { platform:"copy",     label:"📋 Copy Link", color:"#7f8c8d" },
                  ].map(p => (
                    <button key={p.platform}
                      style={{ background:p.color, color:"white", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}
                      onClick={() => {
                        const url = `${window.location.origin}/verify-certificate?cert=${certData.certNumber}`;
                        const text = `Verified BloodLink Pro Certificate: ${certData.donorName} donated blood on ${fmtDate(certData.donationDate)}. Certificate: ${url}`;
                        if (p.platform==="copy") {
                          navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
                        } else if (p.platform==="whatsapp") {
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                        } else if (p.platform==="twitter") {
                          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
                        }
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ⚠️ REVOKED */}
          {result === "revoked" && certData && (
            <div className="verify-result-invalid">
              <div className="verify-result-invalid-header">
                <div className="verify-result-valid-icon">⚠️</div>
                <div>
                  <h2 className="verify-result-invalid-title">Certificate Revoked</h2>
                  <p className="verify-result-invalid-sub">This certificate has been revoked by the issuing authority.</p>
                </div>
              </div>
              <div className="verify-result-invalid-body">
                <p>Certificate <strong>{certData.certNumber}</strong> has been revoked{certData.revokedAt ? ` on ${fmtDate(certData.revokedAt)}` : ""}.</p>
                <p>Please contact <strong>{certData.bankName}</strong> for more information.</p>
              </div>
            </div>
          )}

          {/* ❌ NOT FOUND */}
          {result === "invalid" && (
            <div className="verify-result-invalid">
              <div className="verify-result-invalid-header">
                <div className="verify-result-valid-icon">❌</div>
                <div>
                  <h2 className="verify-result-invalid-title">Certificate Not Found</h2>
                  <p className="verify-result-invalid-sub">No certificate found with this number in the database.</p>
                </div>
              </div>
              <div className="verify-result-invalid-body">
                <p>The certificate number <strong style={{ fontFamily:"monospace" }}>{inputVal}</strong> does not match any record.</p>
                <p>Please check the number and try again, or contact the issuing blood bank.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DEMO CODES (only if logged in and certs exist) */}
      {!result && demoCodes.length > 0 && (
        <div className="verify-demo-hint">
          <p>🧪 Demo — click any code to test verification:</p>
          <div className="verify-demo-codes">
            {demoCodes.map(code=>(
              <span key={code} className="verify-demo-code"
                onClick={() => { setInputVal(code); verifyCode(code); }}>
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {!result && demoCodes.length === 0 && (
        <div className="verify-demo-hint">
          <p>ℹ️ Enter a valid BloodLink Pro certificate number to verify.</p>
          <p style={{ fontSize:12, color:"#aaa", marginTop:4 }}>Format: <code>CERT-YYYY-XXXXXXXX</code></p>
        </div>
      )}
    </div>
  );
}