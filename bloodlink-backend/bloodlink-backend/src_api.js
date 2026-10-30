// src/api.js  — BloodLink Pro API Service
// ============================================================
//  DROP THIS FILE INTO YOUR FRONTEND: src/api.js
//  It replaces all localStorage logic with real API calls.
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Helper: get token from localStorage ───────────────────
const getToken = () => localStorage.getItem("blToken");

// ── Core fetch wrapper ────────────────────────────────────
async function api(path, options = {}) {
  const token = getToken();

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(`${BASE_URL}${path}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

// ══════════════════════════════════════════════════════════
//  AUTH  (Module 1: Login / Register)
// ══════════════════════════════════════════════════════════
export const authAPI = {
  // Register new user (DONOR / HOSPITAL / CAMP_ORGANIZER)
  register: (formData) => api("/auth/register", { method: "POST", body: formData }),

  // Login
  login: async (email, password) => {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    // Save token + user to localStorage (same keys frontend already uses)
    localStorage.setItem("blToken", data.token);
    localStorage.setItem("blCurrentUser", JSON.stringify(data.user));
    localStorage.setItem("blIsLoggedIn", "true");
    localStorage.setItem("user", JSON.stringify(data.user));       // backward compat
    localStorage.setItem("isLogin", "true");                       // backward compat
    return data;
  },

  // Logout (clear all auth keys)
  logout: () => {
    ["blToken","blCurrentUser","blIsLoggedIn","user","isLogin"].forEach((k) =>
      localStorage.removeItem(k)
    );
  },

  // Get current logged-in user from API
  me: () => api("/auth/me"),

  // Update own profile
  updateProfile: (updates) => api("/auth/profile", { method: "PUT", body: updates }),

  // Change password
  changePassword: (currentPassword, newPassword) =>
    api("/auth/change-password", { method: "PUT", body: { currentPassword, newPassword } }),
};

// ══════════════════════════════════════════════════════════
//  DONORS  (Module 2: Donor Profile + Admin List)
// ══════════════════════════════════════════════════════════
export const donorsAPI = {
  // Admin: list all donors
  list: (params = {}) => api("/donors?" + new URLSearchParams(params)),

  // Get single donor
  get: (id) => api(`/donors/${id}`),

  // Get donor medical history
  getMedical: (id) => api(`/donors/${id}/medical`),

  // Update medical history
  updateMedical: (id, data) => api(`/donors/${id}/medical`, { method: "PUT", body: data }),

  // Get donation history
  getDonations: (id) => api(`/donors/${id}/donations`),

  // Admin: suspend/activate donor
  updateStatus: (id, status) => api(`/donors/${id}/status`, { method: "PUT", body: { status } }),
};

// ══════════════════════════════════════════════════════════
//  HEALTH SCREENING  (Module 3)
// ══════════════════════════════════════════════════════════
export const screeningAPI = {
  // Submit screening answers and get result
  submit: (answers, result, score, failedChecks, deferredUntil) =>
    api("/screening/submit", { method: "POST", body: { answers, result, score, failedChecks, deferredUntil } }),

  // Get screening history
  history: () => api("/screening/history"),

  // Get current eligibility status
  status: () => api("/screening/status"),
};

// ══════════════════════════════════════════════════════════
//  BLOOD STOCK  (Module 4)
// ══════════════════════════════════════════════════════════
export const stockAPI = {
  // List all stock entries
  list: (params = {}) => api("/stock?" + new URLSearchParams(params)),

  // Blood group summary (CRITICAL/LOW/GOOD)
  summary: (bankId) => api("/stock/summary" + (bankId ? `?bankId=${bankId}` : "")),

  // Low stock + expiring alerts
  alerts: () => api("/stock/alerts"),

  // Add stock
  add: (data) => api("/stock", { method: "POST", body: data }),

  // Update stock entry
  update: (id, data) => api(`/stock/${id}`, { method: "PUT", body: data }),

  // Delete stock entry
  delete: (id) => api(`/stock/${id}`, { method: "DELETE" }),
};

// ══════════════════════════════════════════════════════════
//  BLOOD REQUESTS  (Module 5)
// ══════════════════════════════════════════════════════════
export const requestsAPI = {
  // List requests (filtered by role on backend)
  list: (params = {}) => api("/requests?" + new URLSearchParams(params)),

  // Stats (admin)
  stats: () => api("/requests/stats"),

  // Create new request
  create: (data) => api("/requests", { method: "POST", body: data }),

  // Update status (admin)
  updateStatus: (id, status, extras = {}) =>
    api(`/requests/${id}/status`, { method: "PUT", body: { status, ...extras } }),

  // Rate fulfilled request (hospital)
  rate: (id, score, comment) => api(`/requests/${id}/rate`, { method: "POST", body: { score, comment } }),

  // Delete request
  delete: (id) => api(`/requests/${id}`, { method: "DELETE" }),
};

// ══════════════════════════════════════════════════════════
//  CAMPS  (Module 6)
// ══════════════════════════════════════════════════════════
export const campsAPI = {
  // List camps
  list: (params = {}) => api("/camps?" + new URLSearchParams(params)),

  // Get single camp
  get: (id) => api(`/camps/${id}`),

  // Create camp
  create: (data) => api("/camps", { method: "POST", body: data }),

  // Update camp
  update: (id, data) => api(`/camps/${id}`, { method: "PUT", body: data }),

  // Donor registers for camp
  register: (campId) => api(`/camps/${campId}/register`, { method: "POST" }),

  // Update registration (check-in, donated, etc.)
  updateRegistration: (campId, regId, data) =>
    api(`/camps/${campId}/registrations/${regId}`, { method: "PUT", body: data }),

  // Delete camp (admin)
  delete: (id) => api(`/camps/${id}`, { method: "DELETE" }),
};

// ══════════════════════════════════════════════════════════
//  BLOOD NETWORK  (Module 7)
// ══════════════════════════════════════════════════════════
export const networkAPI = {
  // Banks
  getBanks: (params = {}) => api("/network/banks?" + new URLSearchParams(params)),
  getBank: (id) => api(`/network/banks/${id}`),
  createBank: (data) => api("/network/banks", { method: "POST", body: data }),
  updateBank: (id, data) => api(`/network/banks/${id}`, { method: "PUT", body: data }),
  deleteBank: (id) => api(`/network/banks/${id}`, { method: "DELETE" }),

  // Network stock summary (all banks)
  getNetworkStocks: () => api("/network/stocks"),

  // Transfers
  getTransfers: (params = {}) => api("/network/transfers?" + new URLSearchParams(params)),
  createTransfer: (data) => api("/network/transfers", { method: "POST", body: data }),
  updateTransferStatus: (id, status, notes) =>
    api(`/network/transfers/${id}/status`, { method: "PUT", body: { status, notes } }),
};

// ══════════════════════════════════════════════════════════
//  THALASSEMIA  (Module 8)
// ══════════════════════════════════════════════════════════
export const thalassemiaAPI = {
  // List patients
  list: (params = {}) => api("/thalassemia?" + new URLSearchParams(params)),

  // Patients due today
  dueToday: () => api("/thalassemia/due-today"),

  // Overdue patients
  overdue: () => api("/thalassemia/overdue"),

  // Get single patient
  get: (id) => api(`/thalassemia/${id}`),

  // Register patient
  create: (data) => api("/thalassemia", { method: "POST", body: data }),

  // Update patient
  update: (id, data) => api(`/thalassemia/${id}`, { method: "PUT", body: data }),

  // Record transfusion
  recordTransfusion: (id, data) => api(`/thalassemia/${id}/transfusion`, { method: "POST", body: data }),

  // Transfusion history
  history: (id) => api(`/thalassemia/${id}/history`),

  // Delete
  delete: (id) => api(`/thalassemia/${id}`, { method: "DELETE" }),
};

// ══════════════════════════════════════════════════════════
//  REWARDS  (Module 9)
// ══════════════════════════════════════════════════════════
export const rewardsAPI = {
  // My rewards + stats
  me: () => api("/rewards/me"),

  // Leaderboard
  leaderboard: (city) => api("/rewards/leaderboard" + (city ? `?city=${city}` : "")),

  // Redeem reward
  redeem: (rewardId, cost) => api("/rewards/redeem", { method: "POST", body: { rewardId, cost } }),

  // Admin: award points
  award: (donorId, points, reason) =>
    api("/rewards/award", { method: "POST", body: { donorId, points, reason } }),
};

// ══════════════════════════════════════════════════════════
//  CERTIFICATES  (Module 10)
// ══════════════════════════════════════════════════════════
export const certificatesAPI = {
  // List (my certs for donor, all for admin)
  list: (params = {}) => api("/certificates?" + new URLSearchParams(params)),

  // Public verify by cert number (no auth needed)
  verify: (certNumber) =>
    fetch(`${BASE_URL}/certificates/verify?cert=${certNumber}`).then((r) => r.json()),

  // Generate certificate from donation
  generate: (donationId) => api("/certificates/generate", { method: "POST", body: { donationId } }),

  // Admin: bulk generate
  bulkGenerate: (data) => api("/certificates/bulk-generate", { method: "POST", body: data }),

  // Admin: revoke certificate
  revoke: (id, reason) => api(`/certificates/${id}/revoke`, { method: "PUT", body: { reason } }),
};

// ══════════════════════════════════════════════════════════
//  ADMIN  (Dashboard + User Management)
// ══════════════════════════════════════════════════════════
export const adminAPI = {
  // Master dashboard stats
  dashboard: () => api("/admin/dashboard"),

  // List all users
  users: (params = {}) => api("/admin/users?" + new URLSearchParams(params)),

  // Update user status
  updateUserStatus: (id, status) => api(`/admin/users/${id}/status`, { method: "PUT", body: { status } }),

  // Create admin account (Super Admin only)
  createAdmin: (data) => api("/admin/create-admin", { method: "POST", body: data }),
};

export default api;
