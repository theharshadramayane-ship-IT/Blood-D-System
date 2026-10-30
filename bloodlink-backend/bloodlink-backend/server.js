// server.js  — BloodLink Pro Backend Entry Point
require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

// ── Connect to MongoDB ───────────────────────────────────
connectDB();

const app = express();

// ── Middleware ───────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "BloodLink Pro API is running 🩸",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ───────────────────────────────────────────
app.use("/api/auth",         require("./routes/auth"));
app.use("/api/donors",       require("./routes/donors"));
app.use("/api/screening",    require("./routes/screening"));
app.use("/api/stock",        require("./routes/stock"));
app.use("/api/requests",     require("./routes/requests"));
app.use("/api/camps",        require("./routes/camps"));
app.use("/api/network",      require("./routes/network"));
app.use("/api/thalassemia",  require("./routes/thalassemia"));
app.use("/api/rewards",      require("./routes/rewards"));
app.use("/api/certificates", require("./routes/certificates"));
app.use("/api/admin",        require("./routes/admin"));

// ── 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🩸 BloodLink Pro Backend running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health\n`);
});
