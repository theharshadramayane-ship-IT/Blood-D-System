// models/Certificate.js
const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certNumber:  { type: String, unique: true, required: true }, // CERT-2025-00001000
    donorId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    donorName:   { type: String, required: true },
    bloodGroup:  { type: String },
    donationId:  { type: mongoose.Schema.Types.ObjectId, ref: "Donation" },
    donationDate:{ type: Date },
    campName:    { type: String },
    bankName:    { type: String },
    unitsDonated:{ type: Number, default: 1 },
    issuedAt:    { type: Date, default: Date.now },
    issuedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isValid:     { type: Boolean, default: true },
    revokedAt:   { type: Date },
    revokedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revokeReason:{ type: String },
    qrData:      { type: String }, // URL for verification
  },
  { timestamps: true }
);

module.exports = mongoose.model("Certificate", certificateSchema);
