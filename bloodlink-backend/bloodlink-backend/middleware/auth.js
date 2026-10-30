// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── Protect: verify JWT ───────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (req.user.status === "SUSPENDED") {
      return res.status(403).json({ success: false, message: "Account suspended. Contact admin." });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Token invalid or expired" });
  }
};

// ── Role check ────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

// ── Admin only shortcut ───────────────────────────────────
const adminOnly = authorize("BB_ADMIN", "SUPER_ADMIN");
const superAdminOnly = authorize("SUPER_ADMIN");

module.exports = { protect, authorize, adminOnly, superAdminOnly };
