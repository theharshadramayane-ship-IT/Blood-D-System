// ============================================================
//  src/api.js  — BloodLink Pro Frontend API Service
//  Connects every module to the Node.js + MongoDB backend
//  BASE URL reads from: VITE_API_URL in .env
//  Fallback: http://localhost:5000/api
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Token helpers ─────────────────────────────────────────
const getToken = ()       => localStorage.getItem("blToken");
const setToken = (token)  => localStorage.setItem("blToken", token);
const clearToken = ()     => localStorage.removeItem("blToken");

// ── Core fetch wrapper ────────────────────────────────────
async function api(path, options = {}) {
  const token = getToken();

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
  };

  if (options.body) {
    config.body =
      typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${path}`, config);
  const data     = await response.json();

  if (!response.ok) {
    // If token expired, force logout
    if (response.status === 401) {
      authAPI.logout();
      window.location.href = "/login";
    }
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

// ── Query string builder ──────────────────────────────────
const qs = (params = {}) => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)
  );
  return Object.keys(filtered).length ? "?" + new URLSearchParams(filtered) : "";
};

// ══════════════════════════════════════════════════════════
//  AUTH  — Login · Register · Profile
// ══════════════════════════════════════════════════════════
export const authAPI = {

  // Register (DONOR / HOSPITAL / CAMP_ORGANIZER)
  register: (formData) =>
    api("/auth/register", { method: "POST", body: formData }),

  // Login — saves token + user to localStorage on success
  login: async (email, password) => {
    const data = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    // Persist token
    setToken(data.token);

    // Persist user (matches keys your existing pages already read)
    localStorage.setItem("blCurrentUser", JSON.stringify(data.user));
    localStorage.setItem("blIsLoggedIn",  "true");
    localStorage.setItem("user",          JSON.stringify(data.user));  // backward compat
    localStorage.setItem("isLogin",       "true");                     // backward compat

    return data;
  },

  // Logout — wipe all session keys
  logout: () => {
    [
      "blToken", "blCurrentUser", "blIsLoggedIn",
      "user", "isLogin", "darkMode",
    ].forEach((k) => localStorage.removeItem(k));
    clearToken();
  },

  // Get current user from backend
  me: () => api("/auth/me"),

  // Update own profile
  updateProfile: (updates) =>
    api("/auth/profile", { method: "PUT", body: updates }),

  // Change password
  changePassword: (currentPassword, newPassword) =>
    api("/auth/change-password", {
      method: "PUT",
      body: { currentPassword, newPassword },
    }),
};

// ══════════════════════════════════════════════════════════
//  MODULE 2 — Donor Profile
// ══════════════════════════════════════════════════════════
export const donorsAPI = {

  // Admin: list all donors with filters
  list: (params = {}) => api(`/donors${qs(params)}`),

  // Get single donor by ID
  get: (id) => api(`/donors/${id}`),

  // Get donor medical history
  getMedical: (id) => api(`/donors/${id}/medical`),

  // Save / update medical history
  updateMedical: (id, data) =>
    api(`/donors/${id}/medical`, { method: "PUT", body: data }),

  // Get donation history for a donor
  getDonations: (id) => api(`/donors/${id}/donations`),

  // Admin: suspend or activate a donor
  updateStatus: (id, status) =>
    api(`/donors/${id}/status`, { method: "PUT", body: { status } }),
};

// ══════════════════════════════════════════════════════════
//  MODULE 3 — Health Pre-Screening
// ══════════════════════════════════════════════════════════
export const screeningAPI = {

  // Submit all 20 answers + computed result to backend
  submit: ({ answers, result, score, failedChecks, deferredUntil }) =>
    api("/screening/submit", {
      method: "POST",
      body: { answers, result, score, failedChecks, deferredUntil },
    }),

  // Screening history list
  history: () => api("/screening/history"),

  // Current eligibility status (ELIGIBLE / DEFERRED / etc.)
  status: () => api("/screening/status"),
};

// ══════════════════════════════════════════════════════════
//  MODULE 4 — Blood Stock & Inventory
// ══════════════════════════════════════════════════════════
export const stockAPI = {

  // List all stock entries (with optional filters)
  list: (params = {}) => api(`/stock${qs(params)}`),

  // Blood-group summary → { "A+": { total: 22, level: "GOOD" }, ... }
  summary: (bankId) =>
    api(`/stock/summary${bankId ? `?bankId=${bankId}` : ""}`),

  // Low stock + expiring soon alerts
  alerts: () => api("/stock/alerts"),

  // Add new blood stock entry
  add: (data) => api("/stock", { method: "POST", body: data }),

  // Update a stock entry (units, status, expiry…)
  update: (id, data) =>
    api(`/stock/${id}`, { method: "PUT", body: data }),

  // Delete a stock entry
  delete: (id) => api(`/stock/${id}`, { method: "DELETE" }),
};

// ══════════════════════════════════════════════════════════
//  MODULE 5 — Emergency Blood Request
// ══════════════════════════════════════════════════════════
export const requestsAPI = {

  // List requests (backend auto-filters by role: hospital sees own only)
  list: (params = {}) => api(`/requests${qs(params)}`),

  // Admin request stats (PENDING count, urgency breakdown)
  stats: () => api("/requests/stats"),

  // Hospital creates a new blood request
  create: (data) =>
    api("/requests", { method: "POST", body: data }),

  // Admin changes status: PENDING → APPROVED → DISPATCHED → DELIVERED
  updateStatus: (id, status, extras = {}) =>
    api(`/requests/${id}/status`, {
      method: "PUT",
      body: { status, ...extras },
    }),

  // Hospital rates a delivered/closed request
  rate: (id, score, comment) =>
    api(`/requests/${id}/rate`, {
      method: "POST",
      body: { score, comment },
    }),

  // Cancel / delete a request
  delete: (id) => api(`/requests/${id}`, { method: "DELETE" }),
};

// ══════════════════════════════════════════════════════════
//  MODULE 6 — Donation Camp Management
// ══════════════════════════════════════════════════════════
export const campsAPI = {

  // List camps (organizer sees own, admin sees all)
  list: (params = {}) => api(`/camps${qs(params)}`),

  // Get single camp with full registration list
  get: (id) => api(`/camps/${id}`),

  // Create a new camp
  create: (data) => api("/camps", { method: "POST", body: data }),

  // Update camp details or status
  update: (id, data) =>
    api(`/camps/${id}`, { method: "PUT", body: data }),

  // Donor self-registers for a camp
  register: (campId) =>
    api(`/camps/${campId}/register`, { method: "POST" }),

  // Organizer updates a registration (CHECKED_IN / DONATED / NO_SHOW…)
  updateRegistration: (campId, regId, data) =>
    api(`/camps/${campId}/registrations/${regId}`, {
      method: "PUT",
      body: data,
    }),

  // Admin deletes a camp
  delete: (id) => api(`/camps/${id}`, { method: "DELETE" }),
};

// ══════════════════════════════════════════════════════════
//  MODULE 7 — Multi-City Blood Bank Network
// ══════════════════════════════════════════════════════════
export const networkAPI = {

  // ── Blood Banks ──────────────────────────────────────────
  getBanks:    (params = {}) => api(`/network/banks${qs(params)}`),
  getBank:     (id)          => api(`/network/banks/${id}`),
  createBank:  (data)        => api("/network/banks",    { method: "POST",   body: data }),
  updateBank:  (id, data)    => api(`/network/banks/${id}`, { method: "PUT",  body: data }),
  deleteBank:  (id)          => api(`/network/banks/${id}`, { method: "DELETE" }),

  // ── Stock summary across all banks ───────────────────────
  getNetworkStocks: () => api("/network/stocks"),

  // ── Blood Transfers ───────────────────────────────────────
  getTransfers: (params = {}) => api(`/network/transfers${qs(params)}`),
  createTransfer: (data)      => api("/network/transfers", { method: "POST", body: data }),
  updateTransferStatus: (id, status, notes) =>
    api(`/network/transfers/${id}/status`, {
      method: "PUT",
      body: { status, notes },
    }),
};

// ══════════════════════════════════════════════════════════
//  MODULE 8 — Thalassemia Patient Management
// ══════════════════════════════════════════════════════════
export const thalassemiaAPI = {

  // List all patients
  list:     (params = {}) => api(`/thalassemia${qs(params)}`),

  // Patients due for transfusion today
  dueToday: () => api("/thalassemia/due-today"),

  // Overdue patients (past nextDueDate)
  overdue:  () => api("/thalassemia/overdue"),

  // Get single patient (includes transfusion history)
  get:      (id) => api(`/thalassemia/${id}`),

  // Register new patient
  create:   (data)      => api("/thalassemia",    { method: "POST",   body: data }),

  // Update patient record
  update:   (id, data)  => api(`/thalassemia/${id}`, { method: "PUT",  body: data }),

  // Record a transfusion session (auto-updates nextDueDate)
  recordTransfusion: (id, data) =>
    api(`/thalassemia/${id}/transfusion`, { method: "POST", body: data }),

  // Get full transfusion history for a patient
  history:  (id) => api(`/thalassemia/${id}/history`),

  // Delete patient record
  delete:   (id) => api(`/thalassemia/${id}`, { method: "DELETE" }),
};

// ══════════════════════════════════════════════════════════
//  MODULE 9 — Rewards & Gamification
// ══════════════════════════════════════════════════════════
export const rewardsAPI = {

  // My rewards profile (points, badges, achievements, donations)
  me: () => api("/rewards/me"),

  // Global or city leaderboard
  leaderboard: (city) =>
    api(`/rewards/leaderboard${city ? `?city=${encodeURIComponent(city)}` : ""}`),

  // Redeem a reward using points
  redeem: (rewardId, cost) =>
    api("/rewards/redeem", { method: "POST", body: { rewardId, cost } }),

  // Admin awards bonus points to a donor
  award: (donorId, points, reason) =>
    api("/rewards/award", { method: "POST", body: { donorId, points, reason } }),
};

// ══════════════════════════════════════════════════════════
//  MODULE 10 — Certificate Generation & Verification
// ══════════════════════════════════════════════════════════
export const certificatesAPI = {

  // Donor: list my certificates | Admin: list all (pass donorId to filter)
  list: (params = {}) => api(`/certificates${qs(params)}`),

  // PUBLIC — no token needed — verify by certificate number (QR scan)
  verify: async (certNumber) => {
    const res  = await fetch(`${BASE_URL}/certificates/verify?cert=${certNumber}`);
    const data = await res.json();
    return data;
  },

  // Generate certificate from a donation record
  generate: (donationId) =>
    api("/certificates/generate", { method: "POST", body: { donationId } }),

  // Admin: bulk generate certificates for date range / donor list
  bulkGenerate: (data) =>
    api("/certificates/bulk-generate", { method: "POST", body: data }),

  // Admin: revoke a certificate (marks isValid: false)
  revoke: (id, reason) =>
    api(`/certificates/${id}/revoke`, { method: "PUT", body: { reason } }),
};

// ══════════════════════════════════════════════════════════
//  ADMIN — Dashboard + User Management
// ══════════════════════════════════════════════════════════
export const adminAPI = {

  // Master dashboard: total donors, requests, stock, monthly chart
  dashboard: () => api("/admin/dashboard"),

  // Full user list with role / status / city filters
  users: (params = {}) => api(`/admin/users${qs(params)}`),

  // Suspend or activate any user account
  updateUserStatus: (id, status) =>
    api(`/admin/users/${id}/status`, { method: "PUT", body: { status } }),

  // Super Admin: create a new BB_ADMIN or SUPER_ADMIN account
  createAdmin: (data) =>
    api("/admin/create-admin", { method: "POST", body: data }),
};

// ── Default export (raw fetch wrapper for one-off calls) ──
export default api;