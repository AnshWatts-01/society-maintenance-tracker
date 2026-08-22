import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/utils/constants";
import type { ComplaintCategory, ComplaintStatus, PriorityLevel } from "@/types";

const STATUS_STYLES: Record<ComplaintStatus, string> = {
  OPEN: "bg-amberEstate-50 text-amberEstate-700 ring-1 ring-inset ring-amberEstate-100",
  IN_PROGRESS: "bg-royal-50 text-royal-700 ring-1 ring-inset ring-royal-100",
  RESOLVED: "bg-moss-50 text-moss-700 ring-1 ring-inset ring-moss-100",
};

const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  LOW: "bg-paper-deep text-ink-mute ring-1 ring-inset ring-parch",
  MEDIUM: "bg-amberEstate-50 text-amberEstate-700 ring-1 ring-inset ring-amberEstate-100",
  HIGH: "bg-burgundy-50 text-burgundy-700 ring-1 ring-inset ring-burgundy-100",
};

const STATUS_DOTS: Record<ComplaintStatus, string> = {
  OPEN: "bg-amberEstate-600",
  IN_PROGRESS: "bg-royal-600",
  RESOLVED: "bg-moss-600",
};

function baseBadge(className: string, label: string, dotClass?: string) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors ${className}`}
    >
      {dotClass && <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />}
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return baseBadge(STATUS_STYLES[status], STATUS_LABELS[status], STATUS_DOTS[status]);
}

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  return baseBadge(PRIORITY_STYLES[priority], PRIORITY_LABELS[priority]);
}

export function CategoryBadge({ category }: { category: ComplaintCategory }) {
  return baseBadge("bg-white text-ink ring-1 ring-inset ring-parch", CATEGORY_LABELS[category]);
}

export function OverdueBadge() {
  return baseBadge("bg-burgundy-600 text-white shadow-sm", "Overdue");
}
