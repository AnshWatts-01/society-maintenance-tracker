"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { startOfLocalDay, endOfLocalDay } from "@/lib/utils/dateRange";
import { CategoryBadge, OverdueBadge, PriorityBadge, StatusBadge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { StatusUpdateModal } from "@/components/StatusUpdateModal";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  PRIORITY_LEVELS,
  CATEGORY_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/utils/constants";
import type { Complaint, PaginatedResult } from "@/types";

export default function AdminComplaintsPage() {
  const [result, setResult] = useState<PaginatedResult<Complaint> | null>(null);
  const [filters, setFilters] = useState({ status: "", category: "", priority: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalComplaint, setModalComplaint] = useState<Complaint | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "15" });
      Object.entries(filters).forEach(([key, value]) => {
        if (!value) return;
        if (key === "dateFrom") params.set(key, startOfLocalDay(value));
        else if (key === "dateTo") params.set(key, endOfLocalDay(value));
        else params.set(key, value);
      });
      const data = await apiFetch<PaginatedResult<Complaint>>(`/api/complaints?${params.toString()}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load complaints.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePriorityChange(complaint: Complaint, priority: string) {
    setError(null);
    try {
      const { complaint: updated } = await apiFetch<{ complaint: Complaint }>(
        `/api/complaints/${complaint.id}/priority`,
        { method: "PATCH", body: JSON.stringify({ priority }) }
      );
      setResult((prev) =>
        prev ? { ...prev, items: prev.items.map((c) => (c.id === updated.id ? updated : c)) } : prev
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update priority.");
    }
  }

  return (
    <div>
      <p className="eyebrow">Command center</p>
      <h1 className="page-title mt-1">Complaint Management</h1>
      <div className="title-rule" />
      <p className="page-sub">Overdue complaints are automatically pinned to the top.</p>

      <div className="card mt-6 flex flex-wrap gap-3 p-4">
        <select className="input max-w-[160px]" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
          <option value="">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="input max-w-[170px]" value={filters.category} onChange={(e) => updateFilter("category", e.target.value)}>
          <option value="">All categories</option>
          {COMPLAINT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select className="input max-w-[150px]" value={filters.priority} onChange={(e) => updateFilter("priority", e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITY_LEVELS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </select>
        <input type="date" className="input max-w-[160px]" value={filters.dateFrom} onChange={(e) => updateFilter("dateFrom", e.target.value)} />
        <input type="date" className="input max-w-[160px]" value={filters.dateTo} onChange={(e) => updateFilter("dateTo", e.target.value)} />
      </div>

      {error && (
        <p className="alert-error mt-4">{error}</p>
      )}

      <div className="card mt-6 overflow-x-auto">
        {loading && (
          <div className="space-y-3 p-6">
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </div>
        )}
        {!loading && result?.items.length === 0 && (
          <div className="p-10 text-center">
            <span className="mx-auto flex h-10 w-10 rotate-45 items-center justify-center rounded-lg border border-parch bg-white">
              <span className="-rotate-45 text-gold-600">◆</span>
            </span>
            <p className="mt-4 text-sm text-ink-mute">No complaints match these filters.</p>
          </div>
        )}
        {!loading && result && result.items.length > 0 && (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-parch">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Complaint</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Resident</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Priority</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">Raised</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-parch">
              {result.items.map((complaint) => (
                <tr
                  key={complaint.id}
                  className={
                    complaint.isOverdue
                      ? "border-l-2 border-l-burgundy-600 bg-burgundy-50/40 transition-colors hover:bg-paper"
                      : "border-l-2 border-l-transparent transition-colors hover:border-l-gold-500 hover:bg-paper"
                  }
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={complaint.category} />
                      {complaint.isOverdue && <OverdueBadge />}
                    </div>
                    <Link
                      href={`/admin/complaints/${complaint.id}`}
                      className="mt-1 block line-clamp-1 max-w-xs text-ink transition-colors hover:text-royal-700 hover:underline"
                    >
                      {complaint.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-mute">
                    {complaint.resident?.name}
                    <div className="text-xs text-ink-mute">Flat {complaint.resident?.flatNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="input max-w-[120px] py-1"
                      value={complaint.priority}
                      onChange={(e) => handlePriorityChange(complaint, e.target.value)}
                      disabled={complaint.status === "RESOLVED"}
                    >
                      {PRIORITY_LEVELS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={complaint.status} /></td>
                  <td className="px-4 py-3 text-xs text-ink-mute">
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setModalComplaint(complaint)}
                      disabled={complaint.status === "RESOLVED"}
                    >
                      Update status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {result && <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />}
      </div>

      {modalComplaint && (
        <StatusUpdateModal
          complaint={modalComplaint}
          onClose={() => setModalComplaint(null)}
          onUpdated={(updated) => {
            setResult((prev) =>
              prev ? { ...prev, items: prev.items.map((c) => (c.id === updated.id ? updated : c)) } : prev
            );
          }}
        />
      )}
    </div>
  );
}
