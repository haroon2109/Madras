"use client";

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { shortLabel } from "./labels";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

export interface WindPoint {
  date: string;
  windMaxKmh: number;
}

/** City-mean daily max wind speed across the window. */
export default function WindChart({ data }: { data: WindPoint[] }) {
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
    scales: {
      x: {
        ticks: { color: "#5F6368", font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "km/h", color: "#5F6368", font: { size: 11 } },
        ticks: { color: "#5F6368", font: { size: 11 } },
        grid: { color: "rgba(100,122,153,0.12)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => (items[0] ? shortLabel(items[0].label) : ""),
          label: (ctx) => ` ${Number(ctx.raw).toFixed(1)} km/h max wind`,
        },
      },
    },
  };

  return (
    <div className="h-56">
      <Line
        aria-label="Daily maximum wind speed trend"
        options={options}
        data={{
          labels: data.map((d) => d.date),
          datasets: [
            {
              label: "Max wind",
              data: data.map((d) => d.windMaxKmh),
              borderColor: "#0EA5A0",
              backgroundColor: "rgba(14,165,160,0.12)",
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
