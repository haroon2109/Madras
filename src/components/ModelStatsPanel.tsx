import type { HourlyModelPoint } from "@/lib/data";

/** Sum of non-null hourly values (mm) across the window. */
function totalMm(points: HourlyModelPoint[], model: "ecmwf" | "gfs"): number {
  return points.reduce((acc, p) => acc + (p[model] ?? 0), 0);
}

/**
 * Per-model summary stats over the hourly window: totals, agreement
 * (share of comparable hours where both models stay within 0.1 mm/h), and
 * the single hour of largest divergence.
 */
export default function ModelStatsPanel({ points }: { points: HourlyModelPoint[] }) {
  const comparable = points.filter((p) => p.ecmwf !== null && p.gfs !== null);
  const ecmwfTotal = totalMm(points, "ecmwf");
  const gfsTotal = totalMm(points, "gfs");

  const agreeThreshold = 0.1; // mm/h — treat smaller gaps as agreement
  const agreeHours = comparable.filter(
    (p) => Math.abs((p.ecmwf ?? 0) - (p.gfs ?? 0)) <= agreeThreshold
  ).length;
  const agreementPct = comparable.length
    ? Math.round((agreeHours / comparable.length) * 100)
    : null;

  let maxDiff: { hour: string; ecmwf: number; gfs: number } | null = null;
  for (const p of comparable) {
    const diff = Math.abs((p.ecmwf ?? 0) - (p.gfs ?? 0));
    if (!maxDiff || diff > Math.abs(maxDiff.ecmwf - maxDiff.gfs)) {
      maxDiff = { hour: p.hour, ecmwf: p.ecmwf ?? 0, gfs: p.gfs ?? 0 };
    }
  }

  const stats = [
    { label: "ECMWF total", value: `${ecmwfTotal.toFixed(1)} mm` },
    { label: "GFS total", value: `${gfsTotal.toFixed(1)} mm` },
    { label: "Comparable hours", value: `${comparable.length}/${points.length}` },
    { label: "Models agree", value: agreementPct === null ? "—" : `${agreementPct}%` },
    {
      label: "Max divergence",
      value: maxDiff ? `${Math.abs(maxDiff.ecmwf - maxDiff.gfs).toFixed(2)} mm/h` : "—",
      hint: maxDiff ? maxDiff.hour : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-2xl font-extrabold tabular-nums text-slate-900">{s.value}</div>
          <div className="mt-1 text-sm font-medium text-slate-500">{s.label}</div>
          {s.hint && <div className="mt-0.5 text-xs text-slate-400">{s.hint}</div>}
        </div>
      ))}
    </div>
  );
}
