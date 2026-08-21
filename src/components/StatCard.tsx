export function StatCard({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
