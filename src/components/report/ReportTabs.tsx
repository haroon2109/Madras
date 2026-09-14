"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export type ReportView = "city" | "daily" | "zone";

/** Segmented control switching between city / daily / zone report views. */
export default function ReportTabs({ active }: { active: ReportView }) {
  const searchParams = useSearchParams();

  // Keep the context (date / zone) when hopping between views.
  const date = searchParams.get("date");
  const zone = searchParams.get("zone");

  function hrefFor(view: ReportView): string {
    if (view === "daily") return date ? `/report/daily?date=${date}` : "/report/daily";
    if (view === "zone") return zone ? `/report/zone?zone=${zone}` : "/report/zone";
    return "/report";
  }

  const tabs: { view: ReportView; label: string }[] = [
    { view: "city", label: "City" },
    { view: "daily", label: "Daily" },
    { view: "zone", label: "By zone" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Report type"
      className="inline-flex rounded-full border border-[#DADCE0] bg-white p-1 shadow-[0_1px_2px_rgba(16,42,86,0.04)]"
    >
      {tabs.map((t) => {
        const isActive = t.view === active;
        return (
          <Link
            key={t.view}
            role="tab"
            aria-selected={isActive}
            href={hrefFor(t.view)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
              isActive ? "bg-[#1A73E8] text-white" : "text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
