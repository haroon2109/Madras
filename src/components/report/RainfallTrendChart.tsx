"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { shortLabel } from "./labels";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

export interface TrendPoint {
  date: string;
  cityMm: number;
  maxZoneMm: number;
}

/** Daily rainfall trend: city mean vs wettest single zone, over the window. */
export default function RainfallTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="grid h-full place-items-center py-10 text-sm text-[#5F6368]">
        No history yet — refresh to pull live forecasts.
      </p>
    );
  }

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        ticks: { color: "#5F6368", font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "mm / 24h", color: "#5F6368", font: { size: 11 } },
        ticks: { color: "#5F6368", font: { size: 11 } },
        grid: { color: "rgba(100,122,153,0.12)" },
      },
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#5F6368", boxWidth: 12, boxHeight: 12, usePointStyle: true, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          title: (items) => (items[0] ? shortLabel(items[0].label) : ""),
          label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(1)} mm`,
        },
      },
    },
  };

  return (
    <div className="h-72">
      <Line
        aria-label="City-wide daily rainfall trend"
        options={options}
        data={{
          labels: data.map((d) => d.date),
          datasets: [
            {
              label: "City mean",
              data: data.map((d) => d.cityMm),
              borderColor: "#1A73E8",
              backgroundColor: "rgba(20,120,242,0.12)",
              fill: true,
              tension: 0.35,
              pointRadius: 2,
              pointHoverRadius: 5,
            },
            {
              label: "Wettest zone",
              data: data.map((d) => d.maxZoneMm),
              borderColor: "#F59E0B",
              backgroundColor: "rgba(245,158,11,0.10)",
              fill: true,
              tension: 0.35,
              pointRadius: 2,
              pointHoverRadius: 5,
            },
          ],
        }}
      />
    </div>
  );
}
