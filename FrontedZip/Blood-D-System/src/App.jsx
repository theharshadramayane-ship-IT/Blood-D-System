// ============================================================
//  BLOODLINK PRO — App.jsx
//  Main Router — All 10 Modules + Role-Based Route Guards
//  SAVE AS: src/App.jsx
// ============================================================

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ── PUBLIC PAGES ──────────────────────────────────────────────────────────────
import Home     from "./Home";
import Login    from "./Login";
import Resister from "./Resister";

// ── PROTECTED PAGES ───────────────────────────────────────────────────────────
import Dashboard    from "./Dashboard";
import Donor        from "./Donor";
import EditProfile  from "./EditProfile";

// ── MODULE 2 — Donor Profile ─────────────────────────────────────────────────
import DonorProfile from "./DonorProfile";

// ── MODULE 3 — Health Pre-Screening ──────────────────────────────────────────
import HealthScreening from "./HealthScreening";

// ── MODULE 4 — Blood Stock & Inventory ───────────────────────────────────────
import BloodStock from "./BloodStock";

// ── MODULE 5 — Emergency Blood Request ───────────────────────────────────────
import BloodRequest from "./BloodRequest";

// ── MODULE 6 — Camp Management ───────────────────────────────────────────────
import CampManagement from "./CampManagement";

// ── MODULE 7 — Multi-City Blood Network ──────────────────────────────────────
import BloodNetwork from "./BloodNetwork";

// ── MODULE 8 — Thalassemia Patient Management ────────────────────────────────
import ThalassemiaManagement from "./ThalassemiaManagement";

// ── MODULE 9 — Rewards & Gamification ────────────────────────────────────────
import Rewards from "./Rewards";

// ── MODULE 10 — Certificates ─────────────────────────────────────────────────
import Certificates       from "./Certificates";
import VerifyCertificate  from "./VerifyCertificate";

// ── ROLE-AWARE PROTECTED ROUTE ────────────────────────────────────────────────
import ProtectedRoute from "./ProtectedRoute";

import "./assets/Style.css";

// ── Helper: read role from localStorage (used to pass userRole to Certificates)
function getCurrentUserRole() {
  try {
    const user =
      JSON.parse(localStorage.getItem("blCurrentUser")) ||
      JSON.parse(localStorage.getItem("user")) ||
      {};
    return (user.role || "donor").toLowerCase();
  } catch {
    return "donor";
  }
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── PUBLIC ROUTES (no login needed) ─────────────────────────────── */}
        <Route path="/"        element={<Home />}     />
        <Route path="/login"   element={<Login />}    />
        <Route path="/resister" element={<Resister />} />

        {/*
          /verify-certificate is PUBLIC — anyone can scan a QR code to verify.
          Per the PDF: "Certificate verification page: enter number or scan QR,
          no login needed."
        */}
        <Route
          path="/verify-certificate"
          element={<VerifyCertificate />}
        />

        {/* ── PROTECTED ROUTES — all logged-in roles ───────────────────────── */}
        {/*
          /dashboard — all roles can access.
          The Dashboard component detects role internally and renders the
          correct role-specific dashboard (DonorDashboard, AdminDashboard, etc.)
        */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/*
          /profile — all roles can view and edit their own profile.
        */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DonorProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/editprofile"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />

        {/* ── MODULE 3 — Health Screening (DONOR only) ─────────────────────── */}
        <Route
          path="/screening"
          element={
            <ProtectedRoute allowedRoles={["DONOR"]}>
              <HealthScreening />
            </ProtectedRoute>
          }
        />
        <Route
          path="/health"
          element={
            <ProtectedRoute allowedRoles={["DONOR"]}>
              <HealthScreening />
            </ProtectedRoute>
          }
        />

        {/* ── MODULE 4 — Blood Stock (Admins only) ─────────────────────────── */}
        <Route
          path="/stock"
          element={
            <ProtectedRoute allowedRoles={["BB_ADMIN", "SUPER_ADMIN"]}>
              <BloodStock />
            </ProtectedRoute>
          }
        />

        {/* ── Donor List (Admins only) ──────────────────────────────────────── */}
        <Route
          path="/donor"
          element={
            <ProtectedRoute allowedRoles={["BB_ADMIN", "SUPER_ADMIN"]}>
              <Donor />
            </ProtectedRoute>
          }
        />

        {/* ── MODULE 5 — Blood Request (Hospital + Admins) ─────────────────── */}
        <Route
          path="/request"
          element={
            <ProtectedRoute allowedRoles={["HOSPITAL", "BB_ADMIN", "SUPER_ADMIN"]}>
              <BloodRequest />
            </ProtectedRoute>
          }
        />

        {/* ── MODULE 6 — Camp Management (Donor + Admins + Organizer) ─────── */}
        <Route
          path="/camps"
          element={
            <ProtectedRoute
              allowedRoles={["DONOR", "BB_ADMIN", "SUPER_ADMIN", "CAMP_ORGANIZER"]}
            >
              <CampManagement />
            </ProtectedRoute>
          }
        />

        {/* ── MODULE 7 — Blood Network (Admins + Hospital) ─────────────────── */}
        <Route
          path="/network"
          element={
            <ProtectedRoute allowedRoles={["BB_ADMIN", "SUPER_ADMIN", "HOSPITAL"]}>
              <BloodNetwork />
            </ProtectedRoute>
          }
        />

        {/* ── MODULE 8 — Thalassemia (Admins + Hospital) ───────────────────── */}
        <Route
          path="/thalassemia"
          element={
            <ProtectedRoute allowedRoles={["BB_ADMIN", "SUPER_ADMIN", "HOSPITAL"]}>
              <ThalassemiaManagement />
            </ProtectedRoute>
          }
        />

        {/* ── MODULE 9 — Rewards (Donor only) ──────────────────────────────── */}
        <Route
          path="/rewards"
          element={
            <ProtectedRoute allowedRoles={["DONOR"]}>
              <Rewards />
            </ProtectedRoute>
          }
        />

        {/* ── MODULE 10 — Certificates (Donor + Admins) ────────────────────── */}
        <Route
          path="/certificates"
          element={
            <ProtectedRoute allowedRoles={["DONOR", "BB_ADMIN", "SUPER_ADMIN"]}>
              <Certificates userRole={getCurrentUserRole()} />
            </ProtectedRoute>
          }
        />

      </Routes>

      {/* ── GLOBAL TOAST ─────────────────────────────────────────────────────── */}
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar={false} />
    </BrowserRouter>
  );
}

export default App;