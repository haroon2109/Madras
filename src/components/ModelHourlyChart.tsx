"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { HourlyModelPoint } from "@/lib/data";

const MODEL_COLORS: Record<string, string> = {
  ecmwf: "#0369a1", // sky-800 — higher-resolution European model
  gfs: "#ea580c", // orange-600 — independent NOAA second opinion
};

const MODEL_LABELS: Record<string, string> = {
  ecmwf: "ECMWF (IFS 0.25°)",
  gfs: "GFS (seamless)",
};

/** "2026-09-09T15" → "15h". */
function hourLabel(hourKey: string): string {
  return `${hourKey.slice(11)}h`;
}

/** Full label for tooltips: "Sep 09, 15:00 IST". */
function fullLabel(hourKey: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, m, d, h] = hourKey.split(/[-T]/);
  return `${months[Number(m) - 1]} ${d}, ${h}:00 IST`;
}

export default function ModelHourlyChart({ data }: { data: HourlyModelPoint[] }) {
  const hasAny = data.some((d) => d.ecmwf !== null || d.gfs !== null);
  if (!hasAny) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        No hourly model data yet — run <code className="rounded bg-slate-100 px-1">npm run process &amp;&amp; npm run load</code>.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="hour"
            tickFormatter={hourLabel}
            ticks={data.filter((_, i) => i % 6 === 0).map((d) => d.hour)}
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            label={{ value: "mm/h", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#94a3b8" } }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (value === null || value === undefined) return ["no data", String(name)];
              return [`${Number(value).toFixed(2)} mm/h`, String(name)];
            }}
            labelFormatter={(label) => fullLabel(String(label))}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Legend formatter={(value) => MODEL_LABELS[value] ?? value} wrapperStyle={{ fontSize: 12 }} />
          {/* Bars show per-hour magnitudes; lines overlay each model's trend
              (legendType none keeps the legend one entry per model). */}
          <Bar dataKey="ecmwf" name="ecmwf" fill={MODEL_COLORS.ecmwf} radius={[2, 2, 0, 0]} />
          <Bar dataKey="gfs" name="gfs" fill={MODEL_COLORS.gfs} radius={[2, 2, 0, 0]} />
          <Line type="monotone" dataKey="ecmwf" name="ecmwf" stroke={MODEL_COLORS.ecmwf} strokeWidth={1.5} dot={false} connectNulls legendType="none" />
          <Line type="monotone" dataKey="gfs" name="gfs" stroke={MODEL_COLORS.gfs} strokeWidth={1.5} dot={false} connectNulls legendType="none" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
