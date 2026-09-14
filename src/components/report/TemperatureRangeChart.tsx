"use client";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { shortLabel } from "./labels";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface TempRangePoint {
  date: string;
  tempMinC: number;
  tempMaxC: number;
}

/**
 * City-mean daily temperature range as floating bars ([min, max]),
 * a compact representation of thermal comfort across the window.
 */
export default function TemperatureRangeChart({ data }: { data: TempRangePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="grid h-full place-items-center py-10 text-sm text-[#5F6368]">
        No history yet — refresh to pull live forecasts.
      </p>
    );
  }

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        ticks: { color: "#5F6368", font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: "°C", color: "#5F6368", font: { size: 11 } },
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
          label: (ctx) => {
            const raw = ctx.raw as [number, number];
            return ` ${ctx.dataset.label}: ${raw[0].toFixed(1)}–${raw[1].toFixed(1)} °C`;
          },
        },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar
        aria-label="Daily temperature range"
        options={options}
        data={{
          labels: data.map((d) => d.date),
          datasets: [
            {
              label: "Temp range (min–max)",
              data: data.map((d) => [d.tempMinC, d.tempMaxC] as [number, number]),
              backgroundColor: "rgba(249,115,22,0.55)",
              hoverBackgroundColor: "rgba(249,115,22,0.75)",
              borderRadius: 5,
              borderSkipped: false,
              maxBarThickness: 26,
            },
          ],
        }}
      />
    </div>
  );
}
