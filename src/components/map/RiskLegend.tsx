import { RISK_META, RISK_ORDER } from "@/lib/risk";

/**
 * Persistent risk legend for map overlays (Feature: standalone-readable maps).
 * Renders the LOW → ALERT scale plus the "No data" fallback color so a
 * screenshot of the map carries its own key. Fully non-interactive.
 */
export default function RiskLegend({
  className = "",
  showNoData = true,
  title = "24h risk",
}: {
  className?: string;
  showNoData?: boolean;
  title?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Map legend — ${title}: ${RISK_ORDER.map((l) => RISK_META[l].label).join(", ")}`}
      className={`pointer-events-none select-none rounded-lg border border-[#DADCE0] bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm ${className}`}
    >
      <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#202124]">{title}</div>
      <ul className="mt-1 space-y-1">
        {RISK_ORDER.map((level) => (
          <li key={level} className="flex items-center gap-1.5 text-[10px] font-semibold leading-none text-[#5F6368]">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: RISK_META[level].color }}
            />
            {RISK_META[level].label}
          </li>
        ))}
        {showNoData && (
          <li className="flex items-center gap-1.5 text-[10px] font-semibold leading-none text-[#5F6368]">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-slate-400 ring-1 ring-black/10" />
            No data
          </li>
        )}
      </ul>
    </div>
  );
}
