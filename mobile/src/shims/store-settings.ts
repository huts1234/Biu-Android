import { create } from "zustand";
import { persist } from "zustand/middleware";

import { defaultAppSettings } from "@shared/settings/app-settings";

import { createPersistStorage } from "../lib/storage";

interface SettingsActions {
  getSettings: () => AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

/**
 * Mobile replacement for `src/store/settings.ts`.
 * Only the subset that is meaningful on a phone is persisted, but the shape is
 * kept compatible with `AppSettings` because the shared utils read it.
 */
export const useSettings = create<AppSettings & SettingsActions>()(
  persist(
    (set, get) => ({
      ...defaultAppSettings,
      getSettings: () =>
        Object.keys(defaultAppSettings).reduce((acc, key) => {
          acc[key] = get()[key];
          return acc;
        }, {} as AppSettings),
      update: (patch: Partial<AppSettings>) => set(patch),
      reset: () => set(defaultAppSettings),
    }),
    {
      name: "settings",
      storage: createPersistStorage("settings"),
      partialize: state => ({
        audioQuality: state.audioQuality,
        themeMode: state.themeMode,
        showSearchHistory: state.showSearchHistory,
        reportPlayHistory: state.reportPlayHistory,
        primaryColor: state.primaryColor,
        borderRadius: state.borderRadius,
        displayMode: state.displayMode,
      }),
    },
  ),
);
