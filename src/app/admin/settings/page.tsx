"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";

export default function AdminSettingsPage() {
  const [days, setDays] = useState<number | "">("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ overdueThresholdDays: number }>("/api/admin/settings")
      .then((data) => setDays(data.overdueThresholdDays))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load the current threshold.")
      );
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (days === "") return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ overdueThresholdDays: days }),
      });
      setMessage("SLA threshold updated. It takes effect on the next dashboard/complaint list load.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update setting.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold text-slate-900">SLA Settings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Complaints still open past this many days are automatically flagged overdue and pinned to the
        top of the complaint queue.
      </p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div>
          <label className="label" htmlFor="days">Overdue threshold (days)</label>
          <input
            id="days"
            type="number"
            min={1}
            max={365}
            required
            className="input max-w-[150px]"
            value={days}
            onChange={(e) => setDays(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save Threshold"}
        </button>
      </form>
    </div>
  );
}
