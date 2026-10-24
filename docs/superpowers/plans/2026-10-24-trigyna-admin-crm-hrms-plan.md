# TriGyna Admin Dashboard + CRM + HRMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the production-ready Healthcare Management System for TriGyna by enforcing the canonical 5-status CRM pipeline, completing missing HRMS endpoints and UI actions, and connecting full real-time database workflows across Admin, CRM, and HRMS.

**Architecture:** Extend the existing modular Express + MongoDB REST API in `apps/api` and Next.js 16 App Router frontend in `src/`. Enforce strict 5-status CRM pipeline transitions and complete HRMS department, shift, leave approval, and payroll finalization workflows without rewriting existing functioning models or breaking active test suites.

**Tech Stack:** Node.js, Express.js, MongoDB (Mongoose), Next.js 16, React 19, Tailwind CSS v4, PDFKit.

**Spec:** [`Docs/superpowers/specs/2026-10-24-trigyna-admin-crm-hrms-design.md`](file:///c:/Users/codew/Downloads/TriGyna/Docs/superpowers/specs/2026-10-24-trigyna-admin-crm-hrms-design.md)

## Global Constraints
- Preserve the existing public website and existing working database entities; do not create duplicate tables or rewrite the MongoDB architecture.
- Enforce strictly five CRM pipeline statuses: `new`, `contacted`, `qualified`, `converted`, `lost`. Do not introduce extra pipeline stages.
- Every state transition must be validated server-side; moving to `lost` requires a non-empty `lostReason`.
- All financial numbers must be handled with exact decimal / integer minor unit arithmetic, never floating point estimations.
- Never hardcode or fabricate patient data, attendance records, or salary calculations in production code paths.

## Review Focus
1. Transitioning a lead to `lost` without a `lostReason` must be rejected with 400 Bad Request.
2. Converting a CRM lead to a patient must be idempotent; repeated calls must return the existing patient without creating duplicate records.
3. Leave approval must be atomic; approving a leave must adjust employee balance and reject double approvals.
4. Finalized payroll runs must be locked; subsequent edit attempts must return 409 Conflict.
5. Non-existent IDs in API routes must cleanly return 404 with structured JSON, never throw unhandled 500 exceptions or crash the server.

---

### Task 1: Enforce Canonical 5-Status CRM Pipeline & Endpoints in Backend

**Files:**
- Modify: `apps/api/src/modules/crm/lead.model.js`
- Modify: `apps/api/src/modules/crm/lead.controller.js`
- Modify: `apps/api/src/modules/crm/lead.routes.js`
- Modify: `apps/api/src/modules/crm/crm.routes.js`
- Test: `apps/api/src/tests/testCrm5StagePipeline.js`

**Interfaces:**
- Consumes: Mongoose `Lead` model, `recordAudit` from `apps/api/src/modules/audit/audit.service.js`.
- Produces:
  - `getCrmStages` returning exactly `[{ id: 'new' }, { id: 'contacted' }, { id: 'qualified' }, { id: 'converted' }, { id: 'lost' }]`.
  - `PATCH /api/v1/crm/leads/:id/status` validating transitions and requiring `lostReason`.
  - `POST /api/v1/crm/leads/:id/mark-lost` setting status to `lost` with reason.
  - `GET /api/v1/crm/leads/:id/activities` returning chronological interaction timeline.
  - `POST /api/v1/crm/leads/:id/follow-ups` scheduling follow-ups.
  - `PATCH /api/v1/crm/follow-ups/:id` completing or rescheduling follow-ups.
  - `GET /api/v1/crm/dashboard` alias to `getCrmOverview`.

- [ ] **Step 1: Write the failing test for the 5-status CRM pipeline**
Create `apps/api/src/tests/testCrm5StagePipeline.js` verifying:
  - `GET /api/v1/crm/stages` returns exactly 5 stages.
  - `PATCH /api/v1/crm/leads/:id/status` transitioning through `new` -> `contacted` -> `qualified` -> `converted`.
  - Moving to `lost` without `lostReason` fails with 400.
  - Moving to `lost` with `lostReason` succeeds.
  - Re-opening a `lost` lead back to `contacted` succeeds.
  - Dedicated endpoints `POST /crm/leads/:id/mark-lost`, `GET /crm/leads/:id/activities`, `POST /crm/leads/:id/follow-ups`, `PATCH /crm/follow-ups/:id` return 200/201.

- [ ] **Step 2: Run test to verify it fails**
Run: `node apps/api/src/tests/testCrm5StagePipeline.js`
Expected: FAIL on missing 5-stage validation or missing endpoints.

- [ ] **Step 3: Implement 5-status pipeline and routes in CRM backend**
In `lead.model.js`, ensure `status` schema accepts the canonical statuses and map legacy statuses smoothly.
In `lead.controller.js`:
  - Update `getCrmStages` to return strictly the 5 canonical stages.
  - Add `updateLeadStatus` with validation: reject `lost` if `lostReason` is missing.
  - Add `markLeadLost` controller function.
  - Add `getLeadActivities` returning activities, communications, notes, and task events.
  - Add `addLeadFollowUp` and `updateFollowUpTask`.
In `lead.routes.js` and `crm.routes.js`:
  - Wire `PATCH /:id/status` to `updateLeadStatus`.
  - Wire `POST /:id/mark-lost` to `markLeadLost`.
  - Wire `PATCH /:id/assign` to `assignLead`.
  - Wire `GET /:id/activities` to `getLeadActivities`.
  - Wire `POST /:id/follow-ups` to `addLeadFollowUp`.
  - Wire `PATCH /follow-ups/:id` to `updateFollowUpTask`.
  - Wire `GET /dashboard` alias to `getCrmOverview`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node apps/api/src/tests/testCrm5StagePipeline.js`
Expected: PASS (all 5-stage assertions verified).

- [ ] **Step 5: Commit changes**
```bash
git add apps/api/src/modules/crm apps/api/src/tests/testCrm5StagePipeline.js
git commit -m "feat(crm): enforce canonical 5-status pipeline and complete REST endpoints"
```

---

### Task 2: Complete HRMS Backend Endpoints & Workflows

**Files:**
- Modify: `apps/api/src/modules/hrms/hrms.controller.js`
- Modify: `apps/api/src/modules/hrms/hrms.routes.js`
- Test: `apps/api/src/tests/testHrmsEndpointsSuite.js`

**Interfaces:**
- Consumes: `Employee`, `Attendance`, `AttendanceCorrection`, `LeaveRequest`, `PayrollRecord` models.
- Produces:
  - `GET /api/v1/hrms/dashboard`: Aggregated HR KPIs (total employees, on duty today, on leave, pending requests, payroll status).
  - `GET /api/v1/hrms/departments` & `POST /api/v1/hrms/departments`: Organizational structure.
  - `GET /api/v1/hrms/shifts` & `POST /api/v1/hrms/shifts`: Work shift rosters.
  - `POST /api/v1/hrms/leaves/:id/approve` & `POST /api/v1/hrms/leaves/:id/reject`: Atomic leave resolution.
  - `POST /api/v1/hrms/payroll/runs`: Draft payroll preparation.
  - `POST /api/v1/hrms/payroll/runs/:id/finalize`: Locking payroll against edits.
  - `GET /api/v1/hrms/payslips/:id`: Structured payslip data retrieval.
  - `POST /api/v1/hrms/employees/:id/offboarding`: Controlled offboarding workflow.

- [ ] **Step 1: Write the failing test for HRMS endpoints**
Create `apps/api/src/tests/testHrmsEndpointsSuite.js` verifying:
  - `GET /api/v1/hrms/dashboard` returns 200 with metrics.
  - `GET /api/v1/hrms/departments` returns department list and `POST` creates a department.
  - `GET /api/v1/hrms/shifts` returns shift list and `POST` creates a shift.
  - `POST /api/v1/hrms/leaves/:id/approve` approves leave and deducts balance; double approval is rejected.
  - `POST /api/v1/hrms/leaves/:id/reject` records rejection reason.
  - `POST /api/v1/hrms/payroll/runs` generates draft; `POST /api/v1/hrms/payroll/runs/:id/finalize` locks it.
  - `GET /api/v1/hrms/payslips/:id` returns payslip calculations.

- [ ] **Step 2: Run test to verify it fails**
Run: `node apps/api/src/tests/testHrmsEndpointsSuite.js`
Expected: FAIL on missing endpoints.

- [ ] **Step 3: Implement missing HRMS controllers and routes**
In `hrms.controller.js`:
  - Implement `getHrmsDashboard`.
  - Implement `getDepartments` and `createDepartment`.
  - Implement `getShifts` and `createShift`.
  - Implement `approveLeaveRequest` and `rejectLeaveRequest`.
  - Implement `preparePayrollRun` and `finalizePayrollRun`.
  - Implement `getPayslipById`.
In `hrms.routes.js`:
  - Register all endpoints with appropriate RBAC guards (`requireRole`).

- [ ] **Step 4: Run test to verify it passes**
Run: `node apps/api/src/tests/testHrmsEndpointsSuite.js`
Expected: PASS.

- [ ] **Step 5: Commit changes**
```bash
git add apps/api/src/modules/hrms apps/api/src/tests/testHrmsEndpointsSuite.js
git commit -m "feat(hrms): complete HRMS dashboard, shifts, departments, leave decisions, and payslips"
```

---

### Task 3: Update Frontend CRM Workspace (`CrmExactTab.tsx`)

**Files:**
- Modify: `src/components/dashboard/admin/CrmExactTab.tsx`
- Modify: `src/app/admin/crm/page.tsx`

**Interfaces:**
- Consumes: `/api/v1/crm/stages`, `/api/v1/crm/leads`, `/api/v1/crm/leads/:id/status`, `/api/v1/crm/leads/:id/mark-lost`, `/api/v1/crm/follow-ups`.
- Produces: Clean 5-column Kanban board (`New`, `Contacted`, `Qualified`, `Converted`, `Lost`), with real-time status transitions, lost-reason modal prompt, follow-up scheduler, and transactional conversion.

- [ ] **Step 1: Update TypeScript types and canonical stage definitions**
In `CrmExactTab.tsx`:
  - Update `CrmLead['status']` to strictly `'new' | 'contacted' | 'qualified' | 'converted' | 'lost'`.
  - Set canonical columns to strictly the 5 stages.

- [ ] **Step 2: Connect status change and lost-reason workflows**
  - Connect column move / status dropdown to `PATCH /api/v1/crm/leads/:id/status`.
  - When user moves lead to `lost`, trigger modal requiring `lostReason` before submitting to `POST /api/v1/crm/leads/:id/mark-lost`.
  - Ensure re-opening moves the lead to `contacted`.

- [ ] **Step 3: Verify build and component compilation**
Run: `npx eslint src/components/dashboard/admin/CrmExactTab.tsx`
Verify zero syntax or linting errors.

- [ ] **Step 4: Commit changes**
```bash
git add src/components/dashboard/admin/CrmExactTab.tsx src/app/admin/crm/page.tsx
git commit -m "feat(ui-crm): align CRM Kanban and status transitions to 5 canonical stages"
```

---

### Task 4: Update Frontend HRMS Workspace (`HrmsTab.tsx`)

**Files:**
- Modify: `src/components/dashboard/admin/HrmsTab.tsx`

**Interfaces:**
- Consumes: `/api/v1/hrms/dashboard`, `/api/v1/hrms/employees`, `/api/v1/hrms/attendance`, `/api/v1/hrms/leaves/:id/approve`, `/api/v1/hrms/payroll/runs`, `/api/v1/hrms/payslips/:id`.
- Produces: Full interactive HR suite with real-time dashboard stats, live punch in/out, leave approve/reject actions, payslip preview modal with print capability, and shift/department selectors.

- [ ] **Step 1: Enhance Leave Management in HrmsTab**
  - Add explicit "Approve" and "Reject" buttons on each pending leave request calling `POST /api/v1/hrms/leaves/:id/approve` and `POST /api/v1/hrms/leaves/:id/reject`.
  - Display updated balances immediately upon approval.

- [ ] **Step 2: Enhance Payroll & Payslip View in HrmsTab**
  - Add "Generate Payroll Run" button calling `POST /api/v1/hrms/payroll/runs`.
  - Add "Finalize & Lock" button for authorized roles (`owner`, `admin`, `finance`).
  - Add "View Payslip" action opening a clean printable payslip modal fetching `/api/v1/hrms/payslips/:id`.

- [ ] **Step 3: Add Department & Shift Roster Views**
  - Display configured shifts (Morning, General, Evening, Night) and departments.

- [ ] **Step 4: Verify build and component compilation**
Run: `npx eslint src/components/dashboard/admin/HrmsTab.tsx`
Verify zero syntax or linting errors.

- [ ] **Step 5: Commit changes**
```bash
git add src/components/dashboard/admin/HrmsTab.tsx
git commit -m "feat(ui-hrms): add interactive leave decisions, payroll finalization, and payslip preview"
```

---

### Task 5: Master Verification & End-to-End Regression Testing

**Files:**
- Modify: `apps/api/src/tests/runTests.js`
- Test: All suites in `apps/api/src/tests/`
- Browser: Verify UI in browser at `http://localhost:3000/admin/dashboard`

- [ ] **Step 1: Run comprehensive test suites**
Run:
  - `node apps/api/src/tests/testCrm5StagePipeline.js`
  - `node apps/api/src/tests/testHrmsEndpointsSuite.js`
  - `npm run test:api`
  - `npm run test:seed`
  - `npm run test:master`
  - `npm run test:integrations`
  - `npm run test:integration`
Verify 100% of tests pass against the live database.

- [ ] **Step 2: Run frontend build check**
Run: `npm run build` or `npx next build`
Verify clean production build without errors.

- [ ] **Step 3: Verify Admin Dashboard in Browser**
Use browser tool to navigate to `http://localhost:3000/admin/dashboard`, log in as admin, switch between Overview, CRM, HRMS, and Billing tabs, and confirm that all metrics, tables, and actions work seamlessly.

- [ ] **Step 4: Commit and finalize**
```bash
git add .
git commit -m "feat: complete TriGyna Admin Dashboard, 5-stage CRM, and HRMS system"
```
