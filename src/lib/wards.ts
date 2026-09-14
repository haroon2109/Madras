/**
 * Chennai ward configuration — loader & accessor.
 *
 * Ward data lives ONLY in `src/config/chennai-wards.json`. This module
 * provides the consumer-facing accessor for ward information.
 */

import rawConfig from "@/config/chennai-wards.json";

/** One ward as defined in the configuration file. */
export interface WardConfig {
  wardNumber: number;
  name: string;
  zoneNumber: number;
}

/** The whole configuration document. */
export interface WardConfigFile {
  version: number;
  city: string;
  timezone: string;
  source: string;
  notes: string;
  wards: WardConfig[];
}

const wardConfig = rawConfig as WardConfigFile;

/**
 * All 200 wards sorted by ward number.
 */
let cachedWards: WardConfig[] | null = null;

export function getChennaiWards(): WardConfig[] {
  if (!cachedWards) {
    cachedWards = [...wardConfig.wards].sort((a, b) => a.wardNumber - b.wardNumber);
  }
  return cachedWards;
}

/**
 * Wards grouped by zone number, with zones sorted ascending.
 * Each zone entry contains its wards sorted by ward number.
 */
export function getWardsByZone(): Map<number, WardConfig[]> {
  const byZone = new Map<number, WardConfig[]>();
  for (const ward of getChennaiWards()) {
    let arr = byZone.get(ward.zoneNumber);
    if (!arr) {
      arr = [];
      byZone.set(ward.zoneNumber, arr);
    }
    arr.push(ward);
  }
  // Sort wards within each zone
  for (const arr of byZone.values()) {
    arr.sort((a, b) => a.wardNumber - b.wardNumber);
  }
  return byZone;
}

/** Total ward count. */
export const TOTAL_WARD_COUNT = wardConfig.wards.length;
