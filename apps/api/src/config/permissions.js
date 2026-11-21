/**
 * TriGyna Enterprise Granular Permissions Catalogue & Policy Engine
 * Supports standard RBAC (Role-Based Access Control) + ABAC (Attribute-Based Access Control)
 * with per-user custom grants and explicit denials.
 */

const PERMISSIONS = {
  // 1. User & Access Control
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_STATUS: "users.status",
  USERS_ROLES: "users.roles",
  USERS_PERMISSIONS: "users.permissions",
  USERS_SESSIONS_REVOKE: "users.sessions.revoke",
  AUDIT_VIEW: "audit.view",

  // 2. Doctor Management
  DOCTORS_VIEW: "doctors.view",
  DOCTORS_CREATE: "doctors.create",
  DOCTORS_VERIFY: "doctors.verify",
  DOCTORS_STATUS: "doctors.status",
  DOCTORS_ASSIGN_SERVICES: "doctors.assign_services",
  DOCTORS_SCHEDULE: "doctors.schedule",
  DOCTORS_LEAVE_MANAGE: "doctors.leave_manage",

  // 3. Sales & CRM Management
  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_MANAGE: "sales.manage",
  LEADS_VIEW_ALL: "leads.view_all",
  LEADS_VIEW_ASSIGNED: "leads.view_assigned",
  LEADS_CREATE: "leads.create",
  LEADS_EDIT_ASSIGNED: "leads.edit_assigned",
  LEADS_ASSIGN: "leads.assign",
  LEADS_REASSIGN: "leads.reassign",
  LEADS_DELETE: "leads.delete",
  DISCOUNTS_APPROVE: "discounts.approve",
  CRM_MANAGE: "crm.manage",
  CRM_FOLLOWUPS_MANAGE: "crm.followups.manage",

  // 4. Patient Directory & Privacy
  PATIENTS_VIEW_ALL: "patients.view_all",
  PATIENTS_VIEW_ASSIGNED: "patients.view_assigned",
  PATIENTS_CREATE: "patients.create",
  PATIENTS_EDIT: "patients.edit",
  PATIENTS_STATUS: "patients.status",
  PATIENTS_DUPLICATES: "patients.duplicates",
  PATIENTS_MERGE: "patients.merge",
  PATIENTS_DELETE: "patients.delete",
  CLINICAL_AUDIT_VIEW: "clinical.audit.view",

  // 5. Clinical Operations & EHR
  CLINICAL_CONSULTATIONS_READ_ASSIGNED: "clinical.consultations.read_assigned",
  CLINICAL_CONSULTATIONS_WRITE_ASSIGNED: "clinical.consultations.write_assigned",
  CLINICAL_CONSULTATIONS_FINALIZE: "clinical.consultations.finalize",
  CLINICAL_CONSULTATIONS_AMEND: "clinical.consultations.amend",
  CLINICAL_PRESCRIPTIONS_CREATE: "clinical.prescriptions.create",
  CLINICAL_PRESCRIPTIONS_SIGN: "clinical.prescriptions.sign",
  CLINICAL_PRESCRIPTIONS_AMEND: "clinical.prescriptions.amend",
  CLINICAL_PRESCRIPTIONS_READ_ASSIGNED: "clinical.prescriptions.read_assigned",
  CLINICAL_TREATMENT_PLANS_MANAGE: "clinical.treatment_plans.manage",
  CLINICAL_OVERSIGHT_VIEW: "clinical.oversight.view",

  // 6. Appointments & Scheduling
  APPOINTMENTS_VIEW_ALL: "appointments.view_all",
  APPOINTMENTS_VIEW_ASSIGNED: "appointments.view_assigned",
  APPOINTMENTS_BOOK: "appointments.book",
  APPOINTMENTS_RESCHEDULE: "appointments.reschedule",
  APPOINTMENTS_CANCEL: "appointments.cancel",
  APPOINTMENTS_AVAILABILITY_MANAGE: "appointments.availability.manage",

  // 7. Financial & Billing Operations
  BILLING_VIEW_ALL: "billing.view_all",
  BILLING_VIEW_ASSIGNED: "billing.view_assigned",
  BILLING_INVOICES_CREATE: "billing.invoices.create",
  BILLING_PAYMENT_LINKS_CREATE: "billing.payment_links.create",
  BILLING_REFUND_APPROVE: "billing.refund.approve",
  BILLING_CREDIT_NOTES_APPROVE: "billing.credit_notes.approve",
  BILLING_PRICING_MANAGE: "billing.pricing.manage",
  FINANCIAL_AUDIT: "financial.audit",

  // 8. Integrations & System Settings
  INTEGRATIONS_MANAGE: "integrations.manage",
  SYSTEM_LOGS_VIEW: "system.logs.view",
  SYSTEM_SETTINGS_MANAGE: "system.settings.manage",

  // 9. Patient Portal Self-Service
  PATIENT_PROFILE_READ_OWN: "patient.profile.read_own",
  PATIENT_PROFILE_UPDATE_OWN: "patient.profile.update_own",
  PATIENT_APPOINTMENTS_READ_OWN: "patient.appointments.read_own",
  PATIENT_APPOINTMENTS_BOOK_OWN: "patient.appointments.book_own",
  PATIENT_APPOINTMENTS_CANCEL_OWN: "patient.appointments.cancel_own",
  PATIENT_CLINICAL_READ_OWN_FINALIZED: "patient.clinical.read_own_finalized",
  PATIENT_BILLING_READ_OWN: "patient.billing.read_own",
};

/**
 * Default permission sets assigned to system roles
 */
const ROLE_PERMISSIONS = {
  owner: ["*"], // Wildcard: Full, unrestricted permissions across all organizational entities
  super_admin: ["*"],

  admin: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_STATUS,
    PERMISSIONS.USERS_ROLES,
    PERMISSIONS.USERS_PERMISSIONS,
    PERMISSIONS.USERS_SESSIONS_REVOKE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.DOCTORS_VIEW,
    PERMISSIONS.DOCTORS_CREATE,
    PERMISSIONS.DOCTORS_VERIFY,
    PERMISSIONS.DOCTORS_STATUS,
    PERMISSIONS.DOCTORS_ASSIGN_SERVICES,
    PERMISSIONS.DOCTORS_SCHEDULE,
    PERMISSIONS.DOCTORS_LEAVE_MANAGE,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_MANAGE,
    PERMISSIONS.LEADS_VIEW_ALL,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.LEADS_REASSIGN,
    PERMISSIONS.LEADS_DELETE,
    PERMISSIONS.DISCOUNTS_APPROVE,
    PERMISSIONS.CRM_MANAGE,
    PERMISSIONS.CRM_FOLLOWUPS_MANAGE,
    PERMISSIONS.PATIENTS_VIEW_ALL,
    PERMISSIONS.PATIENTS_CREATE,
    PERMISSIONS.PATIENTS_EDIT,
    PERMISSIONS.PATIENTS_STATUS,
    PERMISSIONS.PATIENTS_DUPLICATES,
    PERMISSIONS.PATIENTS_MERGE,
    PERMISSIONS.PATIENTS_DELETE,
    PERMISSIONS.CLINICAL_AUDIT_VIEW,
    PERMISSIONS.CLINICAL_OVERSIGHT_VIEW,
    PERMISSIONS.APPOINTMENTS_VIEW_ALL,
    PERMISSIONS.APPOINTMENTS_BOOK,
    PERMISSIONS.APPOINTMENTS_RESCHEDULE,
    PERMISSIONS.APPOINTMENTS_CANCEL,
    PERMISSIONS.APPOINTMENTS_AVAILABILITY_MANAGE,
    PERMISSIONS.BILLING_VIEW_ALL,
    PERMISSIONS.BILLING_INVOICES_CREATE,
    PERMISSIONS.BILLING_PAYMENT_LINKS_CREATE,
    PERMISSIONS.BILLING_REFUND_APPROVE,
    PERMISSIONS.BILLING_CREDIT_NOTES_APPROVE,
    PERMISSIONS.BILLING_PRICING_MANAGE,
    PERMISSIONS.FINANCIAL_AUDIT,
    PERMISSIONS.INTEGRATIONS_MANAGE,
    PERMISSIONS.SYSTEM_LOGS_VIEW,
    PERMISSIONS.SYSTEM_SETTINGS_MANAGE,
  ],

  doctor: [
    PERMISSIONS.DOCTORS_VIEW,
    PERMISSIONS.DOCTORS_SCHEDULE,
    PERMISSIONS.PATIENTS_VIEW_ASSIGNED,
    PERMISSIONS.CLINICAL_CONSULTATIONS_READ_ASSIGNED,
    PERMISSIONS.CLINICAL_CONSULTATIONS_WRITE_ASSIGNED,
    PERMISSIONS.CLINICAL_CONSULTATIONS_FINALIZE,
    PERMISSIONS.CLINICAL_CONSULTATIONS_AMEND,
    PERMISSIONS.CLINICAL_PRESCRIPTIONS_CREATE,
    PERMISSIONS.CLINICAL_PRESCRIPTIONS_SIGN,
    PERMISSIONS.CLINICAL_PRESCRIPTIONS_AMEND,
    PERMISSIONS.CLINICAL_PRESCRIPTIONS_READ_ASSIGNED,
    PERMISSIONS.CLINICAL_TREATMENT_PLANS_MANAGE,
    PERMISSIONS.APPOINTMENTS_VIEW_ASSIGNED,
    PERMISSIONS.APPOINTMENTS_AVAILABILITY_MANAGE,
    PERMISSIONS.BILLING_VIEW_ASSIGNED,
  ],

  sales: [
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.LEADS_VIEW_ASSIGNED,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_EDIT_ASSIGNED,
    PERMISSIONS.CRM_FOLLOWUPS_MANAGE,
    PERMISSIONS.BILLING_PAYMENT_LINKS_CREATE,
    PERMISSIONS.APPOINTMENTS_BOOK,
    PERMISSIONS.APPOINTMENTS_VIEW_ASSIGNED,
  ],

  crm: [
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.LEADS_VIEW_ASSIGNED,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_EDIT_ASSIGNED,
    PERMISSIONS.CRM_FOLLOWUPS_MANAGE,
    PERMISSIONS.BILLING_PAYMENT_LINKS_CREATE,
    PERMISSIONS.APPOINTMENTS_BOOK,
    PERMISSIONS.APPOINTMENTS_VIEW_ASSIGNED,
  ],

  reception: [
    PERMISSIONS.PATIENTS_VIEW_ALL,
    PERMISSIONS.PATIENTS_CREATE,
    PERMISSIONS.PATIENTS_EDIT,
    PERMISSIONS.APPOINTMENTS_VIEW_ALL,
    PERMISSIONS.APPOINTMENTS_BOOK,
    PERMISSIONS.APPOINTMENTS_RESCHEDULE,
    PERMISSIONS.APPOINTMENTS_CANCEL,
    PERMISSIONS.BILLING_VIEW_ALL,
    PERMISSIONS.BILLING_INVOICES_CREATE,
    PERMISSIONS.BILLING_PAYMENT_LINKS_CREATE,
  ],

  hrms: [
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.DOCTORS_VIEW,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.DOCTORS_LEAVE_MANAGE,
  ],

  patient: [
    PERMISSIONS.PATIENT_PROFILE_READ_OWN,
    PERMISSIONS.PATIENT_PROFILE_UPDATE_OWN,
    PERMISSIONS.PATIENT_APPOINTMENTS_READ_OWN,
    PERMISSIONS.PATIENT_APPOINTMENTS_BOOK_OWN,
    PERMISSIONS.PATIENT_APPOINTMENTS_CANCEL_OWN,
    PERMISSIONS.PATIENT_CLINICAL_READ_OWN_FINALIZED,
    PERMISSIONS.PATIENT_BILLING_READ_OWN,
  ],
};

/**
 * Evaluate if a given user holds a specific permission key.
 * Evaluates: Role wildcard -> Explicit Denials -> Explicit Custom Grants -> Role Defaults
 *
 * @param {Object} user - User object (from req.user or database)
 * @param {string} permissionKey - Key defined in PERMISSIONS
 * @returns {boolean}
 */
function hasPermission(user, permissionKey) {
  if (!user || !user.role) return false;

  const role = user.role;

  // 1. Owner & Super Admin carry universal wildcard clearance
  if (role === "owner" || role === "super_admin") {
    return true;
  }

  // 2. Explicit per-user denial overrides everything else
  if (Array.isArray(user.deniedPermissions) && user.deniedPermissions.includes(permissionKey)) {
    return false;
  }

  // 3. Explicit per-user custom grant
  if (Array.isArray(user.customPermissions) && user.customPermissions.includes(permissionKey)) {
    return true;
  }

  // 4. Role default permissions
  const normalizedRole = role === "crm" ? "sales" : role;
  const rolePerms = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS[role] || [];

  if (rolePerms.includes("*") || rolePerms.includes(permissionKey)) {
    return true;
  }

  return false;
}

/**
 * Returns all calculated effective permissions for a user
 * @param {Object} user
 * @returns {string[]}
 */
function getEffectivePermissions(user) {
  if (!user || !user.role) return [];
  if (user.role === "owner" || user.role === "super_admin") {
    return Object.values(PERMISSIONS);
  }

  const normalizedRole = user.role === "crm" ? "sales" : user.role;
  const defaults = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS[user.role] || [];
  const custom = user.customPermissions || [];
  const denied = new Set(user.deniedPermissions || []);

  const combined = new Set([...defaults, ...custom]);
  return Array.from(combined).filter((p) => !denied.has(p));
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getEffectivePermissions,
};
