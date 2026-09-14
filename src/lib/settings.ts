/**
 * Settings service — client-side persistence layer for user preferences.
 *
 * INTEGRATION POINT: there is currently no settings/preferences API or
 * notification backend (see prisma/schema.prisma — User has no preference
 * columns). Everything here persists to localStorage under a versioned key.
 * To move to a backend later, replace `loadSettings` / `saveSettings` with
 * fetch calls to e.g. GET/PUT /api/settings and keep the types + hook API
 * unchanged — all settings UI consumes `useSettings`, never localStorage.
 */

export interface NotificationSettings {
  rainfallAlerts: boolean;
  zoneUpdates: boolean;
  systemNotifications: boolean;
  emailNotifications: boolean;
  smsAlerts: boolean;
}

export interface ApplicationPreferences {
  /** Route id the user prefers to land on. Must match a real route. */
  defaultView: string;
  /** Must match a real model value from HourlyRainfall.model ("ecmwf" | "gfs"). */
  forecastModel: string;
  timeRange: string;
  mapStyle: string;
  language: string;
}

export interface UserSettings {
  notifications: NotificationSettings;
  preferences: ApplicationPreferences;
  /** Department is UI-local: User has no department column yet. */
  department: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  notifications: {
    rainfallAlerts: true,
    zoneUpdates: true,
    systemNotifications: true,
    emailNotifications: false,
    smsAlerts: false,
  },
  preferences: {
    defaultView: "dashboard",
    forecastModel: "ecmwf",
    timeRange: "24h",
    mapStyle: "light",
    language: "en",
  },
  department: "ICCC",
};

const STORAGE_KEY = "mrw-settings-v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Merge stored JSON over defaults so new keys always get sane values. */
export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_SETTINGS;
    return {
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(isRecord(parsed.notifications) ? parsed.notifications : {}) },
      preferences: { ...DEFAULT_SETTINGS.preferences, ...(isRecord(parsed.preferences) ? parsed.preferences : {}) },
      department: typeof parsed.department === "string" ? parsed.department : DEFAULT_SETTINGS.department,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable — preferences simply won't persist.
  }
}

/* ------------------------------------------------------------------ */
/* Option lists — each value must correspond to something real.        */
/* ------------------------------------------------------------------ */

/** Only routes that actually exist in src/app. */
export const VIEW_OPTIONS = [
  { value: "dashboard", label: "Dashboard", href: "/dashboard" },
  { value: "decisions", label: "Decision Support", href: "/decisions" },
  { value: "zones", label: "Zones", href: "/zones" },
  { value: "analytics", label: "Analytics", href: "/analytics" },
] as const;

/** Real model values stored in HourlyRainfall.model. Not backend-switching:
 *  the app blends all loaded models; this preference is display-only until
 *  a model-aware forecast endpoint exists. */
export const MODEL_OPTIONS = [
  { value: "ecmwf", label: "ECMWF" },
  { value: "gfs", label: "GFS" },
] as const;

/** Ranges covered by dashboard data (today + 7-day outlook). */
export const TIME_RANGE_OPTIONS = [
  { value: "24h", label: "24 Hours" },
  { value: "48h", label: "48 Hours" },
  { value: "7d", label: "7 Days" },
] as const;

/** Leaflet/OSM tiles are light; "dark" is stored for future map support. */
export const MAP_STYLE_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export const LANGUAGE_OPTIONS = [{ value: "en", label: "English" }] as const;

export const DEPARTMENT_OPTIONS = ["ICCC", "GCC", "WRD", "TNSDMA", "IMD"] as const;
