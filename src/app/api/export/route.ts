import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { istDateKey } from "@/lib/data";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Feature 7 — CSV export of stored real data (no fabrication).
 *
 *   /api/export?type=forecast   daily ForecastSnapshot rows
 *   /api/export?type=hourly     HourlyRainfall rows (ECMWF/GFS, nulls kept)
 *   /api/export?type=incidents  incident reports
 *
 * Requires a signed-in session (middleware also gates this path).
 */

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return lines.join("\r\n") + "\r\n";
}

function csvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "forecast";
  const stamp = istDateKey(new Date());

  if (type === "forecast") {
    const rows = await prisma.forecastSnapshot.findMany({
      orderBy: [{ forecastDate: "asc" }, { zoneId: "asc" }, { capturedAt: "asc" }],
      include: { zone: true },
    });
    const csv = toCsv(
      ["zone_number", "zone_name", "forecast_date", "captured_at_utc", "precip_sum_mm", "precip_prob_max", "temp_max_c", "temp_min_c", "wind_max_kmh", "risk_level", "source"],
      rows.map((r) => [
        r.zone.number,
        r.zone.name,
        istDateKey(r.forecastDate),
        r.capturedAt.toISOString(),
        r.precipSumMm,
        r.precipProbMax,
        r.tempMaxC,
        r.tempMinC,
        r.windMaxKmh,
        r.riskLevel,
        r.source,
      ])
    );
    return csvResponse(csv, `madras-forecast-${stamp}.csv`);
  }

  if (type === "hourly") {
    const rows = await prisma.hourlyRainfall.findMany({
      orderBy: [{ timestamp: "asc" }, { zoneId: "asc" }, { model: "asc" }],
      include: { zone: true },
    });
    // Same four-column contract as the processing pipeline's CSV output.
    const csv = toCsv(
      ["timestamp_utc", "zone_id", "zone_number", "zone_name", "model", "rainfall_mm_hr"],
      rows.map((r) => [
        r.timestamp.toISOString(),
        r.zoneId,
        r.zone.number,
        r.zone.name,
        r.model,
        r.rainfallMmHr, // null stays empty — missing at source, never interpolated
      ])
    );
    return csvResponse(csv, `madras-hourly-${stamp}.csv`);
  }

  if (type === "incidents") {
    const rows = await prisma.incident.findMany({
      orderBy: { createdAt: "desc" },
      include: { zone: true },
    });
    const csv = toCsv(
      ["created_at_utc", "zone_number", "zone_name", "latitude", "longitude", "depth_cm", "status", "source", "reporter", "description"],
      rows.map((r) => [
        r.createdAt.toISOString(),
        r.zone.number,
        r.zone.name,
        r.latitude,
        r.longitude,
        r.depthCm,
        r.status,
        r.source,
        r.reporterName,
        r.description,
      ])
    );
    return csvResponse(csv, `madras-incidents-${stamp}.csv`);
  }

  if (type === "alerts") {
    const rows = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      include: { zone: true },
    });
    const csv = toCsv(
      ["created_at_utc", "zone_number", "zone_name", "level", "title", "message", "resolved_at_utc"],
      rows.map((r) => [
        r.createdAt.toISOString(),
        r.zone.number,
        r.zone.name,
        r.level,
        r.title,
        r.message,
        r.resolvedAt ? r.resolvedAt.toISOString() : "",
      ])
    );
    return csvResponse(csv, `madras-alerts-${stamp}.csv`);
  }

  return NextResponse.json({ error: "unknown type; use forecast | hourly | incidents | alerts" }, { status: 400 });
}
