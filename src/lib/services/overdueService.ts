import { prisma } from "@/lib/db/prisma";
import { DEFAULT_OVERDUE_THRESHOLD_DAYS, OVERDUE_THRESHOLD_SETTING_KEY } from "@/lib/utils/constants";

export async function getOverdueThresholdDays(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: OVERDUE_THRESHOLD_SETTING_KEY },
  });
  const parsed = setting ? parseInt(setting.value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_OVERDUE_THRESHOLD_DAYS;
}

export async function setOverdueThresholdDays(days: number): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: OVERDUE_THRESHOLD_SETTING_KEY },
    create: { key: OVERDUE_THRESHOLD_SETTING_KEY, value: String(days) },
    update: { value: String(days) },
  });
}

/**
 * The "hybrid" half of the SLA engine that runs synchronously: two cheap,
 * indexed `updateMany` statements (using the `[status, createdAt]` and
 * `[isOverdue, createdAt]` indexes) that flip the persisted, indexed
 * `isOverdue` boolean to match reality right now. This is idempotent and
 * sub-millisecond on realistic data sizes, so it is safe to call inline
 * before every admin list/dashboard read (see complaints route + analytics
 * route) as well as from the scheduled cron sweep — whichever runs first
 * "wins," and the other is a cheap no-op. This is what keeps the persisted
 * flag correct even if the scheduled job is delayed or fails.
 */
export async function resweepOverdueFlags(): Promise<{ flagged: number; unflagged: number }> {
  const thresholdDays = await getOverdueThresholdDays();
  const thresholdDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);

  const [flagged, unflagged] = await prisma.$transaction([
    prisma.complaint.updateMany({
      where: {
        isOverdue: false,
        status: { not: "RESOLVED" },
        createdAt: { lt: thresholdDate },
      },
      data: { isOverdue: true, overdueSince: new Date() },
    }),
    prisma.complaint.updateMany({
      where: {
        isOverdue: true,
        OR: [{ status: "RESOLVED" }, { createdAt: { gte: thresholdDate } }],
      },
      data: { isOverdue: false, overdueSince: null },
    }),
  ]);

  return { flagged: flagged.count, unflagged: unflagged.count };
}
