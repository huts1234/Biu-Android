import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

import type { ThemeMode } from "../store/app";

export type ResolvedTheme = "light" | "dark";

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "light" || mode === "dark") return mode;
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(mode: ThemeMode) {
  const theme = resolveTheme(mode);
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;

  const color = theme === "dark" ? "#000000" : "#f2f2f7";
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute("content", color));

  if (Capacitor.isNativePlatform()) {
    void StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light }).catch(() => undefined);
  }

  return theme;
}
