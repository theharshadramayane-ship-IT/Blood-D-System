// routes/thalassemia.js  — Module 8: Thalassemia Patient Management
const express = require("express");
const router = express.Router();
const ThalassemiaPatient = require("../models/ThalassemiaPatient");
const { protect, authorize } = require("../middleware/auth");

const ALLOWED_ROLES = ["BB_ADMIN","SUPER_ADMIN","HOSPITAL"];

// ── Helper: generate patient ID ───────────────────────────
const genPatientId = async () => {
  const count = await ThalassemiaPatient.countDocuments();
  return `THL-${String(count + 1).padStart(4, "0")}`;
};

// ── Helper: calc next due date ────────────────────────────
const getNextDueDate = (lastDate, frequency) => {
  if (!lastDate) return new Date();
  const d = new Date(lastDate);
  const days = { WEEKLY: 7, BIWEEKLY: 14, MONTHLY: 30 };
  d.setDate(d.getDate() + (days[frequency] || 30));
  return d;
};

// ── GET /api/thalassemia — List patients ──────────────────
router.get("/", protect, authorize(...ALLOWED_ROLES), async (req, res, next) => {
  try {
    const { status, bloodGroup, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== "ALL") query.status = status;
    if (bloodGroup && bloodGroup !== "ALL") query.bloodGroup = bloodGroup;
    if (search) query.name = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const [patients, total] = await Promise.all([
      ThalassemiaPatient.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .select("-transfusionHistory"),
      ThalassemiaPatient.countDocuments(query),
    ]);

    res.json({ success: true, patients, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

// ── GET /api/thalassemia/due-today — Patients due today ───
router.get("/due-today", protect, authorize(...ALLOWED_ROLES), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const patients = await ThalassemiaPatient.find({
      status: "ACTIVE",
      nextDueDate: { $gte: today, $lt: tomorrow },
    });
    res.json({ success: true, patients });
  } catch (err) { next(err); }
});

// ── GET /api/thalassemia/overdue — Overdue patients ───────
router.get("/overdue", protect, authorize(...ALLOWED_ROLES), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const patients = await ThalassemiaPatient.find({
      status: "ACTIVE",
      nextDueDate: { $lt: today },
    });
    res.json({ success: true, patients });
  } catch (err) { next(err); }
});

// ── GET /api/thalassemia/:id — Single patient ─────────────
router.get("/:id", protect, authorize(...ALLOWED_ROLES), async (req, res, next) => {
  try {
    const patient = await ThalassemiaPatient.findById(req.params.id)
      .populate("preferredBank", "name city");
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    res.json({ success: true, patient });
  } catch (err) { next(err); }
});

// ── POST /api/thalassemia — Register patient ──────────────
router.post("/", protect, authorize(...ALLOWED_ROLES), async (req, res, next) => {
  try {
    const patientId = await genPatientId();
    const {
      name, dob, gender, bloodGroup, phone, guardianName, guardianPhone,
      city, address, diagnosisDate, thalassemiaType, chelationTherapy,
      splenectomy, transfusionFrequency, preferredBank, preferredBankName, notes,
    } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "Patient name is required" });

    const patient = await ThalassemiaPatient.create({
      patientId, name, dob, gender, bloodGroup, phone, guardianName, guardianPhone,
      city, address, diagnosisDate, thalassemiaType, chelationTherapy,
      splenectomy, transfusionFrequency, preferredBank, preferredBankName, notes,
      registeredBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Patient registered", patient });
  } catch (err) { next(err); }
});

// ── PUT /api/thalassemia/:id — Update patient ─────────────
router.put("/:id", protect, authorize(...ALLOWED_ROLES), async (req, res, next) => {
  try {
    const patient = await ThalassemiaPatient.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    res.json({ success: true, patient });
  } catch (err) { next(err); }
});

// ── POST /api/thalassemia/:id/transfusion — Record transfusion ──
router.post("/:id/transfusion", protect, authorize(...ALLOWED_ROLES), async (req, res, next) => {
  try {
    const patient = await ThalassemiaPatient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    const { bankId, bankName, bloodGroup, unitsDonated, hemoglobinBefore, hemoglobinAfter, reactions, conductedBy, notes } = req.body;

    const transfusionDate = new Date();
    patient.transfusionHistory.unshift({
      patientId: patient._id,
      bankId, bankName,
      bloodGroup: bloodGroup || patient.bloodGroup,
      unitsDonated: unitsDonated || 1,
      hemoglobinBefore, hemoglobinAfter,
      reactions, conductedBy, notes,
      transfusionDate,
    });

    patient.lastTransfusionDate = transfusionDate;
    patient.nextDueDate = getNextDueDate(transfusionDate, patient.transfusionFrequency);
    await patient.save();

    res.json({ success: true, message: "Transfusion recorded", patient });
  } catch (err) { next(err); }
});

// ── GET /api/thalassemia/:id/history — Transfusion history ──
router.get("/:id/history", protect, authorize(...ALLOWED_ROLES), async (req, res, next) => {
  try {
    const patient = await ThalassemiaPatient.findById(req.params.id).select("transfusionHistory name patientId");
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });
    res.json({ success: true, history: patient.transfusionHistory });
  } catch (err) { next(err); }
});

// ── DELETE /api/thalassemia/:id ───────────────────────────
router.delete("/:id", protect, authorize("BB_ADMIN","SUPER_ADMIN"), async (req, res, next) => {
  try {
    await ThalassemiaPatient.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Patient record deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
