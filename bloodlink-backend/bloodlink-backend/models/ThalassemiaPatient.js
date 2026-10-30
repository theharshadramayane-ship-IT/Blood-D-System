// models/ThalassemiaPatient.js
const mongoose = require("mongoose");

const transfusionSchema = new mongoose.Schema(
  {
    patientId:  { type: mongoose.Schema.Types.ObjectId, ref: "ThalassemiaPatient" },
    bankId:     { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank" },
    bankName:   { type: String },
    bloodGroup: { type: String },
    unitsDonated:{ type: Number, default: 1 },
    hemoglobinBefore: { type: Number },
    hemoglobinAfter:  { type: Number },
    reactions:  { type: String },
    conductedBy:{ type: String },
    notes:      { type: String },
    transfusionDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const thalassemiaPatientSchema = new mongoose.Schema(
  {
    patientId:  { type: String, unique: true },  // THL-XXXX
    name:       { type: String, required: true },
    dob:        { type: Date },
    age:        { type: Number },
    gender:     { type: String, enum: ["MALE","FEMALE","OTHER"] },
    bloodGroup: { type: String },
    phone:      { type: String },
    guardianName: { type: String },
    guardianPhone:{ type: String },
    city:       { type: String },
    address:    { type: String },
    diagnosisDate:  { type: Date },
    thalassemiaType:{ type: String, enum: ["MAJOR","INTERMEDIA","MINOR"] },
    chelationTherapy:{ type: Boolean, default: false },
    splenectomy:     { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["ACTIVE","COMPLETED","TRANSFERRED","DECEASED","INACTIVE"],
      default: "ACTIVE",
    },
    transfusionFrequency: {
      type: String,
      enum: ["WEEKLY","BIWEEKLY","MONTHLY"],
      default: "MONTHLY",
    },
    lastTransfusionDate: { type: Date },
    nextDueDate:         { type: Date },
    preferredBank:       { type: mongoose.Schema.Types.ObjectId, ref: "BloodBank" },
    preferredBankName:   { type: String },
    transfusionHistory:  [transfusionSchema],
    registeredBy:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes:               { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ThalassemiaPatient", thalassemiaPatientSchema);
