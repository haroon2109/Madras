"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import type * as LTypes from "leaflet";
import { Radar as RadarIcon, Pause, Play } from "lucide-react";

/**
 * Feature 1 — live radar overlay.
 *
 * Frame metadata (paths + timestamps) comes from RainViewer's public
 * weather-maps.json, fetched by the server and passed down; tiles stream
 * straight from tilecache.rainviewer.com. Every frame is a real radar
 * capture — nothing is simulated.
 */

export interface RadarFrame {
  time: number;
  path: string;
}

const FRAME_MS = 700;

function RadarTiles({ host, frames, index }: { host: string; frames: RadarFrame[]; index: number }) {
  const map = useMap();
  const layerRef = useRef<LTypes.TileLayer | null>(null);
  const frame = frames[index];

  useEffect(() => {
    if (!frame || !map) return;
    const url = `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    const layer = (window as unknown as { L: typeof LTypes }).L.tileLayer(url, {
      opacity: 0.55,
      zIndex: 350,
      // Real radar tiles from RainViewer's public tile cache.
      attribution: '<a href="https://www.rainviewer.com" target="_blank" rel="noreferrer">RainViewer</a>',
    });
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
    };
  }, [map, host, frame]);

  return null;
}

export default function RadarLayer({ host, frames }: { host: string; frames: RadarFrame[] }) {
  const [on, setOn] = useState(false);
  // Start on the newest frame; the play loop wraps via modulo, and a stale
  // index after a frames refresh is clamped where it is used.
  const [index, setIndex] = useState(frames.length - 1);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!on || !playing || frames.length < 2) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % frames.length);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [on, playing, frames.length]);

  const label =
    frames.length > 0 && on
      ? new Intl.DateTimeFormat("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Kolkata",
        }).format(new Date(frames[index].time * 1000))
      : "";

  return (
    <>
      {on && frames.length > 0 && (
        <RadarTiles host={host} frames={frames} index={Math.min(index, frames.length - 1)} />
      )}
      <div className="flex items-center gap-1.5 rounded-full border border-[#DADCE0] bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-[#3C4043] shadow-sm backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setOn((v) => !v)}
          aria-pressed={on}
          className={`flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-colors ${
            on ? "text-[#1A73E8]" : "hover:bg-[#F1F3F4]"
          }`}
          title="Live rain radar (last 2 hours) — RainViewer"
        >
          <RadarIcon size={13} className={on ? "animate-pulse" : ""} aria-hidden="true" />
          Radar
        </button>
        {on && frames.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              className="grid h-5 w-5 place-items-center rounded-full hover:bg-[#F1F3F4]"
              title={playing ? "Pause animation" : "Play animation"}
            >
              {playing ? <Pause size={11} /> : <Play size={11} />}
            </button>
            <span className="tabular-nums text-[#5F6368]">{label} IST</span>
          </>
        )}
      </div>
    </>
  );
}
