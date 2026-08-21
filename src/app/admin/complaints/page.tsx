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
      <h1 className="text-2xl font-semibold text-slate-900">Complaint Management</h1>
      <p className="mt-1 text-sm text-slate-500">Overdue complaints are automatically pinned to the top.</p>

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
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="card mt-6 overflow-x-auto">
        {loading && <p className="p-6 text-sm text-slate-500">Loading…</p>}
        {!loading && result?.items.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No complaints match these filters.</p>
        )}
        {!loading && result && result.items.length > 0 && (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Complaint</th>
                <th className="px-4 py-3">Resident</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Raised</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.items.map((complaint) => (
                <tr key={complaint.id} className={complaint.isOverdue ? "bg-red-50/50" : undefined}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={complaint.category} />
                      {complaint.isOverdue && <OverdueBadge />}
                    </div>
                    <Link href={`/admin/complaints/${complaint.id}`} className="mt-1 block line-clamp-1 max-w-xs text-slate-700 hover:underline">
                      {complaint.description}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {complaint.resident?.name}
                    <div className="text-xs text-slate-400">Flat {complaint.resident?.flatNumber}</div>
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
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setModalComplaint(complaint)}
                      disabled={complaint.status === "RESOLVED"}
                    >
                      Update Status
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
