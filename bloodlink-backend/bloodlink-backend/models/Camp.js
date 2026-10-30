// models/Camp.js
const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
  {
    donorId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    donorName: { type: String },
    bloodGroup:{ type: String },
    phone:     { type: String },
    status: {
      type: String,
      enum: ["REGISTERED","CHECKED_IN","DONATED","NO_SHOW","CANCELLED","WAITLISTED"],
      default: "REGISTERED",
    },
    qrCode:     { type: String },
    checkedInAt:{ type: Date },
    donatedAt:  { type: Date },
    unitsDonated:{ type: Number, default: 0 },
    notes:      { type: String },
  },
  { timestamps: true }
);

const campSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    organizerName:{ type: String },
    date:        { type: Date, required: true },
    endDate:     { type: Date },
    startTime:   { type: String },
    endTime:     { type: String },
    venue:       { type: String, required: true },
    city:        { type: String, required: true },
    state:       { type: String },
    address:     { type: String },
    capacity:    { type: Number, default: 100 },
    status: {
      type: String,
      enum: ["UPCOMING","REGISTRATION_OPEN","ONGOING","COMPLETED","CANCELLED"],
      default: "UPCOMING",
    },
    description: { type: String },
    contactPhone:{ type: String },
    contactEmail:{ type: String },
    targetBloodGroups: [String],
    registrations: [registrationSchema],
    totalDonations:  { type: Number, default: 0 },
    bankId:      { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank" },
  },
  { timestamps: true }
);

// Virtual: registered count
campSchema.virtual("registeredCount").get(function () {
  return this.registrations?.length || 0;
});

module.exports = mongoose.model("Camp", campSchema);
