import { prisma } from "@/lib/db/prisma";
import { resweepOverdueFlags } from "@/lib/services/overdueService";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from "@/lib/utils/constants";

export interface DashboardAnalytics {
  totalComplaints: number;
  byStatus: Record<(typeof COMPLAINT_STATUSES)[number], number>;
  byCategory: Record<(typeof COMPLAINT_CATEGORIES)[number], number>;
  overdueCount: number;
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  // Resweep first so the counts below (and the overdue count in particular)
  // reflect reality even if the scheduled cron hasn't fired recently.
  await resweepOverdueFlags();

  const [statusGroups, categoryGroups, overdueCount, totalComplaints] = await Promise.all([
    prisma.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.complaint.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.complaint.count({ where: { isOverdue: true } }),
    prisma.complaint.count(),
  ]);

  const byStatus = Object.fromEntries(
    COMPLAINT_STATUSES.map((status) => [
      status,
      statusGroups.find((g) => g.status === status)?._count._all ?? 0,
    ])
  ) as DashboardAnalytics["byStatus"];

  const byCategory = Object.fromEntries(
    COMPLAINT_CATEGORIES.map((category) => [
      category,
      categoryGroups.find((g) => g.category === category)?._count._all ?? 0,
    ])
  ) as DashboardAnalytics["byCategory"];

  return { totalComplaints, byStatus, byCategory, overdueCount };
}
