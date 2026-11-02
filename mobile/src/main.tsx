import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";

import { useUser } from "@/store/user";

import { App } from "./App";
import { primeStreamServer } from "./lib/audio-stream";
import { bootstrapBilibiliCookies } from "./lib/bili-bootstrap";
import { installElectronShim } from "./lib/electron-shim";
import { installHttpAdapter } from "./lib/http";
import { applyTheme } from "./lib/theme";
import { useAppStore } from "./store/app";
import { usePlayer } from "./store/player";

import "./styles/index.css";

const rootElement = document.getElementById("root");

async function start() {
  if (!rootElement) return;

  installElectronShim();
  applyTheme(useAppStore.getState().themeMode);
  usePlayer.getState().init();

  // Bind the loopback media relay early so the first play starts immediately.
  void primeStreamServer().catch(() => undefined);

  try {
    await installHttpAdapter();
  } catch {
    /* the app still renders; requests will surface the error as toasts */
  }

  // Anonymous Bilibili traffic needs these cookies. Don't block the first paint
  // on a slow network round-trip longer than a moment.
  await Promise.race([bootstrapBilibiliCookies(), new Promise<void>(resolve => window.setTimeout(resolve, 1800))]);

  void useUser.getState().updateUser();

  createRoot(rootElement).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  );
}

void start();
