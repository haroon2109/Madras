import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getZoneHistory, getZoneHourlyModels, getHeatmapData, getModelAccuracy, istDateKey } from "@/lib/data";
import { riskLevelFor, recommendationsFor } from "@/lib/risk";
import ZonePicker from "@/components/ZonePicker";
import RainHistoryChart, { HistoryPoint } from "@/components/RainHistoryChart";
import RainfallHeatmap from "@/components/RainfallHeatmap";
import RiskBadge from "@/components/RiskBadge";
import ModelHourlyChart from "@/components/ModelHourlyChart";
import ModelStatsPanel from "@/components/ModelStatsPanel";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  // Feature 3 — the accuracy slice is admin-only, same gate as /accuracy.
  const isAdmin = session?.user?.role === "ADMIN";
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const selectedZoneId =
    zones.find((z) => z.id === sp.zone)?.id ?? zones[0]?.id ?? "";

  const history = selectedZoneId ? await getZoneHistory(selectedZoneId, 14) : null;
  const hourly = selectedZoneId ? await getZoneHourlyModels(selectedZoneId, 48) : null;
  const heatmap = await getHeatmapData(30);
  // Feature 3 — zone-scoped accuracy slice (city-wide computed once).
  const accuracy = isAdmin ? await getModelAccuracy(14) : null;
  const zoneAccuracy = accuracy?.zones.find((z) => z.zoneId === selectedZoneId) ?? null;

  let points: HistoryPoint[] = [];
  let totalMm = 0;
  let maxDay: { date: string; mm: number } | null = null;
  let rainyDays = 0;
  let warningDays = 0;

  if (history) {
    points = history.snapshots.map((s) => {
      const date = istDateKey(s.forecastDate);
      const risk = riskLevelFor(s.precipSumMm, history.zone);
      if (s.precipSumMm > 0.5) rainyDays++;
      if (risk === "WARNING" || risk === "ALERT") warningDays++;
      return { date, precipMm: s.precipSumMm, precipProbMax: s.precipProbMax, risk };
    });
    totalMm = points.reduce((acc, p) => acc + p.precipMm, 0);
    for (const p of points) {
      if (!maxDay || p.precipMm > maxDay.mm) maxDay = { date: p.date, mm: p.precipMm };
    }
  }

  const zone = history?.zone;
  const stats = [
    { label: `${points.length}-day total`, value: `${totalMm.toFixed(0)} mm`, color: "text-slate-900" },
    { label: "Wettest day", value: maxDay ? `${maxDay.mm.toFixed(1)} mm` : "—", color: "text-sky-700" },
    { label: "Rainy days (≥0.5 mm)", value: rainyDays, color: "text-slate-900" },
    { label: "Days ≥ warning", value: warningDays, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">Historical analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Zone-wise rainfall forecast history — past observations and the 7-day outlook.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Feature 7 — CSV exports of stored real data */}
          <a
            href="/api/export?type=forecast"
            className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            title="Download all daily forecast snapshots as CSV"
          >
            Export forecasts CSV
          </a>
          <a
            href="/api/export?type=hourly"
            className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            title="Download hourly ECMWF/GFS rainfall as CSV"
          >
            Export hourly CSV
          </a>
          <ZonePicker zones={zones} selectedId={selectedZoneId} />
        </div>
      </div>

      {heatmap && heatmap.cells.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Historical Rainfall Heatmap — All Zones (past 30 days)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Daily rainfall totals across Chennai zones. Darker cells indicate heavier rainfall.
            </p>
          </div>
          <RainfallHeatmap data={heatmap} />
        </div>
      )}

      {zone ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Zone {zone.number} — {zone.name}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {zone.latitude.toFixed(3)}, {zone.longitude.toFixed(3)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={`truncate text-2xl font-extrabold tabular-nums ${s.color}`}>{s.value}</div>
                <div className="mt-1 truncate text-sm font-medium text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Daily rainfall ({points.length > 0 ? `${points.length} days` : "history"})
            </h3>
            {points.length > 0 ? (
              <RainHistoryChart data={points} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">No history yet — refresh the forecast.</p>
            )}
          </div>

          {hourly && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Hourly model comparison — ECMWF vs GFS (last 48h, IST)
                  </h3>
                  <span className="text-xs text-slate-400">
                    Bars: per-hour values · Lines: trend · Gaps = missing at source
                  </span>
                </div>
                <ModelHourlyChart data={hourly.points} />
              </div>
              <ModelStatsPanel points={hourly.points} />
            </div>
          )}

          {accuracy && zoneAccuracy && zoneAccuracy.rows.some((r) => r.days > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Model accuracy — this zone (last {accuracy.daysEvaluated} evaluated days)
                </h3>
                {isAdmin && (
                  <a href="/accuracy" className="text-xs font-bold text-sky-600 hover:underline">
                    Full scorecard →
                  </a>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {zoneAccuracy.rows.map((r) => (
                  <div key={r.model} className="rounded-lg bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        {r.model}
                      </span>
                      {zoneAccuracy.winner === r.model && (
                        <span className="text-xs font-bold text-sky-600">★ better</span>
                      )}
                    </div>
                    <div className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
                      {r.maeMm.toFixed(1)} <span className="text-xs font-semibold text-slate-400">mm MAE · {r.days}d</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      bias {r.biasMm > 0 ? "+" : ""}{r.biasMm.toFixed(1)} · hit-rate {Math.round(r.hitRate * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {points.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                Recent days
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Date</th>
                      <th className="px-4 py-2 font-semibold">Rainfall (mm)</th>
                      <th className="px-4 py-2 font-semibold">Chance of rain</th>
                      <th className="px-4 py-2 font-semibold">Risk</th>
                      <th className="px-4 py-2 font-semibold">Forecast for</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...points].reverse().slice(0, 14).map((p) => {
                      const { level } = recommendationsFor(p.precipMm, zone);
                      return (
                        <tr key={p.date} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 font-medium text-slate-800">{p.date}</td>
                          <td className="px-4 py-2 font-semibold tabular-nums text-slate-900">
                            {p.precipMm.toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-slate-500">{p.precipProbMax}%</td>
                          <td className="px-4 py-2">
                            <RiskBadge level={level} size="sm" />
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-400">
                            {p.date >= istDateKey(new Date()) ? "outlook" : "past"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Past days come from Open-Meteo&apos;s observed daily history; future days are model forecast.
            Refreshes re-capture the whole window so past values track the model&apos;s final analysis.
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">
          No zones configured.{isAdmin ? <Link href="/admin" className="font-medium text-sky-600 hover:underline">Add a zone in admin.</Link> : <span className="font-medium text-sky-600">Ask an administrator to configure zones.</span>}
        </div>
      )}
    </div>
  );
}