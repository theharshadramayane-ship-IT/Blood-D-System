# 🩸 BloodLink Pro — Backend Setup Guide

## Project Structure

```
bloodlink-backend/
├── server.js                  ← Entry point
├── package.json
├── .env.example               ← Copy to .env and fill in values
├── config/
│   └── db.js                  ← MongoDB connection
├── middleware/
│   ├── auth.js                ← JWT protect + role authorization
│   └── errorHandler.js        ← Global error handler
├── models/
│   ├── User.js                ← All roles (Donor/Hospital/Admin...)
│   ├── DonorMedical.js        ← Module 3: Health screening
│   ├── BloodStock.js          ← Module 4: Blood inventory
│   ├── BloodRequest.js        ← Module 5: Emergency requests
│   ├── Camp.js                ← Module 6: Camp management
│   ├── BloodBank.js           ← Module 7: Network + Transfers
│   ├── ThalassemiaPatient.js  ← Module 8: Thalassemia patients
│   ├── Donation.js            ← All donation records
│   └── Certificate.js         ← Module 10: Certificates
├── routes/
│   ├── auth.js                ← Login, Register, Profile
│   ├── donors.js              ← Donor list + medical history
│   ├── screening.js           ← Module 3: Pre-screening
│   ├── stock.js               ← Module 4: Blood stock
│   ├── requests.js            ← Module 5: Blood requests
│   ├── camps.js               ← Module 6: Camps
│   ├── network.js             ← Module 7: Blood bank network
│   ├── thalassemia.js         ← Module 8: Thalassemia
│   ├── rewards.js             ← Module 9: Rewards
│   ├── certificates.js        ← Module 10: Certificates
│   └── admin.js               ← Admin dashboard + user mgmt
└── src_api.js                 ← ⚡ Copy this to frontend/src/api.js
```

---

## Step 1 — Install Backend

```bash
cd bloodlink-backend
npm install
```

---

## Step 2 — Setup MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition, then:
mongod --dbpath /data/db
# MONGO_URI = mongodb://localhost:27017/bloodlink_pro
```

**Option B: MongoDB Atlas (Recommended - Free)**
1. Go to https://www.mongodb.com/atlas
2. Create free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `MONGO_URI` in `.env`

---

## Step 3 — Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
```

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/bloodlink_pro
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

---

## Step 4 — Start Backend

```bash
# Development (auto-restart on file change)
npm run dev

# Production
npm start
```

You should see:
```
✅ MongoDB Connected: localhost
🩸 BloodLink Pro Backend running on port 5000
```

Test it: http://localhost:5000/api/health

---

## Step 5 — Connect Frontend

### 5a. Copy the API service file

```bash
cp bloodlink-backend/src_api.js Blood-D-System/src/api.js
```

### 5b. Add VITE_API_URL to frontend .env

Create `Blood-D-System/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 5c. Update vite.config.js (optional proxy)

```js
// Blood-D-System/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
```

---

## Step 6 — Update Login.jsx

Replace the localStorage-only login with a real API call:

```jsx
// In Login.jsx — replace handleLogin function:
import { authAPI } from "./api";

const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const data = await authAPI.login(email, password);
    toast.success(`Welcome back, ${data.user.name}! ✅`);
    navigate("/dashboard");
  } catch (err) {
    toast.error(err.message || "Invalid email or password ❌");
  } finally {
    setLoading(false);
  }
};
```

## Step 7 — Update Register (Resister.jsx)

```jsx
import { authAPI } from "./api";

// In handleFormSubmit, replace localStorage save with:
const handleRegisterSubmit = async () => {
  try {
    const data = await authAPI.register({ ...formData, role: selectedRole });
    toast.success("Registration successful! ✅");
    navigate("/login");
  } catch (err) {
    toast.error(err.message);
  }
};
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (Donor/Hospital/Organizer) |
| POST | `/api/auth/login` | Login — returns JWT token |
| GET | `/api/auth/me` | Get current user (needs token) |
| PUT | `/api/auth/profile` | Update own profile |
| PUT | `/api/auth/change-password` | Change password |

### Modules
| Method | Endpoint | Module |
|--------|----------|--------|
| GET/POST | `/api/donors` | Module 2: Donor list |
| POST | `/api/screening/submit` | Module 3: Health screening |
| GET/POST | `/api/stock` | Module 4: Blood inventory |
| GET/POST | `/api/requests` | Module 5: Blood requests |
| GET/POST | `/api/camps` | Module 6: Camp management |
| GET/POST | `/api/network/banks` | Module 7: Blood banks |
| GET/POST | `/api/thalassemia` | Module 8: Patients |
| GET | `/api/rewards/me` | Module 9: Rewards |
| GET/POST | `/api/certificates` | Module 10: Certificates |
| GET | `/api/admin/dashboard` | Admin dashboard |

---

## Features Analysis

### ✅ Fully Supported by Backend

| Feature | Status |
|---------|--------|
| Role-based auth (5 roles) | ✅ JWT + middleware |
| Donor registration + profile | ✅ |
| Hospital registration | ✅ |
| Camp Organizer registration | ✅ |
| Health pre-screening (20 Qs) | ✅ |
| Blood stock inventory | ✅ |
| Low stock + expiry alerts | ✅ |
| Emergency blood requests | ✅ |
| Request status workflow | ✅ PENDING→APPROVED→DISPATCHED→DELIVERED |
| Camp management | ✅ |
| Donor camp registration + QR | ✅ |
| Check-in + donation recording | ✅ auto awards points |
| Multi-city blood bank network | ✅ |
| Blood transfer between banks | ✅ |
| Thalassemia patient management | ✅ |
| Transfusion scheduling | ✅ auto-calculates next due date |
| Rewards & gamification | ✅ |
| Leaderboard | ✅ |
| Certificate generation | ✅ with cert numbers |
| Certificate QR verification | ✅ public endpoint |
| Admin dashboard stats | ✅ |
| Suspend/activate users | ✅ |
| PDF export | ✅ handled frontend (jsPDF already works) |

### 🔧 Frontend-Only (No Backend Needed)
| Feature | Note |
|---------|------|
| PDF generation | jsPDF runs in browser — keep as-is |
| Dark mode toggle | localStorage preference only |
| QR code display | qrcode.react renders in browser |
| Charts | recharts/chart.js uses live API data |

---

## Roles & Permissions

| Role | Can Do |
|------|--------|
| `DONOR` | Profile, screening, camp registration, rewards, my certificates |
| `HOSPITAL` | Create blood requests, view own requests, rate fulfilled requests |
| `CAMP_ORGANIZER` | Create camps, manage registrations, check-in donors |
| `BB_ADMIN` | Everything except: create super admins, delete banks |
| `SUPER_ADMIN` | Full access including user management and bank management |

---

## First Admin Setup

Since admins can't self-register, seed one via MongoDB directly or run:

```js
// run once: node scripts/seed-admin.js
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await User.create({
    name: 'Super Admin',
    email: 'superadmin@bloodlink.com',
    password: 'admin123',
    phone: '9999999999',
    city: 'Mumbai',
    role: 'SUPER_ADMIN',
  });
  console.log('Admin created!');
  process.exit();
});
```
