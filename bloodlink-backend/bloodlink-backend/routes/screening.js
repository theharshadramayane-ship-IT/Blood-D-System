// routes/screening.js  — Module 3: Health Pre-Screening
const express = require("express");
const router = express.Router();
const DonorMedical = require("../models/DonorMedical");
const { protect, authorize } = require("../middleware/auth");

// ── POST /api/screening/submit — Submit screening answers ─
router.post("/submit", protect, authorize("DONOR"), async (req, res, next) => {
  try {
    const { answers, result, score, failedChecks, deferredUntil } = req.body;

    if (!result || !answers) {
      return res.status(400).json({ success: false, message: "answers and result are required" });
    }

    const screeningEntry = {
      donor: req.user._id,
      answers,
      result,
      score,
      failedChecks: failedChecks || [],
      deferredUntil: deferredUntil ? new Date(deferredUntil) : undefined,
      conductedBy: "self",
    };

    // Update or create medical record with new screening entry
    const medical = await DonorMedical.findOneAndUpdate(
      { donor: req.user._id },
      {
        $push: { screeningHistory: { $each: [screeningEntry], $position: 0 } },
        $set: {
          lastScreeningResult: result,
          nextEligibleDate: deferredUntil ? new Date(deferredUntil) : undefined,
        },
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: result === "ELIGIBLE" ? "You are eligible to donate!" : "Screening submitted",
      result,
      medical,
    });
  } catch (err) { next(err); }
});

// ── GET /api/screening/history — My screening history ──────
router.get("/history", protect, authorize("DONOR"), async (req, res, next) => {
  try {
    const medical = await DonorMedical.findOne({ donor: req.user._id });
    const history = medical?.screeningHistory || [];
    res.json({ success: true, history });
  } catch (err) { next(err); }
});

// ── GET /api/screening/status — My current eligibility ─────
router.get("/status", protect, authorize("DONOR"), async (req, res, next) => {
  try {
    const medical = await DonorMedical.findOne({ donor: req.user._id });
    res.json({
      success: true,
      status: medical?.lastScreeningResult || null,
      nextEligibleDate: medical?.nextEligibleDate || null,
    });
  } catch (err) { next(err); }
});

module.exports = router;
