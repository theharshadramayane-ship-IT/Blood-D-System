// models/BloodRequest.js
const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  score:   { type: Number, min: 1, max: 5 },
  comment: { type: String },
  ratedAt: { type: Date, default: Date.now },
});

const bloodRequestSchema = new mongoose.Schema(
  {
    hospitalName: { type: String, required: true },
    hospitalId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bloodGroup: {
      type: String,
      enum: ["A+","A-","B+","B-","O+","O-","AB+","AB-"],
      required: true,
    },
    units:     { type: Number, required: true, min: 1 },
    urgency: {
      type: String,
      enum: ["CRITICAL", "URGENT", "STANDARD"],
      required: true,
    },
    patientName:    { type: String },
    patientAge:     { type: Number },
    purpose:        { type: String },
    contactPerson:  { type: String },
    contactPhone:   { type: String },
    requiredBy:     { type: Date },
    status: {
      type: String,
      enum: ["PENDING","APPROVED","DISPATCHED","DELIVERED","CLOSED","REJECTED"],
      default: "PENDING",
    },
    bankId:      { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank" },
    approvedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt:  { type: Date },
    dispatchedAt:{ type: Date },
    deliveredAt: { type: Date },
    rejectionReason: { type: String },
    adminNotes:  { type: String },
    rating:      ratingSchema,
    city:        { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);
