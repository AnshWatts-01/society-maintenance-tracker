"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { CategoryBadge, OverdueBadge, PriorityBadge, StatusBadge } from "@/components/Badge";
import { StatusTimeline } from "@/components/StatusTimeline";
import type { ComplaintDetail } from "@/types";

export default function ResidentComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ complaint: ComplaintDetail }>(`/api/complaints/${id}`)
      .then((data) => setComplaint(data.complaint))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load this complaint.")
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="skeleton h-5 w-44" />
        <div className="skeleton h-48" />
        <div className="skeleton h-32" />
      </div>
    );
  if (error) return <p className="alert-error">{error}</p>;
  if (!complaint) return <p className="text-sm text-ink-mute">Complaint not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/resident/dashboard" className="link-quiet">
        &larr; Back to my complaints
      </Link>

      <div className="card mt-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={complaint.category} />
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
          {complaint.isOverdue && <OverdueBadge />}
        </div>

        <p className="mt-4 whitespace-pre-wrap text-ink">{complaint.description}</p>

        {complaint.photoUrl && (
          <div className="mt-4 inline-block rounded-xl border border-parch bg-white p-1.5 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={complaint.photoUrl}
              alt="Complaint photo"
              className="max-h-80 rounded-lg object-cover"
            />
          </div>
        )}

        <p className="mt-4 text-xs text-ink-mute">
          Raised on {new Date(complaint.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-display text-xl text-ink">Status History</h2>
        <StatusTimeline history={complaint.history} />
      </div>
    </div>
  );
}
