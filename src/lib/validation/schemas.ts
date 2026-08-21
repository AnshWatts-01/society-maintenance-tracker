import { z } from "zod";
import { ALLOWED_PHOTO_MIME_TYPES, COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, PRIORITY_LEVELS } from "@/lib/utils/constants";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  flatNumber: z.string().trim().min(1, "Flat number is required").max(20),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const createComplaintSchema = z.object({
  category: z.enum(COMPLAINT_CATEGORIES),
  // HTML-sanitized on the server (see lib/utils/sanitize.ts) — this only
  // bounds length and strips control characters at the schema layer.
  description: z
    .string()
    .trim()
    .min(10, "Please describe the issue in at least 10 characters")
    .max(2000, "Description is too long"),
  // Only the storage path is accepted. The displayable URL is derived from
  // it server-side, so a client cannot point a complaint's photo at an
  // arbitrary third-party origin (which would turn every admin viewing the
  // ticket into a tracking beacon for whoever controls that host).
  photoPath: z.string().max(500).optional(),
});
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const listComplaintsQuerySchema = z.object({
  status: z.enum(COMPLAINT_STATUSES).optional(),
  category: z.enum(COMPLAINT_CATEGORIES).optional(),
  priority: z.enum(PRIORITY_LEVELS).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  // NOT z.coerce.boolean(): that applies JS `Boolean()`, and every non-empty
  // query string is truthy — so `?overdueOnly=false` would filter to
  // overdue-only, the exact opposite of what was asked.
  overdueOnly: z
    .enum(["true", "false", "1", "0"])
    .transform((value) => value === "true" || value === "1")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListComplaintsQuery = z.infer<typeof listComplaintsQuerySchema>;

export const updateStatusSchema = z.object({
  status: z.enum(COMPLAINT_STATUSES),
  note: z.string().trim().max(1000).optional(),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const updatePrioritySchema = z.object({
  priority: z.enum(PRIORITY_LEVELS),
});
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>;

export const createNoticeSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(150),
  body: z.string().trim().min(3, "Body is too short").max(5000),
  isImportant: z.boolean().default(false),
});
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;

export const updateSettingSchema = z.object({
  overdueThresholdDays: z.coerce.number().int().min(1).max(365),
});
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;

export const signUploadUrlSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_PHOTO_MIME_TYPES),
  fileSizeBytes: z.number().int().positive(),
});
export type SignUploadUrlInput = z.infer<typeof signUploadUrlSchema>;
