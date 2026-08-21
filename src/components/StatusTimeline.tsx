import { StatusBadge } from "@/components/Badge";
import type { ComplaintHistoryEntry } from "@/types";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function StatusTimeline({ history }: { history: ComplaintHistoryEntry[] }) {
  return (
    <ol className="relative space-y-6 border-l border-slate-200 pl-6">
      {history.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-600" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={entry.newStatus} />
            <span className="text-sm text-slate-500">{formatTimestamp(entry.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-700">
            {entry.previousStatus ? `Moved from ${entry.previousStatus.replace("_", " ")} — ` : ""}
            by <span className="font-medium">{entry.actor.name}</span>{" "}
            <span className="text-slate-400">({entry.actor.role === "ADMIN" ? "Admin" : "Resident"})</span>
          </p>
          {entry.note && (
            <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{entry.note}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
