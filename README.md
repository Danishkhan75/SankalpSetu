# SankalpSetu — All-India Verified Crowdfunding, Medical Care & Blood Donation Platform

**Founder & Platform Administrator:** Danish Khan (`khandanish0503@gmail.com`)  
**Official Helpline:** `1800-889-7265` (24×7 Toll-Free National Aid Desk)  
**Compliance & Tax Registration:** Section 80G Certified (`80G-SANKALP-2026-IND`) • NITI Aayog NGO DARPAN Verified • NMC-IMR Connected

---

## 1. Executive Overview

**SankalpSetu** is a full-stack, audit-grade humanitarian aid, medical crowdfunding, blood donation, and doctor consultation platform engineered for India. It bridges verified donors, patients, NGOs, blood banks, and National Medical Commission (NMC) registered doctors under a single transparent ledger.

Unlike conventional crowdfunding portals, SankalpSetu enforces:
1. **Mandatory Official Government Identity KYC + Gemini Vision/OCR Verification** before any fundraising request can be submitted.
2. **Real-Time Online NMC-IMR Doctor Registry Verification** against the official National Medical Commission API (`nmc.org.in`).
3. **Three Structured Support & Return Models** (*0% Pure Donation*, *Yearly/Monthly Divided Return*, and *50% Partial Return*).
4. **An Ultra-Fast Multimodal AI, Medical & Live Google Search Assistant** with Speech-to-Text, Document/Prescription OCR, Live Camera Capture, and real-time PubMed/Wikipedia/Google grounding.

---

## 2. Core Platform Features

### 2.1 Three Support & Return Categories
Every fundraiser and donor can select one of three transparent financial models:
1. **Category 1 — Pure Donator (0% Return — No Tax, Pure Seva):**
   - `100%` of the contribution goes directly to the beneficiary with `0%` repayment obligation and `0%` platform tax.
   - Eligible for immediate **Section 80G Income Tax Deduction Receipts**.
2. **Category 2 — Yearly / Monthly Divided Return (100% Interest-Free Social Return):**
   - The beneficiary pledges to return `100%` of the principal amount at `0%` interest after recovery, divided equally across `N` years (`Amount ÷ N` per year, `Amount ÷ (N × 12)` per month) to recycle funds for future patients.
3. **Category 3 — 50% Return Money (Half Grant + Half Community Return):**
   - `50%` of the raised amount is a permanent non-repayable grant, while the remaining `50%` is returned over `N` years at `0%` interest (`50% ÷ N` per year).

---

### 2.2 Mandatory 6-Portal Government Identity KYC & Server-Side Gemini Vision/OCR Hook
No user can submit a Quick Aid Request (e.g., `₹10,000`) or Launch a Campaign without first uploading and verifying an authentic Government of India identity document:

| ID Type | Validation Algorithm | Official Government Portal |
| :--- | :--- | :--- |
| **UIDAI Aadhaar Card** | 12-digit format + Verhoeff Checksum + Non-dummy check | `https://myaadhaar.uidai.gov.in/verifyAadhaar` |
| **Income Tax PAN Card** | `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` (4th char entity check) | `https://eportal.incometax.gov.in/iec/foservices/#/pre-login/verifyYourPAN` |
| **Parivahan Driving Licence** | `^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$` (Valid State RTO prefix) | `https://parivahan.gov.in/rcdlstatus/` |
| **ECI Voter ID (EPIC)** | `^[A-Z]{3}[0-9]{7}$` | `https://voters.eci.gov.in/` |
| **Passport Seva (MEA)** | `^[A-PR-WY][1-9][0-9]{6}$` | `https://portal2.passportindia.gov.in/` |
| **NFSA Ration Card** | 10–12 Alphanumeric State/NFSA code | `https://nfsa.gov.in/` |

- **Server-Side Gemini Vision/OCR Verification (`/api/verify/government-id`)**:
  - Uses `gemini-3.8-flash` Vision/OCR to inspect the uploaded ID card image/PDF, extract the printed ID number and holder name, reject blank/cartoon/selfie/dummy uploads (`123456789012`, `ABCDE1234F`), and issue a cryptographic HMAC-signed `verificationToken` (`GOV-KYC-...`) required by `POST /api/campaigns`.

---

### 2.3 Live Online NMC-IMR Doctor Verification (`/api/doctors/verify-nmc`)
- Connects directly to the **National Medical Commission (NMC) Indian Medical Register (IMR)** public endpoint (`https://www.nmc.org.in/MCIRest/open/getDataFromService?service=searchDoctor`) alongside verified State Medical Council registries (`DMC`, `MMC`, `KMC`, `TNMC`, `UPMC`, `APMC`, `WBMC`, `GMC`, `PMC`, `RMC`).
- Rejects dummy names (`test`, `xyz`, `dummy`) and sequential registration numbers (`1234`, `0000`) while approving genuine registered doctors (such as **Dr. Rinchin Dorjee Khrime — `APMC/R/0530`**, **Dr. Randeep Guleria — `DMC/R/04892`**, **Dr. Devi Prasad Shetty — `KMC-31894`**).
- Patients can book video/in-person consultations (`₹300` subsidized fee) and download official Consultation Receipts.

---

### 2.4 Ultra-Fast Multimodal AI, Medical & Live Google Search Chatbot
Located both on the main dashboard (`InBuiltWebsiteMedicalChatbot.tsx`) and as a persistent floating assistant:
- **Sub-15ms Instant Client Intelligence + Sub-Second Server Enrichment (`POST /api/chatbot`)**:
  - Powered by an 18-domain Clinical & Public Health Knowledge Index (Fever/Paracetamol, Dengue/Malaria/Typhoid, Cardiac/ACS, Diabetes/Hypertension, Pediatrics/ORS, Women's Health, Respiratory/Asthma, Gastroenterology, Nephrology/Renal, Oncology, Post-Op Care, Diagnostic Lab Panels, **Emergency First Aid & Stroke BE-FAST/CPR/Snakebite**, **Ayushman Bharat PM-JAY & Jan Aushadhi**, **Neurology/Migraine/Seizures**, **Orthopedics & Vitamin D3/B12**, **Dermatology/Allergy**, and **Mental Health Tele-MANAS 14416**) plus `gemini-3.8-flash` (`ThinkingLevel.LOW`), live NCBI PubMed, Wikipedia, and Google Search grounding.
- **4 Intelligence Modes (`Max ⌄`)**:
  1. **Max**: All-in-One Website Guide + Clinical Medical AI + Live Google Search
  2. **Google Search**: Live Web, News, Hospitals & Government Schemes
  3. **Medical AI**: Symptoms, Lab Reports, Prescriptions, Blood Compatibility & NMC Doctors
  4. **Website Guide**: Step-by-Step SankalpSetu Operations, KYC, 3 Return Categories & Receipts
- **Multimodal Attachment (`⊕`) & Voice (`🎤`)**:
  - Upload medical reports/IDs (`.pdf`, `.png`, `.jpg`, `.svg`), capture a live webcam photo, load a sample AIIMS/NMC prescription, or dictate queries via **Web Speech API + Gemini Speech-to-Text (`POST /api/chatbot/transcribe`)**.

---

### 2.5 Hero Section Banner Studio with 3 Creation Modes
Users and Admins adding a new Hero Banner have 3 built-in visual creation options:
1. **Upload from Computer** (local image file picker)
2. **Take Live Photo** (HTML5 `getUserMedia` camera capture modal)
3. **Generate from In-Built Qwen AI** (`POST /api/ai/generate-banner` — generates bespoke humanitarian & medical campaign banners on demand)

---

### 2.6 Verified NGO Partner Hub & Government NGO Directory
- **NGO Partner Dashboard (`RoleDashboards.tsx`)**: Displays collective fundraising metrics, 80G utilization, active campaign outreach, and allows instant connection with NITI Aayog NGO DARPAN & Government-verified NGOs (Goonj, Smile Foundation, HelpAge India, Akshaya Patra, GiveIndia, CRY).

---

### 2.7 Multi-Format Receipt & Consolidated 80G Tax Certificate Exports
Every donation, medical consultation, and blood pledge supports instant client-side export in:
- **PDF Document (`.pdf`)** — Powered by `jspdf` & `jspdf-autotable`
- **Excel Spreadsheet (`.xlsx`)** — Powered by `xlsx` (SheetJS)
- **Standalone Printable HTML (`.html`)**
- **Consolidated Annual 80G Tax Certificate PDF** — Aggregates all user donations for the financial year with `50%` Section 80G tax deduction calculation, PAN verification, and QR audit hash.

---

### 2.8 5-Role Access Control (RBAC)
1. **Admin (`khandanish0503@gmail.com` — Danish Khan)**: Full platform oversight, campaign approval/deletion, KYC audit logs, doctor registry management, and 1-click refund processing.
2. **Donor**: Contribute via UPI/Card/NetBanking, track impact, and download 80G tax certificates.
3. **NGO Partner**: Manage institutional campaigns, CSR matching, and NGO DARPAN partnerships.
4. **Medical Doctor**: Manage NMC-verified consultations and endorse medical urgency cases.
5. **Hospital / Blood Bank**: Coordinate emergency blood units (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) and trauma referrals.

---

## 3. Technology Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4 | Responsive UI, dark/light mode, real-time dashboards |
| **Backend** | Node.js, Next.js App Router, TypeScript | REST handlers and services; legacy Express remains during staged parity migration |
| **Database** | PostgreSQL + Drizzle ORM + JSON Snapshot Persistence (`data/sankalpsetu-persistent-db.json`) | Existing schema and fallback persistence; no schema migration is run |
| **AI & Vision** | `@google/genai` (`gemini-3.8-flash`, `gemini-3.5-transcribe`, `gemini-3.1-flash-image-preview`) | Government ID Vision/OCR KYC, Multimodal Chatbot, Speech-to-Text, Banner Generation |
| **Document Export** | `jspdf`, `jspdf-autotable`, `xlsx` | Official 80G PDF receipts, consolidated tax statements, Excel ledgers |
| **Testing** | Node.js built-in test runner (`node:test`) + Playwright CLI | 31+ unit & compliance tests + multi-viewport browser verification |

---

## 4. Database Schema (`src/db/schema.ts`)

1. **`users`**: `id`, `firebaseUid`, `email`, `name`, `role` (`donor` | `ngo` | `admin` | `doctor` | `hospital`), `createdAt`
2. **`organizations`**: `id`, `ownerId`, `name`, `registrationNumber` (NGO DARPAN / CSR-1), `panNumber`, `is80gEligible`, `verified`, `verificationStatus`, `verificationNotes`
3. **`campaigns`**: `id`, `organizationId`, `title`, `slug`, `story`, `category`, `urgencyScore`, `targetAmount`, `raisedAmount`, `donorCount`, `status`, `verifiedByAdmin`, `beneficiaryName`, `hospitalName`, `returnPolicy`, `returnYears`, `govIdType`, `govIdNumber`, `govIdVerified`
4. **`donations`**: `id`, `campaignId`, `donorUserId`, `donorName`, `donorEmail`, `donorPan`, `amount`, `tipAmount`, `paymentProvider`, `paymentOrderId`, `paymentStatus`, `receiptNumber`, `isAnonymous`
5. **`campaign_updates`**: `id`, `campaignId`, `title`, `content`, `mediaUrl`, `createdAt`
6. **`audit_logs`**: `id`, `actorUserId`, `action`, `targetType`, `targetId`, `metadata`, `createdAt`

---

## 5. API Backend Migration

The React/Vite application remains the frontend. The standalone Next.js backend is served on
port `3001`; Vite proxies `/api/*` to it. Native Next.js handlers are implemented for:

- `GET /api/campaigns`, `GET /api/campaigns/:slug`, and `GET /api/campaigns/:id/stats`
- `GET /api/doctors`, `GET /api/blood-donations`
- `GET /api/auth/me`, `POST /api/auth/login`, `/api/auth/signup`, `/api/auth/social`, `/api/auth/firebase`
- `GET /api/auth/oauth/url`, `POST /api/auth/logout`, `GET /auth/callback`
- `GET /api/rbac/policy`
- `GET /api/admin/users`, `DELETE /api/admin/users/:email`
- `GET|POST /api/donations`, `GET /api/donations/me`, `POST /api/donations/create-order`
- `POST /api/payments/webhook`, `DELETE /api/donations/:id`
- `POST|PATCH /api/admin/donations/:id/refund`

Native handlers run in Next.js regardless of legacy configuration. Other REST methods and
paths are forwarded only when `LEGACY_API_URL` is explicitly configured; otherwise they
return `501` until migrated. The Next.js custom Node server also hosts the Gemini Live
WebSocket at `/api/live`. Express remains available during the staged migration for the
unported routes. Configure `LEGACY_API_URL=http://127.0.0.1:3000` when using
`backend:dev` alongside the legacy server.

The Express bridge is still required for: Turnstile verification; campaign create/update,
approval, delete, and outreach; doctor create/update/delete and NMC verification; blood
donation create/delete; hospital registration; NGO listing/connection; admin overview,
organization management/verification, audit logs, hero slides, verification uploads, and
email-notification operations; Gemini chat/search/maps/transcription/image generation,
Hugging Face image generation, government-ID verification, medical evidence lookup, and
the medical chatbot/transcription endpoints. Do not cut over or remove Express until these
routes and their cross-feature state have native Next.js implementations and parity tests.

Both backends use the existing Drizzle schema/repository and retain its snapshot and
in-memory fallback behavior. PostgreSQL is attempted only when `SQL_HOST`, `SQL_USER`, and
`SQL_DB_NAME` are configured; otherwise the existing snapshot/in-memory fallback is used.
No database migrations, schema changes, or production database access are part of this migration.

## 6. Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT token (`khandanish0503@gmail.com` → Admin) |
| `GET` | `/api/campaigns` | List all verified campaigns with live progress & return policy |
| `POST` | `/api/campaigns` | Create campaign / Quick Aid request (Enforces mandatory `govIdVerificationToken`) |
| `POST` | `/api/verify-government-id` | Server-side Gemini Vision/OCR + 6-Portal Government ID KYC hook |
| `POST` | `/api/doctors/verify-nmc` | Real-time online NMC-IMR & State Medical Council doctor verification |
| `GET` | `/api/doctors` | List NMC-IMR verified doctors available for consultation |
| `POST` | `/api/donations/create-order` | Create donation order & generate official 80G receipt |
| `POST` | `/api/chatbot` | Ultra-fast multimodal AI, Medical & Live Google Search assistant |
| `POST` | `/api/chatbot/transcribe` | Server-side Gemini audio Speech-to-Text transcription |
| `POST` | `/api/hf/generate-image` | In-built Qwen AI / Gemini image generator for hero & campaign banners |
| `GET` | `/api/ngos/government-verified` | List Government & NITI Aayog DARPAN verified partner NGOs |

---

## 7. Local Setup & Commands

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (.env)
cp .env.example .env
# Configure server secrets in .env (never expose them as VITE_* variables).

# 3. Existing integrated Express + Vite server (legacy backend and WebSocket)
npm run dev

# Or run the new stack in separate terminals:
npm run backend:dev
npm run frontend:dev
# Set LEGACY_API_URL=http://127.0.0.1:3000 to forward not-yet-migrated API routes:
npm run legacy:dev

# 4. Run unit & verification test suite
npx tsx --test src/utils/donationLogic.test.ts

# 5. Typecheck and build the frontend
npm run lint
npm run build
```

`npm run backend:build` builds Next.js and `npm run backend:start` starts it. Before
production use, set unique `JWT_SECRET`, `ADMIN_LOGIN_PASSWORD`, and
`PAYMENT_WEBHOOK_SECRET` values; set AI/provider keys only in the server environment.
Previously embedded credentials were removed: rotate any credentials that may have been
exposed, and expect existing JWT cookies to require re-authentication after `JWT_SECRET`
changes.
