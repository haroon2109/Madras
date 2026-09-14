import Link from "next/link";
import type { ZoneForecastSummary } from "@/lib/data";
import RiskBadge from "./RiskBadge";
import WeekBars from "./WeekBars";

export default function ZoneCard({ summary }: { summary: ZoneForecastSummary }) {
  const { zone, today, week } = summary;
  return (
    <Link
      href={`/analytics?zone=${zone.id}`}
      className="group flex h-full flex-col rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#1A73E8]/40 hover:shadow-[0_14px_30px_-12px_rgba(16,42,86,0.16)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5F6368]">
          Zone {zone.number}
        </span>
        {today ? <RiskBadge level={today.risk} size="sm" /> : <span className="text-[11px] font-medium text-[#5F6368]">No data</span>}
      </div>

      <div className="mt-1.5 text-lg font-bold leading-snug text-[#202124]">{zone.name}</div>

      {today ? (
        <div className="mt-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tabular-nums tracking-tight text-[#202124]">
              {today.precipMm.toFixed(1)}
            </span>
            <span className="text-[13px] font-semibold text-[#5F6368]">mm / 24h</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-[#5F6368]">{today.precipProbMax}% chance</div>
        </div>
      ) : (
        <div className="mt-4 text-sm text-[#5F6368]">Forecast pending…</div>
      )}

      <div className="mt-auto pt-4">
        {week.length > 0 ? (
          <div className="border-t border-[#F1F3F4] pt-3.5">
            <WeekBars week={week} height={40} showLabels={false} />
          </div>
        ) : (
          <div className="border-t border-[#F1F3F4] pt-3 text-xs text-[#5F6368]">No 7-day outlook yet</div>
        )}
      </div>
    </Link>
  );
}