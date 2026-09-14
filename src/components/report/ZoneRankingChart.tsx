"use client";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { RISK_META, type RiskLevel } from "@/lib/risk";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export interface ZoneRankDatum {
  name: string;
  todayMm: number | null;
  risk: RiskLevel | null;
}

/** Horizontal ranking of zones by today's 24h forecast, bars colored by risk. */
export default function ZoneRankingChart({ data }: { data: ZoneRankDatum[] }) {
  const rows = [...data]
    .filter((d) => d.todayMm !== null)
    .sort((a, b) => (b.todayMm ?? 0) - (a.todayMm ?? 0))
    .slice(0, 15);

  if (rows.length === 0) {
    return (
      <p className="grid h-full place-items-center py-10 text-sm text-[#5F6368]">
        No forecast data yet — refresh to pull live forecasts.
      </p>
    );
  }

  const options: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: "Forecast rainfall (mm / 24h)", color: "#5F6368", font: { size: 11 } },
        ticks: { color: "#5F6368", font: { size: 11 } },
        grid: { color: "rgba(100,122,153,0.12)" },
      },
      y: {
        ticks: { color: "#202124", font: { size: 11 }, autoSkip: false },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const row = rows[ctx.dataIndex];
            const level = row?.risk ? RISK_META[row.risk].label : "No data";
            return ` ${Number(ctx.raw).toFixed(1)} mm · ${level} risk`;
          },
        },
      },
    },
  };

  return (
    <div className="h-80">
      <Bar
        aria-label="Zones ranked by today's forecast rainfall"
        options={options}
        data={{
          labels: rows.map((r) => r.name),
          datasets: [
            {
              data: rows.map((r) => Math.round((r.todayMm ?? 0) * 10) / 10),
              backgroundColor: rows.map((r) => (r.risk ? RISK_META[r.risk].color : "#94a3b8")),
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 22,
            },
          ],
        }}
      />
    </div>
  );
}
