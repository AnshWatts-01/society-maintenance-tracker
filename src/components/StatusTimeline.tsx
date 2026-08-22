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
    <ol className="stagger relative space-y-7 border-l border-parch pl-7">
      {history.map((entry, index) => {
        const isLatest = index === history.length - 1;
        return (
          <li key={entry.id} className="relative">
            {/* Gold-ringed marker; the latest entry gets a filled seal. */}
            <span
              className={`absolute -left-[33px] top-0.5 flex h-3.5 w-3.5 rotate-45 items-center justify-center border ${
                isLatest ? "border-gold-600 bg-gold-500" : "border-gold-500 bg-white"
              }`}
            />
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={entry.newStatus} />
              <span className="text-xs tabular-nums text-ink-mute">{formatTimestamp(entry.createdAt)}</span>
            </div>
            <p className="mt-1.5 text-sm text-ink">
              {entry.previousStatus ? `Moved from ${entry.previousStatus.replace("_", " ").toLowerCase()} — ` : ""}
              by <span className="font-semibold">{entry.actor.name}</span>{" "}
              <span className="text-ink-mute">({entry.actor.role === "ADMIN" ? "Admin" : "Resident"})</span>
            </p>
            {entry.note && (
              <p className="mt-2 rounded-lg border-l-2 border-gold-500 bg-paper px-3 py-2 text-sm text-ink">
                {entry.note}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
