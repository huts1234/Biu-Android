import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The Android shell has its own release line (0.x) so it does not inherit the
 * desktop app's 1.16.0 version. Bump `mobile/package.json` for every release;
 * `mobile/android/app/build.gradle` carries the matching versionName/Code.
 */
const mobileVersion = (JSON.parse(readFileSync(here("./package.json"), "utf8")) as { version: string }).version;

/**
 * Dev-only harness: renders the app in a fixed-size iframe so the phone
 * (390×844) and pad (1180×820) layouts can be inspected on a desktop browser.
 * Served from `mobile/dev/preview.html`, never included in production builds.
 *
 *   http://localhost:5178/__preview.html?w=390&h=844&ui=phone
 */
const previewHarness = (): Plugin => ({
  name: "biu-preview-harness",
  apply: "serve",
  configureServer(server) {
    const file = here("./dev/preview.html");
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith("/__preview.html")) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(readFileSync(file, "utf8"));
    });
  },
});

const BILI_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

const proxyFor = (target: string, prefix: string) => ({
  target,
  changeOrigin: true,
  secure: true,
  cookieDomainRewrite: "localhost",
  rewrite: (path: string) => path.replace(prefix, ""),
  headers: {
    Origin: "https://www.bilibili.com",
    Referer: "https://www.bilibili.com/",
    "User-Agent": BILI_UA,
  },
});

export default defineConfig(({ mode, command }) => {
  const target = mode === "pad" ? "pad" : "phone";
  const isDev = command === "serve";

  return {
    root: here("./"),
    base: "./",
    publicDir: here("./public"),
    resolve: {
      dedupe: ["react", "react-dom", "zustand", "axios"],
      alias: [
        // Desktop-only stores are replaced by slim mobile equivalents so that the
        // shared service layer (src/service, src/common/utils) can be reused as-is.
        { find: /^@\/store\/user$/, replacement: here("./src/shims/store-user.ts") },
        { find: /^@\/store\/token$/, replacement: here("./src/shims/store-token.ts") },
        { find: /^@\/store\/settings$/, replacement: here("./src/shims/store-settings.ts") },
        { find: /^electron-log\/renderer$/, replacement: here("./src/lib/logger.ts") },
        { find: /^@heroui\/react$/, replacement: here("./src/shims/heroui.ts") },
        // Single-flight captcha handling; the desktop helper stacks panels when
        // several requests come back with a `v_voucher` at once.
        { find: /^@\/common\/utils\/geetest$/, replacement: here("./src/lib/geetest.ts") },
        { find: /^@shared\//, replacement: here("../shared/") },
        { find: /^@\//, replacement: here("../src/") },
        { find: /^@m\//, replacement: here("./src/") },
      ],
    },
    define: {
      __APP_TARGET__: JSON.stringify(target),
      __APP_VERSION__: JSON.stringify(mobileVersion),
      __DEV_PROXY__: JSON.stringify(isDev),
    },
    plugins: [react(), tailwindcss(), previewHarness()],
    server: {
      port: 5178,
      strictPort: false,
      host: true,
      proxy: {
        "/__bili/api": proxyFor("https://api.bilibili.com", "/__bili/api"),
        "/__bili/passport": proxyFor("https://passport.bilibili.com", "/__bili/passport"),
        "/__bili/www": proxyFor("https://www.bilibili.com", "/__bili/www"),
        "/__bili/search": proxyFor("https://s.search.bilibili.com", "/__bili/search"),
        "/__bili/member": proxyFor("https://member.bilibili.com", "/__bili/member"),
      },
    },
    build: {
      outDir: here(`./dist/${target}`),
      emptyOutDir: true,
      target: "es2020",
      cssMinify: true,
      chunkSizeWarningLimit: 1400,
    },
  };
});
