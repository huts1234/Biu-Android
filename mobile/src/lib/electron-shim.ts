import { Capacitor } from "@capacitor/core";

import { getCookie, setCookie } from "./cookies";

/**
 * `window.electron` compatibility layer.
 *
 * A handful of files in `src/common` and `src/service` call the Electron preload
 * API directly. Instead of patching those files we provide a small runtime
 * shim so that the exact same source can run inside an Android WebView.
 */
export function installElectronShim() {
  const noop = () => {};
  const unsubscribe = () => {};
  const noopAsync = async () => undefined;

  const api = {
    getStore: async (name: string) => {
      try {
        const raw = localStorage.getItem(`biu.store.${name}`);
        return raw ? JSON.parse(raw) : undefined;
      } catch {
        return undefined;
      }
    },
    setStore: async (name: string, value: unknown) => {
      try {
        localStorage.setItem(`biu.store.${name}`, JSON.stringify(value));
      } catch {
        /* noop */
      }
    },
    clearStore: async (name: string) => {
      localStorage.removeItem(`biu.store.${name}`);
    },

    getCookie: async (key: string) => getCookie(key),
    setCookie: async (name: string, value: string, expirationDate?: number) => setCookie(name, value, expirationDate),

    openExternal: async (url: string) => {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        /* noop */
      }
    },

    getPlatform: () => "android",
    updatePlaybackState: noop,
    navigate: () => unsubscribe,
    onPlayerCommand: () => unsubscribe,
    onShortcutCommand: () => unsubscribe,
    onUpdateAvailable: () => unsubscribe,

    registerShortcut: async () => false,
    unregisterShortcut: noopAsync,
    registerAllShortcuts: noopAsync,
    unregisterAllShortcuts: noopAsync,

    toggleMiniPlayer: noopAsync,
    selectDirectory: async () => null,
    selectFile: async () => null,
    openDirectory: noopAsync,
    showFileInFolder: noopAsync,
    getFonts: async () => [],
    scanLocalMusic: async () => [],
    deleteLocalMusicFile: noopAsync,
    searchNeteaseSongs: async () => [],
    getNeteaseLyrics: async () => null,
    searchLrclibLyrics: async () => [],
    setProxySettings: noopAsync,
  };

  (window as unknown as { electron: typeof api }).electron = api;

  if (!Capacitor.isNativePlatform()) {
    // Helps when previewing in a desktop browser.
    document.documentElement.dataset.runtime = "web";
  } else {
    document.documentElement.dataset.runtime = "native";
  }
}
