import Link from "next/link";
import {
  CloudRain,
  Eye,
  Droplets,
  Waves,
  Activity,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  ensureFreshForecasts,
  getActiveAlerts,
  getDashboardData,
  getActiveIncidents,
  getReservoirStatus,
} from "@/lib/data";
import { RISK_META, RISK_ORDER, RISK_SEVERITY } from "@/lib/risk";
import { getVulnerabilityConfig, priorityScore } from "@/lib/vulnerability";
import { getTodayTide, backflowRisk } from "@/lib/tide";
import { fetchRadarFrames } from "@/lib/external";
import RainMap from "@/components/RainMap";
import ZoneCard from "@/components/ZoneCard";
import RiskBadge from "@/components/RiskBadge";
import AlertBanner from "@/components/dashboard/AlertBanner";
import StatCard from "@/components/dashboard/StatCard";
import { AlertsSinceLastVisit } from "@/components/dashboard/NotificationBell";
import { TOTAL_WARD_COUNT } from "@/lib/wards";

export const dynamic = "force-dynamic";

/** Bento cell shell — one surface, consistent padding and radius. */
function Cell({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`bento-cell p-6 ${className}`}>{children}</Tag>
  );
}

function CellHeader({
  title,
  subtitle,
  href,
  linkLabel,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-semibold text-[#202124]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-[#80868B]">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-[#1A73E8] transition-colors duration-200 hover:bg-[#E8F0FE]"
        >
          {linkLabel}
          <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const isSignedIn = !!session?.user;
  const isAdmin = session?.user?.role === "ADMIN";
  await ensureFreshForecasts();
  const [{ zones, citySummary, lastUpdated }, incidents, reservoirs, tide, alerts, radar] =
    await Promise.all([
      getDashboardData(),
      isAdmin ? getActiveIncidents() : Promise.resolve([]),
      getReservoirStatus(),
      getTodayTide(),
      getActiveAlerts(8),
      fetchRadarFrames(),
    ]);

  const vuln = getVulnerabilityConfig();
  const vulnByZone = new Map(vuln.zoneVulnerability.map((v) => [v.zoneNumber, v]));

  const ranked = zones
    .filter((z) => z.today)
    .sort((a, b) => (b.today?.precipMm ?? 0) - (a.today?.precipMm ?? 0));

  const mapZones = zones.map((z) => {
    const v = vulnByZone.get(z.zone.number);
    const priority = z.today && v ? priorityScore(RISK_SEVERITY[z.today.risk], v.score) : null;
    return {
      id: z.zone.id,
      number: z.zone.number,
      name: z.zone.name,
      latitude: z.zone.latitude,
      longitude: z.zone.longitude,
      precipMm: z.today?.precipMm ?? null,
      risk: z.today?.risk ?? null,
      priority,
    };
  });
  const mapIncidents = incidents.map((i) => ({
    id: i.id,
    latitude: i.latitude,
    longitude: i.longitude,
    depthCm: i.depthCm,
    zoneName: i.zoneName,
    status: i.status,
  }));
  const backflowZones = zones.filter(
    (z) => z.today && backflowRisk(z.zone.number, z.today.precipMm, z.zone.warningThreshold, tide)
  ).length;

  const notificationAlerts = alerts.map((alert) => ({
    ...alert,
    createdAt: alert.createdAt.toISOString(),
  }));

  const lastUpdatedLabel = lastUpdated
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(lastUpdated)
    : null;

  return (
    <div className="animate-in space-y-6">
        {/* Sign-in prompt for public users */}
        {!isSignedIn && (
          <div className="rounded-2xl border border-[#DCE8F5] bg-gradient-to-r from-[#EDF6FF] to-white p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#102A56]">Chennai Rainfall Intelligence</h2>
                <p className="mt-1 text-sm text-[#57718F]">
                  Public forecast: 24-hour rainfall outlook for all 15 monitoring zones. Sign in for
                  analytics, decision support, model accuracy and reports.
                </p>
              </div>
              <Link
                href="/login"
                className="shrink-0 rounded-full bg-[#1478F2] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1068D6]"
              >
                Sign in for more
              </Link>
            </div>
          </div>
        )}

        {/* ── KPI strip ── */}
        <div className="stagger-group grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isSignedIn && (
            <StatCard
              label="Total Wards"
              value={TOTAL_WARD_COUNT}
              icon={<Activity size={18} />}
            />
          )}
          <StatCard
            label="Active Zones"
            value={citySummary.total}
            icon={<CloudRain size={18} />}
          />
          <StatCard
            label="On Watch"
            value={citySummary.watch}
            suffix=" zones"
            icon={<Eye size={18} />}
            tone={citySummary.watch > 0 ? "amber" : "green"}
          />
          <StatCard
            label="Critical Alerts"
            value={citySummary.alert}
            suffix=" active"
            icon={<AlertTriangle size={18} />}
            tone={citySummary.alert > 0 ? "red" : "green"}
          />
        </div>

        {/* Alerts raised since last visit (real DB rows) */}
        <AlertsSinceLastVisit alerts={notificationAlerts} />

        {/* Status banners */}
        {citySummary.alert > 0 && (
          <AlertBanner
            severity="critical"
            title="Critical Weather Alert"
            message={`${citySummary.alert} zone${citySummary.alert === 1 ? " is" : "s are"} under critical alert status. Immediate action recommended.`}
            actionHref="/decisions"
            actionLabel="View all alerts"
          />
        )}
        {citySummary.warning > 0 && (
          <AlertBanner
            severity="warning"
            title="Weather Warning"
            message={`${citySummary.warning} zone${citySummary.warning === 1 ? " is" : "s are"} under heavy-rain warning. Monitor conditions closely.`}
            actionHref="/decisions"
            actionLabel="Open decision support"
          />
        )}
        {citySummary.watch === 0 && citySummary.alert === 0 && (
          <AlertBanner
            severity="success"
            title="All Clear"
            message="No zones above watch threshold in the latest forecast. Continue routine monitoring."
          />
        )}

        {/* ── Bento grid ── */}
        <div className="stagger-group grid gap-5 lg:grid-cols-3">
          {/* Map — 2×2 hero cell */}
          <Cell className="lg:col-span-2 lg:row-span-2">
            <CellHeader
              title="Chennai Zone Map"
              subtitle="Live 24h rainfall forecast by monitoring zone"
              href={isSignedIn ? "/analytics" : undefined}
              linkLabel={isSignedIn ? "Analytics" : undefined}
            />
            <RainMap
              zones={mapZones}
              incidents={isAdmin ? mapIncidents : []}
              features={vuln.features}
              radar={radar ? { host: radar.host, frames: radar.past } : null}
              className="h-[360px] w-full overflow-hidden rounded-xl"
            />
            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
              <span className="uppercase tracking-wide text-[#80868B]">Risk</span>
              {RISK_ORDER.map((level) => (
                <span key={level} className="flex items-center gap-1.5 text-[#5F6368]">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: RISK_META[level].color }}
                  />
                  {RISK_META[level].label}
                </span>
              ))}
              {isAdmin && mapIncidents.length > 0 && (
                <span className="flex items-center gap-1.5 text-[#5F6368]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E37400] ring-2 ring-white" />
                  Waterlogging ({mapIncidents.length})
                </span>
              )}
              {radar && (
                <span className="flex items-center gap-1.5 text-[#5F6368]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#22d3ee] ring-2 ring-white" />
                  Live radar (RainViewer)
                </span>
              )}
            </div>
          </Cell>

          {/* Highest expected rainfall — tall cell */}
          <Cell className="flex flex-col">
            <CellHeader
              title="Highest Expected Rainfall"
              subtitle="Top zones by 24h precipitation"
            />
            {citySummary.maxPrecip && (
              <div className="mb-3 inline-flex w-fit items-center rounded-full bg-[#E8F0FE] px-3 py-1 text-xs font-medium text-[#1A73E8]">
                Peak {citySummary.maxPrecip.mm.toFixed(1)} mm · {citySummary.maxPrecip.zoneName}
              </div>
            )}
            <div className="-mx-2 flex-1 divide-y divide-[#EDF0F2]">
              {ranked.slice(0, 6).map((z, i) => (
                <div
                  key={z.zone.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5"
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold tabular-nums ${
                      i === 0 ? "bg-[#1A73E8] text-white" : "bg-[#F1F3F4] text-[#5F6368]"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#202124]">
                    {z.zone.name}
                  </span>
                  {z.today && <RiskBadge level={z.today.risk} size="sm" />}
                  <span className="w-14 text-right text-sm font-semibold tabular-nums text-[#202124]">
                    {z.today?.precipMm.toFixed(1)}
                    <span className="ml-1 text-[10px] font-normal text-[#80868B]">mm</span>
                  </span>
                </div>
              ))}
              {ranked.length === 0 && (
                <p className="py-8 text-center text-sm text-[#80868B]">
                  No forecast data available yet.
                </p>
              )}
            </div>
          </Cell>

          {/* Tide status */}
          <Cell>
            <CellHeader
              title="Tide Status"
              subtitle={tide.source === "manual" ? "Harbour reading" : "Astronomical estimate"}
            />
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums text-[#202124]">
                {tide.highTideM.toFixed(2)}
              </span>
              <span className="text-sm text-[#5F6368]">m at {tide.highTideAt} IST</span>
            </div>
            {backflowZones > 0 ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#FEF7E0] px-3 py-2.5">
                <Waves size={15} className="shrink-0 text-[#E37400]" />
                <span className="text-[13px] font-medium text-[#8a5000]">
                  {backflowZones} coastal zone{backflowZones === 1 ? "" : "s"} at drainage-backflow
                  risk
                </span>
              </div>
            ) : (
              <p className="mt-4 text-[13px] text-[#80868B]">
                No coastal backflow flags in the current outlook.
              </p>
            )}
          </Cell>

          {/* Reservoirs */}
          <Cell className="lg:col-span-2">
            <CellHeader
              title="Reservoir Storage"
              subtitle="Combined level across Chennai's drinking-water lakes"
              href="/season"
              linkLabel="Season & Climate"
            />
            {reservoirs.combinedPct !== null ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tabular-nums text-[#202124]">
                    {reservoirs.combinedPct}%
                  </span>
                  <span className="text-sm text-[#5F6368]">combined · {reservoirs.readingsToday} readings today</span>
                </div>
                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[#1A73E8] transition-all duration-300"
                    style={{ width: `${reservoirs.combinedPct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] font-medium text-[#80868B]">
                  <span>0%</span>
                  <span>{reservoirs.combinedPct > 80 ? "Caution above 80%" : "Normal range"}</span>
                  <span>100%</span>
                </div>
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-[#5F6368]">
                No storage readings logged yet. Analysts enter reservoir levels in{" "}
                <Link href="/season" className="font-medium text-[#1A73E8] hover:underline">
                  Season &amp; Climate
                </Link>{" "}
                — the platform never shows placeholder numbers.
              </p>
            )}
          </Cell>

          {/* Incidents (admin) */}
          {isAdmin && (
            <Cell>
              <CellHeader
                title="Active Waterlogging"
                subtitle="Open + verified field reports"
                href="/incidents"
                linkLabel="Incidents"
              />
              {incidents.length > 0 ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tabular-nums text-[#202124]">
                      {incidents.length}
                    </span>
                    <span className="text-sm text-[#5F6368]">
                      {incidents.length === 1 ? "report" : "reports"} citywide
                    </span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {incidents.slice(0, 3).map((i) => (
                      <li
                        key={i.id}
                        className="flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-[13px]"
                      >
                        <Droplets size={14} className="shrink-0 text-[#E37400]" />
                        <span className="min-w-0 flex-1 truncate font-medium text-[#202124]">
                          Zone {i.zoneNumber} · {i.zoneName}
                        </span>
                        <span className="shrink-0 text-[11px] font-medium text-[#80868B]">
                          {i.depthCm > 0 ? `${i.depthCm} cm` : i.status.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-[13px] text-[#80868B]">
                  No open waterlogging reports. The map layer stays clean until field teams file
                  one.
                </p>
              )}
            </Cell>
          )}
        </div>

        {/* ── All zones ── */}
        <section id="zones" className="scroll-mt-24 pt-4">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-[#202124]">
                All Zones — 24h Forecast &amp; 7-Day Outlook
              </h2>
              <p className="mt-1 text-[13px] text-[#80868B]">
                {zones.length} monitoring zones across Greater Chennai
                {lastUpdatedLabel ? ` · updated ${lastUpdatedLabel} IST` : ""}
              </p>
            </div>
            {isSignedIn && (
              <Link
                href="/decisions"
                className="inline-flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-5 py-2.5 text-sm font-medium text-[#202124] transition-all duration-200 hover:border-[#BDC1C6] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
              >
                Decision support
                <ArrowUpRight size={16} />
              </Link>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {zones.map((z) => (
              <ZoneCard key={z.zone.id} summary={z} />
            ))}
          </div>
        </section>
      </div>
  );
}
