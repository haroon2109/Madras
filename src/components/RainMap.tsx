"use client";

import dynamic from "next/dynamic";
import type { MapZone, MapIncident } from "./LeafletMap";
import type { VulnerabilityFeature } from "@/lib/vulnerability";

// Leaflet touches `window` at import time, so it must never run on the server.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-2xl border border-[#DADCE0] bg-[#EAF2FB] text-sm text-[#5F6368]">
      Loading map…
    </div>
  ),
});

export interface RainMapOverlays {
  incidents?: MapIncident[];
  features?: VulnerabilityFeature[];
}

export default function RainMap({
  zones,
  className,
  incidents,
  features,
  radar,
}: {
  zones: MapZone[];
  className?: string;
  incidents?: MapIncident[];
  features?: VulnerabilityFeature[];
  /** Real RainViewer radar frames, passed from the server when available. */
  radar?: { host: string; frames: { time: number; path: string }[] } | null;
}) {
  return (
    <LeafletMap
      zones={zones}
      className={className}
      incidents={incidents}
      features={features}
      radar={radar}
    />
  );
}
