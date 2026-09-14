import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { RiskLevel } from "@/lib/risk";
import { RISK_META } from "@/lib/risk";

export interface PriorityZone {
  zone: { id: string; number: number; name: string };
  risk: RiskLevel;
  precipMm: number;
  priority: number | null;
}

/**
 * "What should I do next" banner — surfaces the single highest-priority zone
 * with a plain-language summary and one tap to Decision Support. Returns null
 * when every zone is LOW / there is no forecast data.
 */
export function PriorityBanner({ zone }: { zone: PriorityZone | null }) {
  if (!zone || zone.risk === "LOW") return null;
  const meta = RISK_META[zone.risk];
  const tone =
    zone.risk === "ALERT"
      ? "from-red-50 to-orange-50 border-red-200"
      : zone.risk === "WARNING"
        ? "from-orange-50 to-amber-50 border-orange-200"
        : "from-amber-50 to-yellow-50 border-amber-200";

  return (
    <section
      aria-label="Highest priority zone"
      className={`animate-rise-up rounded-2xl border bg-gradient-to-r ${tone} p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)]`}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
          <AlertTriangle
            size={24}
            style={{ color: meta.color }}
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#202124]">
              Highest priority now
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden="true" />
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-base font-extrabold text-[#202124]">
            Zone {zone.zone.number} — {zone.zone.name}
            <span className="ml-2 text-sm font-bold text-[#1A73E8]">{zone.precipMm.toFixed(1)} mm</span>
          </p>
          <p className="mt-0.5 text-sm text-[#5F6368]">{meta.description}</p>
        </div>
        <Link
          href={`/decisions?zone=${zone.zone.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1A73E8] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1765CC]"
        >
          Act on this
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export default PriorityBanner;