"use client";

import { useState, type ReactNode } from "react";
import type { HeatmapData } from "@/lib/data";

/**
 * Color scale for rainfall intensity (mm).
 * Steps: 0 → lightest, progresses through blues to deep navy.
 */
const SCALE_STOPS: { threshold: number; color: string; label: string }[] = [
  { threshold: 0, color: "#F1F3F4", label: "0" },
  { threshold: 0.5, color: "#BFDBFE", label: "0.5" },
  { threshold: 5, color: "#60A5FA", label: "5" },
  { threshold: 15, color: "#2563EB", label: "15" },
  { threshold: 30, color: "#1D4ED8", label: "30" },
  { threshold: 60, color: "#1E3A5F", label: "60+" },
];

function cellColor(mm: number): string {
  for (let i = SCALE_STOPS.length - 1; i >= 0; i--) {
    if (mm >= SCALE_STOPS[i].threshold) return SCALE_STOPS[i].color;
  }
  return SCALE_STOPS[0].color;
}

function shortDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${Number(d)}`;
}

function weekdayLabel(dateKey: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [y, m, d] = dateKey.split("-").map(Number);
  return days[new Date(y, m - 1, d).getDay()];
}

interface TooltipState {
  x: number;
  y: number;
  label: React.ReactNode;
  date: string;
  mm: number;
}

function HeatmapCells({
  rowLabel,
  labelStyle,
  dates,
  dateLookup,
  dateKey,
  tooltip,
  setTooltip,
}: {
  rowLabel: React.ReactNode;
  labelStyle: React.CSSProperties;
  dates: string[];
  dateLookup: Map<string, number>;
  dateKey: string;
  tooltip: TooltipState | null;
  setTooltip: (t: TooltipState | null) => void;
}) {
  const COL_WIDTH = 28;
  const ROW_HEIGHT = 30;

  return (
    <div className="flex items-center" style={{ height: ROW_HEIGHT }}>
      <div className="shrink-0 truncate text-xs font-semibold text-[#202124]" style={{ width: 140, paddingRight: 8, ...labelStyle }}>
        {rowLabel}
      </div>
      {dates.map((date) => {
        const mm = dateLookup.get(date) ?? 0;
        const bg = cellColor(mm);
        const textColor = mm >= 5 ? "#ffffff" : "#202124";
        return (
          <div
            key={date}
            className="relative flex items-center justify-center rounded-[3px] cursor-default transition-transform hover:scale-125 hover:z-10 hover:ring-2 hover:ring-[#1A73E8]"
            style={{
              width: COL_WIDTH,
              height: ROW_HEIGHT - 6,
              margin: "0 1px",
              backgroundColor: bg,
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                x: rect.left + rect.width / 2,
                y: rect.top - 8,
                label: rowLabel,
                date,
                mm,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          >
            {mm > 0 && (
              <span className="text-[8px] font-bold tabular-nums leading-none" style={{ color: textColor }}>
                {mm >= 10 ? mm.toFixed(0) : mm.toFixed(1)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function RainfallHeatmap({ data }: { data: HeatmapData }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [showWards, setShowWards] = useState(false);

  const COL_WIDTH = 28;

  // Build zone → date lookup for zone cells.
  const zoneDateMap = new Map<number, Map<string, number>>();
  for (const cell of data.cells) {
    // Only use cells that belong to actual zones (not ward cells).
    const isWard = data.wards.some((w) => w.wardNumber === parseInt(cell.zoneName.match(/\(W(\d+)\)/)?.[1] ?? ""));
    if (isWard) continue;
    let dm = zoneDateMap.get(cell.zoneNumber);
    if (!dm) {
      dm = new Map();
      zoneDateMap.set(cell.zoneNumber, dm);
    }
    dm.set(cell.date, cell.precipMm);
  }

  // Build ward → date lookup.
  const wardDateMap = new Map<number, Map<string, number>>();
  for (const cell of data.cells) {
    const match = cell.zoneName.match(/\(W(\d+)\)/);
    if (!match) continue;
    const wardNum = parseInt(match[1]);
    let dm = wardDateMap.get(wardNum);
    if (!dm) {
      dm = new Map();
      wardDateMap.set(wardNum, dm);
    }
    dm.set(cell.date, cell.precipMm);
  }

  // Group wards by zone number.
  const wardsByZone = new Map<number, typeof data.wards>();
  for (const w of data.wards) {
    let arr = wardsByZone.get(w.zoneNumber);
    if (!arr) {
      arr = [];
      wardsByZone.set(w.zoneNumber, arr);
    }
    arr.push(w);
  }

  // City daily lookup.
  const cityDateMap = new Map(data.cityDaily.map((cd) => [cd.date, cd.avgMm]));

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex min-w-max flex-col gap-0">
        {/* Date headers */}
        <div className="flex" style={{ marginLeft: 140 }}>
          {data.dates.map((date) => (
            <div key={date} className="flex flex-col items-center" style={{ width: COL_WIDTH }}>
              <span className="text-[9px] font-medium text-[#5F6368] leading-tight">{weekdayLabel(date)}</span>
              <span className="text-[9px] font-semibold text-[#5F6368] leading-tight">{shortDate(date)}</span>
            </div>
          ))}
        </div>

        {/* Zone rows */}
        {data.zones.map((zone) => {
          const zoneMm = zoneDateMap.get(zone.number);
          const wardCount = wardsByZone.get(zone.number)?.length ?? 0;
          return (
            <div key={zone.id}>
              <HeatmapCells
                rowLabel={
                  <>
                    <span className="text-[#5F6368] mr-1 tabular-nums">{String(zone.number).padStart(2, "0")}</span>
                    {zone.name}
                    {wardCount > 0 && (
                      <span className="ml-1 text-[9px] font-medium text-[#5F6368]">({wardCount}w)</span>
                    )}
                  </>
                }
                labelStyle={{ fontWeight: 800 }}
                dates={data.dates}
                dateLookup={zoneMm ?? new Map()}
                dateKey={`zone-${zone.number}`}
                tooltip={tooltip}
                setTooltip={setTooltip}
              />
              {/* Ward rows for this zone (if toggled on) */}
              {showWards && wardsByZone.get(zone.number)?.map((ward) => {
                const wardMm = wardDateMap.get(ward.wardNumber);
                return (
                  <HeatmapCells
                    key={ward.wardNumber}
                    rowLabel={
                      <span className="text-[#5F6368]">
                        <span className="mr-1 tabular-nums">W{ward.wardNumber}</span>
                        {ward.name}
                      </span>
                    }
                    labelStyle={{ paddingLeft: 16, fontWeight: 500, fontSize: 11 }}
                    dates={data.dates}
                    dateLookup={wardMm ?? new Map()}
                    dateKey={`ward-${ward.wardNumber}`}
                    tooltip={tooltip}
                    setTooltip={setTooltip}
                  />
                );
              })}
            </div>
          );
        })}

        {/* Separator before city row */}
        <div className="flex" style={{ marginLeft: 140 }}>
          {data.dates.map((date) => (
            <div key={date} style={{ width: COL_WIDTH, margin: "0 1px" }}>
              <div className="h-px bg-[#DADCE0]" />
            </div>
          ))}
        </div>

        {/* City average row */}
        <HeatmapCells
          rowLabel={
            <>
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#1A73E8]" />
              City avg
            </>
          }
          labelStyle={{ fontWeight: 800, color: "#1A73E8" }}
          dates={data.dates}
          dateLookup={cityDateMap}
          dateKey="city"
          tooltip={tooltip}
          setTooltip={setTooltip}
        />

        {/* Toggle + Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4" style={{ marginLeft: 140 }}>
          <button
            type="button"
            onClick={() => setShowWards(!showWards)}
            className={`rounded-full border px-3 py-1 text-[10px] font-bold transition-colors ${
              showWards
                ? "border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]"
                : "border-[#DADCE0] bg-white text-[#5F6368] hover:border-[#1A73E8] hover:text-[#1A73E8]"
            }`}
          >
            {showWards ? "Hide 200 wards" : "Show 200 wards"}
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368]">Rainfall (mm)</span>
          <div className="flex items-center gap-1">
            {SCALE_STOPS.map((stop, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: stop.color }} />
                <span className="text-[9px] font-medium text-[#5F6368]">{stop.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-[#DADCE0] bg-white px-3 py-2 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="text-xs font-bold text-[#202124]">{tooltip.label}</div>
          <div className="text-[11px] text-[#5F6368]">
            {shortDate(tooltip.date)} ·{" "}
            <span className="font-bold text-[#202124]">{tooltip.mm.toFixed(1)} mm</span>
          </div>
        </div>
      )}
    </div>
  );
}


