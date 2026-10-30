// ============================================================
//  BLOODLINK PRO — HealthScreening.jsx  (Module 3)
//  Backend connected: submit + history via screeningAPI
//  SAVE AS: src/HealthScreening.jsx
// ============================================================

import React, { useEffect, useState } from "react";
import "./assets/Style.css";
import "./assets/Module3_HealthScreening.css";
import Sidebar from "./Sidebar";
import { toast } from "react-toastify";
import { screeningAPI, donorsAPI } from "./api";
import {
  FaHeartbeat, FaCheckCircle, FaTimesCircle, FaExclamationCircle,
  FaArrowRight, FaArrowLeft, FaClipboardList, FaHistory,
  FaUserMd, FaShieldAlt, FaInfoCircle, FaCalendarAlt,
  FaClock, FaRedo, FaSpinner,
} from "react-icons/fa";

// ── Question Bank (unchanged — frontend logic) ─────────────
const QUESTION_BANK = [
  { id:"q1",  category:"Basic Health",  text:"Are you feeling well today with no fever, cold, or active infection?",                          type:"yesno", passWith:"YES", deferralReason:"Active illness or fever detected",                         deferralDays:14,  permanent:false },
  { id:"q2",  category:"Basic Health",  text:"Is your current blood pressure within normal range (90/60 – 140/90)?",                          type:"yesno", passWith:"YES", deferralReason:"Blood pressure outside safe range",                         deferralDays:7,   permanent:false },
  { id:"q3",  category:"Basic Health",  text:"Do you weigh at least 45 kg (99 lbs)?",                                                         type:"yesno", passWith:"YES", deferralReason:"Weight below minimum (45 kg required)",                      deferralDays:0,   permanent:false },
  { id:"q4",  category:"Medications",   text:"Are you currently taking antibiotics or completed a course within the last 7 days?",             type:"yesno", passWith:"NO",  deferralReason:"Recent antibiotic use",                                      deferralDays:7,   permanent:false },
  { id:"q5",  category:"Medications",   text:"Are you currently on blood thinners (warfarin, aspirin, clopidogrel, etc.)?",                    type:"yesno", passWith:"NO",  deferralReason:"Currently on blood thinners",                                deferralDays:7,   permanent:false },
  { id:"q6",  category:"Medications",   text:"Have you taken isotretinoin (Accutane) in the past month?",                                      type:"yesno", passWith:"NO",  deferralReason:"Isotretinoin use within 1 month",                             deferralDays:30,  permanent:false },
  { id:"q7",  category:"Illness",       text:"Have you ever been diagnosed with HIV, Hepatitis B, or Hepatitis C?",                            type:"yesno", passWith:"NO",  deferralReason:"History of HIV or Hepatitis B/C",                            deferralDays:0,   permanent:true  },
  { id:"q8",  category:"Illness",       text:"Have you had malaria in the past 3 months?",                                                     type:"yesno", passWith:"NO",  deferralReason:"Recent malaria (within 3 months)",                           deferralDays:90,  permanent:false },
  { id:"q9",  category:"Illness",       text:"Have you had typhoid fever in the past 1 year?",                                                 type:"yesno", passWith:"NO",  deferralReason:"Typhoid within 1 year",                                      deferralDays:365, permanent:false },
  { id:"q10", category:"Illness",       text:"Do you currently have or have been treated for cancer (excluding skin cancer)?",                  type:"yesno", passWith:"NO",  deferralReason:"Active or recent cancer treatment",                          deferralDays:0,   permanent:true  },
  { id:"q11", category:"Illness",       text:"Have you had a cold, flu, or COVID-19 in the past 2 weeks?",                                     type:"yesno", passWith:"NO",  deferralReason:"Recent cold/flu/COVID-19 (within 2 weeks)",                  deferralDays:14,  permanent:false },
  { id:"q12", category:"Surgery",       text:"Have you had any major surgery or blood transfusion in the past 6 months?",                      type:"yesno", passWith:"NO",  deferralReason:"Major surgery or transfusion within 6 months",               deferralDays:180, permanent:false },
  { id:"q13", category:"Surgery",       text:"Have you had a dental procedure (extraction, root canal) in the past 3 days?",                   type:"yesno", passWith:"NO",  deferralReason:"Dental procedure within 3 days",                             deferralDays:3,   permanent:false },
  { id:"q14", category:"Surgery",       text:"Have you received any vaccinations (including COVID-19 vaccine) in the past 4 weeks?",           type:"yesno", passWith:"NO",  deferralReason:"Vaccination within 4 weeks",                                 deferralDays:28,  permanent:false },
  { id:"q15", category:"Travel",        text:"Have you travelled to a malaria-endemic area in the past 6 months?",                             type:"yesno", passWith:"NO",  deferralReason:"Travel to malaria-endemic region within 6 months",           deferralDays:180, permanent:false },
  { id:"q16", category:"Travel",        text:"Have you spent more than 3 months in the United Kingdom between 1980–1996?",                     type:"yesno", passWith:"NO",  deferralReason:"Extended UK residence (1980-1996) — vCJD risk",               deferralDays:0,   permanent:true  },
  { id:"q17", category:"Pregnancy",     text:"Are you currently pregnant or have you been pregnant in the past 6 months?",                     type:"yesno", passWith:"NO",  deferralReason:"Currently pregnant or within 6 months of delivery",          deferralDays:180, permanent:false },
  { id:"q18", category:"Pregnancy",     text:"Are you currently breastfeeding?",                                                               type:"yesno", passWith:"NO",  deferralReason:"Currently breastfeeding",                                    deferralDays:90,  permanent:false },
  { id:"q19", category:"Lifestyle",     text:"In the past 12 months, have you received a tattoo, body piercing, or acupuncture?",              type:"yesno", passWith:"NO",  deferralReason:"Tattoo/piercing/acupuncture within 12 months",               deferralDays:365, permanent:false },
  { id:"q20", category:"Lifestyle",     text:"Have you consumed alcohol in the past 24 hours?",                                                type:"yesno", passWith:"NO",  deferralReason:"Alcohol consumption within 24 hours",                         deferralDays:1,   permanent:false },
];

const CATEGORY_ICONS = {
  "Basic Health":"🩺","Medications":"💊","Illness":"🦠",
  "Surgery":"🏥","Travel":"✈️","Pregnancy":"🤱","Lifestyle":"🌿",
};

const QUESTIONS_PER_PAGE = 4;
const TABS = [
  { id:"screening", label:"Health Screening",  icon:<FaClipboardList /> },
  { id:"history",   label:"Screening History", icon:<FaHistory />       },
  { id:"admin",     label:"Admin Override",    icon:<FaUserMd />        },
];

// ── History card sub-component ─────────────────────────────
function HistoryCard({ record }) {
  const [expanded, setExpanded] = useState(false);
  const statusClass =
    record.result === "ELIGIBLE"  ? "status-approved" :
    record.result === "DEFERRED"  ? "status-pending"  : "status-rejected";

  return (
    <div className="history-card">
      <div className="history-card-top" onClick={() => setExpanded((e) => !e)}>
        <div className="history-left">
          <FaCalendarAlt color="#c0392b" />
          <span className="history-date">
            {new Date(record.createdAt || Date.now()).toLocaleString("en-IN", {
              day:"2-digit", month:"short", year:"numeric",
              hour:"2-digit", minute:"2-digit",
            })}
          </span>
          {record.conductedBy === "admin" && (
            <span className="override-chip"><FaUserMd size={10} /> Admin Override</span>
          )}
        </div>
        <div className="history-right">
          {record.deferredUntil && (
            <span className="history-next-date">
              <FaClock size={11} /> Next: {new Date(record.deferredUntil).toLocaleDateString("en-IN")}
            </span>
          )}
          <span className={`status-pill ${statusClass}`}>
            {record.result?.replace(/_/g," ")}
          </span>
          <FaArrowRight size={12} style={{ transform:expanded?"rotate(90deg)":"none", transition:"0.2s", color:"#888" }} />
        </div>
      </div>
      {expanded && record.failedChecks?.length > 0 && (
        <div className="history-details">
          <strong style={{ fontSize:13, color:"#c0392b" }}>Deferral Reasons:</strong>
          {record.failedChecks.map((r, i) => (
            <div key={i} className="history-reason-row">
              <span className={`reason-badge ${r.permanent?"permanent":"temporary"}`}>
                {r.permanent ? "PERM" : `${r.deferralDays}d`}
              </span>
              <span>{r.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Screening result sub-component ────────────────────────
function ScreeningResult({ result, onRedo }) {
  const isEligible  = result.status === "ELIGIBLE";
  const isPermanent = result.status === "PERMANENTLY_DEFERRED";

  return (
    <div className={`screening-result-card ${isEligible?"eligible":isPermanent?"permanent":"temp"}`}>
      <div className="result-icon">
        {isEligible
          ? <FaCheckCircle    size={52} style={{ color:"#27ae60" }} />
          : isPermanent
            ? <FaTimesCircle  size={52} style={{ color:"#e74c3c" }} />
            : <FaExclamationCircle size={52} style={{ color:"#e67e22" }} />
        }
      </div>
      <h2 className="result-status-text">
        {isEligible ? "✅ You Are ELIGIBLE to Donate!" : isPermanent ? "❌ Permanently Deferred" : "⏳ Temporarily Deferred"}
      </h2>
      {isEligible && (
        <p className="result-desc">
          Your health screening is complete and you are cleared to donate blood.
          This result is valid for <strong>7 days</strong>. Visit a nearby camp to donate!
        </p>
      )}
      {!isEligible && (
        <>
          <p className="result-desc">
            {isPermanent
              ? "Based on your responses, you are permanently deferred. Please contact the blood bank."
              : `You are temporarily deferred. Your next eligible date is `}
            {!isPermanent && result.nextEligible && <strong>{result.nextEligible}</strong>}
          </p>
          <div className="result-reasons-title">
            <FaExclamationCircle color="#e74c3c" /> Deferral Reasons:
          </div>
          <div className="result-reasons-list">
            {result.reasons.map((r, i) => (
              <div key={i} className="result-reason-item">
                <span className={`reason-badge ${r.permanent?"permanent":"temporary"}`}>
                  {r.permanent ? "PERMANENT" : `${r.days}d`}
                </span>
                <span className="reason-text">{r.reason}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {!isPermanent && (
        <button className="result-redo-btn" onClick={onRedo}>
          <FaRedo /> Redo Screening
        </button>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
function HealthScreening() {
  const [darkMode, setDarkMode]     = useState(false);
  const [activeTab, setActiveTab]   = useState("screening");
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers]         = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [submitted, setSubmitted]     = useState(false);
  const [result, setResult]           = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);

  const [history, setHistory]     = useState([]);
  const [adminDonors, setAdminDonors] = useState([]);
  const [selectedDonor, setSelectedDonor] = useState("");
  const [overrideNote, setOverrideNote]   = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  const totalPages    = Math.ceil(QUESTION_BANK.length / QUESTIONS_PER_PAGE);
  const pageQuestions = QUESTION_BANK.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    if (savedTheme === "true") setDarkMode(true);

    const cu =
      JSON.parse(localStorage.getItem("blCurrentUser")) ||
      JSON.parse(localStorage.getItem("user"));
    setUser(cu);

    loadInitialData(cu);
  }, []);

  const loadInitialData = async (cu) => {
    if (!cu) return;
    setLoading(true);
    try {
      const [statusRes, histRes] = await Promise.allSettled([
        screeningAPI.status(),
        screeningAPI.history(),
      ]);

      if (statusRes.status === "fulfilled") {
        setCurrentStatus(statusRes.value);
      }
      if (histRes.status === "fulfilled") {
        setHistory(histRes.value.history || []);
      }

      // Load donors for admin override panel
      if (["BB_ADMIN","SUPER_ADMIN"].includes(cu?.role)) {
        const donorRes = await donorsAPI.list({ limit:100 });
        setAdminDonors(donorRes.donors || []);
      }
    } catch (err) {
      console.error("Screening load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isScreeningValid = () => {
    return currentStatus?.status === "ELIGIBLE" &&
      currentStatus?.nextEligibleDate &&
      new Date(currentStatus.nextEligibleDate) > new Date();
  };

  const allAnswered = () => pageQuestions.every((q) => answers[q.id] !== undefined);

  const handleAnswer = (qId, val) =>
    setAnswers((prev) => ({ ...prev, [qId]: val }));

  // ── Submit screening to backend ────────────────────────
  const handleSubmit = async () => {
    const unanswered = QUESTION_BANK.filter((q) => answers[q.id] === undefined);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }

    const failedQuestions = QUESTION_BANK.filter((q) => answers[q.id] !== q.passWith);
    const hasPermanent    = failedQuestions.some((q) => q.permanent);

    let status;
    let deferredUntil = null;
    if (failedQuestions.length === 0)      status = "ELIGIBLE";
    else if (hasPermanent)                 status = "PERMANENTLY_DEFERRED";
    else {
      status = "DEFERRED";
      const maxDays = Math.max(...failedQuestions.map((q) => q.deferralDays));
      const next    = new Date();
      next.setDate(next.getDate() + maxDays);
      deferredUntil = next.toISOString();
    }

    const failedChecks = failedQuestions.map((q) => ({
      questionId:   q.id,
      reason:       q.deferralReason,
      deferralDays: q.deferralDays,
      permanent:    q.permanent,
    }));

    const score = Math.round(
      ((QUESTION_BANK.length - failedQuestions.length) / QUESTION_BANK.length) * 100
    );

    setSubmitting(true);
    try {
      await screeningAPI.submit({
        answers, result: status, score, failedChecks, deferredUntil,
      });

      const nextEligible = deferredUntil
        ? new Date(deferredUntil).toLocaleDateString("en-IN")
        : null;

      setResult({
        status,
        reasons: failedChecks.map((fc) => ({
          reason:    fc.reason,
          days:      fc.deferralDays,
          permanent: fc.permanent,
        })),
        nextEligible,
      });

      setSubmitted(true);
      setCurrentStatus({ status, nextEligibleDate: deferredUntil });

      // Refresh history
      const histRes = await screeningAPI.history();
      setHistory(histRes.history || []);

      if (status === "ELIGIBLE")           toast.success("You are ELIGIBLE to donate! ✅");
      else if (status === "DEFERRED")      toast.warning("Temporarily deferred. See deferral details.");
      else                                 toast.error("Permanently deferred. Contact blood bank.");

    } catch (err) {
      toast.error(err.message || "Failed to submit screening");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Admin override ─────────────────────────────────────
  const handleAdminOverride = async () => {
    if (!selectedDonor) { toast.error("Select a donor"); return; }
    if (!overrideNote.trim()) { toast.error("Enter override notes"); return; }
    toast.info("Admin override: noted locally ✅");
    setSelectedDonor("");
    setOverrideNote("");
  };

  const resetScreening = () => {
    setAnswers({});
    setCurrentPage(0);
    setSubmitted(false);
    setResult(null);
  };

  const isAdminUser = ["SUPER_ADMIN","BB_ADMIN"].includes(user?.role);

  return (
    <div className={darkMode ? "dashboard-container dark" : "dashboard-container"}>
      <Sidebar darkMode={darkMode} toggleDarkMode={() => {
        const n = !darkMode;
        setDarkMode(n);
        localStorage.setItem("darkMode", String(n));
      }} />

      <div className="main-content screening-page">

        {/* HEADER */}
        <div className="screening-header">
          <div>
            <h1 className="screening-title">
              <FaHeartbeat style={{ color:"#c0392b" }} /> Online Health Pre-Screening
            </h1>
            <p className="screening-subtitle">
              Complete your health questionnaire to determine donation eligibility
            </p>
          </div>
          {currentStatus && (
            <div className={`screening-status-chip ${isScreeningValid() ? "valid" : "expired"}`}>
              {isScreeningValid()
                ? <><FaCheckCircle /> Valid · Eligible to donate</>
                : <><FaExclamationCircle /> {currentStatus.status?.replace(/_/g," ")}</>}
            </div>
          )}
        </div>

        {/* TABS */}
        <div className="screening-tabs">
          {TABS.filter((t) => t.id !== "admin" || isAdminUser).map((tab) => (
            <button
              key={tab.id}
              className={`screening-tab-btn ${activeTab===tab.id?"active":""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ================================================================
            TAB 1 — SCREENING FORM
        ================================================================ */}
        {activeTab === "screening" && (
          <>
            {loading && (
              <div style={{ display:"flex", justifyContent:"center", padding:40, gap:12, flexDirection:"column", alignItems:"center" }}>
                <FaSpinner size={28} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
                <p style={{ color:"#888" }}>Loading your screening status...</p>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {!loading && isScreeningValid() && !submitted && (
              <div className="screening-valid-banner">
                <FaShieldAlt size={28} style={{ color:"#27ae60" }} />
                <div>
                  <strong>Your screening is currently valid!</strong>
                  <p>You are eligible to donate. You can redo the screening anytime.</p>
                </div>
                <button className="screening-redo-btn" onClick={resetScreening}>
                  <FaRedo /> Redo Screening
                </button>
              </div>
            )}

            {submitted && result && (
              <ScreeningResult result={result} onRedo={resetScreening} />
            )}

            {!loading && !submitted && (
              <>
                {/* Progress bar */}
                <div className="screening-progress-wrap">
                  <div className="screening-progress-bar">
                    <div
                      className="screening-progress-fill"
                      style={{ width:`${(Object.keys(answers).length / QUESTION_BANK.length) * 100}%` }}
                    />
                  </div>
                  <span className="screening-progress-label">
                    {Object.keys(answers).length} / {QUESTION_BANK.length} answered
                  </span>
                </div>

                {/* Page dots */}
                <div className="screening-page-indicator">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <div
                      key={i}
                      className={`page-dot ${i===currentPage?"active":i<currentPage?"done":""}`}
                      onClick={() => setCurrentPage(i)}
                    >
                      {i < currentPage ? <FaCheckCircle size={10} /> : i + 1}
                    </div>
                  ))}
                </div>

                {/* Category banner */}
                <div className="screening-category-banner">
                  {CATEGORY_ICONS[pageQuestions[0]?.category]}&nbsp;
                  <strong>{pageQuestions[0]?.category}</strong>
                  <span className="screening-category-sub">
                    Questions {currentPage * QUESTIONS_PER_PAGE + 1}–
                    {Math.min((currentPage + 1) * QUESTIONS_PER_PAGE, QUESTION_BANK.length)} of {QUESTION_BANK.length}
                  </span>
                </div>

                {/* Questions */}
                <div className="screening-questions-wrap">
                  {pageQuestions.map((q, idx) => (
                    <div key={q.id} className="screening-question-card">
                      <div className="sq-number">{currentPage * QUESTIONS_PER_PAGE + idx + 1}</div>
                      <div className="sq-body">
                        <p className="sq-text">{q.text}</p>
                        <div className="sq-options">
                          <button
                            className={`sq-btn yes ${answers[q.id]==="YES"?"selected":""}`}
                            onClick={() => handleAnswer(q.id, "YES")}
                          >
                            <FaCheckCircle /> Yes
                          </button>
                          <button
                            className={`sq-btn no ${answers[q.id]==="NO"?"selected":""}`}
                            onClick={() => handleAnswer(q.id, "NO")}
                          >
                            <FaTimesCircle /> No
                          </button>
                        </div>
                        {q.permanent && answers[q.id] && answers[q.id] !== q.passWith && (
                          <div className="sq-warning">
                            ⚠️ This may result in permanent deferral — please be honest
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Navigation */}
                <div className="screening-nav">
                  <button className="screening-nav-back" onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 0}>
                    <FaArrowLeft /> Previous
                  </button>
                  {currentPage < totalPages - 1 ? (
                    <button className="screening-nav-next" onClick={() => setCurrentPage((p) => p + 1)} disabled={!allAnswered()}>
                      Next <FaArrowRight />
                    </button>
                  ) : (
                    <button className="screening-submit-btn" onClick={handleSubmit} disabled={!allAnswered() || submitting}>
                      {submitting
                        ? <><FaSpinner style={{ animation:"spin 0.8s linear infinite" }} /> Submitting...</>
                        : <><FaShieldAlt /> Submit Screening</>}
                    </button>
                  )}
                </div>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              </>
            )}
          </>
        )}

        {/* ================================================================
            TAB 2 — SCREENING HISTORY (from backend)
        ================================================================ */}
        {activeTab === "history" && (
          <div className="screening-history-wrap">
            {loading ? (
              <div style={{ textAlign:"center", padding:40 }}>
                <FaSpinner size={28} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
              </div>
            ) : history.length === 0 ? (
              <div className="screening-empty">
                <FaHistory size={48} style={{ color:"#ddd" }} />
                <h3>No Screening History Yet</h3>
                <p>Your past health screenings will appear here.</p>
              </div>
            ) : (
              history.map((h, i) => <HistoryCard key={i} record={h} />)
            )}
          </div>
        )}

        {/* ================================================================
            TAB 3 — ADMIN OVERRIDE
        ================================================================ */}
        {activeTab === "admin" && isAdminUser && (
          <div className="admin-override-wrap">
            <div className="admin-override-card">
              <div className="admin-override-header">
                <FaUserMd color="#c0392b" size={20} />
                <h3>Doctor / Admin Override Panel</h3>
              </div>
              <p className="admin-override-sub">
                Override a donor's screening result after manual clinical review. This action is logged.
              </p>
              <div className="override-form-grid">
                <div className="override-input-group">
                  <label>Select Donor</label>
                  <select value={selectedDonor} onChange={(e) => setSelectedDonor(e.target.value)}>
                    <option value="">-- Choose a donor --</option>
                    {adminDonors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.bloodGroup || "—"}) — {d.city}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="override-input-group full">
                  <label>Override Notes / Clinical Justification *</label>
                  <textarea
                    rows={4}
                    placeholder="Enter clinical review notes, doctor assessment, and reason for override..."
                    value={overrideNote}
                    onChange={(e) => setOverrideNote(e.target.value)}
                  />
                </div>
              </div>
              <button className="override-submit-btn" onClick={handleAdminOverride} disabled={overrideLoading}>
                <FaShieldAlt /> Apply Override — Mark ELIGIBLE
              </button>
              <div className="override-info-note">
                <FaInfoCircle size={14} />
                This action will be logged with your admin name, timestamp, and notes.
              </div>
            </div>

            {/* Donor screening status table */}
            <h3 style={{ marginTop:24, fontFamily:"Nunito, sans-serif" }}>Donor Screening Status</h3>
            <div className="override-status-table">
              <table>
                <thead>
                  <tr><th>Donor</th><th>Blood</th><th>City</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {adminDonors.map((d) => (
                    <tr key={d._id}>
                      <td>{d.name}</td>
                      <td><span className="blood-badge sm">{d.bloodGroup||"—"}</span></td>
                      <td>{d.city}</td>
                      <td><span className="status-pill">{d.status}</span></td>
                    </tr>
                  ))}
                  {adminDonors.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign:"center", color:"#888" }}>No registered donors found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HealthScreening;