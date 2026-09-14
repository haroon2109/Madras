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
  Cell,
  Legend,
} from "recharts";
import { RISK_META, RiskLevel } from "@/lib/risk";

export interface HistoryPoint {
  date: string;
  precipMm: number;
  precipProbMax: number;
  risk: RiskLevel;
}

function shortLabel(dateKey: string): string {
  // "2026-09-09" -> "Sep 09"
  const [, m, d] = dateKey.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1]} ${d}`;
}

export default function RainHistoryChart({ data }: { data: HistoryPoint[] }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tickFormatter={shortLabel} tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis
            yAxisId="mm"
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            label={{ value: "mm", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#94a3b8" } }}
          />
          <YAxis yAxisId="prob" orientation="right" domain={[0, 100]} hide />
          <Tooltip
            formatter={(value, name) => {
              if (name === "precipMm") return [`${Number(value).toFixed(1)} mm`, "Rainfall"];
              if (name === "precipProbMax") return [`${value}%`, "Chance of rain"];
              return [String(value), String(name)];
            }}
            labelFormatter={(label) => shortLabel(String(label))}
            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="mm" dataKey="precipMm" name="Rainfall" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.date} fill={RISK_META[d.risk].color} />
            ))}
          </Bar>
          <Line
            yAxisId="prob"
            type="monotone"
            dataKey="precipProbMax"
            name="Chance of rain"
            stroke="#0369a1"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}