export type Role = "RESIDENT" | "ADMIN";
export type ComplaintCategory =
  | "PLUMBING"
  | "ELECTRICAL"
  | "CARPENTRY"
  | "COMMON_AREA"
  | "HVAC"
  | "SECURITY"
  | "OTHER";
export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  flatNumber: string | null;
  phone?: string | null;
}

export interface ComplaintResident {
  id: string;
  name: string;
  flatNumber: string | null;
  email: string;
}

export interface Complaint {
  id: string;
  residentId: string;
  resident?: ComplaintResident;
  category: ComplaintCategory;
  description: string;
  photoUrl: string | null;
  status: ComplaintStatus;
  priority: PriorityLevel;
  isOverdue: boolean;
  overdueSince: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintHistoryEntry {
  id: string;
  previousStatus: ComplaintStatus | null;
  newStatus: ComplaintStatus;
  note: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: Role };
}

export interface ComplaintDetail extends Complaint {
  resident: ComplaintResident;
  history: ComplaintHistoryEntry[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  isImportant: boolean;
  createdAt: string;
  author: { name: string };
}

export interface DashboardAnalytics {
  totalComplaints: number;
  byStatus: Record<ComplaintStatus, number>;
  byCategory: Record<ComplaintCategory, number>;
  overdueCount: number;
}
