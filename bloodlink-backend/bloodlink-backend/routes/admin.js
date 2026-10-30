// routes/admin.js  — Admin Dashboard + User Management
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const BloodRequest = require("../models/BloodRequest");
const BloodStock = require("../models/BloodStock");
const Donation = require("../models/Donation");
const Camp = require("../models/Camp");
const { protect, adminOnly, superAdminOnly } = require("../middleware/auth");

// ── GET /api/admin/dashboard — Master stats ───────────────
router.get("/dashboard", protect, adminOnly, async (req, res, next) => {
  try {
    const [
      totalDonors,
      totalHospitals,
      totalOrganizers,
      pendingRequests,
      totalDonations,
      activeCamps,
      stockSummary,
    ] = await Promise.all([
      User.countDocuments({ role: "DONOR", status: "ACTIVE" }),
      User.countDocuments({ role: "HOSPITAL", status: "ACTIVE" }),
      User.countDocuments({ role: "CAMP_ORGANIZER", status: "ACTIVE" }),
      BloodRequest.countDocuments({ status: "PENDING" }),
      Donation.countDocuments(),
      Camp.countDocuments({ status: { $in: ["UPCOMING","REGISTRATION_OPEN","ONGOING"] } }),
      BloodStock.getGroupSummary(null),
    ]);

    // Recent activity
    const recentRequests = await BloodRequest.find()
      .sort({ createdAt: -1 }).limit(5)
      .select("hospitalName bloodGroup units urgency status createdAt");

    const recentDonations = await Donation.find()
      .sort({ donationDate: -1 }).limit(5)
      .populate("donorId", "name bloodGroup");

    // Monthly donation chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyChart = await Donation.aggregate([
      { $match: { donationDate: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year:  { $year: "$donationDate" },
            month: { $month: "$donationDate" },
          },
          count: { $sum: 1 },
          units: { $sum: "$units" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalDonors,
        totalHospitals,
        totalOrganizers,
        pendingRequests,
        totalDonations,
        activeCamps,
      },
      stockSummary,
      recentRequests,
      recentDonations,
      monthlyChart,
    });
  } catch (err) { next(err); }
});

// ── GET /api/admin/users — All users ─────────────────────
router.get("/users", protect, adminOnly, async (req, res, next) => {
  try {
    const { role, status, city, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role && role !== "ALL") query.role = role;
    if (status && status !== "ALL") query.status = status;
    if (city) query.city = city;
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).select("-password").skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({ success: true, users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── PUT /api/admin/users/:id/status — Suspend/activate ───
router.put("/users/:id/status", protect, adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE","SUSPENDED","PENDING"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    // Super admin only can modify admin accounts
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: "User not found" });
    if (["BB_ADMIN","SUPER_ADMIN"].includes(target.role) && req.user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Only Super Admin can modify admin accounts" });
    }

    target.status = status;
    await target.save();
    res.json({ success: true, user: target.toJSON() });
  } catch (err) { next(err); }
});

// ── POST /api/admin/create-admin — Create admin (SuperAdmin only) ──
router.post("/create-admin", protect, superAdminOnly, async (req, res, next) => {
  try {
    const { name, email, password, phone, city, role } = req.body;
    if (!["BB_ADMIN","SUPER_ADMIN"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid admin role" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: "Email already exists" });

    const admin = await User.create({ name, email, password, phone, city, role });
    res.status(201).json({ success: true, message: "Admin created", user: admin.toJSON() });
  } catch (err) { next(err); }
});

module.exports = router;
