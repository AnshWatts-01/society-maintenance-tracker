"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { StatCard } from "@/components/StatCard";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/utils/constants";
import type { DashboardAnalytics } from "@/types";

function BreakdownBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">{count}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiFetch<DashboardAnalytics>("/api/admin/analytics");
        if (cancelled) return;
        setAnalytics(data);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Could not load the dashboard.");
      }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (error && !analytics) {
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  }
  if (!analytics) return <p className="text-sm text-slate-500">Loading dashboard…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Executive Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Live snapshot of society maintenance activity.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Complaints" value={analytics.totalComplaints} />
        <StatCard label="Open" value={analytics.byStatus.OPEN} accent="text-amber-600" />
        <StatCard label="In Progress" value={analytics.byStatus.IN_PROGRESS} accent="text-blue-600" />
        <StatCard label="Overdue" value={analytics.overdueCount} accent="text-red-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">By Status</h2>
          <div className="space-y-4">
            <BreakdownBar label={STATUS_LABELS.OPEN} count={analytics.byStatus.OPEN} total={analytics.totalComplaints} color="bg-amber-500" />
            <BreakdownBar label={STATUS_LABELS.IN_PROGRESS} count={analytics.byStatus.IN_PROGRESS} total={analytics.totalComplaints} color="bg-blue-500" />
            <BreakdownBar label={STATUS_LABELS.RESOLVED} count={analytics.byStatus.RESOLVED} total={analytics.totalComplaints} color="bg-emerald-500" />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">By Category</h2>
          <div className="space-y-4">
            {(Object.keys(analytics.byCategory) as Array<keyof typeof analytics.byCategory>).map((category) => (
              <BreakdownBar
                key={category}
                label={CATEGORY_LABELS[category]}
                count={analytics.byCategory[category]}
                total={analytics.totalComplaints}
                color="bg-brand-500"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
