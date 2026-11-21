/**
 * TriGyna Platform Canonical Consultation Constants & Enums
 * 100% Online Video Healthcare Architecture
 */

const CONSULTATION_MODE = {
  ONLINE_VIDEO: "Online Video Consultation",
  // Canonical slug / code
  ONLINE_VIDEO_CODE: "ONLINE_VIDEO",
};

const ALLOWED_CONSULTATION_MODES = [
  "Online Video Consultation",
  "ONLINE_VIDEO",
];

const VIDEO_PROVIDERS = {
  GOOGLE_MEET: "google_meet",
  ZOOM: "zoom",
  NONE: "none",
};

const ALLOWED_VIDEO_PROVIDERS = [
  "google_meet",
  "zoom",
  "none",
];

const MEETING_STATUSES = {
  PENDING: "pending",
  READY: "ready",
  INVALID: "invalid",
  UPDATED: "updated",
  EXPIRED: "expired",
};

const ALLOWED_MEETING_STATUSES = [
  "pending",
  "ready",
  "invalid",
  "updated",
  "expired",
];

const STAFF_ONBOARDING_ROLES = {
  DOCTOR: "doctor",
  SALES: "sales",
};

const ALLOWED_STAFF_ROLES = ["doctor", "sales"];

const ONBOARDING_STATUS = {
  PENDING: "PENDING",
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  INVITATION_QUEUED: "INVITATION_QUEUED",
  INVITATION_SENT: "INVITATION_SENT",
  ACTIVATION_PENDING: "ACTIVATION_PENDING",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  SUSPENDED: "SUSPENDED",
};

const ALLOWED_ONBOARDING_STATUSES = [
  "PENDING",
  "ACCOUNT_CREATED",
  "INVITATION_QUEUED",
  "INVITATION_SENT",
  "ACTIVATION_PENDING",
  "ACTIVE",
  "EXPIRED",
  "FAILED",
  "SUSPENDED",
];

const NOTIFICATION_DELIVERY_STATUS = {
  PENDING: "pending",
  QUEUED: "queued",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
  SKIPPED: "skipped",
};

const DOCTOR_VERIFICATION_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

/**
 * Validates Google Meet or Zoom URLs
 */
function isValidMeetingUrl(url, provider) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    if (provider === "google_meet" || provider === "GOOGLE_MEET") {
      return hostname === "meet.google.com" && parsed.pathname.length > 1;
    }

    if (provider === "zoom" || provider === "ZOOM") {
      return (hostname === "zoom.us" || hostname.endsWith(".zoom.us")) && (parsed.pathname.startsWith("/j/") || parsed.pathname.startsWith("/my/"));
    }

    // Generic fallback for accepted video providers
    if (hostname === "meet.google.com" || hostname.endsWith("zoom.us")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

module.exports = {
  CONSULTATION_MODE,
  ALLOWED_CONSULTATION_MODES,
  VIDEO_PROVIDERS,
  ALLOWED_VIDEO_PROVIDERS,
  MEETING_STATUSES,
  ALLOWED_MEETING_STATUSES,
  STAFF_ONBOARDING_ROLES,
  ALLOWED_STAFF_ROLES,
  ONBOARDING_STATUS,
  ALLOWED_ONBOARDING_STATUSES,
  NOTIFICATION_DELIVERY_STATUS,
  DOCTOR_VERIFICATION_STATUS,
  isValidMeetingUrl,
};
