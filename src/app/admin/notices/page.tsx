"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { Notice, PaginatedResult } from "@/types";

export default function AdminNoticesPage() {
  const [result, setResult] = useState<PaginatedResult<Notice> | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<PaginatedResult<Notice>>("/api/notices?pageSize=50")
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load notices."));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/notices", {
        method: "POST",
        body: JSON.stringify({ title, body, isImportant }),
      });
      setTitle("");
      setBody("");
      setIsImportant(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not post the notice. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow">Community</p>
      <h1 className="page-title mt-1">Notice Board</h1>
      <div className="title-rule" />
      <p className="page-sub">
        Important notices are pinned to the top of every resident&apos;s feed and emailed to all residents.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        <h2 className="font-display text-lg text-ink">Post a notice</h2>
        {error && <p className="alert-error">{error}</p>}
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="body">Body</label>
          <textarea id="body" required rows={4} className="input" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="accent-gold-600"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
          />
          Mark as important (pins to top and emails all residents)
        </label>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Posting…" : "Post notice"}
        </button>
      </form>

      <div className="stagger mt-8 space-y-4">
        {!result && !error && (
          <>
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </>
        )}
        {result?.items.length === 0 && (
          <div className="card p-10 text-center">
            <span className="mx-auto flex h-10 w-10 rotate-45 items-center justify-center rounded-lg border border-parch bg-white">
              <span className="-rotate-45 text-gold-600">◆</span>
            </span>
            <p className="mt-4 text-sm text-ink-mute">No notices posted yet. Use the form above to post the first one.</p>
          </div>
        )}
        {result?.items.map((notice) => (
          <div key={notice.id} className={`card p-5 ${notice.isImportant ? "border-l-4 border-l-gold-500" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-ink">{notice.title}</h3>
              {notice.isImportant && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gold-500 bg-gold-300/25 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
                  <span aria-hidden className="text-[8px]">◆</span>
                  Pinned
                </span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-mute">{notice.body}</p>
            <p className="mt-3 text-xs text-ink-mute">{new Date(notice.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
