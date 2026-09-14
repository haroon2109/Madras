"use client";

import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { RISK_META, RiskLevel } from "@/lib/risk";
import { CHENNAI_MAP_CENTER } from "@/lib/zones";
import RiskHeatToggle from "@/components/map/RiskHeatToggle";
import RiskLegend from "@/components/map/RiskLegend";
import RadarLayer from "@/components/map/RadarLayer";
import type { VulnerabilityFeature } from "@/lib/vulnerability";

export interface MapZone {
  id: string;
  number: number;
  name: string;
  latitude: number;
  longitude: number;
  precipMm: number | null;
  risk: RiskLevel | null;
  /** Operational priority 0–100 (forecast risk x chronic vulnerability). */
  priority?: number | null;
}

export interface MapIncident {
  id: string;
  latitude: number;
  longitude: number;
  depthCm: number;
  zoneName: string;
  status: string;
}

const KIND_COLORS: Record<string, string> = {
  river: "#38bdf8",
  canal: "#0ea5e9",
  lake: "#0284c7",
  marsh: "#34d399",
  shelter: "#f59e0b",
  hospital: "#ef4444",
  "flood-prone": "#a855f7",
};

function featureIcon(kind: string): L.DivIcon {
  const color = KIND_COLORS[kind] ?? "#64748b";
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(16,42,86,.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function LeafletMap({
  zones,
  className = "h-80",
  incidents = [],
  features = [],
  radar,
}: {
  zones: MapZone[];
  className?: string;
  incidents?: MapIncident[];
  features?: VulnerabilityFeature[];
  /** Real RainViewer radar frames (server-fetched); omit to hide the toggle. */
  radar?: { host: string; frames: { time: number; path: string }[] } | null;
}) {
  const center: [number, number] = [CHENNAI_MAP_CENTER.latitude, CHENNAI_MAP_CENTER.longitude];
  const [heat, setHeat] = useState(false);

  return (
    <div className={`${className} relative w-full overflow-hidden rounded-2xl border border-[#DADCE0] shadow-[0_1px_2px_rgba(16,42,86,0.04)]`}>
      <MapContainer center={center} zoom={10} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Risk-heat underlay: soft, rainfall-proportional halos in risk colors. */}
        {heat &&
          zones.map((z) => {
            if (!z.risk || z.precipMm === null) return null;
            const haloRadius = 18 + Math.min(30, z.precipMm / 2.5);
            return (
              <CircleMarker
                key={`heat-${z.id}`}
                center={[z.latitude, z.longitude]}
                radius={haloRadius}
                interactive={false}
                pathOptions={{
                  stroke: false,
                  fillColor: RISK_META[z.risk].color,
                  fillOpacity: 0.28,
                }}
              />
            );
          })}
        {zones.map((z) => {
          const color = z.risk ? RISK_META[z.risk].color : "#94a3b8";
          const radius = z.precipMm ? 7 + Math.min(14, z.precipMm / 4) : 6;
          return (
            <CircleMarker
              key={z.id}
              center={[z.latitude, z.longitude]}
              radius={radius}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 0.75 }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <strong>
                    Zone {z.number} — {z.name}
                  </strong>
                  <br />
                  {z.precipMm !== null && z.risk
                    ? `${z.precipMm.toFixed(1)} mm / 24h · ${RISK_META[z.risk].label} risk`
                    : "No forecast"}
                  {z.priority !== undefined && z.priority !== null && (
                    <>
                      <br />
                      {`Priority ${z.priority}/100`}
                    </>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Feature 4 — vulnerability / GIS overlays */}
        {features.map((f) => {
          if (f.kind === "river" || f.kind === "canal") {
            return (
              <Polyline
                key={f.id}
                positions={f.points as [number, number][]}
                pathOptions={{ color: KIND_COLORS[f.kind], weight: 3, opacity: 0.8 }}
              >
                <Tooltip sticky>
                  <span className="text-xs font-semibold">{f.name}</span>
                </Tooltip>
              </Polyline>
            );
          }
          const [lat, lng] = f.points[0];
          return (
            <Marker key={f.id} position={[lat, lng]} icon={featureIcon(f.kind)}>
              <Tooltip direction="top" offset={[0, -8]}>
                <span className="text-xs font-semibold">
                  {f.name} <span className="font-normal text-slate-500">({f.kind})</span>
                </span>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Feature 2 — waterlogging incident layer */}
        {incidents.map((i) => {
          const severe = i.depthCm >= 60;
          const radius = severe ? 9 : i.depthCm >= 20 ? 7 : 5;
          return (
            <CircleMarker
              key={i.id}
              center={[i.latitude, i.longitude]}
              radius={radius}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: severe ? "#dc2626" : "#f59e0b",
                fillOpacity: 0.9,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong>Waterlogging — {i.zoneName}</strong>
                  <br />
                  {i.depthCm > 0 ? `${i.depthCm} cm deep` : "Depth unmeasured"} · {i.status}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {/* Overlays sit above Leaflet panes (z-[500]) and stay in screenshots. */}
      <div className="absolute left-3 top-3 z-[500] flex flex-col items-start gap-2">
        <RiskHeatToggle active={heat} onToggle={() => setHeat((v) => !v)} />
        <RiskLegend />
        {radar && radar.frames.length > 0 && (
          <RadarLayer host={radar.host} frames={radar.frames} />
        )}
      </div>

    </div>
  );
}