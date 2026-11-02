import { registerPlugin } from "@capacitor/core";

/** Native counterpart: mobile/android/.../BiliStreamPlugin.java */
interface BiliStreamPlugin {
  getPort(): Promise<{ port: number }>;
}

const BiliStream = registerPlugin<BiliStreamPlugin>("BiliStream");

let portPromise: Promise<number> | null = null;

/** Base64url, no padding: safe in a URL path and cheap to decode natively. */
function encode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function primeStreamServer() {
  // Wrap in a promise so a missing web implementation (dev preview) rejects
  // instead of throwing synchronously from `registerPlugin`.
  portPromise ??= Promise.resolve()
    .then(() => BiliStream.getPort())
    .then(result => result.port);
  return portPromise;
}

/**
 * Points the media element at the loopback relay so playback starts after the
 * first bytes instead of after the whole file has been downloaded.
 * Falls back to the original URL when the native plugin is unavailable.
 */
export async function toStreamUrl(url: string): Promise<string> {
  try {
    const port = await primeStreamServer();

    return `http://127.0.0.1:${port}/m/${encode(url)}`;
  } catch {
    return url;
  }
}
