/**
 * GFS forecast service.
 *
 * Pulls hourly precipitation forecasts from NOAA's Global Forecast System
 * (`gfs_seamless`, which blends GFS 0.25° global with the HRRR nest where
 * available) served by Open-Meteo. GFS updates ~4x daily — used here as the
 * independent second opinion alongside ECMWF.
 */

import { fetchModelHourly, type HourlyFetchOptions, type HourlyFetchOutcome } from "./forecast";
import type { IngestZone, WeatherModelId } from "./types";

export const GFS_MODEL: WeatherModelId = "gfs";

/** Fetch an hourly precipitation forecast for one Chennai zone from GFS. */
export function fetchGfsHourly(zone: IngestZone, options: HourlyFetchOptions = {}): Promise<HourlyFetchOutcome> {
  return fetchModelHourly(GFS_MODEL, zone, options);
}