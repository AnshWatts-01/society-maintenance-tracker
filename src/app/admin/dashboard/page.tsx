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
        <span className="text-ink-mute">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{count}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-paper-deep">
        <div className={`bar-animate h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
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
    return <p className="alert-error">{error}</p>;
  }
  if (!analytics)
    return (
      <div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="skeleton h-64" />
          <div className="skeleton h-64" />
        </div>
      </div>
    );

  return (
    <div>
      <p className="eyebrow">Command center</p>
      <h1 className="page-title mt-1">Executive Dashboard</h1>
      <div className="title-rule" />
      <p className="page-sub">Live snapshot of society maintenance activity.</p>

      <div className="stagger mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Complaints" value={analytics.totalComplaints} />
        <StatCard label="Open" value={analytics.byStatus.OPEN} accent="text-amberEstate-600" />
        <StatCard label="In Progress" value={analytics.byStatus.IN_PROGRESS} accent="text-royal-600" />
        <StatCard label="Overdue" value={analytics.overdueCount} accent="text-burgundy-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg tracking-wide text-ink">By Status</h2>
          <div className="space-y-4">
            <BreakdownBar label={STATUS_LABELS.OPEN} count={analytics.byStatus.OPEN} total={analytics.totalComplaints} color="bg-amberEstate-600" />
            <BreakdownBar label={STATUS_LABELS.IN_PROGRESS} count={analytics.byStatus.IN_PROGRESS} total={analytics.totalComplaints} color="bg-royal-600" />
            <BreakdownBar label={STATUS_LABELS.RESOLVED} count={analytics.byStatus.RESOLVED} total={analytics.totalComplaints} color="bg-moss-600" />
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-display text-lg tracking-wide text-ink">By Category</h2>
          <div className="space-y-4">
            {(Object.keys(analytics.byCategory) as Array<keyof typeof analytics.byCategory>).map((category) => (
              <BreakdownBar
                key={category}
                label={CATEGORY_LABELS[category]}
                count={analytics.byCategory[category]}
                total={analytics.totalComplaints}
                color="bg-gold-600"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
