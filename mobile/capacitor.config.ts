import type { CapacitorConfig } from "@capacitor/cli";

const webDir = process.env.CAP_WEB_DIR ?? "dist/phone";

const config: CapacitorConfig = {
  appId: "com.biu.music",
  appName: "Biu",
  webDir,
  backgroundColor: "#000000",
  android: {
    allowMixedContent: false,
    captureInput: true,
    // Allow chrome://inspect only for debug builds (npm run mobile:apk:*:debug).
    webContentsDebuggingEnabled: process.env.CAP_DEBUG === "1",
  },
  server: {
    androidScheme: "http",
    hostname: "localhost",
  },
  plugins: {
    // We deliberately talk to the native HTTP plugin ourselves (see src/lib/http.ts)
    // so that the Bilibili cookie jar can be carried across requests.
    CapacitorHttp: {
      enabled: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
    },
    Keyboard: {
      resize: "native",
      // We draw under the status bar, so Android needs the extra workaround to
      // resize the WebView when the keyboard opens.
      resizeOnFullScreen: true,
    },
  },
};

export default config;
