# TriGyna Healthcare Management — Role-Based Auth & Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete, fully functional, verified role-based authentication and dashboard system across 4 primary application roles (`ADMIN`, `DOCTOR`, `RECEPTION`, `PATIENT`) with strict backend authorization, record ownership scoping, real MongoDB data persistence, and zero breaking changes to the public website.

**Architecture:** Express.js REST API with centralized `requireAuth` and `requireRole` middleware enforcing server-side authorization and record-level scoping (patients only view self records, doctors only assigned patients, reception barred from clinical notes/prescriptions). Next.js 16 App Router frontend with a shared `DashboardShell` layout, `RoleGuard` barriers, canonical `/admin/dashboard`, `/doctor/dashboard`, `/reception/dashboard`, `/patient/dashboard` routes, and safe redirects for legacy `/portal/*` paths.

**Tech Stack:** Next.js 16 (App Router, Tailwind CSS, Lucide Icons, TypeScript), Express.js (Modular Controllers, Mongoose 8, JWT, bcryptjs), MongoDB (`trigyna`), Node.js test runners.

**Spec:** `docs/superpowers/specs/2026-10-24-role-based-auth-and-dashboards-design.md`

## Global Constraints

- Exactly 4 primary application roles: `ADMIN` (unifying `owner` and `admin`), `DOCTOR`, `RECEPTION`, `PATIENT`.
- CRM and HRMS are feature modules within the Admin console, not separate user roles.
- Canonical routes: `/admin/dashboard`, `/doctor/dashboard`, `/reception/dashboard`, `/patient/dashboard`.
- Public marketing page `/doctor` MUST remain accessible to guests with public header and footer.
- No client-side role parameters or localStorage tokens trusted as security boundaries.
- No hardcoded IP/port strings (e.g. `System Online • 127.0.0.1:5000`) in UI; use live `/api/v1/health` checks.
- Do not introduce TypeScript into JavaScript-only backend modules.
- Preserve all existing database records; no destructive resets or collection drops.

## Review Focus

1. **Role Tampering**: User logs in as `patient` and manually navigates to `/admin/dashboard` or calls `GET /api/v1/users` → Frontend shows Access Denied barrier with 1-click return to patient dashboard; Backend returns `403 Forbidden`.
2. **Patient Data Isolation**: Authenticated patient attempts to fetch an invoice or appointment belonging to another patient via `GET /api/v1/invoices/:id` → Backend rejects request with `403 Forbidden` / `404 Not Found`.
3. **Doctor Record Attribution & Clinical Lock**: Doctor finalizes a clinical consultation → record is sealed; subsequent edits without documented amendment are blocked with `400/403`.
4. **Appointment Double-Booking Concurrency**: Two requests attempt to reserve the same doctor slot at the same time → atomic concurrency check permits only the first booking and returns `409 Conflict` to the second.
5. **Server-Side Financial Total Calculations**: Reception creates an invoice with line items → backend computes subtotal, tax, discount, and balance due; does not trust submitted client totals.

---

### Task 1: Audit & Role Architecture Cleanup in Backend Models and Seed Scripts

**Files:**
- Modify: `apps/api/src/modules/users/user.model.js`
- Modify: `apps/api/src/middleware/rbac.js`
- Modify: `apps/api/src/scripts/seed-dev.js`
- Test: `apps/api/src/tests/testSeedAccountsAndRBAC.js`

**Interfaces:**
- Consumes: Mongoose User Schema
- Produces: Normalized roles: `owner`, `admin`, `doctor`, `reception`, `patient`. Unified `requireRole` supporting `ADMIN` (both `owner` and `admin`), `DOCTOR`, `RECEPTION`, `PATIENT`. Backward compatibility mapping for any legacy `crm`/`hrms` accounts to `admin` or staff access.

- [ ] **Step 1: Write the test verifying role normalization and seed account roles**
Update `apps/api/src/tests/testSeedAccountsAndRBAC.js` to assert the 4 canonical roles (`admin`, `doctor`, `reception`, `patient`), verify that `admin` has access to CRM and HRMS modules, and assert that `crm` and `hrms` are no longer required standalone roles.

- [ ] **Step 2: Run test to observe any failures**
Run: `node apps/api/src/tests/testSeedAccountsAndRBAC.js`
Expected: Fails or notices outdated role assumptions.

- [ ] **Step 3: Update User Model & RBAC Middleware**
In `apps/api/src/modules/users/user.model.js`, ensure `role` enum contains `['owner', 'admin', 'doctor', 'reception', 'patient']`. Add a pre-save/migration hook mapping legacy `crm` and `hrms` to `admin` (or staff). In `apps/api/src/middleware/rbac.js`, ensure `requireRole('admin')` automatically allows both `owner` and `admin`.

- [ ] **Step 4: Update `seed-dev.js`**
Update `apps/api/src/scripts/seed-dev.js` to seed canonical accounts:
- Owner (Super Admin): `+919172772326` / `TriGyna@2326`
- Admin: `admin@trigyna.test` / `TriGyna@123`
- Doctor: `doctor@trigyna.test` / `TriGyna@123`
- Reception: `reception@trigyna.test` / `TriGyna@123`
- Patient: `patient@trigyna.test` / `TriGyna@123`

- [ ] **Step 5: Run tests and seed**
Run: `node apps/api/src/scripts/seed-dev.js`
Run: `node apps/api/src/tests/testSeedAccountsAndRBAC.js`
Expected: PASS (All test accounts authenticate, roles verified).

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/modules/users/user.model.js apps/api/src/middleware/rbac.js apps/api/src/scripts/seed-dev.js apps/api/src/tests/testSeedAccountsAndRBAC.js
git commit -m "fix(api): normalize 4 core roles and unify admin authorization"
```

---

### Task 2: Backend Resource Ownership & Access Scoping

**Files:**
- Modify: `apps/api/src/modules/patients/patient.controller.js`
- Modify: `apps/api/src/modules/appointments/appointment.controller.js`
- Modify: `apps/api/src/modules/clinical/clinical.controller.js`
- Modify: `apps/api/src/modules/billing/invoice.controller.js`
- Test: `apps/api/src/tests/testResourceOwnership.js`

**Interfaces:**
- Consumes: `req.user` (`_id`, `role`, `status`)
- Produces: Patient scoping (`patientId` resolved via `Patient.findOne({ userId: req.user._id })` or `req.user.phone`), Doctor scoping (`doctorId` resolved via `Doctor.findOne({ userId: req.user._id })`), and Reception restrictions (cannot modify clinical notes/prescriptions).

- [ ] **Step 1: Write test for resource ownership and cross-patient prevention**
Create `apps/api/src/tests/testResourceOwnership.js` to test:
- Patient A cannot read Patient B's invoices or appointments.
- Doctor cannot edit another doctor's finalized consultation.
- Reception cannot call clinical consultation endpoints (`POST /api/v1/clinical/consultations`).

- [ ] **Step 2: Run test to verify it fails**
Run: `node apps/api/src/tests/testResourceOwnership.js`
Expected: FAIL on cross-patient check.

- [ ] **Step 3: Implement ownership resolution in controllers**
- In `patient.controller.js`: add helper to resolve patient record for `req.user`. Add duplicate check by `phone`.
- In `appointment.controller.js`: if `req.user.role === 'patient'`, force `query.patientId = resolvedPatient._id`. Prevent double-booking using atomic query or slot lock.
- In `clinical.controller.js`: restrict consultation drafting and finalization to `doctor` (and authorized `admin`). Enforce finalized record lock.
- In `invoice.controller.js`: if `req.user.role === 'patient'`, force `query.patientId = resolvedPatient._id`. Calculate totals server-side.

- [ ] **Step 4: Run test to verify it passes**
Run: `node apps/api/src/tests/testResourceOwnership.js`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/modules/patients/patient.controller.js apps/api/src/modules/appointments/appointment.controller.js apps/api/src/modules/clinical/clinical.controller.js apps/api/src/modules/billing/invoice.controller.js apps/api/src/tests/testResourceOwnership.js
git commit -m "feat(api): enforce strict patient and doctor resource ownership"
```

---

### Task 3: Frontend AuthContext & Canonical Role Redirection

**Files:**
- Modify: `src/lib/auth/authContext.tsx`
- Modify: `src/app/login/page.tsx`
- Test: `apps/api/src/tests/testFrontendIntegration.js`

**Interfaces:**
- Consumes: `/api/v1/auth/login`, `/api/v1/auth/me`
- Produces: `useAuth()` hook with `isAdmin`, `isDoctor`, `isReception`, `isPatient`, `user`, `login`, `logout`.
- Redirection map:
  - Admin: `/admin/dashboard`
  - Doctor: `/doctor/dashboard`
  - Reception: `/reception/dashboard`
  - Patient: `/patient/dashboard`

- [ ] **Step 1: Update AuthContext types and role helpers**
In `src/lib/auth/authContext.tsx`:
- Update `AuthUser.role` to `"owner" | "admin" | "doctor" | "reception" | "patient"`.
- Update helper booleans: `isAdmin = role === 'admin' || role === 'owner'`, `isDoctor`, `isReception`, `isPatient`.
- Ensure `refreshUser()` safely re-queries `/auth/me` and handles `401/403` gracefully by logging out.

- [ ] **Step 2: Update LoginPage redirection logic**
In `src/app/login/page.tsx`:
- Map `owner` / `admin` / `crm` / `hrms` → `/admin/dashboard`.
- Map `doctor` → `/doctor/dashboard`.
- Map `reception` → `/reception/dashboard`.
- Map `patient` → `/patient/dashboard`.
- Update Quick Test Account buttons to reflect the 4 canonical roles (Admin, Doctor, Reception, Patient) and Super Admin.

- [ ] **Step 3: Run integration test**
Run: `node apps/api/src/tests/testFrontendIntegration.js`
Expected: PASS (Dashboards load live data).

- [ ] **Step 4: Commit**
```bash
git add src/lib/auth/authContext.tsx src/app/login/page.tsx
git commit -m "feat(frontend): update AuthContext and login redirection for 4 canonical dashboards"
```

---

### Task 4: Shared Dashboard Shell & RoleGuard Component

**Files:**
- Create: `src/components/dashboard/DashboardShell.tsx`
- Create: `src/components/dashboard/RoleGuard.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/Footer.tsx`

**Interfaces:**
- Consumes: `useAuth()`
- Produces: Reusable `<DashboardShell role="..." title="...">` layout with sidebar, mobile drawer, live backend health indicator (querying `/health`), notifications, profile dropdown, and `<RoleGuard allowedRoles={[...]} title="...">` preventing unauthorized URL entry.

- [ ] **Step 1: Create RoleGuard component**
In `src/components/dashboard/RoleGuard.tsx`:
- If `isLoading`, show pulse loader.
- If `!isAuthenticated`, redirect to `/login?redirect=...`.
- If user role is not in `allowedRoles`, render an accessible Access Denied (403) screen with explanation and a prominent button: *"Go to My [Role] Dashboard"* routing to their authorized dashboard.

- [ ] **Step 2: Create DashboardShell component**
In `src/components/dashboard/DashboardShell.tsx`:
- Navigation filtered by role:
  - Admin: Overview, Users & RBAC, Approvals, Audit Logs, Organization, CRM, HRMS, Billing, Appointments.
  - Doctor: Today's Encounters, Assigned Patients, Prescription Builder, Medical Records.
  - Reception: Patient Lookup & Registration, Appointment Booking, Queue Tracker, Invoicing & POS.
  - Patient: My Health Records, Appointments, Digital Prescriptions, Invoices.
- Header: Breadcrumbs, notifications badge, live backend health check (`/api/v1/health` query to determine Online/Degraded status without hardcoded IP strings), user profile dropdown, and logout.
- Responsive mobile drawer with backdrop.

- [ ] **Step 3: Update Header.tsx and Footer.tsx route exclusion**
Ensure `Header.tsx` and `Footer.tsx` check:
```tsx
const isDashboard = pathname?.startsWith('/admin') ||
  pathname?.startsWith('/doctor/dashboard') ||
  pathname?.startsWith('/reception') ||
  pathname?.startsWith('/patient') ||
  pathname?.startsWith('/portal') ||
  pathname?.startsWith('/login');
if (isDashboard) return null;
```
Note: `/doctor` alone returns `false` (does NOT match `/doctor/dashboard`), so the public consultant marketing page remains fully intact!

- [ ] **Step 4: Commit**
```bash
git add src/components/dashboard/DashboardShell.tsx src/components/dashboard/RoleGuard.tsx src/components/layout/Header.tsx src/components/layout/Footer.tsx
git commit -m "feat(frontend): create reusable DashboardShell, RoleGuard, and route isolation"
```

---

### Task 5: Canonical Admin Dashboard (`/admin/dashboard`)

**Files:**
- Create: `src/app/admin/dashboard/page.tsx`
- Create: `src/app/admin/layout.tsx` (or pass-through)

**Interfaces:**
- Consumes: `DashboardShell`, `RoleGuard` (`allowedRoles: ['owner', 'admin']`), `/api/v1/reports/summary`, `/api/v1/users`, `/api/v1/approvals`, `/api/v1/organization`, `/api/v1/crm/leads`, `/api/v1/hrms/employees`, `/api/v1/invoices`.
- Produces: Unified Admin Console with tabs: Overview KPIs, User Accounts & RBAC, Approvals, Audit Logs, Organization, CRM Pipeline, HRMS Staff, Billing & Payments.

- [ ] **Step 1: Implement `/admin/dashboard/page.tsx`**
Build the complete Admin Dashboard using `DashboardShell` and `RoleGuard`:
- Real KPI summary cards connected to `/reports/summary`.
- User directory with status toggling (`active`/`suspended`) and temporary password resets.
- Centralized approvals for leave and attendance corrections.
- Integrated views for CRM leads, HRMS employees, clinic branches, and financial invoices.
- Search, role filtering, pagination, and empty/error states.

- [ ] **Step 2: Commit**
```bash
git add src/app/admin/dashboard/page.tsx
git commit -m "feat(admin): implement canonical Admin dashboard with unified module oversight"
```

---

### Task 6: Canonical Doctor Dashboard (`/doctor/dashboard`)

**Files:**
- Create: `src/app/doctor/dashboard/page.tsx`
- Test: Verify `/doctor` still loads public profile, `/doctor/dashboard` loads clinical portal

**Interfaces:**
- Consumes: `DashboardShell`, `RoleGuard` (`allowedRoles: ['owner', 'admin', 'doctor']`), `/api/v1/appointments`, `/api/v1/clinical/consultations`, `/api/v1/clinical/prescriptions`.
- Produces: Clinical Encounter Console with today's appointments queue, patient medical history banner, chief complaints/vitals/diagnosis, electronic homeopathy prescription posology builder, finalize & lock, and legal amendments.

- [ ] **Step 1: Implement `/doctor/dashboard/page.tsx`**
Create the clinical dashboard with:
- Today's appointment schedule queue.
- Patient health banner (chart code, age, gender, allergies).
- Clinical consultation draft saving and finalization lock.
- Homeopathic prescription builder (remedy, potency, frequency, duration, diet rules).
- Documented amendment addendums for locked records.

- [ ] **Step 2: Test public `/doctor` vs. protected `/doctor/dashboard`**
Verify with curl/browser that `/doctor` returns the public Doctor Profile Page and `/doctor/dashboard` requires doctor authentication.

- [ ] **Step 3: Commit**
```bash
git add src/app/doctor/dashboard/page.tsx
git commit -m "feat(doctor): implement canonical Doctor clinical dashboard and preserve public /doctor profile"
```

---

### Task 7: Canonical Reception Dashboard (`/reception/dashboard`)

**Files:**
- Create: `src/app/reception/dashboard/page.tsx`

**Interfaces:**
- Consumes: `DashboardShell`, `RoleGuard` (`allowedRoles: ['owner', 'admin', 'reception']`), `/api/v1/patients`, `/api/v1/appointments`, `/api/v1/doctors`, `/api/v1/invoices`.
- Produces: Reception Front-Desk Console with patient registration (duplicate phone check), conflict-free appointment booking, patient check-in status progression (`scheduled` → `arrived` → `in_consultation` → `completed`), invoice creation and payment collection.

- [ ] **Step 1: Implement `/reception/dashboard/page.tsx`**
Build reception desk with:
- Patient lookup & search.
- New patient intake modal with duplicate mobile check.
- Collision-free appointment booking modal with doctor slot selection.
- Waiting room queue with status progression buttons.
- POS billing invoice creation and cash collection.

- [ ] **Step 2: Commit**
```bash
git add src/app/reception/dashboard/page.tsx
git commit -m "feat(reception): implement canonical Reception desk dashboard"
```

---

### Task 8: Canonical Patient Dashboard (`/patient/dashboard`)

**Files:**
- Create: `src/app/patient/dashboard/page.tsx`

**Interfaces:**
- Consumes: `DashboardShell`, `RoleGuard` (`allowedRoles: ['owner', 'admin', 'patient']`), `/api/v1/appointments`, `/api/v1/invoices`.
- Produces: Personal patient portal showing authenticated patient's demographic card, consultation records, verified digital prescriptions, and downloadable/printable billing receipts. Strictly scoped to `req.user._id`.

- [ ] **Step 1: Implement `/patient/dashboard/page.tsx`**
Build patient portal with:
- Patient demographic card with HIPAA alignment badge.
- List of personal appointments and status.
- Digital homeopathic prescriptions with posology and dietary guidelines.
- Invoices, payment receipts, and print summary action.

- [ ] **Step 2: Commit**
```bash
git add src/app/patient/dashboard/page.tsx
git commit -m "feat(patient): implement canonical Patient personal health portal"
```

---

### Task 9: Legacy Route Aliasing and Redirects

**Files:**
- Modify: `src/app/portal/page.tsx`
- Modify: `src/app/portal/admin/page.tsx`
- Modify: `src/app/portal/doctor/page.tsx`
- Modify: `src/app/portal/reception/page.tsx`
- Modify: `src/app/portal/patient/page.tsx`

**Interfaces:**
- Consumes: Next.js `redirect()` or client router
- Produces: Clean backwards-compatibility redirects from `/portal/*` to `/admin/dashboard`, `/doctor/dashboard`, `/reception/dashboard`, `/patient/dashboard`.

- [ ] **Step 1: Implement seamless redirection for legacy `/portal/*` routes**
Ensure any user or bookmark hitting `/portal`, `/portal/admin`, `/portal/doctor`, `/portal/reception`, or `/portal/patient` is immediately routed to the corresponding canonical `/dashboard` route.

- [ ] **Step 2: Commit**
```bash
git add src/app/portal/
git commit -m "refactor(portal): add automatic redirects from legacy /portal routes to canonical dashboards"
```

---

### Task 10: Automated Master Verification & End-to-End Test Suite

**Files:**
- Create: `apps/api/src/tests/testMasterE2E.js`
- Modify: `package.json` (root and `apps/api/package.json`)
- Test: Run all test suites and production build

**Interfaces:**
- Runs the 10 complete user journeys from Section 16:
  1. Admin logs in, opens admin dashboard, manages users, views reports.
  2. Doctor logs in, views assigned appointments, saves/locks clinical consultation.
  3. Reception logs in, registers patient, books appointment, checks in, creates invoice.
  4. Patient logs in, views only their own appointments and records.
  5. Unauthorized user attempts to open another role's dashboard/API (denied 403).
  6. Patient attempts to access another patient's record by ID (denied 403/404).
  7. Suspended user session reuse attempt (denied 403).
  8. Concurrent appointment conflict prevention verified.
  9. Duplicate payment submission idempotency verified.
  10. Public marketing pages and `/doctor` remain accessible.

- [ ] **Step 1: Create `apps/api/src/tests/testMasterE2E.js`**
Write the comprehensive automated end-to-end test script covering all 10 journeys.

- [ ] **Step 2: Run all test suites**
Run: `npm run test:seed`
Run: `npm run test:api`
Run: `npm run test:integration`
Run: `node apps/api/src/tests/testMasterE2E.js`
Run: `npm run test:master`
Expected: 100% PASS across all suites.

- [ ] **Step 3: Run production build**
Run: `npm run build`
Expected: Build succeeds with zero TypeScript or Next.js route errors.

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/tests/testMasterE2E.js package.json apps/api/package.json
git commit -m "test: add comprehensive 10-journey E2E verification suite"
```
