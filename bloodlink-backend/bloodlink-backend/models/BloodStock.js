// models/BloodStock.js
const mongoose = require("mongoose");

const bloodStockSchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
      enum: ["A+","A-","B+","B-","O+","O-","AB+","AB-"],
      required: true,
    },
    units:       { type: Number, required: true, min: 0 },
    expiryDate:  { type: Date, required: true },
    hospital:    { type: String, required: true },  // hospital/camp name
    source: {
      type: String,
      enum: ["DONATION", "WALK_IN", "TRANSFER", "PURCHASE"],
      default: "DONATION",
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "RESERVED", "DISPATCHED", "EXPIRED", "DISCARDED"],
      default: "AVAILABLE",
    },
    bankId:     { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank" },
    donorId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes:      { type: String },
  },
  { timestamps: true }
);

// Virtual: level (CRITICAL/LOW/GOOD) — checked per blood group total
bloodStockSchema.statics.getGroupSummary = async function (bankId) {
  const groups = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];
  const results = {};
  for (const bg of groups) {
    const query = { bloodGroup: bg, status: "AVAILABLE" };
    if (bankId) query.bankId = bankId;
    const total = await this.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$units" } } },
    ]);
    const t = total[0]?.total || 0;
    results[bg] = { total: t, level: t < 5 ? "CRITICAL" : t < 15 ? "LOW" : "GOOD" };
  }
  return results;
};

module.exports = mongoose.model("BloodStock", bloodStockSchema);
