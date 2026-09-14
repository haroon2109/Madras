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

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

export interface RainyDaysDatum {
  name: string;
  rainyDays: number;
}

/** Rainy days (≥0.5 mm) per zone across the report window. */
export default function RainyDaysChart({ data, windowDays }: { data: RainyDaysDatum[]; windowDays: number }) {
  const rows = [...data].sort((a, b) => b.rainyDays - a.rainyDays);

  if (rows.length === 0) {
    return (
      <p className="grid h-full place-items-center py-10 text-sm text-[#5F6368]">
        No history yet — refresh to pull live forecasts.
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
        grace: "5%",
        ticks: { color: "#5F6368", font: { size: 11 }, precision: 0 },
        title: { display: true, text: `days with ≥0.5 mm (of ${windowDays})`, color: "#5F6368", font: { size: 11 } },
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
          label: (ctx) => ` ${ctx.raw} rainy day${Number(ctx.raw) === 1 ? "" : "s"}`,
        },
      },
    },
  };

  return (
    <div className="h-80">
      <Bar
        aria-label="Rainy days per zone"
        options={options}
        data={{
          labels: rows.map((r) => r.name),
          datasets: [
            {
              data: rows.map((r) => r.rainyDays),
              backgroundColor: rows.map((r) => (r.rainyDays >= windowDays * 0.6 ? "#1A73E8" : "#7FB2F0")),
              borderRadius: 6,
              borderSkipped: false,
              maxBarThickness: 20,
            },
          ],
        }}
      />
    </div>
  );
}
