import { NextRequest, NextResponse } from "next/server";
import { refreshAllZones, assessAndAlert } from "@/lib/data";

/** Manual refresh triggered from the dashboard (requires login via middleware). */
export async function POST() {
  const result = await refreshAllZones();
  const alertsCreated = await assessAndAlert();
  return NextResponse.json({ ...result, alertsCreated });
}

/**
 * Cron-style refresh, e.g. `curl https://host/api/refresh?key=<CRON_SECRET>`.
 * In production set CRON_SECRET; in development an unset secret is allowed.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const key = request.nextUrl.searchParams.get("key");
  if (secret && key !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await refreshAllZones();
  const alertsCreated = await assessAndAlert();
  return NextResponse.json({ ...result, alertsCreated });
}