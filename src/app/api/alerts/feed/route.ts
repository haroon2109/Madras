import { NextResponse } from "next/server";
import { getPublicAlerts } from "@/app/(public)/weather/alerts-helpers";
import { istToday } from "@/lib/weather";

export const dynamic = "force-dynamic";

/**
 * Feature 8 — public, machine-readable feed of active alerts.
 *
 * Returns every unresolved alert from the last 3 days (real rows from the
 * Alert table) as JSON, suitable for other apps, bots, or the citizen
 * notification pipeline. No auth — this data is public on /weather already.
 */
export async function GET() {
  const rows = await getPublicAlerts(100);
  const active = rows.filter((r) => r.resolvedAt === null);
  const todayKey = istToday();

  return NextResponse.json(
    {
      generator: "Madras — Chennai rainfall decision-support platform",
      updated: new Date().toISOString(),
      activeCount: active.length,
      items: active.map((a) => ({
        id: a.id,
        level: a.level,
        title: a.title,
        message: a.message,
        zone: { number: a.zoneNumber, name: a.zoneName },
        forecastDate: todayKey,
        recommendedActions: a.actions,
        issuedAt: a.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
