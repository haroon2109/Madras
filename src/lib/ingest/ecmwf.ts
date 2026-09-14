/**
 * ECMWF forecast service.
 *
 * Pulls hourly precipitation forecasts from the ECMWF IFS 0.25° model
 * (`ecmwf_ifs04`) served by Open-Meteo. ECMWF is the higher-resolution
 * European model, updated roughly 4x daily — useful as the "primary" model.
 */

import { fetchModelHourly, type HourlyFetchOptions, type HourlyFetchOutcome } from "./forecast";
import type { IngestZone, WeatherModelId } from "./types";

export const ECMWF_MODEL: WeatherModelId = "ecmwf";

/** Fetch an hourly precipitation forecast for one Chennai zone from ECMWF. */
export function fetchEcmwfHourly(zone: IngestZone, options: HourlyFetchOptions = {}): Promise<HourlyFetchOutcome> {
  return fetchModelHourly(ECMWF_MODEL, zone, options);
}