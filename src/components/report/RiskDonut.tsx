"use client";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { RiskLevel } from "@/lib/risk";
import { RISK_META } from "@/lib/risk";

ChartJS.register(ArcElement, Tooltip, Legend);

export interface RiskDonutDatum {
  level: RiskLevel;
  zones: number;
}

/** City-wide risk mix right now: one donut segment per non-LOW risk level. */
export default function RiskDonut({ data }: { data: RiskDonutDatum[] }) {
  const total = data.reduce((acc, d) => acc + d.zones, 0);

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#5F6368", boxWidth: 12, boxHeight: 12, usePointStyle: true, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number(ctx.raw ?? 0);
            const pct = total > 0 ? Math.round((v / total) * 100) : 0;
            return ` ${ctx.label}: ${v} zone${v === 1 ? "" : "s"} (${pct}%)`;
          },
        },
      },
    },
  };

  if (total === 0) {
    return (
      <p className="grid h-full place-items-center py-10 text-sm text-[#5F6368]">
        No forecast data yet — refresh to pull live forecasts.
      </p>
    );
  }

  return (
    <div className="h-64">
      <Doughnut
        aria-label="City-wide risk level distribution"
        options={options}
        data={{
          labels: data.map((d) => RISK_META[d.level].label),
          datasets: [
            {
              data: data.map((d) => d.zones),
              backgroundColor: data.map((d) => RISK_META[d.level].color),
              borderColor: "#ffffff",
              borderWidth: 2,
              hoverOffset: 6,
            },
          ],
        }}
      />
    </div>
  );
}
