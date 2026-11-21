/**
 * TriGyna Canonical Consultation Constants (Frontend)
 * Online-Only Healthcare Architecture
 */

export const CONSULTATION_MODE = {
  ONLINE_VIDEO: "Online Video Consultation",
  ONLINE_VIDEO_CODE: "ONLINE_VIDEO",
} as const;

export const VIDEO_PROVIDERS = {
  GOOGLE_MEET: "google_meet",
  ZOOM: "zoom",
  NONE: "none",
} as const;

export const VIDEO_PROVIDER_LABELS: Record<string, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  GOOGLE_MEET: "Google Meet",
  ZOOM: "Zoom",
  none: "None",
};

export const MEETING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Meeting Link Pending", color: "text-amber-700 bg-amber-50 border-amber-200" },
  ready: { label: "Meeting Ready", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  updated: { label: "Link Updated", color: "text-blue-700 bg-blue-50 border-blue-200" },
  invalid: { label: "Invalid Link", color: "text-red-700 bg-red-50 border-red-200" },
  expired: { label: "Meeting Expired", color: "text-neutral-600 bg-neutral-100 border-neutral-200" },
};

export const STAFF_ONBOARDING_ROLES = {
  DOCTOR: "doctor",
  SALES: "sales",
} as const;

export function isValidMeetingUrl(url: string, provider?: string): boolean {
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
    return hostname === "meet.google.com" || hostname.endsWith("zoom.us");
  } catch {
    return false;
  }
}
