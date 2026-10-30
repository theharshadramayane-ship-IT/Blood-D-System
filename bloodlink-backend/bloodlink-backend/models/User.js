// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ── COMMON FIELDS ──────────────────────────────────────
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone:    { type: String, required: true },
    city:     { type: String, required: true },
    role: {
      type: String,
      enum: ["DONOR", "HOSPITAL", "CAMP_ORGANIZER", "BB_ADMIN", "SUPER_ADMIN"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "PENDING"],
      default: "ACTIVE",
    },

    // ── DONOR SPECIFIC ─────────────────────────────────────
    bloodGroup: { type: String, enum: ["A+","A-","B+","B-","O+","O-","AB+","AB-"] },
    dob:        { type: Date },
    gender:     { type: String, enum: ["MALE", "FEMALE", "OTHER"] },
    address:    { type: String },
    emergencyContact: { type: String },
    emergencyPhone:   { type: String },

    // ── HOSPITAL SPECIFIC ──────────────────────────────────
    hospitalName:  { type: String },
    licenseNumber: { type: String },
    contactPerson: { type: String },

    // ── CAMP ORGANIZER SPECIFIC ────────────────────────────
    organizationName: { type: String },
    designation:      { type: String },

    // ── REWARDS ────────────────────────────────────────────
    points:           { type: Number, default: 0 },
    totalDonations:   { type: Number, default: 0 },
    lastDonationDate: { type: Date },

    // ── PROFILE COMPLETENESS ───────────────────────────────
    profilePicture: { type: String }, // URL or base64
  },
  { timestamps: true }
);

// ── Hash password before save ─────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare password ──────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Strip password from JSON output ──────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
