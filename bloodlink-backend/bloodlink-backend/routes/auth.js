// routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ── Generate JWT ──────────────────────────────────────────
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

// ── POST /api/auth/register ───────────────────────────────
router.post("/register", async (req, res, next) => {
  try {
    const {
      name, email, password, phone, city, role,
      // Donor
      bloodGroup, dob, gender,
      // Hospital
      hospitalName, licenseNumber, contactPerson, address,
      // Camp Organizer
      organizationName, designation,
    } = req.body;

    // Validate required
    if (!name || !email || !password || !phone || !city || !role) {
      return res.status(400).json({ success: false, message: "Please fill all required fields" });
    }

    // Only these roles can self-register
    const selfRegisterRoles = ["DONOR", "HOSPITAL", "CAMP_ORGANIZER"];
    if (!selfRegisterRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role for registration" });
    }

    // Check duplicate email
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Build user object
    const userData = { name, email, password, phone, city, role };

    if (role === "DONOR") {
      if (!bloodGroup || !dob || !gender) {
        return res.status(400).json({ success: false, message: "Blood group, DOB and gender required for donors" });
      }
      Object.assign(userData, { bloodGroup, dob, gender });
    }

    if (role === "HOSPITAL") {
      if (!hospitalName || !licenseNumber || !contactPerson) {
        return res.status(400).json({ success: false, message: "Hospital details required" });
      }
      Object.assign(userData, { hospitalName, licenseNumber, contactPerson, address });
    }

    if (role === "CAMP_ORGANIZER") {
      if (!organizationName || !designation) {
        return res.status(400).json({ success: false, message: "Organization name and designation required" });
      }
      Object.assign(userData, { organizationName, designation });
    }

    const user = await User.create(userData);
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (user.status === "SUSPENDED") {
      return res.status(403).json({ success: false, message: "Account suspended. Contact admin." });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── PUT /api/auth/profile ─────────────────────────────────
router.put("/profile", protect, async (req, res, next) => {
  try {
    const allowed = [
      "name","phone","city","address","gender","dob","bloodGroup",
      "emergencyContact","emergencyPhone","hospitalName","contactPerson",
      "organizationName","designation",
    ];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true, runValidators: true,
    }).select("-password");

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/change-password ─────────────────────────
router.put("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
