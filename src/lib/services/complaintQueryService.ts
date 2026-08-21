import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { resweepOverdueFlags } from "@/lib/services/overdueService";
import type { ListComplaintsQuery } from "@/lib/validation/schemas";

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function buildWhere(
  filters: Pick<ListComplaintsQuery, "status" | "category" | "priority" | "dateFrom" | "dateTo" | "overdueOnly">,
  residentId?: string
): Prisma.ComplaintWhereInput {
  const where: Prisma.ComplaintWhereInput = {};
  if (residentId) where.residentId = residentId;
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.priority) where.priority = filters.priority;
  if (filters.overdueOnly) where.isOverdue = true;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
    };
  }
  return where;
}

/**
 * Admin queue ordering, entirely in the database so it is correct across
 * page boundaries rather than only within a page:
 *   1. overdue first   — the SLA breach is the headline
 *   2. HIGH before LOW — Postgres orders an enum by its declaration order,
 *      and PriorityLevel is declared LOW, MEDIUM, HIGH, so `desc` yields
 *      HIGH → MEDIUM → LOW natively. No raw SQL, no in-memory re-sort.
 *   3. oldest first    — nothing quietly ages past its neighbors.
 */
export async function listComplaintsForAdmin(query: ListComplaintsQuery) {
  await resweepOverdueFlags();

  const where = buildWhere(query);

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      include: { resident: { select: { id: true, name: true, flatNumber: true, email: true } } },
      orderBy: [{ isOverdue: "desc" }, { priority: "desc" }, { createdAt: "asc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.complaint.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function listComplaintsForResident(residentId: string, query: ListComplaintsQuery) {
  const where = buildWhere(query, residentId);

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.complaint.count({ where }),
  ]);

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
