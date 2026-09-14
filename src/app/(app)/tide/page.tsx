import type { Metadata } from "next";
import { ensureFreshForecasts, getDashboardData } from "@/lib/data";
import { getTideForDate, getTodayTide, getTideSeries, HIGH_TIDE_RISK_M, COASTAL_ZONE_NUMBERS } from "@/lib/tide";
import { istToday } from "@/lib/weather";
import { Waves, Anchor, AlertTriangle, CalendarDays } from "lucide-react";
import TideCurveChart, { type TideCurvePoint, type TideCurveTick } from "@/components/tide/TideCurveChart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tide Monitor",
  description: "Daily tide estimates, harbour readings and coastal drainage-backflow risk for Chennai.",
};

const IST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
const IST_LABEL = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});
/** "HH:MM" in IST — precomputed server-side so the client never guesses TZ. */
const IST_TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});
/** "Mon 15" in IST for chart ticks. */
const IST_DAY = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  timeZone: "Asia/Kolkata",
});

/** Next n IST date keys starting today. */
function nextDateKeys(n: number): string[] {
  const base = new Date(`${istToday()}T00:00:00+05:30`).getTime();
  return Array.from({ length: n }, (_, i) => IST_DATE.format(new Date(base + i * 86_400_000)));
}

export default async function TidePage() {
  await ensureFreshForecasts();
  const [{ zones }, today] = await Promise.all([getDashboardData(), getTodayTide()]);

  // Coastal zones flagged for drainage backflow today (rain ≥ warning + high tide ≥ risk level).
  const backflow = zones
    .filter(
      (z) =>
        z.today &&
        COASTAL_ZONE_NUMBERS.includes(z.zone.number) &&
        z.today.precipMm >= z.zone.warningThreshold &&
        today.highTideM >= HIGH_TIDE_RISK_M
    )
    .map((z) => z.zone.name);

  // 7-day outlook. Manual harbour readings override the estimate per date.
  const dateKeys = nextDateKeys(7);
  const outlook = await Promise.all(
    dateKeys.map(async (key) => ({ key, tide: await getTideForDate(key) }))
  );

  // Full 7-day hourly curve for the chart, with one tick per day placed at
  // that day's high-tide time (matches the table and honest source labels).
  const series = await getTideSeries(dateKeys);
  const chartPoints: TideCurvePoint[] = series.map((p) => ({
    t: p.t,
    m: p.m,
    time: IST_TIME.format(p.t),
    day: IST_DAY.format(p.t),
  }));
  const chartTicks: TideCurveTick[] = outlook.map(({ key, tide }) => {
    const dayStart = new Date(`${key}T00:00:00+05:30`).getTime();
    const [h, m] = tide.highTideAt.split(":").map(Number);
    return { t: dayStart + (h || 0) * 3_600_000 + (m || 0) * 60_000, label: IST_DAY.format(dayStart) };
  });

  return (
    <div className="animate-in space-y-6">
      {/* Header */}
      <div className="animate-rise">
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] px-3 py-1 text-xs font-semibold text-[#1A73E8]">
            <Waves size={13} aria-hidden="true" />
            Coastal conditions
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#202124] sm:text-4xl">Tide Monitor</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#5F6368]">
          High and low tide for Chennai harbour, with coastal drainage-backflow flags when heavy
          rain coincides with a high tide above {HIGH_TIDE_RISK_M.toFixed(2)}&nbsp;m.
        </p>
      </div>

      {/* Today + backflow */}
      <div className="stagger-group grid gap-5 lg:grid-cols-3">
        <section className="bento-cell overflow-hidden p-6 lg:col-span-2">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#202124]">Today — {IST_LABEL.format(new Date(`${today.date}T12:00:00+05:30`))}</h2>
              <p className="mt-0.5 text-[13px] text-[#80868B]">Chennai harbour, IST</p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                today.source === "manual" ? "bg-[#E6F4EA] text-[#188038]" : "bg-[#E8F0FE] text-[#1A73E8]"
              }`}
            >
              <Anchor size={13} aria-hidden="true" />
              {today.source === "manual" ? "Harbour reading" : "Astronomical estimate"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#80868B]">High tide</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-3xl font-semibold tabular-nums text-[#202124]">
                <span>{today.highTideM.toFixed(2)}</span>
                <span className="text-base font-medium text-[#5F6368]">m</span>
              </p>
              <p className="mt-1 text-sm font-medium text-[#5F6368]">at {today.highTideAt} IST</p>
            </div>
            <div className="rounded-2xl bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#80868B]">Low tide</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-3xl font-semibold tabular-nums text-[#202124]">
                <span>{today.lowTideM > 0 ? today.lowTideM.toFixed(2) : "—"}</span>
                <span className="text-base font-medium text-[#5F6368]">{today.lowTideM > 0 ? "m" : ""}</span>
              </p>
              <p className="mt-1 text-sm font-medium text-[#5F6368]">at {today.lowTideAt !== "—" ? `${today.lowTideAt} IST` : "not recorded"}</p>
            </div>
          </div>
          {today.source !== "manual" && (
            <p className="mt-4 text-[13px] leading-relaxed text-[#80868B]">
              Estimates are computed from harmonic constituents and are overridden automatically
              when staff enter an official harbour reading in Administration.
            </p>
          )}
        </section>

        <section className="bento-cell p-6">
          <h2 className="text-base font-semibold text-[#202124]">Drainage backflow today</h2>
          <p className="mt-0.5 text-[13px] text-[#80868B]">Coastal zones · forecast ≥ warning threshold</p>
          {backflow.length > 0 ? (
            <>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#FEF7E0] px-3 py-2.5">
                <AlertTriangle size={15} className="shrink-0 text-[#E37400]" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-[#8a5000]">
                  {backflow.length} zone{backflow.length === 1 ? "" : "s"} flagged
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {backflow.map((name) => (
                  <li key={name} className="flex items-center gap-2 text-[13px] font-medium text-[#202124]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E37400]" aria-hidden="true" />
                    {name}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 text-[13px] leading-relaxed text-[#5F6368]">
              No backflow flags today — either the forecast is below warning thresholds or the
              high tide stays under {HIGH_TIDE_RISK_M.toFixed(2)}&nbsp;m.
            </p>
          )}
        </section>
      </div>

      {/* 7-day outlook */}
      <section className="bento-cell animate-rise overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[#EDF0F2] px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-[#202124]">7-day outlook</h2>
            <p className="mt-0.5 text-[13px] text-[#80868B]">High-tide time and height per day</p>
          </div>
          <CalendarDays size={18} className="text-[#80868B]" aria-hidden="true" />
        </div>
        <div className="border-b border-[#EDF0F2] px-4 pb-2 pt-4 sm:px-6">
          <TideCurveChart points={chartPoints} ticks={chartTicks} riskM={HIGH_TIDE_RISK_M} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#EDF0F2] bg-white text-left text-[11px] font-bold uppercase tracking-wide text-[#80868B]">
                <th className="px-6 py-3 font-bold">Date</th>
                <th className="px-6 py-3 font-bold">High tide</th>
                <th className="px-6 py-3 font-bold">Height</th>
                <th className="px-6 py-3 font-bold">Backflow watch</th>
                <th className="px-6 py-3 font-bold">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F4]">
              {outlook.map(({ key, tide }) => (
                <tr key={key} className={tide.date === istToday() ? "bg-[#F8F9FA]" : "bg-white"}>
                  <td className="px-6 py-3.5 font-semibold text-[#202124]">
                    {IST_LABEL.format(new Date(`${tide.date}T12:00:00+05:30`))}
                    {tide.date === istToday() && (
                      <span className="ml-2 rounded-full bg-[#E8F0FE] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1A73E8]">
                        Today
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 tabular-nums text-[#5F6368]">{tide.highTideAt} IST</td>
                  <td className="px-6 py-3.5 font-semibold tabular-nums text-[#202124]">{tide.highTideM.toFixed(2)} m</td>
                  <td className="px-6 py-3.5">
                    {tide.highTideM >= HIGH_TIDE_RISK_M ? (
                      <span className="inline-flex items-center rounded-full bg-[#FEF7E0] px-2.5 py-1 text-xs font-semibold text-[#E37400]">
                        High-tide risk
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-[#80868B]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-xs font-medium text-[#80868B]">
                    {tide.source === "manual" ? "Harbour reading" : "Estimate"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
