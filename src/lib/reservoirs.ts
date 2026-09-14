/**
 * Reservoirs configuration — loader.
 *
 * Reservoir rows (name, capacity, map coordinates) live ONLY in
 * `src/config/reservoirs.json`. Storage readings are manual-entry rows
 * (`ReservoirReading`) created from /admin. This module is the only
 * accessor for the config file.
 */

import rawConfig from "@/config/reservoirs.json";

export interface ReservoirConfig {
  key: string;
  name: string;
  capacityTmcft: number;
  latitude: number;
  longitude: number;
}

export interface ReservoirConfigFile {
  version: number;
  source: string;
  notes: string;
  reservoirs: ReservoirConfig[];
}

export function getReservoirConfigs(): ReservoirConfig[] {
  const cfg = rawConfig as ReservoirConfigFile;
  return cfg.reservoirs;
}
