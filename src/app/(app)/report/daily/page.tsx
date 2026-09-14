import { getDailyReport, getAvailableReportDates } from "@/lib/data";
import { RISK_META, RISK_ORDER } from "@/lib/risk";
import RiskBadge from "@/components/RiskBadge";
import ReportTabs from "@/components/report/ReportTabs";
import DateNav from "@/components/report/DateNav";
import ExportButton from "@/components/report/ExportButton";
import PrintButton from "@/components/report/PrintButton";
import RiskDonut from "@/components/report/RiskDonut";
import ZoneRankingChart from "@/components/report/ZoneRankingChart";
import { shortLabel } from "@/components/report/labels";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Daily report — Madras",
  description: "Zone-by-zone rainfall report for one day, with day-over-day comparison and the 7-day outlook.",
};

function diffColor(diff: number): string {
  if (diff > 0.05) return "text-[#0EA5A0]";
  if (diff < -0.05) return "text-[#F59E0B]";
  return "text-[#5F6368]";
}

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const dates = await getAvailableReportDates();

  // Default to the most recent date with data (falls back to today).
  const selected = sp.date && dates.includes(sp.date) ? sp.date : dates.at(-1);
  const report = selected ? await getDailyReport(selected) : null;

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs />
          <PrintButton />
        </div>
        <div className="rounded-2xl border border-dashed border-[#DADCE0] bg-white p-12 text-center text-sm text-[#5F6368]">
          {selected
            ? `No zone data for ${shortLabel(selected)} yet. Refresh the forecast data to populate this report.`
            : "No forecast data stored yet. Refresh the forecast data to generate the daily report."}
        </div>
      </div>
    );
  }

  const { zones, city, riskCounts, outlook } = report;

  const donutData = RISK_ORDER.filter((l) => l !== "LOW").map((level) => ({
    level,
    zones: riskCounts[level === "ALERT" ? "alert" : level === "WARNING" ? "warning" : "watch"],
  }));

  const zonesAtRisk = riskCounts.warning + riskCounts.alert;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#202124]">Daily rainfall report</h1>
            <span className="rounded-full bg-[#E8F0FE] px-3 py-1 text-xs font-bold text-[#1A73E8]">
              {shortLabel(report.date)}
            </span>
            {report.prevDate && (
              <span className="text-xs font-medium text-[#5F6368]">
                vs previous day ({shortLabel(report.prevDate)})
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#5F6368]">
            Every zone&apos;s 24h forecast for the selected day — generated from stored Open-Meteo data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateNav dates={dates} selected={report.date} />
          <ExportButton
            options={[{ type: "daily", label: `Zone table — ${shortLabel(report.date)}` }]}
          />
          <PrintButton />
        </div>
      </div>

      <Tabs />

      {/* Headline stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="City total (zone sum)"
          value={`${city.totalMm.toFixed(1)} mm`}
          sub={`mean ${city.meanMm.toFixed(1)} mm`}
          accent="#1A73E8"
        />
        <StatCard
          label="Wettest zone"
          value={city.wettestZone ? `${city.wettestZone.mm.toFixed(1)} mm` : "—"}
          sub={city.wettestZone?.name}
          accent="#0EA5A0"
        />
        <StatCard
          label="Zones ≥ warning"
          value={String(zonesAtRisk)}
          sub={`of ${zones.length} zones`}
          accent={zonesAtRisk > 0 ? "#EF4444" : "#10B981"}
        />
        <StatCard
          label="Temp range"
          value={`${city.tempMinC.toFixed(1)}–${city.tempMaxC.toFixed(1)} °C`}
          sub={`wind up to ${city.windMaxKmh.toFixed(0)} km/h`}
          accent="#F59E0B"
        />
      </section>

      {/* Risk mix + ranking */}
      <section className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Panel title="Risk mix" subtitle="Zones by forecast risk level for this day">
          <RiskDonut data={donutData} />
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-[#5F6368]">
            {RISK_ORDER.map((l) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RISK_META[l].color }} />
                {RISK_META[l].label}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Zones ranked" subtitle="Expected 24h rainfall, colored by risk">
          <ZoneRankingChart data={zones.map((z) => ({ name: z.name, todayMm: z.precipMm, risk: z.risk }))} />
        </Panel>
      </section>

      {/* Day-over-day comparison + outlook */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Day-over-day change"
          subtitle={report.prevDate ? `vs ${shortLabel(report.prevDate)}` : "No previous day available"}
        >
          <DayDiffBars
            data={zones
              .filter((z) => z.prevDayDiffMm !== null)
              .map((z) => ({ name: z.name, diff: z.prevDayDiffMm as number }))}
          />
        </Panel>
        <Panel title="7-day outlook" subtitle="City mean rainfall per day from this date">
          <OutlookMiniChart data={outlook} />
        </Panel>
      </section>

      {/* Zone table */}
      <section className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-white shadow-[0_1px_2px rgba(16,42,86,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DADCE0] px-5 py-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">Zone detail — {shortLabel(report.date)}</h2>
          <span className="text-xs text-[#5F6368]">{zones.length} zones</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F9FA] text-xs uppercase tracking-wide text-[#5F6368]">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Zone</th>
                <th className="px-5 py-2.5 font-semibold">Rainfall</th>
                <th className="px-5 py-2.5 font-semibold">Δ Prev. day</th>
                <th className="px-5 py-2.5 font-semibold">Chance</th>
                <th className="px-5 py-2.5 font-semibold">Temp (min–max)</th>
                <th className="px-5 py-2.5 font-semibold">Wind max</th>
                <th className="px-5 py-2.5 font-semibold">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F4]">
              {zones.map((z) => (
                <tr key={z.zoneId} className="hover:bg-[#F8F9FA]/60">
                  <td className="px-5 py-2.5 font-semibold text-[#202124]">
                    {z.name} <span className="text-xs font-medium text-[#5F6368]">#{z.number}</span>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums font-semibold text-[#202124]">{z.precipMm.toFixed(1)} mm</td>
                  <td className={`px-5 py-2.5 tabular-nums font-semibold ${diffColor(z.prevDayDiffMm ?? 0)}`}>
                    {z.prevDayDiffMm === null
                      ? "—"
                      : `${z.prevDayDiffMm > 0 ? "+" : ""}${z.prevDayDiffMm.toFixed(1)} mm`}
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">{z.precipProbMax}%</td>
                  <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">
                    {z.tempMinC.toFixed(1)}–{z.tempMaxC.toFixed(1)} °C
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">{z.windMaxKmh.toFixed(0)} km/h</td>
                  <td className="px-5 py-2.5">
                    <RiskBadge level={z.risk} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-[#5F6368]">
        Values come from stored Open-Meteo forecasts (ECMWF/GFS daily feeds). The selected day reflects the
        model&apos;s latest capture for that date.
      </p>
    </div>
  );
}

function Tabs() {
  return <ReportTabs active="daily" />;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px rgba(16,42,86,0.04)]">
      <div className="text-[13px] font-semibold text-[#5F6368]">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: accent }}>
          {value}
        </span>
        {sub && <span className="text-xs font-semibold text-[#5F6368]">{sub}</span>}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px rgba(16,42,86,0.04)] sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#202124]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-[#5F6368]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Simple horizontal diverging bars for day-over-day change (server-rendered). */
function DayDiffBars({ data }: { data: { name: string; diff: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-[#5F6368]">No previous day to compare against.</p>;
  }
  const max = Math.max(...data.map((d) => Math.abs(d.diff)), 0.1);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => {
        const pct = Math.min(Math.abs(d.diff) / max, 1) * 50;
        const positive = d.diff > 0;
        return (
          <li key={d.name} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 truncate font-semibold text-[#202124]">{d.name}</span>
            <span className="relative h-4 flex-1 rounded bg-[#F8F9FA]">
              <span className="absolute inset-y-0 left-1/2 w-px bg-[#DADCE0]" aria-hidden="true" />
              <span
                className={`absolute inset-y-0 ${positive ? "left-1/2" : "right-1/2"} rounded-sm`}
                style={{
                  width: `${pct}%`,
                  backgroundColor: positive ? "#0EA5A0" : "#F59E0B",
                }}
                aria-hidden="true"
              />
            </span>
            <span className={`w-20 shrink-0 text-right tabular-nums font-semibold ${diffColor(d.diff)}`}>
              {d.diff > 0 ? "+" : ""}
              {d.diff.toFixed(1)} mm
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact server-rendered column chart of the 7-day city outlook. */
function OutlookMiniChart({ data }: { data: { date: string; cityMm: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-[#5F6368]">No outlook data yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.cityMm), 0.1);
  return (
    <div>
      <div className="flex h-40 items-end gap-2">
        {data.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold tabular-nums text-[#5F6368]">
              {d.cityMm >= 0.05 ? d.cityMm.toFixed(1) : ""}
            </span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-[#7FB2F0] to-[#1A73E8]"
              style={{ height: `${Math.max((d.cityMm / max) * 100, 2)}%` }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-semibold text-[#5F6368]">{shortLabel(d.date)}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-[#5F6368]">City mean mm / 24h</p>
    </div>
  );
}
