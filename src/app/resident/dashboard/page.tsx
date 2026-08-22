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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Resident portal</p>
          <h1 className="page-title mt-1">My Complaints</h1>
          <div className="title-rule" />
          <p className="page-sub">Track every complaint you have raised and its full history.</p>
        </div>
        <Link href="/resident/complaints/new" className="btn-primary">
          Raise a complaint
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

      {error && <p className="alert-error mb-4">{error}</p>}

      <div className="card overflow-hidden">
        {loading && (
          <div className="space-y-3 p-4">
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
          </div>
        )}
        {!loading && result?.items.length === 0 && (
          <div className="p-10 text-center">
            <span className="mx-auto flex h-10 w-10 rotate-45 items-center justify-center rounded-lg border border-parch bg-white">
              <span className="-rotate-45 text-gold-600">◆</span>
            </span>
            <p className="mt-4 text-sm text-ink-mute">No complaints found.</p>
            <Link href="/resident/complaints/new" className="link-quiet mt-3 inline-block">
              Raise a complaint
            </Link>
          </div>
        )}
        {!loading && result && result.items.length > 0 && (
          <ul className="stagger divide-y divide-parch">
            {result.items.map((complaint) => (
              <li key={complaint.id}>
                <Link
                  href={`/resident/complaints/${complaint.id}`}
                  className="flex flex-col gap-2 border-l-2 border-transparent p-4 transition-colors hover:border-gold-500 hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={complaint.category} />
                      {complaint.isOverdue && <OverdueBadge />}
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-sm text-ink-soft">{complaint.description}</p>
                    <p className="mt-1 text-xs text-ink-mute">
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
