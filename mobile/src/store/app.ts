import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createPersistStorage } from "../lib/storage";

export type ThemeMode = "system" | "light" | "dark";
export type UiTarget = "auto" | "phone" | "pad";

export type MotionLevel = "full" | "reduced";

interface AppState {
  themeMode: ThemeMode;
  /** Force the phone / pad shell regardless of the measured window size. */
  uiTarget: UiTarget;
  motion: MotionLevel;
  /** Show romanised / translated lyric line under the original one. */
  showLyricTranslation: boolean;
  /** Keep the screen awake while the full player is visible. */
  keepScreenAwake: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setUiTarget: (target: UiTarget) => void;
  setMotion: (motion: MotionLevel) => void;
  toggleLyricTranslation: () => void;
  toggleKeepScreenAwake: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      themeMode: "system",
      uiTarget: "auto",
      motion: "full",
      showLyricTranslation: false,
      keepScreenAwake: true,
      setThemeMode: themeMode => set({ themeMode }),
      setUiTarget: uiTarget => set({ uiTarget }),
      setMotion: motion => set({ motion }),
      toggleLyricTranslation: () => set(state => ({ showLyricTranslation: !state.showLyricTranslation })),
      toggleKeepScreenAwake: () => set(state => ({ keepScreenAwake: !state.keepScreenAwake })),
    }),
    {
      name: "app",
      storage: createPersistStorage("app"),
      partialize: state => ({
        themeMode: state.themeMode,
        uiTarget: state.uiTarget,
        motion: state.motion,
        showLyricTranslation: state.showLyricTranslation,
        keepScreenAwake: state.keepScreenAwake,
      }),
    },
  ),
);
