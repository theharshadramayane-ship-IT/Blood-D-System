// models/BloodBank.js
const mongoose = require("mongoose");

const bloodBankSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    city:     { type: String, required: true },
    state:    { type: String },
    address:  { type: String },
    adminId:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    adminName:{ type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    capacity: { type: Number, default: 500 },
    isActive: { type: Boolean, default: true },
    lat:      { type: Number },
    lng:      { type: Number },
  },
  { timestamps: true }
);

const networkTransferSchema = new mongoose.Schema(
  {
    fromBankId:   { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank", required: true },
    fromBankName: { type: String },
    toBankId:     { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank", required: true },
    toBankName:   { type: String },
    bloodGroup: {
      type: String,
      enum: ["A+","A-","B+","B-","O+","O-","AB+","AB-"],
      required: true,
    },
    units:  { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["REQUESTED","APPROVED","DISPATCHED","RECEIVED","REJECTED"],
      default: "REQUESTED",
    },
    reason:       { type: String },
    requestedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt:   { type: Date },
    dispatchedAt: { type: Date },
    receivedAt:   { type: Date },
    notes:        { type: String },
  },
  { timestamps: true }
);

module.exports = {
  BloodBank: mongoose.model("BloodBank", bloodBankSchema),
  NetworkTransfer: mongoose.model("NetworkTransfer", networkTransferSchema),
};
