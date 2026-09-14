import { RISK_META, RiskLevel } from "@/lib/risk";

export interface WeekBar {
  date: string;
  precipMm: number;
  risk: RiskLevel;
}

function shortLabel(dateKey: string): string {
  // "2026-09-09" -> "Sep 09"
  const [, m, d] = dateKey.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${d}`;
}

export default function WeekBars({
  week,
  height = 56,
  showLabels = true,
}: {
  week: WeekBar[];
  height?: number;
  showLabels?: boolean;
}) {
  const max = Math.max(1, ...week.map((w) => w.precipMm));
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {week.map((w) => {
        const h = Math.max(6, Math.round((w.precipMm / max) * (height - 10)));
        return (
          <div key={w.date} className="group flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-sm transition-all group-hover:opacity-80"
                style={{
                  height: h,
                  backgroundColor: RISK_META[w.risk].color,
                }}
                title={`${shortLabel(w.date)}: ${w.precipMm.toFixed(1)} mm`}
              />
            </div>
            {showLabels && <span className="text-[9px] font-medium text-slate-400">{shortLabel(w.date)}</span>}
          </div>
        );
      })}
    </div>
  );
}