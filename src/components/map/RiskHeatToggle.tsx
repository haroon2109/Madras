"use client";

/**
 * Toggle pill for the map "risk heat" view (Feature: standalone-readable maps).
 * When on, each zone marker gains a soft, rainfall-proportional halo in its
 * risk color, so the city-wide risk pattern reads at a glance in screenshots.
 */
export default function RiskHeatToggle({
  active,
  onToggle,
  className = "",
}: {
  active: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold shadow-sm transition-colors ${className} ${
        active
          ? "border-[#1A73E8] bg-[#1A73E8] text-white hover:bg-[#1765CC]"
          : "border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F1F3F4]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-[#5F6368]"}`}
      />
      Risk heat {active ? "on" : "off"}
    </button>
  );
}
