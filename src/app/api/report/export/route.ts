import { NextRequest, NextResponse } from "next/server";
import {
  getCityReport,
  getDailyReport,
  getZoneReport,
  getAvailableReportDates,
  istDateKey,
} from "@/lib/data";
import { RISK_META } from "@/lib/risk";

export const dynamic = "force-dynamic";

/** A CSV row cell: string, number, or null/undefined (rendered empty). */
type Cell = string | number | null | undefined;

/** CSV cell escaping: quotes, leading =,+,-,@ guard, commas, newlines. */
function csvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? String(Math.round(value * 100) / 100) : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvResponse(filename: string, rows: Cell[][]): NextResponse {
  const body = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Report CSV export.
 *
 * GET /api/report/export?type=…
 *   city         — per-zone summary over the past 14 days + today's risk
 *   city-days    — city-mean daily series over the past 14 days
 *   daily        — per-zone detail for one date (?date=YYYY-MM-DD, default latest)
 *   zone         — one zone's daily series over the past 14 days (?zone=<id>)
 *   zone-outlook — one zone's 7-day outlook (?zone=<id>)
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "city";

  if (type === "city") {
    const report = await getCityReport(14);
    if (!report) return badRequest("No zones configured.");

    const rows: Cell[][] = [
      ["Madras — city zone summary (past 14 days)"],
      ["Generated (IST)", report.generatedAt],
      [],
      ["Zone #", "Zone", "Risk today", "Today (mm)", "Window total (mm)", "Rainy days", "Wettest day", "Wettest day (mm)"],
    ];
    for (const z of report.zones) {
      rows.push([
        z.number,
        z.name,
        z.risk ? RISK_META[z.risk].label : "",
        z.todayMm,
        z.totalMm,
        z.rainyDays,
        z.wettestDay ? z.wettestDay.date : "",
        z.wettestDay ? z.wettestDay.mm : "",
      ]);
    }
    return csvResponse("city-zone-summary.csv", rows);
  }

  if (type === "city-days") {
    const report = await getCityReport(14);
    if (!report) return badRequest("No zones configured.");

    const rows: Cell[][] = [
      ["Madras — city daily series (past 14 days)"],
      ["Generated (IST)", report.generatedAt],
      [],
      ["Date", "City mean (mm)", "Wettest zone (mm)", "Temp max (°C)", "Temp min (°C)", "Wind max (km/h)"],
    ];
    for (const d of report.days) {
      rows.push([d.date, d.cityMm, d.maxZoneMm, d.tempMaxC, d.tempMinC, d.windMaxKmh]);
    }
    return csvResponse("city-daily-series.csv", rows);
  }

  if (type === "daily") {
    const requested = sp.get("date");
    const dates = await getAvailableReportDates();
    const dateKey =
      requested && dates.includes(requested) ? requested : dates.at(-1) ?? istDateKey(new Date());
    const report = await getDailyReport(dateKey);
    if (!report) return badRequest(`No zone data for ${dateKey}.`);

    const rows: Cell[][] = [
      [`Madras — daily zone report ${report.date}`],
      ["Generated (IST)", report.generatedAt],
      ["Zones reported", report.zones.length],
      [],
      [
        "Zone #",
        "Zone",
        "Rainfall (mm)",
        "Δ previous day (mm)",
        "Chance of rain (%)",
        "Temp min (°C)",
        "Temp max (°C)",
        "Wind max (km/h)",
        "Risk",
      ],
    ];
    for (const z of report.zones) {
      rows.push([
        z.number,
        z.name,
        z.precipMm,
        z.prevDayDiffMm,
        z.precipProbMax,
        z.tempMinC,
        z.tempMaxC,
        z.windMaxKmh,
        RISK_META[z.risk].label,
      ]);
    }
    rows.push([]);
    rows.push(["City total (zone sum, mm)", report.city.totalMm]);
    rows.push(["City mean (mm)", report.city.meanMm]);
    rows.push([
      "Wettest zone",
      report.city.wettestZone ? `${report.city.wettestZone.name} (${report.city.wettestZone.mm} mm)` : "",
    ]);
    return csvResponse(`daily-report-${report.date}.csv`, rows);
  }

  if (type === "zone" || type === "zone-outlook") {
    const zoneId = sp.get("zone");
    if (!zoneId) return badRequest("Missing ?zone=<zone id>.");
    const report = await getZoneReport(zoneId, 14);
    if (!report) return badRequest("Unknown zone.");

    const isOutlook = type === "zone-outlook";
    const source = isOutlook ? report.outlook : report.days;

    const rows: Cell[][] = [
      [
        isOutlook
          ? `Madras — ${report.zone.name} 7-day outlook`
          : `Madras — ${report.zone.name} daily series (past 14 days)`,
      ],
      ["Generated (IST)", report.generatedAt],
      [],
      ["Date", "Rainfall (mm)", "Chance of rain (%)", "Temp min (°C)", "Temp max (°C)", "Wind max (km/h)", "Risk"],
    ];
    for (const d of source) {
      rows.push([
        d.date,
        d.precipMm,
        d.precipProbMax,
        d.tempMinC,
        d.tempMaxC,
        d.windMaxKmh,
        RISK_META[d.risk].label,
      ]);
    }
    const suffix = isOutlook ? "outlook" : "daily";
    return csvResponse(`zone-${report.zone.number}-${suffix}.csv`, rows);
  }

  return badRequest("Unknown export type. Use city, city-days, daily, zone or zone-outlook.");
}
