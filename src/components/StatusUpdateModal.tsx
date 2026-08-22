"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close dialog"
        className="modal-overlay absolute inset-0 bg-ink/50"
        onClick={onClose}
      />
      <div className="modal-panel card relative w-full max-w-md p-6 shadow-modal">
        <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-gold-600 via-gold-300 to-transparent" />
        <h2 className="font-display text-xl tracking-wide text-ink">Update Status</h2>
        <p className="mt-1 text-sm text-ink-mute">Currently: {STATUS_LABELS[complaint.status]}</p>

        {error && <p className="alert-error mt-3">{error}</p>}

        {options.length === 0 ? (
          <p className="mt-4 text-sm text-ink-mute">This complaint is resolved and closed.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="modal-status">New status</label>
              <select
                id="modal-status"
                className="input"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
              >
                {options.map((status) => (
                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                ))}
              </select>
              {newStatus === "RESOLVED" && (
                <p className="mt-1.5 text-xs text-burgundy-600">
                  Resolving closes this complaint permanently — it cannot be reopened.
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="modal-note">Note for the resident (optional)</label>
              <textarea
                id="modal-note"
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
              {submitting ? "Saving…" : "Save update"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
