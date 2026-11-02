import { CapacitorHttp } from "@capacitor/core";

import { toStreamUrl } from "./audio-stream";
import { isNative } from "./cookies";

/**
 * Bilibili audio streams are served from CDN hosts (upos-*.bilivideo.com) as
 * `application/octet-stream`. Chromium's Opaque Response Blocking (ORB) refuses
 * to hand such a response to an `<audio>` element, and the CDN rejects the
 * WebView user agent with HTTP 403.
 *
 * On Android the native side ({@code BiliMediaWebViewClient}) intercepts those
 * CDN requests, replays them with a desktop UA + Referer and streams the body
 * back, so `<audio src="https://...">` starts playing after the first few
 * kilobytes. Only when that path fails do we fall back to downloading the whole
 * file through CapacitorHttp and playing an in-memory blob URL.
 *
 * Browser previews keep using the direct URL because the dev server runs in a
 * regular browser where playback works.
 */
const MAX_CACHE = 2;

/** Bilibili's CDN rejects WebView ("wv") and okhttp user agents. */
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

const cache = new Map<string, string>();

/** Hard ceiling for a single stream download; without it a stalled connection
 *  would leave playback waiting forever and the UI looking unresponsive. */
const DOWNLOAD_TIMEOUT = 75_000;

/** Small surface for the in-app diagnostics panel. */
const diagnostics = {
  lastError: null as string | null,
  lastStatus: null as number | null,
  lastAt: null as number | null,
  lastMode: null as "stream" | "download" | null,
};

export function getAudioDiagnostics() {
  return { ...diagnostics, cacheSize: cache.size };
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

function remember(url: string, objectUrl: string) {
  cache.set(url, objectUrl);
  while (cache.size > MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    const evicted = cache.get(oldest);
    cache.delete(oldest);
    if (evicted) URL.revokeObjectURL(evicted);
  }
}

interface PlayableOptions {
  /** Force the buffered download instead of streaming (recovery path). */
  download?: boolean;
}

/**
 * Resolve a stream URL that the WebView can actually play.
 *
 * Native builds stream the CDN response through `BiliMediaWebViewClient`, so
 * this returns immediately. `download: true` is the compatibility fallback that
 * buffers the whole file into a blob first (slower, but immune to interception
 * quirks).
 */
export async function getPlayableAudioUrl(url: string, { download = false }: PlayableOptions = {}): Promise<string> {
  if (!isNative() || !/^https?:/i.test(url)) return url;

  if (!download) {
    diagnostics.lastMode = "stream";
    return toStreamUrl(url);
  }

  diagnostics.lastMode = "download";
  const cached = cache.get(url);
  if (cached) return cached;

  let timer = 0;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error("音频下载超时，请检查网络")), DOWNLOAD_TIMEOUT);
    });

    const res = await Promise.race([
      CapacitorHttp.get({
        url,
        responseType: "blob",
        headers: {
          // The CDN rejects WebView / okhttp user agents with 403 and expects a
          // media range request, so both are overridden for this download.
          "User-Agent": DESKTOP_UA,
          Range: "bytes=0-",
          Accept: "*/*",
          Referer: "https://www.bilibili.com/",
        },
        connectTimeout: 15000,
        readTimeout: 120_000,
        shouldEncodeUrlParams: false,
      }),
      timeout,
    ]);

    diagnostics.lastStatus = res.status;

    if (res.status < 200 || res.status >= 300 || typeof res.data !== "string" || !res.data) {
      throw new Error(`音频下载失败（HTTP ${res.status}）`);
    }

    const contentType = String(res.headers?.["Content-Type"] ?? res.headers?.["content-type"] ?? "audio/mp4");
    const mime = contentType.split(";")[0]?.trim() || "audio/mp4";
    const objectUrl = URL.createObjectURL(base64ToBlob(res.data, mime));

    remember(url, objectUrl);
    diagnostics.lastError = null;
    return objectUrl;
  } catch (error) {
    diagnostics.lastError = error instanceof Error ? error.message : "音频下载失败";
    diagnostics.lastAt = Date.now();
    throw error;
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}
