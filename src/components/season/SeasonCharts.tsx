"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import type { SeasonStats } from "@/lib/data";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function SeasonCharts({
  season,
  monthNames,
  normals: _normals,
}: {
  season: SeasonStats;
  monthNames: string[];
  normals: { month: number; normalMm: number }[];
}) {
  void _normals;
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { ticks: { color: "#5F6368", font: { size: 11 } }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: "#5F6368", font: { size: 11 } }, grid: { color: "rgba(100,122,153,0.12)" } },
    },
    plugins: { legend: { position: "bottom", labels: { color: "#5F6368", boxWidth: 12, font: { size: 12 } } } },
  };
  return (
    <div className="rounded-2xl border border-[#DADCE0] bg-white p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#5F6368]">
        Monthly actual vs normal
      </h2>
      <div className="mt-3 h-64">
        <Bar
          options={options}
          data={{
            labels: season.monthly.map((m) => monthNames[m.month]),
            datasets: [
              { label: "Actual (city mean)", data: season.monthly.map((m) => m.actualMm), backgroundColor: "#1A73E8", borderRadius: 6 },
              { label: "Normal", data: season.monthly.map((m) => m.normalMm), backgroundColor: "rgba(100,122,153,0.35)", borderRadius: 6 },
            ],
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-[#5F6368]">
        <span>Rainy days (season): <strong className="text-[#202124]">{season.rainyDays}</strong></span>
        {season.wettestDay && <span>Wettest day: <strong className="text-[#202124]">{season.wettestDay.mm.toFixed(1)} mm · {season.wettestDay.date}</strong></span>}
        {season.wettestZone && <span>Wettest zone: <strong className="text-[#202124]">{season.wettestZone.name} ({season.wettestZone.mm.toFixed(0)} mm)</strong></span>}
      </div>
    </div>
  );
}
