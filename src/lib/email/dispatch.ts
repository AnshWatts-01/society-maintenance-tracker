import { prisma } from "@/lib/db/prisma";
import { sendViaResend } from "@/lib/email/resendClient";
import { statusChangeEmail, importantNoticeEmail } from "@/lib/email/templates";
import { NOTIFICATION_MAX_ATTEMPTS, PENDING_STALE_AFTER_MS } from "@/lib/utils/constants";
import type { ComplaintStatus, NotificationType } from "@prisma/client";

/**
 * Every send attempt — success or failure — is durably recorded first. This
 * decouples "the domain event happened" (status changed / notice posted)
 * from "the email provider accepted it": a Resend outage never loses the
 * fact that a notification was owed, it just leaves a FAILED row behind for
 * the scheduled sweep (see retryFailedNotifications) to retry with backoff
 * up to NOTIFICATION_MAX_ATTEMPTS.
 */
async function attemptSend(params: {
  type: NotificationType;
  to: string;
  subject: string;
  html: string;
  relatedComplaintId?: string;
  relatedNoticeId?: string;
}) {
  const log = await prisma.notificationLog.create({
    data: {
      type: params.type,
      recipientEmail: params.to,
      subject: params.subject,
      bodyHtml: params.html,
      relatedComplaintId: params.relatedComplaintId,
      relatedNoticeId: params.relatedNoticeId,
      status: "PENDING",
    },
  });

  try {
    await sendViaResend({ to: params.to, subject: params.subject, html: params.html });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "SENT", attempts: { increment: 1 } },
    });
  } catch (error) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export async function dispatchStatusChangeEmail(
  complaintId: string,
  previousStatus: ComplaintStatus,
  newStatus: ComplaintStatus
): Promise<void> {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { resident: { select: { name: true, email: true } } },
  });
  if (!complaint) return;

  const latestHistory = await prisma.complaintStatusHistory.findFirst({
    where: { complaintId, newStatus },
    orderBy: { createdAt: "desc" },
  });

  const { subject, html } = statusChangeEmail({
    residentName: complaint.resident.name,
    complaintId: complaint.id,
    category: complaint.category,
    previousStatus,
    newStatus,
    note: latestHistory?.note,
  });

  await attemptSend({
    type: "STATUS_CHANGE",
    to: complaint.resident.email,
    subject,
    html,
    relatedComplaintId: complaint.id,
  });
}

export async function dispatchImportantNoticeEmail(noticeId: string): Promise<void> {
  const notice = await prisma.notice.findUnique({ where: { id: noticeId } });
  if (!notice) return;

  const residents = await prisma.user.findMany({
    where: { role: "RESIDENT" },
    select: { name: true, email: true },
  });

  for (const resident of residents) {
    const { subject, html } = importantNoticeEmail({
      residentName: resident.name,
      title: notice.title,
      body: notice.body,
    });
    await attemptSend({
      type: "IMPORTANT_NOTICE",
      to: resident.email,
      subject,
      html,
      relatedNoticeId: notice.id,
    });
  }
}

/**
 * Scheduled retry pass. Picks up two kinds of stragglers:
 *  - FAILED rows that still have attempts budget left, and
 *  - PENDING rows older than the stale window — a row is only left PENDING
 *    if the process died between writing the log and recording an outcome,
 *    so anything older than that window is orphaned, not in flight.
 */
export async function retryFailedNotifications(): Promise<{ retried: number; nowSent: number }> {
  const staleBefore = new Date(Date.now() - PENDING_STALE_AFTER_MS);

  const candidates = await prisma.notificationLog.findMany({
    where: {
      attempts: { lt: NOTIFICATION_MAX_ATTEMPTS },
      OR: [{ status: "FAILED" }, { status: "PENDING", createdAt: { lt: staleBefore } }],
    },
    take: 50,
  });

  let nowSent = 0;
  for (const candidate of candidates) {
    try {
      await sendViaResend({
        to: candidate.recipientEmail,
        subject: candidate.subject,
        html: candidate.bodyHtml,
      });
      await prisma.notificationLog.update({
        where: { id: candidate.id },
        data: { status: "SENT", attempts: { increment: 1 } },
      });
      nowSent += 1;
    } catch (error) {
      await prisma.notificationLog.update({
        where: { id: candidate.id },
        data: {
          status: "FAILED",
          attempts: { increment: 1 },
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  return { retried: candidates.length, nowSent };
}
