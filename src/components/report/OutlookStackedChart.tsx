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
import { shortLabel, weekdayLabel } from "./labels";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface OutlookDatum {
  date: string;
  /** Ordered zone precip values aligned with zoneNames. */
  zoneMm: number[];
}

/**
 * Next-7-day outlook as a stacked bar: each segment is one zone's forecast,
 * the bar height is the city total — reads as "which zones make the rain".
 */
export default function OutlookStackedChart({
  data,
  zoneNames,
}: {
  data: OutlookDatum[];
  zoneNames: string[];
}) {
  if (data.length === 0) {
    return (
      <p className="grid h-full place-items-center py-10 text-sm text-[#5F6368]">
        No outlook data yet — refresh to pull live forecasts.
      </p>
    );
  }

  const PALETTE = [
    "#1A73E8", "#0EA5A0", "#F59E0B", "#8B5CF6", "#EF4444",
    "#10B981", "#F97316", "#3B82F6", "#EC4899", "#14B8A6",
    "#A855F7", "#EAB308", "#06B6D4", "#F43F5E", "#84CC16",
  ];

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: "#5F6368",
          font: { size: 11 },
          callback: (_value, index) => shortLabel(data[index]?.date ?? ""),
        },
        grid: { display: false },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: { display: true, text: "mm / 24h (city total)", color: "#5F6368", font: { size: 11 } },
        ticks: { color: "#5F6368", font: { size: 11 } },
        grid: { color: "rgba(100,122,153,0.12)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => (items[0] ? weekdayLabel(data[items[0].dataIndex]?.date ?? "") : ""),
          label: (ctx) => {
            const v = Number(ctx.raw ?? 0);
            if (v < 0.05) return ` ${ctx.dataset.label}: —`;
            return ` ${ctx.dataset.label}: ${v.toFixed(1)} mm`;
          },
          footer: (items) => {
            const total = items.reduce((acc, it) => acc + Number(it.raw ?? 0), 0);
            return `City total: ${total.toFixed(1)} mm`;
          },
        },
      },
    },
  };

  return (
    <div className="h-72">
      <Bar
        aria-label="Seven day rainfall outlook stacked by zone"
        options={options}
        data={{
          labels: data.map((d) => d.date),
          datasets: zoneNames.map((name, zi) => ({
            label: name,
            data: data.map((d) => Math.round((d.zoneMm[zi] ?? 0) * 100) / 100),
            backgroundColor: PALETTE[zi % PALETTE.length],
            stack: "zones",
            maxBarThickness: 44,
          })),
        }}
      />
    </div>
  );
}
