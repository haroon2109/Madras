import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getZoneReport } from "@/lib/data";
import RiskBadge from "@/components/RiskBadge";
import ReportTabs from "@/components/report/ReportTabs";
import ExportButton from "@/components/report/ExportButton";
import PrintButton from "@/components/report/PrintButton";
import ZoneReportChart from "@/components/report/ZoneReportChart";
import ZonePicker from "@/components/ZonePicker";
// ZonePicker is a Client Component ("use client") — keeps onChange out of this Server Component.
import { shortLabel } from "@/components/report/labels";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Zone report — Madras",
  description: "Per-zone rainfall report: daily window, outlook, and window statistics.",
};

export default async function ZoneReportPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>;
}) {
  const sp = await searchParams;
  const zones = await prisma.zone.findMany({ where: { isActive: true }, orderBy: { number: "asc" } });
  const selectedZoneId = zones.find((z) => z.id === sp.zone)?.id ?? zones[0]?.id ?? "";

  const report = selectedZoneId ? await getZoneReport(selectedZoneId, 14) : null;

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ReportTabs active="zone" />
          <PrintButton />
        </div>
        <div className="rounded-2xl border border-dashed border-[#DADCE0] bg-white p-12 text-center text-sm text-[#5F6368]">
          No zones configured. <Link href="/dashboard" className="font-medium text-[#1A73E8] hover:underline">Return to the dashboard</Link> or ask an administrator to configure zones.
        </div>
      </div>
    );
  }

  const { zone, stats, days, outlook, cityMeanMmByDay } = report;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#202124]">Zone rainfall report</h1>
          <p className="mt-1 text-sm text-[#5F6368]">
            {zone.name} — last {report.windowDays} days plus the 7-day outlook, from stored Open-Meteo data.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ZonePicker
            zones={zones.map((z) => ({ id: z.id, number: z.number, name: z.name }))}
            selectedId={zone.id}
          />
          <ExportButton
            options={[
              { type: "zone", label: `Daily series — ${zone.name}` },
              { type: "zone-outlook", label: "7-day outlook" },
            ]}
          />
          <PrintButton />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportTabs active="zone" />
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5F6368]">
          <span className="rounded-full bg-[#F1F3F4] px-3 py-1">Zone #{zone.number}</span>
          <span className="rounded-full bg-[#F1F3F4] px-3 py-1 tabular-nums">
            {zone.latitude.toFixed(3)}, {zone.longitude.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Zone heading */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-[#202124]">
          Zone {zone.number} — {zone.name}
        </h2>
        {stats && (
          <span className="text-xs font-semibold text-[#5F6368]">
            {days.length} past days · {outlook.length} outlook days
          </span>
        )}
      </div>

      {/* Window stats */}
      {stats ? (
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={`${report.windowDays}-day total`} value={`${stats.totalMm.toFixed(1)} mm`} sub={`mean ${stats.meanMm.toFixed(1)} mm/day`} accent="#1A73E8" />
          <StatCard
            label="Wettest day"
            value={stats.wettestDay ? `${stats.wettestDay.mm.toFixed(1)} mm` : "—"}
            sub={stats.wettestDay ? shortLabel(stats.wettestDay.date) : undefined}
            accent="#F59E0B"
          />
          <StatCard label="Rainy days (≥0.5 mm)" value={String(stats.rainyDays)} sub={`of ${days.length} days`} accent="#0EA5A0" />
          <StatCard
            label="Days ≥ warning"
            value={String(stats.warningDays)}
            sub={stats.warningDays > 0 ? "Response triggered" : "None"}
            accent={stats.warningDays > 0 ? "#EF4444" : "#10B981"}
          />
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#DADCE0] bg-white p-10 text-center text-sm text-[#5F6368]">
          No stored forecasts for this zone yet — refresh the forecast data first.
        </div>
      )}

      {/* Daily series chart */}
      {days.length > 0 && (
        <Panel title="Daily rainfall" subtitle="Zone bars vs city mean line (past window)">
          <ZoneReportChart
            data={days.map((d) => ({ date: d.date, precipMm: d.precipMm, risk: d.risk }))}
            cityData={cityMeanMmByDay}
          />
        </Panel>
      )}

      {/* Past table */}
      {days.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-white shadow-[0_1px_2px rgba(16,42,86,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DADCE0] px-5 py-3.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">Daily detail — past window</h2>
            <span className="text-xs text-[#5F6368]">{days.length} days</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F9FA] text-xs uppercase tracking-wide text-[#5F6368]">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-5 py-2.5 font-semibold">Rainfall</th>
                  <th className="px-5 py-2.5 font-semibold">Chance</th>
                  <th className="px-5 py-2.5 font-semibold">Temp (min–max)</th>
                  <th className="px-5 py-2.5 font-semibold">Wind max</th>
                  <th className="px-5 py-2.5 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F4]">
                {[...days].reverse().map((d) => (
                  <tr key={d.date} className="hover:bg-[#F8F9FA]/60">
                    <td className="px-5 py-2.5 font-semibold text-[#202124]">{shortLabel(d.date)}</td>
                    <td className="px-5 py-2.5 tabular-nums font-semibold text-[#202124]">{d.precipMm.toFixed(1)} mm</td>
                    <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">{d.precipProbMax}%</td>
                    <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">
                      {d.tempMinC.toFixed(1)}–{d.tempMaxC.toFixed(1)} °C
                    </td>
                    <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">{d.windMaxKmh.toFixed(0)} km/h</td>
                    <td className="px-5 py-2.5">
                      <RiskBadge level={d.risk} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Outlook table */}
      {outlook.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-white shadow-[0_1px_2px rgba(16,42,86,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DADCE0] px-5 py-3.5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">7-day outlook</h2>
            <span className="text-xs text-[#5F6368]">
              Total {outlook.reduce((a, o) => a + o.precipMm, 0).toFixed(1)} mm
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8F9FA] text-xs uppercase tracking-wide text-[#5F6368]">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-5 py-2.5 font-semibold">Forecast</th>
                  <th className="px-5 py-2.5 font-semibold">Chance</th>
                  <th className="px-5 py-2.5 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F4]">
                {outlook.map((o) => (
                  <tr key={o.date} className="hover:bg-[#F8F9FA]/60">
                    <td className="px-5 py-2.5 font-semibold text-[#202124]">{shortLabel(o.date)}</td>
                    <td className="px-5 py-2.5 tabular-nums font-semibold text-[#202124]">{o.precipMm.toFixed(1)} mm</td>
                    <td className="px-5 py-2.5 tabular-nums text-[#5F6368]">{o.precipProbMax}%</td>
                    <td className="px-5 py-2.5">
                      <RiskBadge level={o.risk} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-[#5F6368]">
        Past days reflect the model&apos;s latest analysis for each date; outlook days are forecasts. Risk levels use
        this zone&apos;s configured thresholds.
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
