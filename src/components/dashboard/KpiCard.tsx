import type { LucideIcon } from "lucide-react";

type ToneKey = "blue" | "yellow" | "orange" | "red";

const TONES: Record<ToneKey, { chip: string; dot: string }> = {
  blue: { chip: "bg-[#E1F0FE] text-[#1A73E8]", dot: "bg-[#1A73E8]" },
  yellow: { chip: "bg-[#FCF3D8] text-yellow-700", dot: "bg-yellow-500" },
  orange: { chip: "bg-[#FDEBDD] text-orange-700", dot: "bg-orange-500" },
  red: { chip: "bg-[#FCE4E4] text-red-700", dot: "bg-red-500" },
};

export default function KpiCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  note?: string;
  tone?: ToneKey;
}) {
  const t = TONES[tone];
  return (
    <div className="group animate-rise-up rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#1A73E8]/30 hover:shadow-[0_14px_32px_-14px_rgba(16,42,86,0.16)] sm:p-6">
      <div className={`grid h-11 w-11 place-items-center rounded-full transition-transform group-hover:scale-105 ${t.chip}`}>
        <Icon size={20} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <div className="mt-4 text-[13px] font-semibold text-[#5F6368]">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tabular-nums tracking-tight text-[#202124]">{value}</span>
        {note && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#5F6368]">
            <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} aria-hidden="true" />
            {note}
          </span>
        )}
      </div>
    </div>
  );
}