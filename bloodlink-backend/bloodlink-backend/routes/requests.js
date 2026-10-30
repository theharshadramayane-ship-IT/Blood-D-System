// routes/requests.js  — Module 5: Emergency Blood Request
const express = require("express");
const router = express.Router();
const BloodRequest = require("../models/BloodRequest");
const { protect, authorize, adminOnly } = require("../middleware/auth");

// ── GET /api/requests — List requests ─────────────────────
router.get("/", protect, async (req, res, next) => {
  try {
    const { status, urgency, bloodGroup, hospitalId, page = 1, limit = 20 } = req.query;
    const query = {};

    // Hospitals only see their own requests
    if (req.user.role === "HOSPITAL") query.hospitalId = req.user._id;

    if (status && status !== "ALL")     query.status = status;
    if (urgency && urgency !== "ALL")   query.urgency = urgency;
    if (bloodGroup && bloodGroup !== "ALL") query.bloodGroup = bloodGroup;
    if (hospitalId && req.user.role !== "HOSPITAL") query.hospitalId = hospitalId;

    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      BloodRequest.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      BloodRequest.countDocuments(query),
    ]);

    res.json({ success: true, requests, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── GET /api/requests/stats — Dashboard stats ─────────────
router.get("/stats", protect, adminOnly, async (req, res, next) => {
  try {
    const stats = await BloodRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const urgencyStats = await BloodRequest.aggregate([
      { $match: { status: { $in: ["PENDING","APPROVED"] } } },
      { $group: { _id: "$urgency", count: { $sum: 1 } } },
    ]);
    res.json({ success: true, stats, urgencyStats });
  } catch (err) { next(err); }
});

// ── POST /api/requests — Create new blood request ─────────
router.post(
  "/",
  protect,
  authorize("HOSPITAL","BB_ADMIN","SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const {
        hospitalName, bloodGroup, units, urgency,
        patientName, patientAge, purpose,
        contactPerson, contactPhone, requiredBy, city,
      } = req.body;

      if (!bloodGroup || !units || !urgency) {
        return res.status(400).json({ success: false, message: "bloodGroup, units and urgency are required" });
      }

      const request = await BloodRequest.create({
        hospitalName: hospitalName || req.user.hospitalName || req.user.name,
        hospitalId: req.user._id,
        bloodGroup, units, urgency,
        patientName, patientAge, purpose,
        contactPerson, contactPhone,
        requiredBy, city: city || req.user.city,
      });

      res.status(201).json({ success: true, message: "Blood request submitted", request });
    } catch (err) { next(err); }
  }
);

// ── PUT /api/requests/:id/status — Admin: update status ───
router.put("/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const { status, adminNotes, rejectionReason } = req.body;
    const validStatuses = ["PENDING","APPROVED","DISPATCHED","DELIVERED","CLOSED","REJECTED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updates = { status, adminNotes };
    if (status === "APPROVED")    { updates.approvedBy = req.user._id; updates.approvedAt = new Date(); }
    if (status === "DISPATCHED")  { updates.dispatchedAt = new Date(); }
    if (status === "DELIVERED")   { updates.deliveredAt = new Date(); }
    if (status === "REJECTED")    { updates.rejectionReason = rejectionReason; }

    const request = await BloodRequest.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    res.json({ success: true, request });
  } catch (err) { next(err); }
});

// ── POST /api/requests/:id/rate — Hospital rates fulfilled request ──
router.post("/:id/rate", protect, authorize("HOSPITAL"), async (req, res, next) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ success: false, message: "Score must be 1–5" });
    }

    const request = await BloodRequest.findOneAndUpdate(
      { _id: req.params.id, hospitalId: req.user._id, status: { $in: ["DELIVERED","CLOSED"] } },
      { rating: { score, comment, ratedAt: new Date() } },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: "Request not found or not yet delivered" });

    res.json({ success: true, request });
  } catch (err) { next(err); }
});

// ── DELETE /api/requests/:id — Cancel/delete request ──────
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const request = await BloodRequest.findOne({ _id: req.params.id });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    // Only the requester (hospital) or admin can delete
    const isOwner = request.hospitalId?.toString() === req.user._id.toString();
    const isAdmin = ["BB_ADMIN","SUPER_ADMIN"].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await BloodRequest.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Request deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
