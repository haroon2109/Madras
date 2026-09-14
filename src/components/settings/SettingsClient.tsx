"use client";

import { Bell, SlidersHorizontal, Building2 } from "lucide-react";
import { useSettings } from "./useSettings";
import { SettingsCard, Toggle, FieldSelect, FieldInput } from "./ui";
import {
  VIEW_OPTIONS,
  MODEL_OPTIONS,
  TIME_RANGE_OPTIONS,
  MAP_STYLE_OPTIONS,
  LANGUAGE_OPTIONS,
  DEPARTMENT_OPTIONS,
} from "@/lib/settings";

const NOTIF_ROWS = [
  { key: "rainfallAlerts", label: "Rainfall alerts", hint: "Heavy-rain warnings for monitored zones." },
  { key: "zoneUpdates", label: "Zone updates", hint: "Threshold changes and new zone activity." },
  { key: "systemNotifications", label: "System notifications", hint: "Forecast sync and service status." },
  { key: "emailNotifications", label: "Email notifications", hint: "Daily digest to your inbox." },
  { key: "smsAlerts", label: "SMS alerts", hint: "Critical alerts by text message." },
] as const;

export default function SettingsClient({ userEmail }: { userEmail: string }) {
  const { settings, hydrated, updateNotifications, updatePreferences, updateDepartment } = useSettings();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SettingsCard icon={Bell} title="Notifications" subtitle="Choose what you want to be alerted about.">
        <div className="space-y-4">
          {NOTIF_ROWS.map((row) => (
            <div key={row.key} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#202124]">{row.label}</p>
                <p className="mt-0.5 text-xs font-medium leading-relaxed text-[#5F6368]">{row.hint}</p>
              </div>
              <Toggle
                label={row.label}
                checked={hydrated ? settings.notifications[row.key] : false}
                onChange={(v) => updateNotifications({ [row.key]: v } as Partial<Record<typeof row.key, boolean>>)}
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      <div className="space-y-6">
        <SettingsCard icon={SlidersHorizontal} title="Application preferences" subtitle="Defaults applied when you open Madras.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSelect
              id="pref-view"
              label="Default view"
              value={settings.preferences.defaultView}
              onChange={(v) => updatePreferences({ defaultView: v })}
              options={VIEW_OPTIONS}
            />
            <FieldSelect
              id="pref-model"
              label="Preferred forecast model"
              hint="Display preference — data blending is unchanged."
              value={settings.preferences.forecastModel}
              onChange={(v) => updatePreferences({ forecastModel: v })}
              options={MODEL_OPTIONS}
            />
            <FieldSelect
              id="pref-range"
              label="Time range"
              value={settings.preferences.timeRange}
              onChange={(v) => updatePreferences({ timeRange: v })}
              options={TIME_RANGE_OPTIONS}
            />
            <FieldSelect
              id="pref-map"
              label="Map style"
              value={settings.preferences.mapStyle}
              onChange={(v) => updatePreferences({ mapStyle: v })}
              options={MAP_STYLE_OPTIONS}
              disabled={settings.preferences.mapStyle === "dark"}
              disabledNote="Dark map tiles are not available yet."
            />
            <FieldSelect
              id="pref-lang"
              label="Language"
              value={settings.preferences.language}
              onChange={(v) => updatePreferences({ language: v })}
              options={LANGUAGE_OPTIONS}
            />
          </div>
        </SettingsCard>

        <SettingsCard icon={Building2} title="Department" subtitle="Shown with your reports and exports.">
          <FieldSelect
            id="pref-dept"
            label="Department"
            value={settings.department}
            onChange={updateDepartment}
            options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
          />
          <div className="mt-4">
            <FieldInput id="pref-email" label="Email" value={userEmail} readOnly note="Sign-in email — managed in your account." />
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}