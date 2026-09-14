"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

export interface TideCurvePoint {
  /** Epoch ms at the top of the hour (IST). */
  t: number;
  /** Tide height in metres. */
  m: number;
  /** Preformatted IST time label, e.g. "06:00" (server-computed, TZ-safe). */
  time: string;
  /** Preformatted IST day label, e.g. "Mon 15". */
  day: string;
}

export interface TideCurveTick {
  t: number;
  label: string;
}

export default function TideCurveChart({
  points,
  ticks,
  riskM,
}: {
  points: TideCurvePoint[];
  ticks: TideCurveTick[];
  /** Backflow-risk high-tide level in metres (dashed line). */
  riskM: number;
}) {
  const tickMap = Object.fromEntries(ticks.map((tick) => [tick.t, tick.label]));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A73E8" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#1A73E8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F2" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={ticks.map((tick) => tick.t)}
            tickFormatter={(t: number) => tickMap[t] ?? ""}
            tick={{ fontSize: 11 }}
            stroke="#BDC1C6"
          />
          <YAxis
            domain={[0, 1.4]}
            tick={{ fontSize: 11 }}
            stroke="#BDC1C6"
            label={{
              value: "metres",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 11, fill: "#80868B" },
            }}
          />
          <Tooltip
            formatter={(value) => [`${Number(value).toFixed(2)} m`, "Tide height"]}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as TideCurvePoint | undefined;
              return p ? `${p.day}, ${p.time} IST` : "";
            }}
            contentStyle={{ borderRadius: 8, border: "1px solid #EDF0F2", fontSize: 12 }}
          />
          <ReferenceLine
            y={riskM}
            stroke="#E37400"
            strokeDasharray="6 4"
            label={{
              value: `Backflow risk (${riskM.toFixed(2)} m)`,
              position: "insideTopRight",
              fontSize: 11,
              fill: "#E37400",
            }}
          />
          <Area
            type="monotone"
            dataKey="m"
            stroke="#1A73E8"
            strokeWidth={1.5}
            fill="url(#tideFill)"
            dot={false}
            activeDot={{ r: 3, fill: "#1A73E8" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
