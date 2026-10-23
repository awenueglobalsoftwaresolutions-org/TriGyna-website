# TriGyna Healthcare Management — Role-Based Authentication & Dashboard Design Spec

## 1. Overview & Objectives

TriGyna Healthcare is a clinical management and patient wellness platform. This design spec establishes a unified role-based authentication and dashboard ecosystem for four distinct application roles:

1. **ADMIN** — Combined Administrator & Super Admin (Owner) with complete system oversight.
2. **DOCTOR** — Dedicated clinical workflow, patient appointment queue, electronic health assessments, and digital homeopathic prescriptions.
3. **RECEPTION** — Front-desk intake, duplicate-checked patient registrations, collision-free slot bookings, queue progression, and billing cash desk.
4. **PATIENT** — Patient health portal for personal medical history, digital prescriptions, upcoming visits, and billing invoices.

### Non-Negotiable Constraints
- **Preserve Public Website**: The marketing website (including the public `/doctor` profile page) remains intact and unaffected.
- **Existing Tech Stack**: Next.js 16 (App Router, Tailwind CSS, TypeScript) on frontend port 3000, Express.js (Modular REST API, Mongoose, JWT) on backend port 5000, and MongoDB (`trigyna`).
- **No Client Security Assumptions**: Roles and permissions are strictly enforced on the server; client-side parameters, route segments, and localStorage tokens are never trusted as security boundaries.

---

## 2. Canonical Routing & Redirection Architecture

### 2.1 Route Matrix
| Role | Canonical Dashboard Route | Permitted Views |
| :--- | :--- | :--- |
| `ADMIN` (`owner`, `admin`) | `/admin/dashboard` | Overview, Users & RBAC, Approvals, Audit Logs, Organization, CRM, HRMS, Billing, Clinical Queues |
| `DOCTOR` (`doctor`) | `/doctor/dashboard` | Clinical Queue, Assessment & Encounters, Digital Prescriptions, Legal Addendums |
| `RECEPTION` (`reception`) | `/reception/dashboard` | Patient Intake, Appointment Scheduler, Status Queue, POS Invoicing |
| `PATIENT` (`patient`) | `/patient/dashboard` | My Health Records, Appointments, Digital Prescriptions, Invoices & Receipts |

### 2.2 Legacy Portal Aliasing
Existing `/portal/*` paths will seamlessly redirect to their canonical equivalents:
- `/portal` → Canonical user dashboard based on authenticated role
- `/portal/admin` → `/admin/dashboard`
- `/portal/doctor` → `/doctor/dashboard`
- `/portal/reception` → `/reception/dashboard`
- `/portal/patient` → `/patient/dashboard`

### 2.3 Authentication Lifecycle & Session Handling
1. **Login Handshake**:
   - `POST /api/v1/auth/login` receives `identifier` (phone or email) and `password`.
   - Rate limiting applied via `apiLimiter` and `loginLimiter`.
   - Accounts with status `inactive` or `suspended` are rejected with `403 Forbidden`.
   - Returns signed JWT and sanitized user profile (`_id`, `name`, `email`, `phone`, `role`, `status`). Password hashes are never sent.
2. **Dynamic Redirection**:
   - `router.push('/admin/dashboard')` for Admin.
   - `router.push('/doctor/dashboard')` for Doctor.
   - `router.push('/reception/dashboard')` for Reception.
   - `router.push('/patient/dashboard')` for Patient.
   - If a valid `redirect` query parameter was present and matches the authenticated user's permissions, that target is honored.
3. **Session Restoration on Refresh**:
   - On page mount, `AuthProvider` queries `GET /api/v1/auth/me` with the stored JWT.
   - Express verifies token freshness against the database.
   - If the account has been disabled or token expired, session is purged and user is redirected to `/login`.
4. **Logout**:
   - Clears tokens and cached state in `localStorage` and React context, redirecting to `/login`.

---

## 3. Shared Dashboard Layout (`DashboardShell`) & Role Guard

### 3.1 Visual Structure
- **Isolated Layout**:
  - `src/components/layout/Header.tsx` and `Footer.tsx` exclude `/admin`, `/doctor/dashboard`, `/reception`, `/patient`, and `/portal`. The public `/doctor` page continues rendering marketing layout.
- **Sidebar & Mobile Drawer**:
  - TriGyna botanical branding (logo, primary green `#154734`, background `#F9F7F1`, accents `#A7C089`).
  - Active role badge indicator.
  - Role-filtered navigation links with active indicators and icons.
  - User profile drawer with name, phone, and sign-out action.
- **Top Bar**:
  - Mobile menu button.
  - Current view title and breadcrumbs.
  - System status indicator (`System Online • 127.0.0.1:5000`).
  - Notification drawer with unread counters.

### 3.2 Security Barrier: `RoleGuard`
A client-side protective wrapper `<RoleGuard allowedRoles={[...]} dashboardTitle="...">`:
- If unauthenticated → redirects to `/login`.
- If authenticated role is not in `allowedRoles`:
  - Renders an **Access Denied (403)** interstitial screen.
  - Displays user's current role and states why access to this console is prohibited.
  - Provides a one-click button: *"Return to My Dashboard"* (`/doctor/dashboard`, etc.).

---

## 4. Role Dashboards Specification

### 4.1 Admin Dashboard (`/admin/dashboard`)
Integrated administration workspace with tabs:
1. **Overview**: Real-time KPI summary (CRM leads, patient count, today's appointments, active staff, cash flow).
2. **User Accounts & RBAC**: Staff directory, status toggle (`active`/`suspended`), temporary password resets, and staff account creation.
3. **Approval Centre**: Real-time queue for pending leave requests and biometric attendance punch adjustments.
4. **Audit Trail**: Searchable, immutable event logs with actor, action, target entity, IP address, and timestamp.
5. **Organization & Services**: Clinic branch locations, departments, service catalog, and consultation fee schedules.
6. **CRM Pipeline**: Inbound leads, stage progression (`new` → `assigned` → `contacted` → `qualified` → `converted`), and conversion to patient records.
7. **HRMS Staff**: Employee directory, live attendance check-in review, and payroll verification.
8. **Billing & Finance**: Invoices, partial/full payment recordings, authorized refund issuance, and operational expense logs.

### 4.2 Doctor Dashboard (`/doctor/dashboard`)
1. **Today's Encounters Queue**: Appointments filterable by time, patient name, and consult mode (In-Person / Online Video).
2. **Clinical Patient Profile**: Patient banner showing age, gender, chart number, and allergy alerts.
3. **Assessment & Findings**: Chief complaints, vitals, provisional and final diagnosis, and holistic homeopathic treatment plan.
4. **Electronic Prescription Builder**: Dynamic remedy rows (remedy name, potency, dosage frequency, duration, precautions).
5. **Legal Finalization**: "Finalize & Lock" permanently seals clinical records with timestamp and physician author attribution. Amendments can only be made as documented addendums.

### 4.3 Reception Dashboard (`/reception/dashboard`)
1. **Patient Registration & Lookup**: Full patient intake form with server-side duplicate check by phone number.
2. **Collision-Free Appointment Booking**: Selection of registered patient, doctor, service, date, and conflict-free slot.
3. **Queue Tracker**: Patient status buttons (`scheduled` → `arrived` → `in_consultation` → `completed`).
4. **POS Desk & Invoicing**: Generate billing invoices and record cash/digital payments on the server with receipt generation.

### 4.4 Patient Portal (`/patient/dashboard`)
1. **Demographic Profile**: Name, phone, email, patient code, and HIPAA alignment badge.
2. **Consultation Records**: List of past and upcoming appointments.
3. **Digital Prescriptions**: Clear posology, medicine dosages, and therapeutic food/drink precautions.
4. **Invoices & Receipts**: View financial status and print summary receipts.
5. **Strict Data Boundary**: Encounters and records strictly scoped to `req.user._id`; internal staff notes are never exposed.

---

## 5. Backend Security & Data Scoping Architecture

### 5.1 RBAC Enforcement
- `requireAuth`: Validates JWT, queries database for active account status, rejects suspended/inactive accounts.
- `requireRole`: Validates server-verified role. `owner` and `admin` both satisfy administrative authorization checks.

### 5.2 Resource Ownership Scoping
- In `invoice.controller.js` and `appointment.controller.js`:
  - When role is `patient`, queries are filtered by `{ patientId: patientDoc._id }`.
  - When role is `doctor`, clinical records are filtered by `{ doctorId: doctorDoc._id }`.
  - Reception cannot sign prescriptions or alter user permissions.

### 5.3 Server-Side Financial Integrity
- Invoice calculations (total amount, discounts, balance dues, payments) are strictly calculated on the server.
- Partial/full payments and refunds update the invoice ledger non-destructively.

---

## 6. Verification & Acceptance Testing Plan

1. **Authentication & Session Tests**:
   - `npm run test:seed`: Tests all 6 seed accounts (admin, doctor, crm, hrms, reception, patient).
2. **Backend RBAC & API Tests**:
   - `npm run test:api` and `npm run test:master`: Tests 19-point verification across all Express modules.
3. **Frontend Integration Tests**:
   - `npm run test:integration`: Verifies live database metrics on all dashboards.
4. **End-to-End Browser Verification**:
   - Test login and redirect for `ADMIN`, `DOCTOR`, `RECEPTION`, and `PATIENT`.
   - Verify page refresh maintains session and route.
   - Verify unauthorized URL tampering results in Access Denied screen.
   - Verify public `/doctor` page remains accessible to guests.
