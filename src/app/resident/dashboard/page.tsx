"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { CategoryBadge, OverdueBadge, PriorityBadge, StatusBadge } from "@/components/Badge";
import { Pagination } from "@/components/Pagination";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, CATEGORY_LABELS, STATUS_LABELS } from "@/lib/utils/constants";
import type { Complaint, PaginatedResult } from "@/types";

export default function ResidentDashboardPage() {
  const [result, setResult] = useState<PaginatedResult<Complaint> | null>(null);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      const data = await apiFetch<PaginatedResult<Complaint>>(`/api/complaints?${params.toString()}`);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your complaints.");
    } finally {
      setLoading(false);
    }
  }, [page, status, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">My Complaints</h1>
          <p className="text-sm text-slate-500">Track every complaint you have raised and its full history.</p>
        </div>
        <Link href="/resident/complaints/new" className="btn-primary">
          + Raise a Complaint
        </Link>
      </div>

      <div className="card mb-6 flex flex-wrap gap-3 p-4">
        <select
          className="input max-w-[180px]"
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
        >
          <option value="">All statuses</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="input max-w-[180px]"
          value={category}
          onChange={(e) => { setPage(1); setCategory(e.target.value); }}
        >
          <option value="">All categories</option>
          {COMPLAINT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="card overflow-hidden">
        {loading && <p className="p-6 text-sm text-slate-500">Loading…</p>}
        {!loading && result?.items.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No complaints found. Raise one to get started.</p>
        )}
        {!loading && result && result.items.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {result.items.map((complaint) => (
              <li key={complaint.id}>
                <Link
                  href={`/resident/complaints/${complaint.id}`}
                  className="flex flex-col gap-2 p-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={complaint.category} />
                      {complaint.isOverdue && <OverdueBadge />}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-sm text-slate-700">{complaint.description}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Raised {new Date(complaint.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={complaint.priority} />
                    <StatusBadge status={complaint.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {result && <Pagination page={result.page} totalPages={result.totalPages} onPageChange={setPage} />}
      </div>
    </div>
  );
}
