export function StatCard({
  label,
  value,
  accent = "text-ink",
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="card-lift relative overflow-hidden p-5">
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-600 via-gold-300 to-transparent" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">{label}</p>
      <p className={`mt-2 font-display text-4xl tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
