export const COMPLAINT_CATEGORIES = [
  "PLUMBING",
  "ELECTRICAL",
  "CARPENTRY",
  "COMMON_AREA",
  "HVAC",
  "SECURITY",
  "OTHER",
] as const;

export const COMPLAINT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;

export const DEFAULT_OVERDUE_THRESHOLD_DAYS = 3;
export const OVERDUE_THRESHOLD_SETTING_KEY = "overdue_threshold_days";

export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const NOTIFICATION_MAX_ATTEMPTS = 5;
/** A NotificationLog row still PENDING after this long was orphaned mid-send. */
export const PENDING_STALE_AFTER_MS = 10 * 60 * 1000;

export const CATEGORY_LABELS: Record<(typeof COMPLAINT_CATEGORIES)[number], string> = {
  PLUMBING: "Plumbing",
  ELECTRICAL: "Electrical",
  CARPENTRY: "Carpentry",
  COMMON_AREA: "Common Area",
  HVAC: "HVAC",
  SECURITY: "Security",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<(typeof COMPLAINT_STATUSES)[number], string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
};

export const PRIORITY_LABELS: Record<(typeof PRIORITY_LEVELS)[number], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};
