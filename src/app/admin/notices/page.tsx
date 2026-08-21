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
      setError(err instanceof ApiError ? err.message : "Failed to post notice.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Notice Board</h1>
      <p className="mt-1 text-sm text-slate-500">
        Important notices are pinned to the top of every resident&apos;s feed and emailed to all residents.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="body">Body</label>
          <textarea id="body" required rows={4} className="input" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isImportant} onChange={(e) => setIsImportant(e.target.checked)} />
          Mark as important (pins to top &amp; emails all residents)
        </label>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Posting…" : "Post Notice"}
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {result?.items.map((notice) => (
          <div key={notice.id} className={`card p-5 ${notice.isImportant ? "border-l-4 border-l-brand-600" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{notice.title}</h3>
              {notice.isImportant && (
                <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white">
                  📌 Pinned
                </span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{notice.body}</p>
            <p className="mt-3 text-xs text-slate-400">{new Date(notice.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
