import { getPublicReport, type PublicZoneRow, type PublicDay, type PublicOutlook } from "@/lib/public-report";
import { RISK_META, RISK_ORDER } from "@/lib/risk";
import Link from "next/link";
import { BrandMark } from "@/components/auth/BrandMark";
import {
  CalendarDays, CloudRain, MapPin, Waves, AlertTriangle, TrendingUp,
  ArrowUpRight, Share2, Printer, RefreshCw,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Chennai rainfall summary — Madras",
  description: "City-wide rainfall summary for Chennai: risk mix, trend and 7-day outlook. Public view.",
};

function shortLabel(dateKey: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, m, d] = dateKey.split("-");
  return `${months[Number(m) - 1] ?? m} ${d}`;
}

function ZoneRiskChip({ level }: { level: string | null }) {
  if (!level) return null;
  const meta = RISK_META[level as keyof typeof RISK_META];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${meta?.badge ?? "bg-slate-100 text-slate-600"}`}>
      {meta?.label ?? level}
    </span>
  );
}

export default async function PublicReportPage() {
  const report = await getPublicReport(14);

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandMark className="h-10 w-10" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Chennai rainfall summary</h1>
                <p className="text-xs text-slate-500">Madras Weather Monitor</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-500">
          <CloudRain size={40} className="mx-auto text-sky-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No zone data yet</h2>
          <p className="text-sm">Zone forecasts are not available right now.</p>
        </main>
      </div>
    );
  }

  const { zones, days, outlook, windowDays } = report;

  const riskCounts = new Map<string, number>();
  for (const z of zones) {
    const level = z.risk ?? "LOW";
    riskCounts.set(level, (riskCounts.get(level) ?? 0) + 1);
  }

  const cityTotal = days.reduce((a, d) => a + d.cityMm, 0);
  const wettestDay = days.reduce<{ date: string; mm: number } | null>(
    (best, d) => (!best || d.maxZoneMm > best.mm ? { date: d.date, mm: d.maxZoneMm } : best),
    null
  );
  const wettestZone = zones.reduce<{ name: string; mm: number } | null>(
    (best, z) => (!best || z.totalMm > best.mm ? { name: z.name, mm: z.totalMm } : best),
    null
  );
  const zonesAtRisk = zones.filter((z) => z.risk === "WARNING" || z.risk === "ALERT").length;
  const outlookTotal = outlook.reduce((a, o) => a + o.cityMm, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Chennai rainfall summary</h1>
              <p className="text-xs text-slate-500">Madras Weather Monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-xs font-medium text-slate-500 md:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live · Open-Meteo
            </span>
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">City rainfall summary</h1>
            <p className="mt-1 text-sm text-slate-500">
              Last {windowDays} days of observations plus the 7-day outlook — public view.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Generated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(report.generatedAt))} IST
            </span>
          </div>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
              <CloudRain size={14} className="text-sky-600" />
              <span>{windowDays}-day total</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{cityTotal.toFixed(1)}<span className="text-sm font-medium text-slate-500"> mm</span></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
              <TrendingUp size={14} className="text-amber-600" />
              <span>Wettest day</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-600">{wettestDay ? wettestDay.mm.toFixed(1) : "—"}<span className="text-sm font-medium text-slate-500"> mm</span></div>
            {wettestDay && <div className="text-xs text-slate-400">{shortLabel(wettestDay.date)}</div>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
              <MapPin size={14} className="text-teal-600" />
              <span>Wettest zone</span>
            </div>
            <div className="text-2xl font-extrabold text-teal-600 truncate px-2">{wettestZone ? wettestZone.mm.toFixed(1) : "—"}<span className="text-sm font-medium text-slate-500"> mm</span></div>
            {wettestZone && <div className="text-xs text-slate-400 truncate">{wettestZone.name}</div>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 mb-1">
              <AlertTriangle size={14} className="text-red-600" />
              <span>Zones at warning+</span>
            </div>
            <div className={`text-2xl font-extrabold ${zonesAtRisk > 0 ? "text-red-600" : "text-emerald-600"}`}>{zonesAtRisk}</div>
            <div className="text-xs text-slate-500">of {zones.length} zones</div>
          </div>
        </div>

        {/* Risk mix */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-3">Current risk mix</h2>
          <div className="flex flex-wrap items-center gap-3">
            {RISK_ORDER.map((level) => {
              const count = riskCounts.get(level) ?? 0;
              const meta = RISK_META[level as keyof typeof RISK_META];
              return (
                <div key={level} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta?.color }} />
                  <span className="text-sm text-slate-700">{meta?.label}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outlook */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">7-day outlook</h2>
            <span className="text-xs text-slate-400">City mean per day</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">City mean (mm)</th>
                  <th className="pb-2">Outlook</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {outlook.map((o) => (
                  <tr key={o.date} className="text-slate-700">
                    <td className="py-2 pr-4 font-medium">{shortLabel(o.date)}</td>
                    <td className="py-2 pr-4 font-semibold tabular-nums">{o.cityMm.toFixed(1)}</td>
                    <td className="py-2">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden max-w-[160px]">
                        <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min((o.cityMm / 120) * 100, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-3">Rainfall trend</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">City mean (mm)</th>
                  <th className="pb-2">Wettest zone (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {days.map((d) => (
                  <tr key={d.date} className="text-slate-700">
                    <td className="py-2 pr-4 font-medium">{shortLabel(d.date)}</td>
                    <td className="py-2 pr-4 font-semibold tabular-nums">{d.cityMm.toFixed(1)}</td>
                    <td className="py-2 font-semibold tabular-nums text-slate-600">{d.maxZoneMm.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zone table */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">Zone detail</h2>
            <span className="text-xs text-slate-400">{zones.length} zones</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Zone</th>
                  <th className="pb-2 pr-4">Today (mm)</th>
                  <th className="pb-2 pr-4">Risk</th>
                  <th className="pb-2 pr-4">Window total (mm)</th>
                  <th className="pb-2 pr-4">Rainy days</th>
                  <th className="pb-2">Wettest day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {zones.map((z) => (
                  <tr key={z.zoneId} className="text-slate-700">
                    <td className="py-2 pr-4 font-medium">{z.name} <span className="text-xs text-slate-400">#{z.number}</span></td>
                    <td className="py-2 pr-4 font-semibold tabular-nums">{z.todayMm !== null ? z.todayMm.toFixed(1) : "—"}</td>
                    <td className="py-2 pr-4"><ZoneRiskChip level={z.risk ?? null} /></td>
                    <td className="py-2 pr-4 font-semibold tabular-nums">{z.totalMm.toFixed(1)}</td>
                    <td className="py-2 pr-4 tabular-nums">{z.rainyDays}</td>
                    <td className="py-2 text-slate-500">
                      {z.wettestDay ? `${z.wettestDay.mm.toFixed(1)} mm · ${shortLabel(z.wettestDay.date)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          <p>Weather data sourced from Open-Meteo (ECMWF & GFS models). Tide data computed from astronomical estimates.</p>
          <p className="mt-1">Madras Weather Monitor — Helping Chennai stay prepared, one zone at a time.</p>
        </div>
      </main>
    </div>
  );
}
