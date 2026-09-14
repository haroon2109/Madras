import { getCityReport } from "@/lib/data";
import { RISK_META, RISK_ORDER, type RiskLevel } from "@/lib/risk";
import RiskBadge from "@/components/RiskBadge";
import RiskDonut from "@/components/report/RiskDonut";
import ReportTabs from "@/components/report/ReportTabs";
import ExportButton from "@/components/report/ExportButton";
import ZoneRankingChart from "@/components/report/ZoneRankingChart";
import RainfallTrendChart from "@/components/report/RainfallTrendChart";
import TemperatureRangeChart from "@/components/report/TemperatureRangeChart";
import OutlookStackedChart from "@/components/report/OutlookStackedChart";
import RainyDaysChart from "@/components/report/RainyDaysChart";
import WindChart from "@/components/report/WindChart";
import PrintButton from "@/components/report/PrintButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "City report — Madras",
  description: "Visual rainfall report for Chennai: risk mix, trends, zone rankings and the 7-day outlook.",
};

function shortLabel(dateKey: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, m, d] = dateKey.split("-");
  return `${months[Number(m) - 1] ?? m} ${d}`;
}

export default async function ReportPage() {
  const report = await getCityReport(14);

  if (!report) {
    return (
      <div className="space-y-6">
        <ReportTabs active="city" />
        <div className="rounded-2xl border border-dashed border-[#DADCE0] bg-white p-12 text-center text-sm text-[#5F6368]">
          No zones configured. Add zones in admin to generate the city report.
        </div>
      </div>
    );
  }

  const { zones, days, outlook, windowDays } = report;

  // Risk mix for the donut — today's forecast per zone.
  const riskCounts = new Map<RiskLevel, number>();
  for (const z of zones) {
    if (!z.risk) continue;
    riskCounts.set(z.risk, (riskCounts.get(z.risk) ?? 0) + 1);
  }
  const donutData = RISK_ORDER.filter((l) => l !== "LOW").map((level) => ({
    level,
    zones: riskCounts.get(level) ?? 0,
  }));

  // Headline stats (all derived from stored Open-Meteo snapshots).
  const cityTotal = days.reduce((acc, d) => acc + d.cityMm, 0);
  const wettestDay = days.reduce<{ date: string; mm: number } | null>(
    (best, d) => (!best || d.maxZoneMm > best.mm ? { date: d.date, mm: d.maxZoneMm } : best),
    null
  );
  const wettestZone = zones.reduce<{ name: string; mm: number } | null>(
    (best, z) => (!best || z.totalMm > best.mm ? { name: z.name, mm: z.totalMm } : best),
    null
  );
  const zonesAtRisk = zones.filter((z) => z.risk === "WARNING" || z.risk === "ALERT").length;

  const outlookTotal = outlook.reduce((acc, o) => acc + o.cityMm, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#202124]">City rainfall report</h1>
          <p className="mt-1 text-sm text-[#5F6368]">
            Last {windowDays} days of observations plus the 7-day outlook — generated from live Open-Meteo data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#5F6368]">
            Generated {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(report.generatedAt))} IST
          </span>
          <ExportButton
            options={[
              { type: "city", label: "Zone summary (14 days)" },
              { type: "city-days", label: "City daily series" },
            ]}
          />
          <PrintButton />
        </div>
      </div>

      <ReportTabs active="city" />

      {/* Headline stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={`${windowDays}-day city total`} value={`${cityTotal.toFixed(1)} mm`} accent="#1A73E8" />
        <StatCard
          label="Wettest day"
          value={wettestDay ? `${wettestDay.mm.toFixed(1)} mm` : "—"}
          sub={wettestDay ? shortLabel(wettestDay.date) : undefined}
          accent="#F59E0B"
        />
        <StatCard
          label="Wettest zone"
          value={wettestZone ? `${wettestZone.mm.toFixed(1)} mm` : "—"}
          sub={wettestZone?.name}
          accent="#0EA5A0"
        />
        <StatCard
          label="Zones ≥ warning today"
          value={String(zonesAtRisk)}
          sub={`of ${zones.length} zones`}
          accent={zonesAtRisk > 0 ? "#EF4444" : "#10B981"}
        />
      </section>

      {/* Risk mix + ranking */}
      <section className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <Panel title="Current risk mix" subtitle="Zones by highest active risk level">
          <RiskDonut data={donutData} />
          <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-[#5F6368]">
            {(["LOW", "WATCH", "WARNING", "ALERT"] as const).map((l) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RISK_META[l].color }} />
                {RISK_META[l].label}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Today's forecast by zone" subtitle="Ranked by expected 24h rainfall">
          <ZoneRankingChart data={zones.map((z) => ({ name: z.name, todayMm: z.todayMm, risk: z.risk }))} />
        </Panel>
      </section>

      {/* Trend + temperature */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Rainfall trend" subtitle={`City mean vs wettest zone, last ${windowDays} days`}>
          <RainfallTrendChart data={days} />
        </Panel>
        <Panel title="Temperature range" subtitle="City-mean daily min–max (°C)">
          <TemperatureRangeChart data={days} />
        </Panel>
      </section>

      {/* Outlook */}
      <Panel
        title="7-day outlook"
        subtitle={`Stacked by zone · city total ${outlookTotal.toFixed(1)} mm over the next 7 days`}
      >
        <OutlookStackedChart
          data={outlook.map((o) => ({ date: o.date, zoneMm: o.zoneMm }))}
          zoneNames={zones.map((z) => z.name)}
        />
      </Panel>

      {/* Zone detail: rainy days + wind */}
      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Rainy days per zone" subtitle={`Days with ≥0.5 mm in the last ${windowDays} days`}>
          <RainyDaysChart data={zones.map((z) => ({ name: z.name, rainyDays: z.rainyDays }))} windowDays={windowDays} />
        </Panel>
        <Panel title="Wind" subtitle="City-mean daily maximum wind speed">
          <WindChart data={days} />
        </Panel>
      </section>

      {/* Zone table */}
      <section className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-white shadow-[0_1px_2px_rgba(16,42,86,0.04)]">
        <div className="border-b border-[#DADCE0] px-5 py-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">Zone detail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F9FA] text-xs uppercase tracking-wide text-[#5F6368]">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Zone</th>
                <th className="px-5 py-2.5 font-semibold">Today</th>
                <th className="px-5 py-2.5 font-semibold">Risk</th>
                <th className="px-5 py-2.5 font-semibold">Window total</th>
                <th className="px-5 py-2.5 font-semibold">Rainy days</th>
                <th className="px-5 py-2.5 font-semibold">Wettest day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F4]">
              {zones.map((z) => (
                <tr key={z.zoneId} className="hover:bg-[#F8F9FA]/60">
                  <td className="px-5 py-2.5 font-semibold text-[#202124]">
                    {z.name} <span className="text-xs font-medium text-[#5F6368]">#{z.number}</span>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-[#202124]">
                    {z.todayMm !== null ? `${z.todayMm.toFixed(1)} mm` : "—"}
                  </td>
                  <td className="px-5 py-2.5">{z.risk ? <RiskBadge level={z.risk} size="sm" /> : "—"}</td>
                  <td className="px-5 py-2.5 tabular-nums text-[#202124]">{z.totalMm.toFixed(1)} mm</td>
                  <td className="px-5 py-2.5 tabular-nums text-[#202124]">{z.rainyDays}</td>
                  <td className="px-5 py-2.5 text-[#5F6368]">
                    {z.wettestDay ? `${z.wettestDay.mm.toFixed(1)} mm · ${shortLabel(z.wettestDay.date)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-[#5F6368]">
        All values come from stored Open-Meteo forecasts and observations (ECMWF/GFS daily feeds). Past days reflect
        the model&apos;s analysis for that date; future days are forecasts.
      </p>
    </div>
  );
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
    <div className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)]">
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
    <div className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)] sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#202124]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs font-medium text-[#5F6368]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/** Print support: browsers can save the report as PDF. */

