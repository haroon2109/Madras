"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Date navigation for the daily report: prev/next day buttons around a
 * native date input. Navigating past the newest date is clamped by the
 * server (it falls back to the latest available date).
 */
export default function DateNav({
  dates,
  selected,
}: {
  /** All available IST date keys, ascending. */
  dates: string[];
  selected: string;
}) {
  const router = useRouter();

  const idx = dates.indexOf(selected);
  const prev = idx > 0 ? dates[idx - 1] : null;
  const next = idx >= 0 && idx < dates.length - 1 ? dates[idx + 1] : null;

  function go(date: string | null) {
    if (!date) return;
    router.push(`/report/daily?date=${date}`);
  }

  function fmt(dateKey: string): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const [, m, d] = dateKey.split("-");
    return `${months[Number(m) - 1] ?? m} ${d}`;
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => go(prev)}
        disabled={!prev}
        aria-label="Previous day"
        className="rounded-full border border-[#DADCE0] bg-white p-2 text-[#5F6368] transition-colors hover:bg-[#F1F3F4] hover:text-[#202124] disabled:opacity-40"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <select
        value={selected}
        onChange={(e) => go(e.target.value)}
        aria-label="Report date"
        className="rounded-full border border-[#DADCE0] bg-white px-3.5 py-2 text-sm font-bold text-[#202124] focus:border-[#1A73E8] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
      >
        {dates.map((d) => (
          <option key={d} value={d}>
            {fmt(d)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => go(next)}
        disabled={!next}
        aria-label="Next day"
        className="rounded-full border border-[#DADCE0] bg-white p-2 text-[#5F6368] transition-colors hover:bg-[#F1F3F4] hover:text-[#202124] disabled:opacity-40"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
