"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CHENNAI_MAP_CENTER } from "@/lib/zones";
import { RISK_META } from "@/lib/risk";
import RiskHeatToggle from "@/components/map/RiskHeatToggle";
import RiskLegend from "@/components/map/RiskLegend";
import type { ZoneMapDatum } from "./ZonesMap";

function FitChennai({ zones }: { zones: ZoneMapDatum[] }) {
  const map = useMap();

  useEffect(() => {
    if (zones.length === 0) return;
    map.fitBounds(
      L.latLngBounds(zones.map((zone) => [zone.latitude, zone.longitude] as [number, number])),
      { padding: [26, 26] }
    );
  }, [map, zones]);

  return (
    <button
      type="button"
      onClick={() => {
        if (zones.length > 0) {
          map.fitBounds(
            L.latLngBounds(zones.map((zone) => [zone.latitude, zone.longitude] as [number, number])),
            { padding: [26, 26] }
          );
        } else {
          map.setView([CHENNAI_MAP_CENTER.latitude, CHENNAI_MAP_CENTER.longitude], 10);
        }
      }}
      className="absolute right-3 top-3 z-[500] rounded-lg border border-[#DADCE0] bg-white px-3 py-2 text-xs font-bold text-[#202124] shadow-sm transition-colors hover:bg-[#F1F3F4]"
    >
      Fit Chennai
    </button>
  );
}

function markerIcon(number: number) {
  return L.divIcon({
    className: "",
    html: `<span style="display:grid;place-items:center;width:26px;height:26px;border:1px solid rgba(16,42,86,.16);border-radius:999px;background:rgba(255,255,255,.9);color:#202124;font:800 10px/1 ui-sans-serif,system-ui,sans-serif;box-shadow:0 1px 3px rgba(16,42,86,.12)">${number}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function ZonesMapInner({
  zones,
  selectedZoneId,
  onSelect,
}: {
  zones: ZoneMapDatum[];
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
}) {
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [heat, setHeat] = useState(false);
  const center: [number, number] = [CHENNAI_MAP_CENTER.latitude, CHENNAI_MAP_CENTER.longitude];

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-xl border border-[#DADCE0] bg-[#DDF2FC]">
      <MapContainer center={center} zoom={10} scrollWheelZoom className="h-full min-h-[360px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* TODO: replace centroid markers with authoritative GCC GeoJSON boundaries when supplied. */}
        <FitChennai zones={zones} />
        {/* Risk-heat underlay: soft, rainfall-proportional halos in risk colors. */}
        {heat &&
          zones.map((zone) => {
            if (!zone.risk || zone.precipMm === null) return null;
            const haloRadius = 18 + Math.min(30, zone.precipMm / 2.5);
            return (
              <CircleMarker
                key={`heat-${zone.id}`}
                center={[zone.latitude, zone.longitude]}
                radius={haloRadius}
                interactive={false}
                pathOptions={{
                  stroke: false,
                  fillColor: RISK_META[zone.risk].color,
                  fillOpacity: 0.28,
                }}
              />
            );
          })}
        {zones.map((zone) => {
          const color = zone.risk ? RISK_META[zone.risk].color : "#94A3B8";
          const selected = selectedZoneId === zone.id;
          const hovered = hoveredZoneId === zone.id;
          const radius = selected || hovered ? 15 : 11;
          return (
            <CircleMarker
              key={zone.id}
              center={[zone.latitude, zone.longitude]}
              radius={radius}
              pathOptions={{
                color: selected ? "#202124" : "#FFFFFF",
                weight: selected ? 3 : 2,
                fillColor: color,
                fillOpacity: selected || hovered ? 0.92 : 0.72,
              }}
              eventHandlers={{
                click: () => onSelect(zone.id),
                mouseover: () => setHoveredZoneId(zone.id),
                mouseout: () => setHoveredZoneId(null),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <div className="min-w-32 text-xs">
                  <strong>
                    Zone {zone.number} · {zone.name}
                  </strong>
                  <div className="mt-1">
                    24H Forecast: {zone.precipMm === null ? "No data" : `${zone.precipMm.toFixed(1)} mm`}
                  </div>
                  <div>
                    Risk: {zone.risk ? RISK_META[zone.risk].label : "Pending"}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
        {zones.map((zone) => (
          <Marker key={`label-${zone.id}`} position={[zone.latitude, zone.longitude]} icon={markerIcon(zone.number)} interactive={false} />
        ))}
      </MapContainer>
      {/* Overlays sit above Leaflet panes (z-[500]) and stay in screenshots. */}
      <div className="absolute left-3 top-3 z-[500] flex flex-col items-start gap-2">
        <RiskHeatToggle active={heat} onToggle={() => setHeat((v) => !v)} />
        <RiskLegend />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[260px] rounded-lg border border-[#DADCE0] bg-white/95 px-3 py-2 text-[11px] font-medium leading-relaxed text-[#5F6368] shadow-sm">
        Centroid view. Official GCC boundary GeoJSON can be plugged into this layer when available.
      </div>
    </div>
  );
}
