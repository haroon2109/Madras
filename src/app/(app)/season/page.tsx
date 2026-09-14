import { getSeasonStats, getAnomalies, getReservoirStatus, getDashboardData } from "@/lib/data";
import { seasonLabel, CHENNAI_MONTHLY_NORMALS } from "@/lib/climate";
import { getTodayTide } from "@/lib/tide";
import ReservoirPanel from "@/components/season/ReservoirPanel";
import SeasonCharts from "@/components/season/SeasonCharts";
import { upsertReservoirReading, upsertTideReading } from "@/app/(app)/incidents/actions";
import { istToday } from "@/lib/weather";

export const dynamic = "force-dynamic";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const metadata = {
  title: "Season & climate — Madras",
  description: "Monsoon progress, rainfall anomalies, reservoir storage and tide state.",
};

export default async function SeasonPage() {
  const [season, anomalies, reservoirs, tide, dash] = await Promise.all([
    getSeasonStats(),
    getAnomalies(30, 20),
    getReservoirStatus(),
    getTodayTide(),
    getDashboardData(),
  ]);

  const cityToday = dash.zones.reduce((a, z) => a + (z.today?.precipMm ?? 0), 0) / Math.max(1, dash.zones.length);
  const depColor = season.departurePct >= 20 ? "text-sky-700" : season.departurePct <= -20 ? "text-amber-700" : "text-slate-900";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#202124]">
          Season &amp; climate
        </h1>
        <p className="mt-1 text-sm text-[#5F6368]">
          {seasonLabel(season.season)} · normals from IMD Chennai climatology · actuals from stored observations.
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#5F6368]">Season actual</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-[#202124]">{season.actualMm.toFixed(0)}<span className="text-sm font-semibold text-[#5F6368]"> mm</span></div>
          <div className="text-xs font-semibold text-[#5F6368]">normal {season.normalMm.toFixed(0)} mm</div>
        </div>
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#5F6368]">Departure</div>
          <div className={`mt-1 text-3xl font-extrabold tabular-nums ${depColor}`}>
            {season.departurePct > 0 ? "+" : ""}{season.departurePct}%
          </div>
          <div className="text-xs font-semibold text-[#5F6368]">vs seasonal normal</div>
        </div>
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#5F6368]">Combined reservoir storage</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-[#0284c7]">
            {reservoirs.combinedPct !== null ? `${reservoirs.combinedPct}%` : "—"}
          </div>
          <div className="text-xs font-semibold text-[#5F6368]">{reservoirs.readingsToday} readings today</div>
        </div>
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#5F6368]">Today&apos;s high tide</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-[#0e7490]">
            {tide.highTideM.toFixed(2)}<span className="text-sm font-semibold text-[#5F6368]"> m · {tide.highTideAt}</span>
          </div>
          <div className="text-xs font-semibold text-[#5F6368]">{tide.source === "manual" ? "harbour reading" : "astronomical estimate"} · city rain {cityToday.toFixed(1)} mm</div>
        </div>
      </div>

      <SeasonCharts season={season} monthNames={MONTHS} normals={CHENNAI_MONTHLY_NORMALS.filter((m) => season.seasonMonths.includes(m.month))} />

      {/* Anomalies */}
      <section className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-white">
        <div className="border-b border-[#F1F3F4] px-5 py-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">Rainfall anomalies — past 30 days</h2>
          <p className="mt-0.5 text-xs text-[#5F6368]">Days at ≥1.5× the pro-rated monthly normal. EXTREME = ≥3×.</p>
        </div>
        {anomalies.length > 0 ? (
          <ul className="divide-y divide-[#F1F3F4]">
            {anomalies.map((a) => (
              <li key={`${a.date}-${a.zoneId}`} className="flex flex-wrap items-center gap-2 px-5 py-2.5 text-sm">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${a.label === "EXTREME" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  {a.label}
                </span>
                <span className="font-bold text-[#202124]">{a.date}</span>
                <span className="text-[#5F6368]">Zone {a.zoneNumber} — {a.zoneName}</span>
                <span className="ml-auto font-extrabold tabular-nums text-[#202124]">{a.mm.toFixed(1)} mm</span>
                <span className="text-xs font-semibold text-[#5F6368]">{a.ratio}× normal</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-[#5F6368]">No anomalous days in the window.</p>
        )}
      </section>

      <ReservoirPanel
        reservoirs={reservoirs.reservoirs}
        tide={tide}
        todayKey={istToday()}
        readingAction={upsertReservoirReading}
        tideAction={upsertTideReading}
      />
    </div>
  );
}
