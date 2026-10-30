// models/DonorMedical.js
const mongoose = require("mongoose");

const screeningResultSchema = new mongoose.Schema(
  {
    donor:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers:    { type: Map, of: String }, // { q1: "YES", q2: "NO", ... }
    result:     { type: String, enum: ["ELIGIBLE", "DEFERRED", "PERMANENTLY_DEFERRED"], required: true },
    score:      { type: Number },
    failedChecks: [{ questionId: String, reason: String, deferralDays: Number, permanent: Boolean }],
    deferredUntil: { type: Date },
    notes:      { type: String },
    conductedBy: { type: String, default: "self" },
  },
  { timestamps: true }
);

const donorMedicalSchema = new mongoose.Schema(
  {
    donor:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    conditions:       [String],
    allergies:        { type: String },
    medications:      { type: String },
    recentSurgeries:  { type: String },
    notes:            { type: String },
    lastCheckup:      { type: Date },
    weight:           { type: Number },
    height:           { type: Number },
    screeningHistory: [screeningResultSchema],
    lastScreeningResult: { type: String, enum: ["ELIGIBLE", "DEFERRED", "PERMANENTLY_DEFERRED"] },
    nextEligibleDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DonorMedical", donorMedicalSchema);
