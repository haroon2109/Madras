/**
 * Chennai zone configuration — loader & validation.
 *
 * Zone data (IDs, names, centroids, optional GeoJSON boundaries) lives ONLY in
 * `src/config/chennai-zones.json`. This module is the ONLY consumer-facing
 * accessor for it: every part of the app that needs zone information imports
 * from here. UI components must never hardcode zone names, IDs, or
 * coordinates — they receive zones via props, seeded from this configuration.
 */

import rawConfig from "@/config/chennai-zones.json";

/** Optional GeoJSON geometry (RFC 7946) for a zone boundary. */
export type ZoneGeometry = {
  type: "Polygon" | "MultiPolygon";
  /** Positions are [longitude, latitude] per RFC 7946. */
  coordinates: unknown;
};

/** One zone as defined in the configuration file. */
export interface ZoneConfig {
  /** Stable zone identifier (unique across the configuration). */
  zoneId: string;
  /** GCC zone number, 1–15. */
  number: number;
  /** Zone name (unique across the configuration). */
  name: string;
  /** Zone centroid in decimal degrees (WGS 84). */
  centroid: { latitude: number; longitude: number };
  /** Optional boundary geometry; null until survey-grade data is added. */
  geometry: ZoneGeometry | null;
}

/** The whole configuration document. */
export interface ZoneConfigFile {
  version: number;
  city: string;
  timezone: string;
  source: string;
  notes: string;
  /** Default map center for city-wide views (Chennai). */
  mapCenter: { latitude: number; longitude: number };
  zones: ZoneConfig[];
}

/** Shape returned by `validateZoneConfig`. */
export interface ZoneValidationResult {
  valid: boolean;
  errors: string[];
}

const EXPECTED_ZONE_COUNT = 15;
/** Plausible bounds around Chennai (greater metropolitan area). */
const CHENNAI_BOUNDS = { minLat: 12.8, maxLat: 13.35, minLon: 79.9, maxLon: 80.4 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate arbitrary latitude/longitude values as finite decimal degrees.
 * Returns an error message, or null when both values are valid.
 */
export function validateLatLng(latitude: number, longitude: number): string | null {
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return `latitude must be a finite number in [-90, 90] (got ${String(latitude)})`;
  }
  if (typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return `longitude must be a finite number in [-180, 180] (got ${String(longitude)})`;
  }
  return null;
}

/** Validate a centroid as valid decimal degrees, within Chennai's bounds. */
export function validateCentroid(centroid: unknown, label: string): string[] {
  if (!isRecord(centroid)) {
    return [`${label}: centroid must be an object with latitude/longitude`];
  }
  const { latitude, longitude } = centroid as Record<string, unknown>;
  const errors: string[] = [];
  const base = validateLatLng(latitude as number, longitude as number);
  if (base) {
    errors.push(`${label}: ${base}`);
    return errors;
  }
  const lat = latitude as number;
  const lon = longitude as number;
  if (lat < CHENNAI_BOUNDS.minLat || lat > CHENNAI_BOUNDS.maxLat) {
    errors.push(`${label}: latitude ${lat} is outside Chennai bounds`);
  }
  if (lon < CHENNAI_BOUNDS.minLon || lon > CHENNAI_BOUNDS.maxLon) {
    errors.push(`${label}: longitude ${lon} is outside Chennai bounds`);
  }
  return errors;
}

/** Validate an optional RFC 7946 Polygon/MultiPolygon geometry field. */
export function validateGeometry(geometry: unknown, label: string): string[] {
  if (geometry === null || geometry === undefined) return [];
  if (!isRecord(geometry)) return [`${label}: geometry must be an object or null`];

  const { type, coordinates } = geometry as Record<string, unknown>;
  if (type !== "Polygon" && type !== "MultiPolygon") {
    return [`${label}: geometry.type must be "Polygon" or "MultiPolygon"`];
  }

  // RFC 7946 positions are [lon, lat]. Every ring is a non-empty array of
  // positions; we walk the structure to that depth and check the leaf values.
  const ringDepth = type === "Polygon" ? 2 : 3; // Polygon: rings→positions; MultiPolygon: polygons→rings→positions
  let node: unknown = coordinates;
  for (let depth = 0; depth < ringDepth; depth++) {
    if (!Array.isArray(node) || node.length === 0) {
      return [`${label}: geometry.coordinates has invalid structure for ${type}`];
    }
    node = node[0];
  }
  if (
    !Array.isArray(node) ||
    node.length < 2 ||
    typeof node[0] !== "number" ||
    typeof node[1] !== "number" ||
    !Number.isFinite(node[0]) ||
    !Number.isFinite(node[1])
  ) {
    return [`${label}: geometry positions must be [longitude, latitude] number pairs`];
  }
  const [lon, lat] = node as [number, number];
  if (lat < -90 || lat > 90) return [`${label}: geometry latitude ${lat} out of range`];
  if (lon < -180 || lon > 180) return [`${label}: geometry longitude ${lon} out of range`];
  return [];
}

/**
 * Validate a zone configuration document: shape, coordinates, unique
 * zoneIds/numbers/names, and the GCC 1–15 numbering.
 */
export function validateZoneConfig(config: unknown): ZoneValidationResult {
  const errors: string[] = [];

  if (!isRecord(config)) {
    return { valid: false, errors: ["zone config: expected a JSON object"] };
  }

  const zones = (config as { zones?: unknown }).zones;
  if (!Array.isArray(zones) || zones.length === 0) {
    return { valid: false, errors: ["zone config: `zones` must be a non-empty array"] };
  }
  if (zones.length !== EXPECTED_ZONE_COUNT) {
    errors.push(`zone config: expected ${EXPECTED_ZONE_COUNT} zones, found ${zones.length}`);
  }

  const seenIds = new Set<string>();
  const seenNumbers = new Set<number>();
  const seenNames = new Set<string>();

  zones.forEach((zone, index) => {
    const label = `zone config: zones[${index}]`;
    if (!isRecord(zone)) {
      errors.push(`${label}: must be an object`);
      return;
    }

    const { zoneId, number, name, centroid, geometry } = zone as Record<string, unknown>;

    // Unique, non-empty zone ID.
    if (typeof zoneId !== "string" || zoneId.trim().length === 0) {
      errors.push(`${label}: zoneId must be a non-empty string`);
    } else if (seenIds.has(zoneId)) {
      errors.push(`${label}: duplicate zoneId "${zoneId}"`);
    } else {
      seenIds.add(zoneId);
    }

    // Zone number: integer 1–15, unique.
    if (typeof number !== "number" || !Number.isInteger(number) || number < 1 || number > EXPECTED_ZONE_COUNT) {
      errors.push(`${label}: number must be an integer in [1, ${EXPECTED_ZONE_COUNT}]`);
    } else if (seenNumbers.has(number)) {
      errors.push(`${label}: duplicate zone number ${number}`);
    } else {
      seenNumbers.add(number);
    }

    // Unique, non-empty name.
    if (typeof name !== "string" || name.trim().length === 0) {
      errors.push(`${label}: name must be a non-empty string`);
    } else if (seenNames.has(name)) {
      errors.push(`${label}: duplicate zone name "${name}"`);
    } else {
      seenNames.add(name);
    }

    // Valid centroid coordinates.
    errors.push(...validateCentroid(centroid, `${label} ("${String(name)}")`));

    // Optional geometry.
    errors.push(...validateGeometry(geometry, `${label} ("${String(name)}")`));
  });

  return { valid: errors.length === 0, errors };
}

/** The parsed configuration document (as-written on disk). */
export const zoneConfig = rawConfig as ZoneConfigFile;

/**
 * Load and validate the configuration, throwing a descriptive error if invalid.
 * Callers that need clean error reporting (CLIs) should prefer
 * `validateZoneConfig` and handle the errors themselves.
 */
export function loadZoneConfig(): ZoneConfigFile {
  const { valid, errors } = validateZoneConfig(rawConfig);
  if (!valid) {
    throw new Error(`Invalid Chennai zone configuration:\n  - ${errors.join("\n  - ")}`);
  }
  return zoneConfig;
}

/**
 * The 15 validated Chennai zones, ordered by zone number. Validated lazily on
 * first call and cached — a malformed configuration fails fast, before any
 * consumer touches zone data.
 */
let cachedZones: ZoneConfig[] | null = null;

export function getChennaiZones(): ZoneConfig[] {
  if (!cachedZones) {
    const { valid, errors } = validateZoneConfig(rawConfig);
    if (!valid) {
      throw new Error(`Invalid Chennai zone configuration:\n  - ${errors.join("\n  - ")}`);
    }
    cachedZones = [...zoneConfig.zones].sort((a, b) => a.number - b.number);
  }
  return cachedZones;
}

/** Default map center for city-wide views, from the configuration file. */
export const CHENNAI_MAP_CENTER: { latitude: number; longitude: number } =
  zoneConfig.mapCenter;

/** Look up a configured zone by its GCC number. */
export function getZoneByNumber(number: number): ZoneConfig | undefined {
  return getChennaiZones().find((z) => z.number === number);
}
