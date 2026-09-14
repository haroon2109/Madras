export type RiskLevel = "LOW" | "WATCH" | "WARNING" | "ALERT";

export interface RiskThresholds {
  watchThreshold: number;
  warningThreshold: number;
  alertThreshold: number;
}

export function riskLevelFor(precipMm: number, t: RiskThresholds): RiskLevel {
  if (precipMm >= t.alertThreshold) return "ALERT";
  if (precipMm >= t.warningThreshold) return "WARNING";
  if (precipMm >= t.watchThreshold) return "WATCH";
  return "LOW";
}

export const RISK_META: Record<
  RiskLevel,
  {
    label: string;
    plain: string;
    description: string;
    /** Tailwind badge classes */
    badge: string;
    /** Leaflet/tile color */
    color: string;
    severity: number;
    actions: string[];
  }
> = {
  LOW: {
    label: "Low",
    plain: "No significant rainfall expected. Situation normal.",
    description: "No significant rainfall expected in the next 24 hours.",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    color: "#10b981",
    severity: 0,
    actions: [
      "Continue routine monitoring",
      "No action required",
    ],
  },
  WATCH: {
    label: "Watch",
    plain: "Moderate rainfall possible. Keep an eye on low-lying areas.",
    description: "Moderate rainfall possible. Monitor low-lying areas.",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    color: "#eab308",
    severity: 1,
    actions: [
      "Alert field staff and zone engineers",
      "Monitor drainage outlets and water-logging hotspots",
      "Pre-position dewatering pumps at known problem spots",
    ],
  },
  WARNING: {
    label: "Warning",
    plain: "Heavy rainfall likely. Prepare response crews and clear drains.",
    description: "Heavy rainfall likely. Prepare response teams.",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    color: "#f97316",
    severity: 2,
    actions: [
      "Activate pump operators and dewatering crews",
      "Clear stormwater drains and culverts of debris",
      "Alert residents in low-lying areas via community channels",
      "Stage emergency response teams at zone control rooms",
    ],
  },
  ALERT: {
    label: "Alert",
    plain: "Very heavy rain expected. Activate flood response now.",
    description: "Very heavy rainfall expected. Activate flood response.",
    badge: "bg-red-100 text-red-800 border-red-200",
    color: "#ef4444",
    severity: 3,
    actions: [
      "Activate flood response command center",
      "Close low-lying roads, subways and underpasses to traffic",
      "Pre-position rescue boats and evacuate vulnerable pockets",
      "Deploy pumps to chronic water-logging hotspots",
      "Broadcast public alert via sirens, SMS and social media",
    ],
  },
};

export function recommendationsFor(precipMm: number, t: RiskThresholds): {
  level: RiskLevel;
  actions: string[];
} {
  const level = riskLevelFor(precipMm, t);
  return { level, actions: RISK_META[level].actions };
}

export const RISK_ORDER: RiskLevel[] = ["LOW", "WATCH", "WARNING", "ALERT"];

/** Numeric severity per level, for priority math (Feature 4). */
export const RISK_SEVERITY: Record<RiskLevel, number> = {
  LOW: 0,
  WATCH: 1,
  WARNING: 2,
  ALERT: 3,
};

export function riskTitle(level: RiskLevel, zoneName: string): string {
  switch (level) {
    case "ALERT":
      return `Very heavy rainfall expected in ${zoneName}`;
    case "WARNING":
      return `Heavy rainfall expected in ${zoneName}`;
    case "WATCH":
      return `Moderate rainfall expected in ${zoneName}`;
    default:
      return `Low rainfall expected in ${zoneName}`;
  }
}

export function riskMessage(level: RiskLevel, precipMm: number): string {
  switch (level) {
    case "ALERT":
      return `Forecast of ${precipMm.toFixed(1)} mm in the next 24 hours — above the alert threshold. Immediate flood-response activation advised.`;
    case "WARNING":
      return `Forecast of ${precipMm.toFixed(1)} mm in the next 24 hours — above the warning threshold. Response teams should be prepared.`;
    case "WATCH":
      return `Forecast of ${precipMm.toFixed(1)} mm in the next 24 hours — above the watch threshold. Monitor low-lying areas.`;
    default:
      return `Forecast of ${precipMm.toFixed(1)} mm in the next 24 hours — routine monitoring.`;
  }
}