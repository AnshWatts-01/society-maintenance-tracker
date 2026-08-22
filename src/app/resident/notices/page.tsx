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
      <p className="eyebrow">Community</p>
      <h1 className="page-title mt-1">Notice Board</h1>
      <div className="title-rule" />
      <p className="page-sub">Important notices stay pinned to the top.</p>

      <div className="stagger mt-6 space-y-4">
        {error && <p className="alert-error">{error}</p>}
        {!error && !result && (
          <>
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </>
        )}
        {result?.items.length === 0 && (
          <div className="card p-10 text-center">
            <span className="mx-auto flex h-10 w-10 rotate-45 items-center justify-center rounded-lg border border-parch bg-white">
              <span className="-rotate-45 text-gold-600">◆</span>
            </span>
            <p className="mt-4 text-sm text-ink-mute">No notices yet.</p>
          </div>
        )}
        {result?.items.map((notice) => (
          <div
            key={notice.id}
            className={`card p-5 ${notice.isImportant ? "border-l-4 border-l-gold-500" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-ink">{notice.title}</h3>
              {notice.isImportant && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold-500 bg-gold-300/25 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
                  <span aria-hidden className="text-[8px]">◆</span>
                  Pinned
                </span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{notice.body}</p>
            <p className="mt-3 text-xs text-ink-mute">
              {notice.author.name} · {new Date(notice.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
