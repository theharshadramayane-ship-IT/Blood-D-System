// routes/camps.js  — Module 6: Donation Camp Management
const express = require("express");
const router = express.Router();
const Camp = require("../models/Camp");
const User = require("../models/User");
const Donation = require("../models/Donation");
const { protect, authorize, adminOnly } = require("../middleware/auth");

// ── GET /api/camps — List camps ───────────────────────────
router.get("/", protect, async (req, res, next) => {
  try {
    const { status, city, page = 1, limit = 20, search } = req.query;
    const query = {};

    // Camp organizer only sees their own camps
    if (req.user.role === "CAMP_ORGANIZER") query.organizerId = req.user._id;

    if (status && status !== "ALL") query.status = status;
    if (city)   query.city = { $regex: city, $options: "i" };
    if (search) query.title = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const [camps, total] = await Promise.all([
      Camp.find(query).sort({ date: 1 }).skip(skip).limit(Number(limit)),
      Camp.countDocuments(query),
    ]);

    res.json({ success: true, camps, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── GET /api/camps/:id — Single camp detail ───────────────
router.get("/:id", protect, async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ success: false, message: "Camp not found" });
    res.json({ success: true, camp });
  } catch (err) { next(err); }
});

// ── POST /api/camps — Create camp ─────────────────────────
router.post(
  "/",
  protect,
  authorize("CAMP_ORGANIZER","BB_ADMIN","SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const {
        title, date, endDate, startTime, endTime,
        venue, city, state, address, capacity,
        description, contactPhone, contactEmail,
        targetBloodGroups, bankId,
      } = req.body;

      if (!title || !date || !venue || !city) {
        return res.status(400).json({ success: false, message: "title, date, venue and city are required" });
      }

      const camp = await Camp.create({
        title, date, endDate, startTime, endTime,
        venue, city, state, address, capacity,
        description, contactPhone, contactEmail,
        targetBloodGroups, bankId,
        organizerId: req.user._id,
        organizerName: req.user.organizationName || req.user.name,
        status: "UPCOMING",
      });

      res.status(201).json({ success: true, message: "Camp created successfully", camp });
    } catch (err) { next(err); }
  }
);

// ── PUT /api/camps/:id — Update camp ──────────────────────
router.put("/:id", protect, authorize("CAMP_ORGANIZER","BB_ADMIN","SUPER_ADMIN"), async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ success: false, message: "Camp not found" });

    // Organizer can only edit their own camps
    if (req.user.role === "CAMP_ORGANIZER" && camp.organizerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const allowed = ["title","date","endDate","startTime","endTime","venue","city","state","address","capacity","status","description","contactPhone","contactEmail","targetBloodGroups"];
    allowed.forEach((k) => { if (req.body[k] !== undefined) camp[k] = req.body[k]; });
    await camp.save();

    res.json({ success: true, camp });
  } catch (err) { next(err); }
});

// ── POST /api/camps/:id/register — Donor registers ────────
router.post("/:id/register", protect, authorize("DONOR"), async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ success: false, message: "Camp not found" });
    if (!["UPCOMING","REGISTRATION_OPEN"].includes(camp.status)) {
      return res.status(400).json({ success: false, message: "Registration is not open for this camp" });
    }

    // Check duplicate registration
    const alreadyRegistered = camp.registrations.find(
      (r) => r.donorId.toString() === req.user._id.toString()
    );
    if (alreadyRegistered) {
      return res.status(400).json({ success: false, message: "You are already registered for this camp" });
    }

    // Check capacity
    const activeRegs = camp.registrations.filter((r) => !["CANCELLED","NO_SHOW"].includes(r.status));
    const status = activeRegs.length >= camp.capacity ? "WAITLISTED" : "REGISTERED";

    const qrCode = `QR-${camp._id}-${req.user._id}-${Date.now()}`;
    camp.registrations.push({
      donorId: req.user._id,
      donorName: req.user.name,
      bloodGroup: req.user.bloodGroup,
      phone: req.user.phone,
      status,
      qrCode,
    });
    await camp.save();

    res.status(201).json({ success: true, message: `Registered! Status: ${status}`, status, qrCode });
  } catch (err) { next(err); }
});

// ── PUT /api/camps/:id/registrations/:regId — Update reg status ──
router.put("/:id/registrations/:regId", protect, authorize("CAMP_ORGANIZER","BB_ADMIN","SUPER_ADMIN"), async (req, res, next) => {
  try {
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ success: false, message: "Camp not found" });

    const reg = camp.registrations.id(req.params.regId);
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found" });

    const { status, unitsDonated, notes } = req.body;
    if (status) reg.status = status;
    if (unitsDonated !== undefined) reg.unitsDonated = unitsDonated;
    if (notes) reg.notes = notes;

    if (status === "CHECKED_IN")  reg.checkedInAt = new Date();
    if (status === "DONATED") {
      reg.donatedAt = new Date();
      camp.totalDonations += (unitsDonated || 1);

      // Record donation
      await Donation.create({
        donorId: reg.donorId,
        donorName: reg.donorName,
        bloodGroup: reg.bloodGroup,
        campId: camp._id,
        campName: camp.title,
        units: unitsDonated || 1,
        donationDate: new Date(),
        city: camp.city,
        pointsAwarded: 100,
      });

      // Award donor points
      await User.findByIdAndUpdate(reg.donorId, {
        $inc: { points: 100, totalDonations: 1 },
        lastDonationDate: new Date(),
      });
    }

    await camp.save();
    res.json({ success: true, camp });
  } catch (err) { next(err); }
});

// ── DELETE /api/camps/:id — Delete camp ───────────────────
router.delete("/:id", protect, adminOnly, async (req, res, next) => {
  try {
    await Camp.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Camp deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
