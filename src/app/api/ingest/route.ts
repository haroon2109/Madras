import { NextRequest, NextResponse } from "next/server";
import { ingestAllZones } from "@/lib/ingest";

/** Manual ingestion triggered from the UI (requires login via middleware). */
export async function POST() {
  const summary = await ingestAllZones();
  return NextResponse.json(summary);
}

/**
 * Cron-style ingestion, e.g. `curl https://host/api/ingest?key=<CRON_SECRET>`.
 * In production set CRON_SECRET; in development an unset secret is allowed.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const key = request.nextUrl.searchParams.get("key");
  if (secret && key !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await ingestAllZones();
  return NextResponse.json(summary);
}