// routes/certificates.js  — Module 10: Certificate Generation
const express = require("express");
const router = express.Router();
const Certificate = require("../models/Certificate");
const Donation = require("../models/Donation");
const User = require("../models/User");
const { protect, authorize, adminOnly } = require("../middleware/auth");

// ── Helper: generate cert number ──────────────────────────
const genCertNumber = async (year) => {
  const count = await Certificate.countDocuments({
    certNumber: { $regex: `^CERT-${year}-` },
  });
  return `CERT-${year}-${String(1000 + count + 1).padStart(8, "0")}`;
};

// ── GET /api/certificates — My certificates ───────────────
router.get("/", protect, async (req, res, next) => {
  try {
    const query = {};
    // Donors only see their own; admins see all or filter by donorId
    if (req.user.role === "DONOR") {
      query.donorId = req.user._id;
    } else if (req.query.donorId) {
      query.donorId = req.query.donorId;
    }

    const { bloodGroup, year, page = 1, limit = 20 } = req.query;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (year) query.donationDate = {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31`),
    };

    const skip = (page - 1) * limit;
    const [certs, total] = await Promise.all([
      Certificate.find(query).sort({ issuedAt: -1 }).skip(skip).limit(Number(limit)),
      Certificate.countDocuments(query),
    ]);

    res.json({ success: true, certificates: certs, total, page: Number(page) });
  } catch (err) { next(err); }
});

// ── GET /api/certificates/verify — Public verify by cert # ──
router.get("/verify", async (req, res, next) => {
  try {
    const { cert } = req.query;
    if (!cert) return res.status(400).json({ success: false, message: "cert number required" });

    const certificate = await Certificate.findOne({ certNumber: cert });
    if (!certificate) {
      return res.status(404).json({ success: false, message: "Certificate not found", valid: false });
    }

    res.json({
      success: true,
      valid: certificate.isValid,
      certificate: {
        certNumber: certificate.certNumber,
        donorName: certificate.donorName,
        bloodGroup: certificate.bloodGroup,
        donationDate: certificate.donationDate,
        campName: certificate.campName,
        bankName: certificate.bankName,
        unitsDonated: certificate.unitsDonated,
        issuedAt: certificate.issuedAt,
        isValid: certificate.isValid,
        revokedAt: certificate.revokedAt,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/certificates/generate — Generate from donation ──
router.post("/generate", protect, async (req, res, next) => {
  try {
    const { donationId } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation) return res.status(404).json({ success: false, message: "Donation not found" });

    // Check permission
    const isOwner = donation.donorId.toString() === req.user._id.toString();
    const isAdmin = ["BB_ADMIN","SUPER_ADMIN"].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Prevent duplicate
    const existing = await Certificate.findOne({ donationId });
    if (existing) return res.json({ success: true, certificate: existing, message: "Certificate already exists" });

    const year = new Date(donation.donationDate).getFullYear();
    const certNumber = await genCertNumber(year);
    const donor = await User.findById(donation.donorId).select("name");

    const qrData = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-certificate?cert=${certNumber}`;

    const certificate = await Certificate.create({
      certNumber,
      donorId: donation.donorId,
      donorName: donor?.name || donation.donorName,
      bloodGroup: donation.bloodGroup,
      donationId: donation._id,
      donationDate: donation.donationDate,
      campName: donation.campName,
      bankName: donation.bankName,
      unitsDonated: donation.units,
      issuedBy: req.user._id,
      qrData,
    });

    res.status(201).json({ success: true, certificate });
  } catch (err) { next(err); }
});

// ── POST /api/certificates/bulk-generate — Admin bulk gen ─
router.post("/bulk-generate", protect, adminOnly, async (req, res, next) => {
  try {
    const { donorIds, dateFrom, dateTo } = req.body;
    const query = {};
    if (donorIds?.length) query.donorId = { $in: donorIds };
    if (dateFrom || dateTo) {
      query.donationDate = {};
      if (dateFrom) query.donationDate.$gte = new Date(dateFrom);
      if (dateTo)   query.donationDate.$lte = new Date(dateTo);
    }

    const donations = await Donation.find(query);
    const results = [];

    for (const donation of donations) {
      const exists = await Certificate.findOne({ donationId: donation._id });
      if (exists) { results.push({ status: "skipped", donationId: donation._id }); continue; }

      const year = new Date(donation.donationDate).getFullYear();
      const certNumber = await genCertNumber(year);
      const donor = await User.findById(donation.donorId).select("name");
      const qrData = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-certificate?cert=${certNumber}`;

      await Certificate.create({
        certNumber, donorId: donation.donorId,
        donorName: donor?.name || donation.donorName,
        bloodGroup: donation.bloodGroup, donationId: donation._id,
        donationDate: donation.donationDate, campName: donation.campName,
        bankName: donation.bankName, unitsDonated: donation.units,
        issuedBy: req.user._id, qrData,
      });
      results.push({ status: "created", certNumber, donationId: donation._id });
    }

    res.json({ success: true, results, total: results.length });
  } catch (err) { next(err); }
});

// ── PUT /api/certificates/:id/revoke — Revoke certificate ─
router.put("/:id/revoke", protect, adminOnly, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cert = await Certificate.findByIdAndUpdate(
      req.params.id,
      { isValid: false, revokedAt: new Date(), revokedBy: req.user._id, revokeReason: reason },
      { new: true }
    );
    if (!cert) return res.status(404).json({ success: false, message: "Certificate not found" });
    res.json({ success: true, certificate: cert });
  } catch (err) { next(err); }
});

module.exports = router;
