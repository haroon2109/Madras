import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getModelAccuracy } from "@/lib/data";
import ModelAccuracyTable from "@/components/accuracy/ModelAccuracyTable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Model accuracy — Madras",
  description: "ECMWF vs GFS forecast accuracy scored against observed rainfall.",
};

export default async function AccuracyPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard?error=forbidden");
  const accuracy = await getModelAccuracy(14);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#202124]">
          Model accuracy scorecard
        </h1>
        <p className="mt-1 text-sm text-[#5F6368]">
          Daily-aggregate ECMWF vs GFS forecasts scored against stored observations
          over the last {accuracy.daysEvaluated} evaluated days (MAE = mean absolute error).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#5F6368]">ECMWF city MAE</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-[#1A73E8]">
            {accuracy.cityMae.ecmwf.toFixed(1)} <span className="text-sm font-semibold text-[#5F6368]">mm/day</span>
          </div>
        </div>
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#5F6368]">GFS city MAE</div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-[#7c3aed]">
            {accuracy.cityMae.gfs.toFixed(1)} <span className="text-sm font-semibold text-[#5F6368]">mm/day</span>
          </div>
        </div>
      </div>

      <ModelAccuracyTable zones={accuracy.zones} />
    </div>
  );
}
