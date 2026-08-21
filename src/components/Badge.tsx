import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/utils/constants";
import type { ComplaintCategory, ComplaintStatus, PriorityLevel } from "@/types";

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
};

const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

function baseBadge(className: string, label: string) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return baseBadge(STATUS_STYLES[status], STATUS_LABELS[status]);
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return baseBadge(PRIORITY_STYLES[priority], PRIORITY_LABELS[priority]);
}

export function CategoryBadge({ category }: { category: ComplaintCategory }) {
  return baseBadge("bg-slate-100 text-slate-700", CATEGORY_LABELS[category]);
}

export function OverdueBadge() {
  return baseBadge("bg-red-600 text-white", "Overdue");
}
