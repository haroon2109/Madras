import { NextResponse } from "next/server";
import { getActiveAlerts } from "@/lib/data";

export const dynamic = "force-dynamic";

/** Active (unresolved) alerts for the notification bell digest. */
export async function GET() {
  const alerts = await getActiveAlerts(20);
  return NextResponse.json(alerts);
}