"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type ApplicationPreferences,
  type NotificationSettings,
  type UserSettings,
} from "@/lib/settings";

/**
 * Client hook over the settings service. Reads localStorage on mount
 * (SSR-safe: starts from defaults, hydrates after mount to avoid mismatch)
 * and persists every change. Swap the load/save internals for API calls
 * later without touching consumers.
 */
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe: the first render uses
  // defaults on both server and client, then we sync once post-hydration).
  // Both updates are deferred out of the effect body (React 19 lint rule).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSettings(loadSettings());
      setHydrated(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const updateNotifications = useCallback((patch: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const next: UserSettings = {
        ...prev,
        notifications: { ...prev.notifications, ...patch },
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const updatePreferences = useCallback((patch: Partial<ApplicationPreferences>) => {
    setSettings((prev) => {
      const next: UserSettings = {
        ...prev,
        preferences: { ...prev.preferences, ...patch },
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateDepartment = useCallback((department: string) => {
    setSettings((prev) => {
      const next: UserSettings = { ...prev, department };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, hydrated, updateNotifications, updatePreferences, updateDepartment };
}
