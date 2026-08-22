"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { CategoryBadge, OverdueBadge, PriorityBadge, StatusBadge } from "@/components/Badge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { StatusUpdateModal } from "@/components/StatusUpdateModal";
import { PRIORITY_LABELS, PRIORITY_LEVELS } from "@/lib/utils/constants";
import type { Complaint, ComplaintDetail } from "@/types";

export default function AdminComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const reload = useCallback(() => {
    apiFetch<{ complaint: ComplaintDetail }>(`/api/complaints/${id}`)
      .then((data) => {
        setComplaint(data.complaint);
        setError(null);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load this complaint.")
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handlePriorityChange(priority: string) {
    setError(null);
    try {
      const { complaint: updated } = await apiFetch<{ complaint: Complaint }>(
        `/api/complaints/${id}/priority`,
        { method: "PATCH", body: JSON.stringify({ priority }) }
      );
      setComplaint((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update priority.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton h-5 w-44" />
        <div className="skeleton h-56" />
        <div className="skeleton h-40" />
      </div>
    );
  }
  if (error && !complaint) {
    return <p className="alert-error mx-auto max-w-3xl">{error}</p>;
  }
  if (!complaint) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <span className="mx-auto flex h-10 w-10 rotate-45 items-center justify-center rounded-lg border border-parch bg-white">
          <span className="-rotate-45 text-gold-600">◆</span>
        </span>
        <p className="mt-4 text-sm text-ink-mute">This complaint could not be found.</p>
        <Link href="/admin/complaints" className="link-quiet mt-3 inline-block">
          Back to all complaints
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/complaints" className="link-quiet">
        &larr; Back to all complaints
      </Link>

      {error && (
        <p className="alert-error mt-4">{error}</p>
      )}

      <div className="card mt-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={complaint.category} />
            <StatusBadge status={complaint.status} />
            {complaint.isOverdue && <OverdueBadge />}
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowModal(true)}
            disabled={complaint.status === "RESOLVED"}
          >
            Update status
          </button>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-ink">{complaint.description}</p>

        {complaint.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={complaint.photoUrl}
            alt="Complaint photo"
            className="mt-4 max-h-80 rounded-lg border-4 border-white object-cover shadow-card ring-1 ring-parch"
          />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-mute">
          <span>
            Resident: <span className="font-medium text-ink">{complaint.resident.name}</span> (Flat {complaint.resident.flatNumber})
          </span>
          <span>Raised {new Date(complaint.createdAt).toLocaleString()}</span>
        </div>

        <div className="mt-4">
          <label className="label">Priority</label>
          <select
            className="input max-w-[160px]"
            value={complaint.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            disabled={complaint.status === "RESOLVED"}
          >
            {PRIORITY_LEVELS.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-display text-lg text-ink">Status history</h2>
        <StatusTimeline history={complaint.history} />
      </div>

      {showModal && (
        <StatusUpdateModal
          complaint={complaint}
          onClose={() => setShowModal(false)}
          onUpdated={() => reload()}
        />
      )}
    </div>
  );
}
