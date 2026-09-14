"use client";

import dynamic from "next/dynamic";
import type { RiskLevel } from "@/lib/risk";

export interface ZoneMapDatum {
  id: string;
  number: number;
  name: string;
  latitude: number;
  longitude: number;
  precipMm: number | null;
  precipProbMax: number | null;
  risk: RiskLevel | null;
}

const ZonesMapInner = dynamic(() => import("./ZonesMapInner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[360px] place-items-center rounded-xl bg-[#EAF5FF] text-sm font-semibold text-[#5F6368]">
      Loading Chennai zone map...
    </div>
  ),
});

export default function ZonesMap({
  zones,
  selectedZoneId,
  onSelect,
}: {
  zones: ZoneMapDatum[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
}) {
  return <ZonesMapInner zones={zones} selectedZoneId={selectedZoneId} onSelect={onSelect} />;
}
