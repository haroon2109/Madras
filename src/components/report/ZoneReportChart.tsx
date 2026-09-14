"use client";

import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import type { RiskLevel } from "@/lib/risk";
import { RISK_META } from "@/lib/risk";
import { shortLabel } from "./labels";

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface ZoneReportChartPoint {
  date: string;
  precipMm: number;
  risk: RiskLevel;
}

/**
 * Zone daily rainfall: per-day bars colored by risk level, with the city-mean
 * daily rainfall as a comparison line.
 */
export default function ZoneReportChart({
  data,
  cityData,
}: {
  data: ZoneReportChartPoint[];
  cityData: { date: string; cityMm: number }[];
}) {
  if (data.length === 0) {
    return (
      <p className="grid h-full place-items-center py-10 text-sm text-[#5F6368]">
        No history yet — refresh to pull live forecasts.
      </p>
    );
  }

  const cityByDate = new Map(cityData.map((c) => [c.date, c.cityMm]));

  // Mixed bar + line datasets: Chart.js supports per-dataset type overrides at
  // runtime; the cast is needed because ChartData<"bar"> types datasets as bars.
  const chartData: ChartData<"bar", (number | null)[], string> = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        type: "line",
        label: "City mean",
        data: data.map((d) => cityByDate.get(d.date) ?? null),
        borderColor: "#202124",
        backgroundColor: "rgba(16,42,86,0.08)",
        tension: 0.35,
        pointRadius: 2,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        type: "bar",
        label: "Zone rainfall",
        data: data.map((d) => d.precipMm),
        backgroundColor: data.map((d) => RISK_META[d.risk].color),
        borderRadius: 5,
        borderSkipped: false,
        maxBarThickness: 28,
      },
    ] as ChartData<"bar", (number | null)[], string>["datasets"],
  };

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
          label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.raw ?? 0).toFixed(1)} mm`,
        },
      },
    },
  };

  return (
    <div className="h-72">
      <Chart
        aria-label="Zone daily rainfall with city mean comparison"
        options={options}
        type="bar"
        data={chartData}
      />
    </div>
  );
}
