// routes/network.js  — Module 7: Multi-City Blood Bank Network
const express = require("express");
const router = express.Router();
const { BloodBank, NetworkTransfer } = require("../models/BloodBank");
const BloodStock = require("../models/BloodStock");
const { protect, adminOnly, authorize, superAdminOnly } = require("../middleware/auth");

// ═══════════════════════════════════════════════════════════
//  BLOOD BANKS
// ═══════════════════════════════════════════════════════════

// ── GET /api/network/banks ────────────────────────────────
router.get("/banks", protect, async (req, res, next) => {
  try {
    const { city, isActive } = req.query;
    const query = {};
    if (city)     query.city = { $regex: city, $options: "i" };
    if (isActive !== undefined) query.isActive = isActive === "true";

    const banks = await BloodBank.find(query).sort({ city: 1 });
    res.json({ success: true, banks });
  } catch (err) { next(err); }
});

// ── GET /api/network/banks/:id ────────────────────────────
router.get("/banks/:id", protect, async (req, res, next) => {
  try {
    const bank = await BloodBank.findById(req.params.id);
    if (!bank) return res.status(404).json({ success: false, message: "Blood bank not found" });

    // Attach live stock summary
    const stockSummary = await BloodStock.getGroupSummary(bank._id);
    res.json({ success: true, bank, stockSummary });
  } catch (err) { next(err); }
});

// ── POST /api/network/banks — Create bank (Super Admin) ───
router.post("/banks", protect, superAdminOnly, async (req, res, next) => {
  try {
    const { name, city, state, address, adminId, adminName, contactPhone, contactEmail, capacity, lat, lng } = req.body;
    if (!name || !city) return res.status(400).json({ success: false, message: "name and city required" });

    const bank = await BloodBank.create({ name, city, state, address, adminId, adminName, contactPhone, contactEmail, capacity, lat, lng });
    res.status(201).json({ success: true, bank });
  } catch (err) { next(err); }
});

// ── PUT /api/network/banks/:id ────────────────────────────
router.put("/banks/:id", protect, adminOnly, async (req, res, next) => {
  try {
    const bank = await BloodBank.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!bank) return res.status(404).json({ success: false, message: "Blood bank not found" });
    res.json({ success: true, bank });
  } catch (err) { next(err); }
});

// ── DELETE /api/network/banks/:id ─────────────────────────
router.delete("/banks/:id", protect, superAdminOnly, async (req, res, next) => {
  try {
    await BloodBank.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Blood bank deleted" });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════
//  NETWORK STOCK (per bank)
// ═══════════════════════════════════════════════════════════

// ── GET /api/network/stocks — All banks stock summary ─────
router.get("/stocks", protect, authorize("BB_ADMIN","SUPER_ADMIN","HOSPITAL"), async (req, res, next) => {
  try {
    const banks = await BloodBank.find({ isActive: true });
    const result = await Promise.all(
      banks.map(async (bank) => ({
        bank: { _id: bank._id, name: bank.name, city: bank.city },
        stocks: await BloodStock.getGroupSummary(bank._id),
      }))
    );
    res.json({ success: true, networkStocks: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════
//  TRANSFERS
// ═══════════════════════════════════════════════════════════

// ── GET /api/network/transfers ────────────────────────────
router.get("/transfers", protect, adminOnly, async (req, res, next) => {
  try {
    const { status, fromBankId, toBankId, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)     query.status = status;
    if (fromBankId) query.fromBankId = fromBankId;
    if (toBankId)   query.toBankId = toBankId;

    const skip = (page - 1) * limit;
    const [transfers, total] = await Promise.all([
      NetworkTransfer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .populate("fromBankId", "name city")
        .populate("toBankId", "name city"),
      NetworkTransfer.countDocuments(query),
    ]);
    res.json({ success: true, transfers, total });
  } catch (err) { next(err); }
});

// ── POST /api/network/transfers — Request a transfer ──────
router.post("/transfers", protect, adminOnly, async (req, res, next) => {
  try {
    const { fromBankId, toBankId, bloodGroup, units, reason } = req.body;
    if (!fromBankId || !toBankId || !bloodGroup || !units) {
      return res.status(400).json({ success: false, message: "fromBankId, toBankId, bloodGroup and units required" });
    }

    const [fromBank, toBank] = await Promise.all([
      BloodBank.findById(fromBankId),
      BloodBank.findById(toBankId),
    ]);
    if (!fromBank || !toBank) {
      return res.status(404).json({ success: false, message: "One or both banks not found" });
    }

    const transfer = await NetworkTransfer.create({
      fromBankId, fromBankName: fromBank.name,
      toBankId,   toBankName: toBank.name,
      bloodGroup, units, reason,
      requestedBy: req.user._id,
    });
    res.status(201).json({ success: true, transfer });
  } catch (err) { next(err); }
});

// ── PUT /api/network/transfers/:id/status ─────────────────
router.put("/transfers/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const updates = { status, notes };
    if (status === "APPROVED")   { updates.approvedBy = req.user._id; updates.approvedAt = new Date(); }
    if (status === "DISPATCHED") { updates.dispatchedAt = new Date(); }
    if (status === "RECEIVED")   { updates.receivedAt = new Date(); }

    const transfer = await NetworkTransfer.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!transfer) return res.status(404).json({ success: false, message: "Transfer not found" });
    res.json({ success: true, transfer });
  } catch (err) { next(err); }
});

module.exports = router;
