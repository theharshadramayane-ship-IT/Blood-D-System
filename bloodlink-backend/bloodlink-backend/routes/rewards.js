// routes/rewards.js  — Module 9: Rewards & Gamification
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Donation = require("../models/Donation");
const { protect, authorize, adminOnly } = require("../middleware/auth");

// ── GET /api/rewards/me — My rewards profile ──────────────
router.get("/me", protect, authorize("DONOR"), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("name bloodGroup points totalDonations lastDonationDate city createdAt");
    const donations = await Donation.find({ donorId: req.user._id }).sort({ donationDate: -1 });

    // Compute stats
    const daysSinceJoined = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const emergencyResponses = donations.filter((d) => d.isEmergency).length;
    const rareBloodDonations = ["O-","AB-"].includes(user.bloodGroup) ? user.totalDonations : 0;

    // Consecutive months streak
    const months = [...new Set(donations.map((d) => {
      const dt = new Date(d.donationDate);
      return `${dt.getFullYear()}-${dt.getMonth()}`;
    }))];
    let streak = 0;
    if (months.length > 0) {
      streak = 1;
      for (let i = 1; i < months.length; i++) {
        const [y1, m1] = months[i - 1].split("-").map(Number);
        const [y2, m2] = months[i].split("-").map(Number);
        if ((y1 * 12 + m1) - (y2 * 12 + m2) === 1) streak++;
        else break;
      }
    }

    res.json({
      success: true,
      stats: {
        points: user.points || 0,
        totalDonations: user.totalDonations || 0,
        lastDonationDate: user.lastDonationDate,
        daysSinceJoined,
        emergencyResponses,
        rareBloodDonations,
        consecutiveMonths: streak,
        cityRank: null, // computed in leaderboard endpoint
      },
      donations,
    });
  } catch (err) { next(err); }
});

// ── GET /api/rewards/leaderboard — City/global leaderboard ──
router.get("/leaderboard", protect, async (req, res, next) => {
  try {
    const { city, limit = 50 } = req.query;
    const query = { role: "DONOR" };
    if (city) query.city = city;

    const leaders = await User.find(query)
      .select("name bloodGroup points totalDonations city")
      .sort({ points: -1 })
      .limit(Number(limit));

    const board = leaders.map((u, i) => ({
      rank: i + 1,
      name: u.name,
      bloodGroup: u.bloodGroup,
      points: u.points || 0,
      totalDonations: u.totalDonations || 0,
      city: u.city,
    }));

    res.json({ success: true, leaderboard: board });
  } catch (err) { next(err); }
});

// ── POST /api/rewards/redeem — Redeem reward ──────────────
router.post("/redeem", protect, authorize("DONOR"), async (req, res, next) => {
  try {
    const { rewardId, cost } = req.body;
    if (!rewardId || !cost) {
      return res.status(400).json({ success: false, message: "rewardId and cost required" });
    }

    const user = await User.findById(req.user._id);
    if (user.points < cost) {
      return res.status(400).json({ success: false, message: `Insufficient points. You need ${cost}, you have ${user.points}` });
    }

    user.points -= cost;
    await user.save();

    res.json({
      success: true,
      message: "Reward redeemed successfully!",
      remainingPoints: user.points,
    });
  } catch (err) { next(err); }
});

// ── POST /api/rewards/award — Admin awards points ─────────
router.post("/award", protect, adminOnly, async (req, res, next) => {
  try {
    const { donorId, points, reason } = req.body;
    if (!donorId || !points) {
      return res.status(400).json({ success: false, message: "donorId and points required" });
    }

    const user = await User.findByIdAndUpdate(
      donorId,
      { $inc: { points } },
      { new: true }
    ).select("name points");

    if (!user) return res.status(404).json({ success: false, message: "Donor not found" });

    res.json({ success: true, message: `Awarded ${points} points to ${user.name}`, user });
  } catch (err) { next(err); }
});

module.exports = router;
