// routes/donors.js  — Module 1 + 2: Donor List & Profile
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const DonorMedical = require("../models/DonorMedical");
const Donation = require("../models/Donation");
const { protect, adminOnly } = require("../middleware/auth");

// ── GET /api/donors — Admin: list all donors ──────────────
router.get("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { city, bloodGroup, status, search, page = 1, limit = 20 } = req.query;
    const query = { role: "DONOR" };

    if (city)       query.city = city;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (status)     query.status = status;
    if (search)     query.name = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const [donors, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({ success: true, donors, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── GET /api/donors/:id — Get single donor ────────────────
router.get("/:id", protect, async (req, res, next) => {
  try {
    const donor = await User.findOne({ _id: req.params.id, role: "DONOR" }).select("-password");
    if (!donor) return res.status(404).json({ success: false, message: "Donor not found" });
    res.json({ success: true, donor });
  } catch (err) { next(err); }
});

// ── GET /api/donors/:id/medical — Medical history ─────────
router.get("/:id/medical", protect, async (req, res, next) => {
  try {
    // Donor can only view own medical data
    if (req.user.role === "DONOR" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const medical = await DonorMedical.findOne({ donor: req.params.id });
    res.json({ success: true, medical: medical || {} });
  } catch (err) { next(err); }
});

// ── PUT /api/donors/:id/medical — Update medical history ──
router.put("/:id/medical", protect, async (req, res, next) => {
  try {
    if (req.user.role === "DONOR" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const { conditions, allergies, medications, recentSurgeries, notes, lastCheckup, weight, height } = req.body;

    const medical = await DonorMedical.findOneAndUpdate(
      { donor: req.params.id },
      { donor: req.params.id, conditions, allergies, medications, recentSurgeries, notes, lastCheckup, weight, height },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, medical });
  } catch (err) { next(err); }
});

// ── GET /api/donors/:id/donations — Donation history ──────
router.get("/:id/donations", protect, async (req, res, next) => {
  try {
    if (req.user.role === "DONOR" && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const donations = await Donation.find({ donorId: req.params.id }).sort({ donationDate: -1 });
    res.json({ success: true, donations });
  } catch (err) { next(err); }
});

// ── PUT /api/donors/:id/status — Admin: suspend/activate ──
router.put("/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE","SUSPENDED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const donor = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select("-password");
    res.json({ success: true, donor });
  } catch (err) { next(err); }
});

module.exports = router;
