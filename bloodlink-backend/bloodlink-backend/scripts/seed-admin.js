// scripts/seed-admin.js
// Run once: node scripts/seed-admin.js
// Creates Super Admin + BB Admin in MongoDB

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const User = require("../models/User");

const ADMINS = [
  {
    name: "Super Admin",
    email: "superadmin@bloodlink.com",
    password: "admin123",
    phone: "9999999999",
    city: "Mumbai",
    role: "SUPER_ADMIN",
  },
  {
    name: "Blood Bank Admin",
    email: "bbadmin@bloodlink.com",
    password: "admin123",
    phone: "8888888888",
    city: "Pune",
    role: "BB_ADMIN",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/bloodlink_pro");
    console.log("✅ Connected to MongoDB");

    for (const admin of ADMINS) {
      const exists = await User.findOne({ email: admin.email });
      if (exists) {
        console.log(`⚠️  ${admin.email} already exists — skipping`);
        continue;
      }
      await User.create(admin);
      console.log(`✅ Created ${admin.role}: ${admin.email} / ${admin.password}`);
    }

    console.log("\n🩸 Admin seed complete! You can now login at /login");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();
