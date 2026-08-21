import { after } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { dispatchImportantNoticeEmail } from "@/lib/email/dispatch";

export async function createNotice(params: {
  authorId: string;
  title: string;
  body: string;
  isImportant: boolean;
}) {
  const notice = await prisma.notice.create({ data: params });

  if (notice.isImportant) {
    // Fanned out after the notice is durably created, via `after()` so the
    // serverless instance stays alive for the broadcast instead of being
    // frozen when the response flushes. Each recipient's attempt is logged
    // individually, so one bad address never blocks delivery to the rest.
    after(() => dispatchImportantNoticeEmail(notice.id));
  }

  return notice;
}

/** Important notices are permanently pinned above the chronological feed. */
export async function listNotices(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.notice.findMany({
      orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { author: { select: { name: true } } },
    }),
    prisma.notice.count(),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
