// models/Donation.js  — tracks every blood donation event
const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donorId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    donorName:  { type: String },
    bloodGroup: { type: String },
    campId:     { type: mongoose.Schema.Types.ObjectId, ref: "Camp" },
    campName:   { type: String },
    bankId:     { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank" },
    bankName:   { type: String },
    units:      { type: Number, default: 1 },
    donationDate:{ type: Date, default: Date.now },
    city:       { type: String },
    isEmergency:{ type: Boolean, default: false },
    pointsAwarded: { type: Number, default: 0 },
    notes:      { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Donation", donationSchema);
