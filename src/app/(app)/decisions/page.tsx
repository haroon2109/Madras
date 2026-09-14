import {
  ensureFreshForecasts,
  getDashboardData,
  assessAndAlert,
} from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { RISK_META, recommendationsFor, type RiskLevel } from "@/lib/risk";
import { getZoneVulnerability, priorityScore, priorityLabel } from "@/lib/vulnerability";
import { getTodayTide, backflowRisk } from "@/lib/tide";
import { getRiverStatuses } from "@/lib/external";
import { getNowcast } from "@/lib/external";
import { resolveAlert, reopenAlert } from "./actions";
import {
  ShieldCheck,
  RefreshCw,
  CalendarDays,
  Lightbulb,
  Building2,
  ChevronRight,
  AlertTriangle,
  Eye,
  TriangleAlert,
  CheckCircle2,
  CloudRain,
  Waves,
} from "lucide-react";
import DecisionsHeroIllustration from "@/components/decisions/DecisionsHeroIllustration";
import Link from "next/link";

export const dynamic = "force-dynamic";

const LEVEL_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  WATCH: 1,
  WARNING: 2,
  ALERT: 3,
};

// Zone row icon styles — subtle pastels cycling through zones
const ZONE_ICON_STYLES = [
  { bg: "bg-blue-100",   text: "text-blue-500"   },
  { bg: "bg-sky-100",    text: "text-sky-500"    },
  { bg: "bg-teal-100",   text: "text-teal-500"   },
  { bg: "bg-cyan-100",   text: "text-cyan-600"   },
  { bg: "bg-indigo-100", text: "text-indigo-500" },
  { bg: "bg-violet-100", text: "text-violet-500" },
  { bg: "bg-blue-100",   text: "text-blue-600"   },
  { bg: "bg-sky-100",    text: "text-sky-600"    },
  { bg: "bg-teal-100",   text: "text-teal-600"   },
  { bg: "bg-cyan-100",   text: "text-cyan-500"   },
  { bg: "bg-indigo-100", text: "text-indigo-600" },
  { bg: "bg-violet-100", text: "text-violet-600" },
  { bg: "bg-blue-100",   text: "text-blue-500"   },
  { bg: "bg-sky-100",    text: "text-sky-500"    },
  { bg: "bg-teal-100",   text: "text-teal-500"   },
];

const ZONE_ICONS = [
  CloudRain, Building2, Waves, Building2, CloudRain,
  Waves, CloudRain, Building2, Waves, CloudRain,
  Building2, Waves, CloudRain, Building2, Waves,
];

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles: Record<RiskLevel, { pill: string; dot: string }> = {
    LOW:     { pill: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500" },
    WATCH:   { pill: "bg-amber-50 text-amber-700 border border-amber-200",       dot: "bg-amber-500"   },
    WARNING: { pill: "bg-orange-50 text-orange-700 border border-orange-200",    dot: "bg-orange-500"  },
    ALERT:   { pill: "bg-red-50 text-red-700 border border-red-200",             dot: "bg-red-500"     },
  };
  const s = styles[level];
  const meta = RISK_META[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {meta.label}
    </span>
  );
}

function QuickInsightRow({
  count,
  label,
  sub,
  iconBg,
  icon: Icon,
}: {
  count: number;
  label: string;
  sub: string;
  iconBg: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-lg font-extrabold leading-none text-[#202124]">{count}</div>
        <div className="mt-0.5 text-[13px] font-semibold text-[#202124]">{label}</div>
        <div className="text-[12px] text-[#5F6368]">{sub}</div>
      </div>
    </div>
  );
}

export default async function DecisionsPage() {
  await ensureFreshForecasts();
  const alertsCreated = await assessAndAlert();
  const [{ zones }, tide, rivers, nowcast] = await Promise.all([
    getDashboardData(),
    getTodayTide(),
    getRiverStatuses(),
    getNowcast(2),
  ]);

  // Zones whose upstream river cell is rising — unioned with backflow flags.
  const risingRivers = rivers.filter((r) => r.rising);
  const risingRiverNames = risingRivers.map((r) => r.station.river).join(" & ");

  const rows = zones
    .filter((z) => z.today)
    .map((z) => {
      const { level, actions } = recommendationsFor(z.today!.precipMm, z.zone);
      // Feature 4 — chronic vulnerability + forecast risk = priority.
      const vuln = getZoneVulnerability(z.zone.number);
      const priority = vuln ? priorityScore(LEVEL_ORDER[level], vuln.score) : 0;
      // Feature 9 — coastal drainage backflow flag.
      const backflow = backflowRisk(z.zone.number, z.today!.precipMm, z.zone.warningThreshold, tide);
      return { summary: z, level, actions, priority, vuln, backflow };
    })
    .sort((a, b) => b.priority - a.priority);

  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    include: { zone: true },
  });

  const openCount  = alerts.filter((a) => !a.resolvedAt).length;
  const warnCount  = rows.filter((r) => r.level === "WARNING").length;
  const alertCount = rows.filter((r) => r.level === "ALERT").length;
  const highRisk   = warnCount + alertCount;

  const nowIST = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date()) + " (IST)";

  return (
    <div className="space-y-6">
      {/* ─── Hero ─── */}
      <section
        aria-label="Decision support overview"
        className="relative overflow-hidden rounded-[28px] border border-[#DADCE0] bg-white shadow-[0_1px_3px_rgba(16,42,86,0.06)]"
        style={{ minHeight: 210 }}
      >
        {/* Left content */}
        <div className="relative z-10 flex flex-col justify-center px-8 py-8 lg:max-w-[55%] lg:py-10 lg:pl-12">
          <span className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1A73E8]">
            Decision Support
          </span>
          <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-tight text-[#202124] sm:text-[34px]">
            Smarter Decisions for
            <br />a Safer Chennai
          </h1>
          <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-[#5F6368]">
            Actionable insights and risk assessments for the next 24 hours,
            helping the ICCC respond faster and more effectively.
          </p>
          <p className="mt-2 text-[12px] font-semibold text-[#0e7490]">
            High tide {tide.highTideAt} IST · {tide.highTideM.toFixed(2)} m ({tide.source === "manual" ? "harbour reading" : "astronomical estimate"}) — coastal zones at warning level or above are flagged for backflow.
          </p>
          {risingRivers.length > 0 && (
            <p className="mt-1 text-[12px] font-semibold text-[#b45309]">
              River rising: {risingRiverNames} basin discharge above advisory level ({risingRivers[0].note}) — GloFAS.
            </p>
          )}

          {alertsCreated > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
              <AlertTriangle size={15} aria-hidden="true" />
              {alertsCreated} new alert{alertsCreated > 1 ? "s" : ""} raised
            </div>
          )}
        </div>

        {/* Right illustration */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block">
          <DecisionsHeroIllustration className="h-full w-full" />
        </div>

        {/* Floating info card */}
        <div className="absolute right-6 top-6 z-20 hidden xl:block">
          <div className="flex items-center gap-3 rounded-2xl border border-[#DADCE0] bg-white/95 px-4 py-3 shadow-lg shadow-blue-900/8 backdrop-blur-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF3FF]">
              <ShieldCheck size={16} className="text-[#1A73E8]" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-[#202124]">Real-time risk analysis</div>
              <div className="text-[11px] text-[#5F6368]">Zone-wise monitoring • Recommended actions</div>
            </div>
          </div>
        </div>

        {/* Compact illustration on mobile */}
        <div className="relative z-0 h-40 w-full lg:hidden">
          <DecisionsHeroIllustration className="h-full w-full" />
        </div>
      </section>

      {/* ─── Two-column layout ─── */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* ── LEFT: Main risk assessment table ── */}
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-[20px] border border-[#DADCE0] bg-white shadow-[0_1px_3px_rgba(16,42,86,0.06)]">
            {/* Card header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EDF0F2] px-6 py-5">
              <div>
                <h2 className="text-[18px] font-extrabold text-[#202124]">Zone-wise Risk Assessment</h2>
                <p className="mt-0.5 text-[13px] text-[#5F6368]">
                  Current risk level and recommended actions for all Chennai zones.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {/* Date pill */}
                <div className="flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-[#F8F9FA] px-3.5 py-2 text-[12px] font-semibold text-[#5F6368]">
                  <CalendarDays size={13} aria-hidden="true" />
                  {nowIST}
                </div>
                {/* Refresh */}
                <form>
                  <button
                    type="submit"
                    formAction={async () => {
                      "use server";
                      const { revalidatePath } = await import("next/cache");
                      revalidatePath("/decisions");
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-4 py-2 text-[13px] font-bold text-white shadow-sm shadow-blue-400/25 transition-all hover:bg-[#1765CC] hover:shadow-md active:scale-95"
                  >
                    <RefreshCw size={13} aria-hidden="true" />
                    Refresh
                  </button>
                </form>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#EDF0F2] bg-[#F8F9FA]">
                    {["Zone", "24H Forecast", "Risk", "Priority", "Flags", "Recommended Actions", ""].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#5F6368]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F3F4]">
                  {rows.map(({ summary, level, actions, priority, vuln, backflow }, idx) => {
                    const iconStyle = ZONE_ICON_STYLES[idx % ZONE_ICON_STYLES.length];
                    const ZoneIcon = ZONE_ICONS[idx % ZONE_ICONS.length];
                    return (
                      <tr
                        key={summary.zone.id}
                        className="group align-middle transition-colors duration-150 hover:bg-[#F8F9FA]"
                      >
                        {/* Zone */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconStyle.bg}`}
                            >
                              <ZoneIcon size={15} className={iconStyle.text} aria-hidden="true" />
                            </div>
                            <div>
                              <div className="text-[13px] font-bold text-[#202124]">{summary.zone.name}</div>
                              <div className="text-[11px] text-[#5F6368]">Zone {summary.zone.number}</div>
                            </div>
                          </div>
                        </td>

                        {/* 24H Forecast */}
                        <td className="px-5 py-4">
                          <div className="text-[14px] font-bold tabular-nums text-[#202124]">
                            {summary.today!.precipMm.toFixed(1)} mm
                          </div>
                          <div className="text-[12px] text-[#5F6368]">
                            {summary.today!.precipProbMax}% chance
                          </div>
                        </td>

                        {/* Risk badge */}
                        <td className="px-5 py-4">
                          <RiskBadge level={level} />
                        </td>

                        {/* Feature 4 — priority */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums ${
                              priority >= 75 ? "bg-red-50 text-red-700"
                              : priority >= 60 ? "bg-orange-50 text-orange-700"
                              : priority >= 35 ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {priority}
                          </span>
                          <div className="mt-1 text-[11px] font-semibold text-[#5F6368]">
                            {priorityLabel(priority)}{vuln ? ` · vuln ${vuln.score}/5` : ""}
                          </div>
                        </td>

                        {/* Feature 9 — backflow + river-rise + vulnerability flags */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            {backflow && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-800">
                                <Waves size={12} /> backflow risk
                              </span>
                            )}
                            {risingRivers.length > 0 && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800"
                                title={risingRivers.map((r) => `${r.station.name}: ${r.note}`).join(" · ")}
                              >
                                <Waves size={12} /> river rising ({risingRiverNames})
                              </span>
                            )}
                            {vuln && vuln.lowLyingAreas.slice(0, 1).map((a) => (
                              <span key={a} className="max-w-[160px] truncate text-[11px] font-medium text-[#5F6368]" title={vuln.lowLyingAreas.join(", ")}>
                                {a}
                              </span>
                            ))}
                            {!backflow && risingRivers.length === 0 && !vuln && (
                              <span className="text-[11px] text-[#5F6368]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Recommended actions */}
                        <td className="px-5 py-4">
                          <ul className="space-y-1">
                            {actions.map((a) => (
                              <li key={a} className="flex items-start gap-2 text-[13px] text-[#3C4043]">
                                <span
                                  className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: RISK_META[level].color }}
                                />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </td>

                        {/* Chevron */}
                        <td className="px-4 py-4">
                          <ChevronRight
                            size={16}
                            className="text-[#BDC1C6] transition-colors group-hover:text-[#1A73E8]"
                            aria-hidden="true"
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[14px] text-[#5F6368]">
                        No forecast data yet — click <strong>Refresh</strong> to pull live forecasts.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Alert log (below table on desktop) ── */}
          {alerts.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[#5F6368]">
                Alert Log
                <span className="rounded-full bg-[#EDF0F2] px-2.5 py-0.5 text-xs font-bold text-[#5F6368]">
                  {openCount} open
                </span>
              </h3>
              <div className="space-y-3">
                {alerts.map((a) => {
                  const meta = RISK_META[a.level as RiskLevel];
                  return (
                    <div
                      key={a.id}
                      className={`overflow-hidden rounded-[16px] border bg-white shadow-sm ${
                        a.resolvedAt ? "border-[#DADCE0] opacity-70" : "border-[#DADCE0]"
                      }`}
                      style={a.resolvedAt ? undefined : { borderLeftColor: meta.color, borderLeftWidth: 4 }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <RiskBadge level={a.level as RiskLevel} />
                          <div>
                            <div className="text-[13px] font-bold text-[#202124]">{a.title}</div>
                            <div className="text-[11px] text-[#5F6368]">
                              {a.zone.name} ·{" "}
                              {new Intl.DateTimeFormat("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: "Asia/Kolkata",
                              }).format(a.createdAt)}{" "}
                              IST
                            </div>
                          </div>
                        </div>
                        <form
                          action={async () => {
                            "use server";
                            if (a.resolvedAt) await reopenAlert(a.id);
                            else await resolveAlert(a.id);
                          }}
                        >
                          <button
                            type="submit"
                            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                              a.resolvedAt
                                ? "border border-[#DADCE0] text-[#5F6368] hover:bg-[#F8F9FA]"
                                : "border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {a.resolvedAt ? "Reopen" : "Mark resolved"}
                          </button>
                        </form>
                      </div>
                      <p className="px-5 pb-4 text-[13px] text-[#5F6368]">{a.message}</p>
                      {(JSON.parse(a.actions) as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-2 px-5 pb-4">
                          {(JSON.parse(a.actions) as string[]).map((action) => (
                            <span
                              key={action}
                              className="rounded-full bg-[#F1F3F4] px-3 py-1 text-[11px] font-semibold text-[#5F6368]"
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Sidebar cards ── */}
        <div className="flex flex-col gap-5 xl:w-72 xl:shrink-0">
          {/* Immediate Action card */}
          <div className="overflow-hidden rounded-[20px] border border-[#DADCE0] bg-white shadow-[0_1px_3px_rgba(16,42,86,0.06)]">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#EAF3FF]">
                  <svg viewBox="0 0 48 48" fill="none" className="h-9 w-9" aria-hidden="true">
                    {/* Stylized rain cloud icon */}
                    <ellipse cx="24" cy="18" rx="14" ry="10" fill="#BDD9F5" />
                    <ellipse cx="15" cy="20" rx="9"  ry="7"  fill="#C8E4F8" />
                    <ellipse cx="33" cy="20" rx="8"  ry="6"  fill="#C0DDF6" />
                    <ellipse cx="24" cy="24" rx="14" ry="8"  fill="#A0C8EC" />
                    <g stroke="#5AACDC" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="30" x2="15" y2="38" />
                      <line x1="24" y1="31" x2="21" y2="39" />
                      <line x1="30" y1="30" x2="27" y2="38" />
                    </g>
                  </svg>
                </div>
                <div>
                  <div className="text-[15px] font-extrabold text-[#202124]">Need Immediate Action?</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#5F6368]">
                    View high-risk zones, active alerts and recommended steps.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              <Link
                href="/decisions#alerts"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1A73E8] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm shadow-blue-400/20 transition-all hover:bg-[#1765CC] hover:shadow-md"
              >
                View Alerts
                <ChevronRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Next-2h nowcast card (real HourlyRainfall data) */}
          <div className="rounded-[20px] border border-[#DADCE0] bg-white px-5 py-5 shadow-[0_1px_3px_rgba(16,42,86,0.06)]">
            <div className="mb-1 flex items-center gap-2">
              <CloudRain size={16} className="text-[#1A73E8]" aria-hidden="true" />
              <h3 className="text-[14px] font-extrabold text-[#202124]">Rain next 2 hours</h3>
            </div>
            <p className="mb-2 text-[11px] text-[#5F6368]">From the hourly ECMWF/GFS ingestion, zones with expected rain only.</p>
            {(() => {
              const rainy = nowcast.filter((n) => (n.next2hMm ?? 0) > 0).sort((a, b) => (b.next2hMm ?? 0) - (a.next2hMm ?? 0));
              if (rainy.length === 0) {
                return (
                  <p className="py-3 text-[13px] text-[#5F6368]">
                    No rain expected citywide in the next 2 hours (or hourly data not loaded yet — run <code>npm run ingest && npm run process && npm run load</code>).
                  </p>
                );
              }
              return (
                <ul className="divide-y divide-[#F1F3F4]">
                  {rainy.slice(0, 5).map((n) => (
                    <li key={n.zoneId} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0 truncate text-[13px] font-semibold text-[#202124]">
                        Zone {n.zoneNumber} · {n.zoneName}
                      </span>
                      <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#1A73E8]">
                        {n.next2hMm!.toFixed(1)} mm
                      </span>
                    </li>
                  ))
                  }
                </ul>
              );
            })()}
          </div>

          {/* Quick Insights card */}
          <div className="rounded-[20px] border border-[#DADCE0] bg-white px-5 py-5 shadow-[0_1px_3px_rgba(16,42,86,0.06)]">
            <div className="mb-1 flex items-center gap-2">
              <Lightbulb size={16} className="text-[#1A73E8]" aria-hidden="true" />
              <h3 className="text-[14px] font-extrabold text-[#202124]">Quick Insights</h3>
            </div>
            <div className="divide-y divide-[#F1F3F4]">
              <QuickInsightRow
                count={highRisk}
                label="High Risk Zones"
                sub="No severe risk at the moment"
                iconBg="bg-red-50"
                icon={TriangleAlert}
              />
              <QuickInsightRow
                count={warnCount}
                label="Warning Zones"
                sub="Monitor closely"
                iconBg="bg-amber-50"
                icon={Eye}
              />
              <QuickInsightRow
                count={rows.length}
                label="Active Zones"
                sub="Under surveillance"
                iconBg="bg-emerald-50"
                icon={CheckCircle2}
              />
            </div>
          </div>

          {/* Supporting ICCC card */}
          <div className="overflow-hidden rounded-[20px] border border-[#DADCE0] bg-white shadow-[0_1px_3px_rgba(16,42,86,0.06)]">
            <div className="px-5 pt-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAF3FF]">
                  <Building2 size={14} className="text-[#1A73E8]" aria-hidden="true" />
                </div>
                <h3 className="text-[14px] font-extrabold text-[#202124]">Supporting ICCC</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-[#5F6368]">
                Better information.
                <br />
                Faster response. Safer Chennai.
              </p>
            </div>

            {/* Coastal wave footer illustration */}
            <div className="mt-4 overflow-hidden" style={{ height: 80 }}>
              <svg
                viewBox="0 0 280 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full"
                preserveAspectRatio="xMidYMax slice"
                aria-hidden="true"
              >
                {/* Sky */}
                <rect x="0" y="0" width="280" height="80" fill="#EAF5FD" />
                {/* Distant buildings */}
                <g fill="#B4D0E8" opacity="0.6">
                  <rect x="10"  y="25" width="14" height="40" />
                  <rect x="30"  y="15" width="18" height="50" />
                  <rect x="55"  y="30" width="12" height="35" />
                  <rect x="75"  y="10" width="22" height="55" />
                  <rect x="105" y="22" width="16" height="43" />
                  <rect x="130" y="8"  width="24" height="57" />
                  <rect x="165" y="20" width="18" height="45" />
                  <rect x="195" y="14" width="20" height="51" />
                  <rect x="228" y="26" width="14" height="39" />
                  <rect x="252" y="18" width="22" height="47" />
                </g>
                {/* Waves */}
                <path d="M0 55 Q35 45 70 55 Q105 65 140 55 Q175 45 210 55 Q245 65 280 55 L280 80 L0 80 Z" fill="#8AC6E4" />
                <path d="M0 62 Q35 52 70 62 Q105 72 140 62 Q175 52 210 62 Q245 72 280 62 L280 80 L0 80 Z" fill="#5EB3D6" />
                {/* Palm trees */}
                <g fill="#2A6E42">
                  <circle cx="88"  cy="48" r="8" />
                  <rect   x="86"  y="50" width="4" height="14" fill="#5E3D1C" />
                  <circle cx="200" cy="46" r="9" />
                  <rect   x="198" y="48" width="4" height="16" fill="#5E3D1C" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}