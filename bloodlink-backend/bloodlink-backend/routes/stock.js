// routes/stock.js  — Module 4: Blood Stock & Inventory
const express = require("express");
const router = express.Router();
const BloodStock = require("../models/BloodStock");
const { protect, adminOnly } = require("../middleware/auth");

// ── GET /api/stock — List all stock entries ───────────────
router.get("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { bloodGroup, status, bankId, page = 1, limit = 50 } = req.query;
    const query = {};
    if (bloodGroup && bloodGroup !== "ALL") query.bloodGroup = bloodGroup;
    if (status && status !== "ALL")         query.status = status;
    if (bankId)                             query.bankId = bankId;

    const skip = (page - 1) * limit;
    const [stocks, total] = await Promise.all([
      BloodStock.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      BloodStock.countDocuments(query),
    ]);

    res.json({ success: true, stocks, total, page: Number(page) });
  } catch (err) { next(err); }
});

// ── GET /api/stock/summary — Group-level summary ──────────
router.get("/summary", protect, async (req, res, next) => {
  try {
    const { bankId } = req.query;
    const summary = await BloodStock.getGroupSummary(bankId || null);
    res.json({ success: true, summary });
  } catch (err) { next(err); }
});

// ── GET /api/stock/alerts — Low/critical alerts ───────────
router.get("/alerts", protect, adminOnly, async (req, res, next) => {
  try {
    const summary = await BloodStock.getGroupSummary(null);
    const alerts = Object.entries(summary)
      .filter(([, v]) => v.level !== "GOOD")
      .map(([bg, v]) => ({ bloodGroup: bg, ...v }));

    // Expiring within 7 days
    const expiringSoon = await BloodStock.find({
      status: "AVAILABLE",
      expiryDate: { $lte: new Date(Date.now() + 7 * 86400000) },
    }).sort({ expiryDate: 1 });

    res.json({ success: true, lowAlerts: alerts, expiringSoon });
  } catch (err) { next(err); }
});

// ── POST /api/stock — Add new blood stock ─────────────────
router.post("/", protect, adminOnly, async (req, res, next) => {
  try {
    const { bloodGroup, units, expiryDate, hospital, source, bankId, donorId, notes } = req.body;

    if (!bloodGroup || !units || !expiryDate || !hospital) {
      return res.status(400).json({ success: false, message: "bloodGroup, units, expiryDate and hospital are required" });
    }

    const stock = await BloodStock.create({
      bloodGroup, units, expiryDate, hospital, source, bankId, donorId,
      notes, addedBy: req.user._id,
    });

    res.status(201).json({ success: true, message: "Stock added successfully", stock });
  } catch (err) { next(err); }
});

// ── PUT /api/stock/:id — Update stock (status/units) ──────
router.put("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const allowed = ["units","status","expiryDate","hospital","notes"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const stock = await BloodStock.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!stock) return res.status(404).json({ success: false, message: "Stock entry not found" });

    res.json({ success: true, stock });
  } catch (err) { next(err); }
});

// ── DELETE /api/stock/:id — Remove stock entry ────────────
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const stock = await BloodStock.findByIdAndDelete(req.params.id);
    if (!stock) return res.status(404).json({ success: false, message: "Stock entry not found" });
    res.json({ success: true, message: "Stock entry deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
