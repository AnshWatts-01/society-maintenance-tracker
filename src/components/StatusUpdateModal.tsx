"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { STATUS_LABELS } from "@/lib/utils/constants";
import type { Complaint, ComplaintStatus } from "@/types";

const NEXT_STATUS_OPTIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["OPEN", "RESOLVED"],
  RESOLVED: [],
};

export function StatusUpdateModal({
  complaint,
  onClose,
  onUpdated,
}: {
  complaint: Complaint;
  onClose: () => void;
  onUpdated: (updated: Complaint) => void;
}) {
  const options = NEXT_STATUS_OPTIONS[complaint.status];
  const [newStatus, setNewStatus] = useState<ComplaintStatus | "">(options[0] ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!newStatus) return;
    setSubmitting(true);
    setError(null);
    try {
      const { complaint: updated } = await apiFetch<{ complaint: Complaint }>(
        `/api/complaints/${complaint.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: newStatus, note: note || undefined }) }
      );
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Update Complaint Status</h2>
        <p className="mt-1 text-sm text-slate-500">Currently: {STATUS_LABELS[complaint.status]}</p>

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {options.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">This complaint is resolved and closed.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">New status</label>
              <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}>
                {options.map((status) => (
                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Note (optional)</label>
              <textarea
                className="input"
                rows={3}
                maxLength={1000}
                placeholder="E.g. Plumber scheduled for tomorrow morning"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          {options.length > 0 && (
            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
