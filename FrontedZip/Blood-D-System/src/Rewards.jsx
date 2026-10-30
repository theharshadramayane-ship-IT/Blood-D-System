// ============================================================
//  BLOODLINK PRO — Rewards.jsx  (Module 9)
//  Fully connected to backend via rewardsAPI
//  SAVE AS: src/Rewards.jsx
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "./assets/Module9_Rewards.css";
import Sidebar from "./Sidebar";
import { rewardsAPI } from "./api";
import { FaSpinner } from "react-icons/fa";

// ── Constants (frontend logic, no backend needed) ──────────
const BADGE_LEVELS = [
  { name:"NEWCOMER",  min:0,    max:99,        icon:"🌱", color:"#78909C", desc:"Just getting started"  },
  { name:"BRONZE",    min:100,  max:299,        icon:"🥉", color:"#CD7F32", desc:"First steps taken"     },
  { name:"SILVER",    min:300,  max:599,        icon:"🥈", color:"#A8A9AD", desc:"Regular contributor"   },
  { name:"GOLD",      min:600,  max:999,        icon:"🥇", color:"#FFD700", desc:"Dedicated donor"       },
  { name:"PLATINUM",  min:1000, max:1999,       icon:"💎", color:"#E5E4E2", desc:"Elite lifesaver"       },
  { name:"LEGEND",    min:2000, max:Infinity,   icon:"🏆", color:"#C0392B", desc:"Hall of Fame"          },
];

const ACHIEVEMENTS = [
  { id:"a1", title:"First Drop",     icon:"💉", desc:"Complete your first donation",          req:1,   type:"donations", points:50  },
  { id:"a2", title:"Triple Hero",    icon:"🦸", desc:"Donate 3 times",                        req:3,   type:"donations", points:80  },
  { id:"a3", title:"High Five",      icon:"✋", desc:"Reach 5 total donations",               req:5,   type:"donations", points:120 },
  { id:"a4", title:"Ten Lives Saved",icon:"❤️", desc:"Complete 10 donations",                 req:10,  type:"donations", points:200 },
  { id:"a5", title:"Emergency Hero", icon:"🚨", desc:"Respond to 3 emergency blood alerts",   req:3,   type:"emergency", points:150 },
  { id:"a6", title:"1 Year Donor",   icon:"🎂", desc:"Be a donor for over 1 year",            req:365, type:"days",      points:100 },
  { id:"a7", title:"City Champion",  icon:"🏙️", desc:"Reach top 5 in city leaderboard",       req:5,   type:"rank",      points:300 },
  { id:"a8", title:"Streak Master",  icon:"🔥", desc:"Donate 3 consecutive months",           req:3,   type:"streak",    points:120 },
  { id:"a9", title:"Rare Saver",     icon:"🩸", desc:"Donate rare blood group (O-, AB-)",     req:1,   type:"rare",      points:200 },
];

const REDEMPTION_OPTIONS = [
  { id:"r1", title:"Certificate of Appreciation", icon:"📜", cost:100,  desc:"Official appreciation certificate" },
  { id:"r2", title:"Priority Camp Slot",           icon:"⚡", cost:250,  desc:"Skip waitlist at any camp"         },
  { id:"r3", title:"BloodLink Merchandise",        icon:"👕", cost:500,  desc:"T-shirt + water bottle combo"      },
  { id:"r4", title:"Special Gold Badge",           icon:"🏅", cost:1000, desc:"Exclusive digital badge"           },
  { id:"r5", title:"Donor of the Month Frame",     icon:"🖼️", cost:750,  desc:"Profile highlight for 30 days"    },
];

// ── Helpers ───────────────────────────────────────────────
function getBadgeLevel(points) {
  return BADGE_LEVELS.find(b => points >= b.min && points <= b.max) || BADGE_LEVELS[0];
}
function getNextBadge(points) {
  const idx = BADGE_LEVELS.findIndex(b => points >= b.min && points <= b.max);
  return idx < BADGE_LEVELS.length - 1 ? BADGE_LEVELS[idx + 1] : null;
}
function getBadgeProgress(points) {
  const current = getBadgeLevel(points);
  if (current.max === Infinity) return 100;
  return Math.min(100, Math.round(((points - current.min) / (current.max - current.min + 1)) * 100));
}
function getUnlockedAchievements(stats) {
  return ACHIEVEMENTS.map(a => {
    let unlocked = false;
    if (a.type === "donations") unlocked = (stats.totalDonations || 0) >= a.req;
    if (a.type === "emergency") unlocked = (stats.emergencyResponses || 0) >= a.req;
    if (a.type === "days")      unlocked = (stats.daysSinceJoined || 0) >= a.req;
    if (a.type === "rank")      unlocked = stats.cityRank !== null && stats.cityRank <= a.req;
    if (a.type === "streak")    unlocked = (stats.consecutiveMonths || 0) >= a.req;
    if (a.type === "rare")      unlocked = (stats.rareBloodDonations || 0) >= a.req;
    return { ...a, unlocked };
  });
}
function getUser() {
  return JSON.parse(localStorage.getItem("blCurrentUser")) ||
         JSON.parse(localStorage.getItem("user")) || {};
}

// ── Main Component ─────────────────────────────────────────
export default function Rewards() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]         = useState("overview");
  const [loading, setLoading]             = useState(true);
  const [redeeming, setRedeeming]         = useState(false);
  const [showShareModal, setShowShareModal]     = useState(false);
  const [shareAchievement, setShareAchievement] = useState(null);
  const [showRedeemModal, setShowRedeemModal]   = useState(null);
  const [leaderboardFilter, setLeaderboardFilter] = useState("national");
  const [animatedPoints, setAnimatedPoints] = useState(0);

  // ── API data states ─────────────────────────────────────
  const [stats, setStats]           = useState({});
  const [donations, setDonations]   = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [redeemHistory, setRedeemHistory] = useState([]);

  const user = getUser();

  // ── Load data from backend ────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, lbRes] = await Promise.allSettled([
        rewardsAPI.me(),
        rewardsAPI.leaderboard(),
      ]);

      if (meRes.status === "fulfilled") {
        setStats(meRes.value.stats || {});
        setDonations(meRes.value.donations || []);
      }

      if (lbRes.status === "fulfilled") {
        setLeaderboard(lbRes.value.leaderboard || []);
      }
    } catch (err) {
      console.error("Rewards load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Animate points counter ─────────────────────────────
  const totalPoints = stats.points || 0;
  useEffect(() => {
    if (totalPoints === 0) return;
    let start = 0;
    const step = Math.ceil(totalPoints / (1200 / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= totalPoints) { setAnimatedPoints(totalPoints); clearInterval(timer); }
      else setAnimatedPoints(start);
    }, 16);
    return () => clearInterval(timer);
  }, [totalPoints]);

  // ── Derived values ─────────────────────────────────────
  const totalDonations = stats.totalDonations || 0;
  const bloodGroup     = user.bloodGroup || "—";
  const achievements   = getUnlockedAchievements(stats);
  const currentBadge   = getBadgeLevel(totalPoints);
  const nextBadge      = getNextBadge(totalPoints);
  const progress       = getBadgeProgress(totalPoints);
  const availablePoints = totalPoints; // backend manages this

  // My entry in leaderboard
  const myEntry = {
    rank: stats.cityRank || null,
    name: user.name || "You",
    city: user.city || "—",
    points: totalPoints,
    badge: currentBadge.name,
    bloodGroup,
    totalDonations,
    isMe: true,
  };

  // Add self to leaderboard if not present
  const fullLeaderboard = leaderboard.some(l => l.name === user.name)
    ? leaderboard
    : totalPoints > 0 ? [...leaderboard, myEntry].sort((a,b)=>b.points-a.points).map((l,i)=>({...l,rank:i+1}))
    : leaderboard;

  const filteredLeaderboard = leaderboardFilter === "city"
    ? fullLeaderboard.filter(l => l.city?.toLowerCase() === user.city?.toLowerCase() || l.isMe)
    : fullLeaderboard;

  // ── Redeem ────────────────────────────────────────────
  const handleRedeem = async (option) => {
    if (availablePoints < option.cost) {
      toast.error(`Not enough points! Need ${option.cost - availablePoints} more.`);
      return;
    }
    setRedeeming(true);
    try {
      const res = await rewardsAPI.redeem(option.id, option.cost);
      toast.success(`🎉 Redeemed "${option.title}" successfully!`);
      setShowRedeemModal(null);
      setRedeemHistory(prev => [{
        type: "REDEEM", points: -option.cost,
        reason: `Redeemed: ${option.title}`,
        date: new Date().toLocaleDateString("en-IN"),
      }, ...prev]);
      // Update stats
      setStats(prev => ({ ...prev, points: res.remainingPoints ?? (prev.points - option.cost) }));
    } catch (err) {
      toast.error(err.message || "Redemption failed");
    } finally {
      setRedeeming(false);
    }
  };

  // ── Share ─────────────────────────────────────────────
  const handleShare = (platform, text) => {
    const msg = encodeURIComponent(text);
    const urls = {
      whatsapp: `https://wa.me/?text=${msg}`,
      twitter:  `https://twitter.com/intent/tweet?text=${msg}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://bloodlinkpro.in")}&summary=${msg}`,
    };
    window.open(urls[platform], "_blank");
    setShowShareModal(false);
  };

  // ── Transaction history (donations + redeems) ──────────
  const txnList = [
    ...redeemHistory,
    ...donations.map(d => ({
      type: "EARN",
      points: d.pointsAwarded || 100,
      reason: `Donation at ${d.campName || d.bankName || "Blood Bank"}`,
      date: d.donationDate ? new Date(d.donationDate).toLocaleDateString("en-IN") : "—",
    })),
  ];

  // ── Render ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="main-content" style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"70vh", flexDirection:"column", gap:12 }}>
          <FaSpinner size={32} color="#c0392b" style={{ animation:"spin 0.8s linear infinite" }} />
          <p style={{ color:"#888" }}>Loading your rewards...</p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">

        {/* HEADER */}
        <div className="rw-header">
          <button className="rw-back-btn" onClick={() => navigate("/dashboard")}>← Back</button>
          <div>
            <h1 className="rw-title">🏆 Rewards & Achievements</h1>
            <p className="rw-subtitle">Your donation journey, gamified</p>
          </div>
        </div>

        {/* BADGE HERO CARD */}
        <div className="rw-hero-card" style={{ "--badge-color": currentBadge.color }}>
          <div className="rw-hero-left">
            <div className="rw-badge-icon">{currentBadge.icon}</div>
            <div>
              <div className="rw-badge-name">{currentBadge.name}</div>
              <div className="rw-badge-desc">{currentBadge.desc}</div>
            </div>
          </div>
          <div className="rw-hero-right">
            <div className="rw-points-display">
              <span className="rw-points-num">{animatedPoints.toLocaleString()}</span>
              <span className="rw-points-label">Total Points</span>
            </div>
            <div className="rw-avail-pts">
              <span>{availablePoints.toLocaleString()}</span>
              <span className="rw-avail-label">Available</span>
            </div>
          </div>

          {nextBadge ? (
            <div className="rw-progress-section">
              <div className="rw-progress-labels">
                <span>{currentBadge.name}</span>
                <span>{nextBadge.name} in {(nextBadge.min - totalPoints).toLocaleString()} pts</span>
              </div>
              <div className="rw-progress-bar">
                <div className="rw-progress-fill" style={{ width:`${progress}%` }} />
              </div>
              <div className="rw-progress-pct">{progress}% to {nextBadge.icon} {nextBadge.name}</div>
            </div>
          ) : (
            <div className="rw-progress-section">
              <div className="rw-legend-text">🏆 You've reached the highest tier — LEGEND!</div>
            </div>
          )}

          <button className="rw-share-badge-btn" onClick={() => setShowShareModal(true)}>Share Badge 🔗</button>
        </div>

        {/* STATS ROW */}
        <div className="rw-stats-row">
          <div className="rw-stat-card"><span className="rw-stat-icon">💉</span><span className="rw-stat-num">{totalDonations}</span><span className="rw-stat-lbl">Donations</span></div>
          <div className="rw-stat-card"><span className="rw-stat-icon">🏅</span><span className="rw-stat-num">{achievements.filter(a=>a.unlocked).length}</span><span className="rw-stat-lbl">Achievements</span></div>
          <div className="rw-stat-card"><span className="rw-stat-icon">💰</span><span className="rw-stat-num">{availablePoints}</span><span className="rw-stat-lbl">Points</span></div>
          <div className="rw-stat-card"><span className="rw-stat-icon">🩸</span><span className="rw-stat-num">{bloodGroup}</span><span className="rw-stat-lbl">Blood Group</span></div>
        </div>

        {/* TABS */}
        <div className="rw-tabs">
          {["overview","achievements","leaderboard","redeem","history"].map(tab => (
            <button key={tab} className={`rw-tab${activeTab===tab?" active":""}`} onClick={() => setActiveTab(tab)}>
              {{overview:"📊 Overview",achievements:"🏅 Achievements",leaderboard:"🏆 Leaderboard",redeem:"🎁 Redeem",history:"📋 History"}[tab]}
            </button>
          ))}
        </div>

        <div className="rw-tab-content">

          {/* ── OVERVIEW ────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div className="rw-overview">
              <div className="rw-section">
                <h3 className="rw-section-title">How You Earn Points</h3>
                <div className="rw-earn-grid">
                  {[
                    { label:"Base donation",       pts:"+100", icon:"💉" },
                    { label:"Rare blood (O-, AB-)",pts:"+50",  icon:"🩸" },
                    { label:"Emergency response",  pts:"+30",  icon:"🚨" },
                    { label:"First donation ever", pts:"+50",  icon:"🌟" },
                    { label:"3-month streak",      pts:"+20",  icon:"🔥" },
                    { label:"Donation anniversary",pts:"+25",  icon:"🎂" },
                  ].map(e=>(
                    <div key={e.label} className="rw-earn-card">
                      <span className="rw-earn-icon">{e.icon}</span>
                      <span className="rw-earn-label">{e.label}</span>
                      <span className="rw-earn-pts">{e.pts}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rw-section">
                <h3 className="rw-section-title">Badge Roadmap</h3>
                <div className="rw-badge-roadmap">
                  {BADGE_LEVELS.map(b=>(
                    <div key={b.name} className={`rw-roadmap-step${totalPoints>=b.min?" unlocked":""}`}>
                      <div className="rw-roadmap-icon" style={{ "--badge-col":b.color }}>{b.icon}</div>
                      <div className="rw-roadmap-name">{b.name}</div>
                      <div className="rw-roadmap-pts">{b.min===0?"0":`${b.min}+`} pts</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rw-section">
                <h3 className="rw-section-title">Recent Achievements</h3>
                <div className="rw-mini-achievements">
                  {achievements.filter(a=>a.unlocked).slice(0,4).map(a=>(
                    <div key={a.id} className="rw-mini-ach">
                      <span className="rw-mini-icon">{a.icon}</span>
                      <span className="rw-mini-title">{a.title}</span>
                      <span className="rw-mini-pts">+{a.points} pts</span>
                    </div>
                  ))}
                  {achievements.filter(a=>a.unlocked).length===0 && (
                    <div className="rw-empty">Make your first donation to unlock achievements!</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── ACHIEVEMENTS ───────────────────────────────── */}
          {activeTab === "achievements" && (
            <div className="rw-achievements-grid">
              {achievements.map(a=>(
                <div key={a.id} className={`rw-ach-card${a.unlocked?" unlocked":" locked"}`}>
                  <div className="rw-ach-icon">{a.unlocked?a.icon:"🔒"}</div>
                  <div className="rw-ach-info">
                    <div className="rw-ach-title">{a.title}</div>
                    <div className="rw-ach-desc">{a.desc}</div>
                    <div className="rw-ach-pts">+{a.points} pts</div>
                  </div>
                  {a.unlocked
                    ? <button className="rw-share-ach-btn" onClick={() => { setShareAchievement(a); setShowShareModal(true); }}>Share</button>
                    : <div className="rw-ach-locked-tag">Locked</div>}
                </div>
              ))}
            </div>
          )}

          {/* ── LEADERBOARD ─────────────────────────────────── */}
          {activeTab === "leaderboard" && (
            <div className="rw-leaderboard">
              <div className="rw-lb-filters">
                <button className={`rw-lb-filter${leaderboardFilter==="national"?" active":""}`} onClick={() => setLeaderboardFilter("national")}>🌍 National</button>
                <button className={`rw-lb-filter${leaderboardFilter==="city"?" active":""}`}     onClick={() => setLeaderboardFilter("city")}>🏙️ My City</button>
              </div>
              {filteredLeaderboard.length === 0 ? (
                <div className="rw-empty" style={{ padding:40 }}>No leaderboard data yet. Donations will appear here.</div>
              ) : (
                <div className="rw-lb-table">
                  <div className="rw-lb-header">
                    <span>Rank</span><span>Donor</span><span>City</span><span>Blood</span><span>Points</span><span>Badge</span>
                  </div>
                  {filteredLeaderboard.slice(0,10).map((donor, i) => {
                    const badge = BADGE_LEVELS.find(b=>b.name===donor.badge) || BADGE_LEVELS[0];
                    return (
                      <div key={i} className={`rw-lb-row${donor.isMe?" my-row":""}`}>
                        <span className="rw-lb-rank">
                          {donor.rank<=3 ? ["🥇","🥈","🥉"][donor.rank-1] : `#${donor.rank}`}
                        </span>
                        <span className="rw-lb-name">{donor.name}{donor.isMe && <span className="rw-me-tag"> (You)</span>}</span>
                        <span className="rw-lb-city">{donor.city}</span>
                        <span className="rw-lb-blood">{donor.bloodGroup}</span>
                        <span className="rw-lb-pts">{(donor.points||0).toLocaleString()}</span>
                        <span className="rw-lb-badge" title={donor.badge||""}>{badge.icon}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── REDEEM ──────────────────────────────────────── */}
          {activeTab === "redeem" && (
            <div className="rw-redeem">
              <div className="rw-redeem-balance">
                Available Points: <strong>{availablePoints.toLocaleString()}</strong>
              </div>
              <div className="rw-redeem-grid">
                {REDEMPTION_OPTIONS.map(opt=>(
                  <div key={opt.id} className={`rw-redeem-card${availablePoints<opt.cost?" cannot-redeem":""}`}>
                    <div className="rw-redeem-icon">{opt.icon}</div>
                    <div className="rw-redeem-title">{opt.title}</div>
                    <div className="rw-redeem-desc">{opt.desc}</div>
                    <div className="rw-redeem-cost">{opt.cost} pts</div>
                    <button className="rw-redeem-btn" disabled={availablePoints<opt.cost} onClick={() => setShowRedeemModal(opt)}>
                      {availablePoints>=opt.cost?"Redeem":`Need ${opt.cost-availablePoints} more pts`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── HISTORY ─────────────────────────────────────── */}
          {activeTab === "history" && (
            <div className="rw-history">
              {txnList.length===0 && <div className="rw-empty">No transactions yet. Start donating to earn points!</div>}
              {txnList.map((txn,i)=>(
                <div key={i} className={`rw-txn-row${txn.type==="REDEEM"?" redeem":" earn"}`}>
                  <span className="rw-txn-icon">{txn.type==="EARN"?"💰":"🎁"}</span>
                  <div className="rw-txn-info">
                    <div className="rw-txn-reason">{txn.reason}</div>
                    <div className="rw-txn-date">{txn.date}</div>
                  </div>
                  <div className={`rw-txn-pts${txn.type==="REDEEM"?" neg":" pos"}`}>
                    {txn.type==="EARN"?"+":""}{txn.points} pts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SHARE MODAL ──────────────────────────────────── */}
        {showShareModal && (
          <div className="rw-modal-overlay" onClick={() => setShowShareModal(false)}>
            <div className="rw-modal" onClick={e=>e.stopPropagation()}>
              <button className="rw-modal-close" onClick={() => setShowShareModal(false)}>✕</button>
              <h3 className="rw-modal-title">Share Your Achievement 🎉</h3>
              <div className="rw-share-card">
                <div className="rw-share-card-badge">{currentBadge.icon}</div>
                <div className="rw-share-card-level">{currentBadge.name} Donor</div>
                <div className="rw-share-card-name">{user.name || "Donor"}</div>
                {shareAchievement && <div className="rw-share-card-ach">{shareAchievement.icon} {shareAchievement.title}</div>}
                <div className="rw-share-card-pts">{totalPoints} Points • {totalDonations} Donations</div>
                <div className="rw-share-card-tag">#BloodLinkPro #BloodDonation</div>
              </div>
              <div className="rw-share-btns">
                {[
                  { id:"whatsapp", label:"WhatsApp", icon:"💬", color:"#25D366" },
                  { id:"twitter",  label:"Twitter",  icon:"🐦", color:"#1DA1F2" },
                  { id:"linkedin", label:"LinkedIn", icon:"💼", color:"#0077B5" },
                ].map(p=>{
                  const text = shareAchievement
                    ? `I just unlocked "${shareAchievement.title}" on BloodLink Pro! 🩸 ${currentBadge.icon} ${currentBadge.name} level | ${totalPoints} Points #BloodDonation`
                    : `I'm a ${currentBadge.name} level donor on BloodLink Pro! 🩸 ${totalPoints} points | ${totalDonations} donations #BloodDonation`;
                  return (
                    <button key={p.id} className="rw-share-platform-btn" style={{ "--platform-color":p.color }} onClick={() => handleShare(p.id, text)}>
                      {p.icon} {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── REDEEM CONFIRM MODAL ─────────────────────────── */}
        {showRedeemModal && (
          <div className="rw-modal-overlay" onClick={() => setShowRedeemModal(null)}>
            <div className="rw-modal" onClick={e=>e.stopPropagation()}>
              <button className="rw-modal-close" onClick={() => setShowRedeemModal(null)}>✕</button>
              <h3 className="rw-modal-title">Confirm Redemption</h3>
              <div className="rw-redeem-confirm">
                <div className="rw-redeem-confirm-icon">{showRedeemModal.icon}</div>
                <div className="rw-redeem-confirm-title">{showRedeemModal.title}</div>
                <div className="rw-redeem-confirm-desc">{showRedeemModal.desc}</div>
                <div className="rw-redeem-confirm-cost">Cost: <strong>{showRedeemModal.cost} pts</strong></div>
                <div className="rw-redeem-confirm-after">Points after: <strong>{(availablePoints-showRedeemModal.cost).toLocaleString()}</strong></div>
                <p className="rw-redeem-note">ℹ️ Admin will fulfil your redemption within 3–5 working days.</p>
                <div className="rw-redeem-confirm-btns">
                  <button className="rw-btn-cancel" onClick={() => setShowRedeemModal(null)}>Cancel</button>
                  <button className="rw-btn-confirm" disabled={redeeming} onClick={() => handleRedeem(showRedeemModal)}>
                    {redeeming ? "Processing..." : "Confirm Redeem"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}