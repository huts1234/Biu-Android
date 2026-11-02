import { useEffect } from "react";
import { useNavigate } from "react-router";

import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

import { PadShell } from "./components/layout/PadShell";
import { PhoneShell } from "./components/layout/PhoneShell";
import { TrackActionsSheet } from "./components/music/TrackActionsSheet";
import { FullPlayer } from "./components/player/FullPlayer";
import { LoginSheet } from "./components/player/LoginSheet";
import { QueueSheet } from "./components/player/QueueSheet";
import { ToastHost } from "./components/ui/ToastHost";
import { useEffectiveTarget } from "./hooks/useEffectiveTarget";
import { closeTopSheet } from "./lib/sheet-stack";
import { applyTheme } from "./lib/theme";
import { useAppStore } from "./store/app";
import { usePlayer } from "./store/player";
import { toast } from "./store/toast";
import { useUiStore } from "./store/ui";

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

function useKeepAwake(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let sentinel: WakeLockSentinelLike | undefined;
    let cancelled = false;

    const request = async () => {
      try {
        const wakeLock = (
          navigator as Navigator & {
            wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
          }
        ).wakeLock;
        const result = await wakeLock?.request("screen");
        if (cancelled) void result?.release();
        else sentinel = result;
      } catch {
        /* not supported / denied */
      }
    };

    void request();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, [enabled]);
}

export function App() {
  const target = useEffectiveTarget();
  const navigate = useNavigate();
  const themeMode = useAppStore(state => state.themeMode);
  const keepAwake = useAppStore(state => state.keepScreenAwake);
  const isPlaying = usePlayer(state => state.isPlaying);

  const actions = useUiStore(state => state.actions);
  const closeActions = useUiStore(state => state.closeActions);

  useKeepAwake(keepAwake && isPlaying);

  useEffect(() => {
    applyTheme(themeMode);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(themeMode);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themeMode]);

  /*
   * Android hardware / gesture back. The chain mirrors what users expect on
   * Android: dismiss the keyboard, then overlays, then walk back through the
   * in-app navigation to the start tab, and only exit on a second press.
   */
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listeners: Array<{ remove: () => Promise<void> }> = [];
    let keyboardVisible = false;
    let lastBackAt = 0;

    void Keyboard.addListener("keyboardDidShow", () => {
      keyboardVisible = true;
    }).then(handle => listeners.push(handle));
    void Keyboard.addListener("keyboardDidHide", () => {
      keyboardVisible = false;
    }).then(handle => listeners.push(handle));

    void CapacitorApp.addListener("backButton", () => {
      if (keyboardVisible) {
        keyboardVisible = false;
        void Keyboard.hide();
        return;
      }

      const ui = useUiStore.getState();
      if (closeTopSheet()) return;
      if (ui.fullPlayerOpen) return ui.closeFullPlayer();

      const path = (window.location.hash.replace(/^#/, "").split("?")[0] ?? "") || "/";

      if (path !== "/") {
        // Tabs behave like Android bottom navigation: back returns to the
        // start tab, while nested pages pop one level.
        if (path === "/search" || path === "/library") navigate("/");
        else navigate(-1);
        return;
      }

      const now = Date.now();
      if (now - lastBackAt < 2000) {
        void CapacitorApp.exitApp();
        return;
      }

      lastBackAt = now;
      toast("再按一次退出");
    }).then(handle => {
      listeners.push(handle);
    });

    return () => {
      for (const handle of listeners) void handle.remove();
    };
  }, [navigate]);

  return (
    <>
      {target === "pad" ? <PadShell /> : <PhoneShell />}

      <FullPlayer />
      <QueueSheet />
      <TrackActionsSheet
        open={Boolean(actions)}
        queueIndex={actions?.queueIndex}
        track={actions?.track ?? null}
        onClose={closeActions}
      />
      <LoginSheet />
      <ToastHost />
    </>
  );
}
