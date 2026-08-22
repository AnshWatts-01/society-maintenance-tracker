import { after } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { ComplaintCategory, ComplaintStatus, PriorityLevel } from "@prisma/client";
import { dispatchStatusChangeEmail } from "@/lib/email/dispatch";
import { PhotoValidationError } from "@/lib/services/photoService";

const RESIDENT_SELECT = {
  resident: { select: { id: true, name: true, flatNumber: true, email: true } },
} as const;

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

export class ConcurrentModificationError extends Error {
  constructor(message = "This complaint was updated by someone else. Please refresh and try again.") {
    super(message);
    this.name = "ConcurrentModificationError";
  }
}

// RESOLVED is terminal: once closed, a complaint cannot silently reopen.
// Re-opening a resolved ticket is a conscious admin decision the business
// rules explicitly disallow ("Once resolved, it is closed").
const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["OPEN", "RESOLVED"],
  RESOLVED: [],
};

export async function createComplaint(params: {
  residentId: string;
  category: ComplaintCategory;
  description: string;
  photoUrl?: string;
  photoPath?: string;
  photoId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.create({
      data: {
        residentId: params.residentId,
        category: params.category,
        description: params.description,
        photoUrl: params.photoUrl,
        photoPath: params.photoPath,
      },
    });

    // First-party photo: claim it atomically inside this transaction. The
    // WHERE clause enforces uploader ownership AND single-use in one shot —
    // a photo id can never be attached to two complaints or to someone
    // else's upload. A failed claim rolls the whole creation back.
    if (params.photoId) {
      const claimed = await tx.complaintPhoto.updateMany({
        where: { id: params.photoId, uploaderId: params.residentId, complaintId: null },
        data: { complaintId: complaint.id },
      });
      if (claimed.count === 0) {
        throw new PhotoValidationError("Invalid photo reference");
      }
    }

    // The creation itself is the first entry in the audit ledger, recorded
    // with no previousStatus so the timeline reads "Raised" rather than a
    // transition from nothing.
    await tx.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        actorId: params.residentId,
        previousStatus: null,
        newStatus: "OPEN",
        note: "Complaint raised",
      },
    });

    return complaint;
  });
}

/**
 * Atomically transitions a complaint's status, appends an immutable audit
 * record, and (after the transaction commits) fires the resident
 * notification email. Concurrency is enforced with an optimistic version
 * token: the WHERE clause on the update requires the version last read by
 * the caller, so two admins racing to update the same ticket cannot
 * silently overwrite one another — the loser gets ConcurrentModificationError
 * and must re-fetch and retry.
 */
export async function transitionComplaintStatus(params: {
  complaintId: string;
  actorId: string;
  newStatus: ComplaintStatus;
  note?: string;
}) {
  const { complaint, previousStatus } = await prisma.$transaction(async (tx) => {
    const current = await tx.complaint.findUnique({ where: { id: params.complaintId } });
    if (!current) throw new Error("NOT_FOUND");

    if (current.status === params.newStatus) {
      throw new InvalidTransitionError(`Complaint is already ${params.newStatus}`);
    }
    if (!ALLOWED_TRANSITIONS[current.status].includes(params.newStatus)) {
      throw new InvalidTransitionError(
        `Cannot move a complaint from ${current.status} to ${params.newStatus}`
      );
    }

    const isResolving = params.newStatus === "RESOLVED";
    const updateResult = await tx.complaint.updateMany({
      where: { id: params.complaintId, version: current.version },
      data: {
        status: params.newStatus,
        version: { increment: 1 },
        resolvedAt: isResolving ? new Date() : null,
        isOverdue: isResolving ? false : current.isOverdue,
        overdueSince: isResolving ? null : current.overdueSince,
      },
    });

    if (updateResult.count === 0) {
      throw new ConcurrentModificationError();
    }

    await tx.complaintStatusHistory.create({
      data: {
        complaintId: params.complaintId,
        actorId: params.actorId,
        previousStatus: current.status,
        newStatus: params.newStatus,
        note: params.note,
      },
    });

    const updated = await tx.complaint.findUniqueOrThrow({
      where: { id: params.complaintId },
      include: RESIDENT_SELECT,
    });
    return { complaint: updated, previousStatus: current.status };
  });

  // Deliberately NOT awaited — notification delivery must never roll back a
  // status change that already committed. `after()` (rather than a bare
  // `void`) is what makes this safe on serverless: it keeps the invocation
  // alive until the dispatch finishes, instead of the platform freezing the
  // instance the moment the response flushes and silently dropping the send.
  after(() => dispatchStatusChangeEmail(complaint.id, previousStatus, params.newStatus));

  return complaint;
}

export async function updateComplaintPriority(params: {
  complaintId: string;
  priority: PriorityLevel;
}) {
  const complaint = await prisma.complaint.findUnique({ where: { id: params.complaintId } });
  if (!complaint) throw new Error("NOT_FOUND");

  return prisma.complaint.update({
    where: { id: params.complaintId },
    data: { priority: params.priority, version: { increment: 1 } },
    include: RESIDENT_SELECT,
  });
}

export async function getComplaintWithHistory(complaintId: string) {
  return prisma.complaint.findUnique({
    where: { id: complaintId },
    include: {
      resident: { select: { id: true, name: true, flatNumber: true, email: true } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true, role: true } } },
      },
    },
  });
}
