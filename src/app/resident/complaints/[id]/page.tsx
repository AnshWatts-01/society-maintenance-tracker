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

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (!complaint) return <p className="text-sm text-slate-500">Complaint not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/resident/dashboard" className="text-sm text-brand-600 hover:underline">
        &larr; Back to my complaints
      </Link>

      <div className="card mt-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={complaint.category} />
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
          {complaint.isOverdue && <OverdueBadge />}
        </div>

        <p className="mt-4 whitespace-pre-wrap text-slate-800">{complaint.description}</p>

        {complaint.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={complaint.photoUrl}
            alt="Complaint photo"
            className="mt-4 max-h-80 rounded-lg border border-slate-200 object-cover"
          />
        )}

        <p className="mt-4 text-xs text-slate-400">
          Raised on {new Date(complaint.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Status History</h2>
        <StatusTimeline history={complaint.history} />
      </div>
    </div>
  );
}
