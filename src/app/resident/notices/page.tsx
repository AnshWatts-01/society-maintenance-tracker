"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { Notice, PaginatedResult } from "@/types";

export default function ResidentNoticesPage() {
  const [result, setResult] = useState<PaginatedResult<Notice> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<PaginatedResult<Notice>>("/api/notices?pageSize=50")
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load notices."));
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Notice Board</h1>
      <p className="mt-1 text-sm text-slate-500">Important notices stay pinned to the top.</p>

      <div className="mt-6 space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!error && !result && <p className="card p-6 text-sm text-slate-500">Loading…</p>}
        {result?.items.length === 0 && (
          <p className="card p-6 text-sm text-slate-500">No notices yet.</p>
        )}
        {result?.items.map((notice) => (
          <div
            key={notice.id}
            className={`card p-5 ${notice.isImportant ? "border-l-4 border-l-brand-600" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{notice.title}</h3>
              {notice.isImportant && (
                <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white">
                  📌 Pinned
                </span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{notice.body}</p>
            <p className="mt-3 text-xs text-slate-400">
              {notice.author.name} · {new Date(notice.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
