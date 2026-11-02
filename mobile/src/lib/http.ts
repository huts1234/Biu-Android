import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import { absorbSetCookie, getCookieHeader, isNative } from "./cookies";
import { IS_DEV_PROXY } from "./env";

/* ------------------------------------------------------------------ */
/*  Low level transport                                                */
/* ------------------------------------------------------------------ */

export interface RawRequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  data?: string | undefined;
  timeout?: number;
  responseType?: "json" | "text";
}

export interface RawResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
  url: string;
}

/** In the browser preview the requests go through the Vite dev proxy. */
const PROXY_MAP: Array<[string, string]> = [
  ["https://api.bilibili.com", "/__bili/api"],
  ["https://passport.bilibili.com", "/__bili/passport"],
  ["https://www.bilibili.com", "/__bili/www"],
  ["https://s.search.bilibili.com", "/__bili/search"],
  ["https://member.bilibili.com", "/__bili/member"],
];

function toProxyUrl(url: string): string {
  if (!IS_DEV_PROXY) return url;
  for (const [origin, prefix] of PROXY_MAP) {
    if (url.startsWith(origin)) return prefix + url.slice(origin.length);
  }
  return url;
}

async function webRequest(options: RawRequestOptions): Promise<RawResponse> {
  const controller = new AbortController();
  const timeout = options.timeout && options.timeout > 0 ? options.timeout : 15000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(toProxyUrl(options.url), {
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.data,
      credentials: "include",
      signal: controller.signal,
    });

    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    const isJson = (headers["content-type"] ?? "").includes("json");
    const data =
      options.responseType === "text" && !isJson ? await res.text() : isJson ? await res.json() : await res.text();

    return { data, status: res.status, headers, url: res.url };
  } finally {
    clearTimeout(timer);
  }
}

async function nativeRequest(options: RawRequestOptions): Promise<RawResponse> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  const cookie = getCookieHeader(options.url);
  if (cookie) headers.Cookie = cookie;

  const res = await CapacitorHttp.request({
    url: options.url,
    method: (options.method ?? "GET").toUpperCase(),
    headers,
    data: options.data,
    connectTimeout: options.timeout ?? 15000,
    readTimeout: options.timeout ?? 20000,
    responseType: options.responseType === "text" ? "text" : "json",
    shouldEncodeUrlParams: false,
  });

  const responseHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(res.headers ?? {})) {
    if (!key) continue;
    responseHeaders[key.toLowerCase()] = String(value);
  }

  absorbSetCookie(options.url, responseHeaders);
  return { data: res.data, status: res.status, headers: responseHeaders, url: res.url ?? options.url };
}

export function rawRequest(options: RawRequestOptions): Promise<RawResponse> {
  return isNative() ? nativeRequest(options) : webRequest(options);
}

/* ------------------------------------------------------------------ */
/*  axios adapter                                                      */
/* ------------------------------------------------------------------ */

const ABSOLUTE_URL_RE = /^([a-z][a-z\d+\-.]*:)?\/\//i;

function combineURLs(baseURL: string, relativeURL: string) {
  if (!relativeURL) return baseURL;
  return baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "");
}

function serializeParams(params: Record<string, unknown>): string {
  const search = new URLSearchParams();

  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null) continue;

    if (Array.isArray(raw)) {
      for (const item of raw) search.append(`${key}[]`, String(item));
      continue;
    }

    if (typeof raw === "object") {
      search.append(key, JSON.stringify(raw));
      continue;
    }

    search.append(key, String(raw));
  }

  return search.toString();
}

function resolveURL(config: InternalAxiosRequestConfig): string {
  let url = config.url ?? "";

  if (config.baseURL && !ABSOLUTE_URL_RE.test(url)) {
    url = combineURLs(config.baseURL, url);
  }

  if (config.params && typeof config.params === "object") {
    const query = serializeParams(config.params as Record<string, unknown>);
    if (query) url += (url.includes("?") ? "&" : "?") + query;
  }

  return url;
}

function flattenHeaders(config: InternalAxiosRequestConfig): Record<string, string> {
  const headers =
    (config.headers as unknown as { toJSON?: () => Record<string, unknown> })?.toJSON?.() ??
    (config.headers as unknown as Record<string, unknown>) ??
    {};

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    if (key.toLowerCase() === "content-length") continue;
    result[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }
  return result;
}

function normalizeBody(config: InternalAxiosRequestConfig): string | undefined {
  const data = config.data;
  if (data === undefined || data === null) return undefined;

  if (typeof data === "string") return data;
  if (data instanceof URLSearchParams) return data.toString();
  if (typeof FormData !== "undefined" && data instanceof FormData) {
    const params = new URLSearchParams();
    data.forEach((value, key) => params.append(key, String(value)));
    return params.toString();
  }
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return undefined;

  try {
    return JSON.stringify(data);
  } catch {
    return undefined;
  }
}

export const mobileAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const url = resolveURL(config);
  const headers = flattenHeaders(config);
  const data = normalizeBody(config);

  if (data !== undefined && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  let response: RawResponse;
  try {
    response = await rawRequest({
      url,
      method: config.method,
      headers,
      data,
      timeout: config.timeout,
      responseType: config.responseType === "text" ? "text" : "json",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "网络请求失败";
    throw new AxiosError(message, AxiosError.ERR_NETWORK, config, null);
  }

  const axiosResponse: AxiosResponse = {
    data: response.data,
    status: response.status,
    statusText: String(response.status),
    headers: response.headers as AxiosResponse["headers"],
    config,
    request: null,
  };

  const validateStatus = config.validateStatus ?? (status => status >= 200 && status < 300);
  if (!validateStatus(response.status)) {
    throw new AxiosError(
      `Request failed with status code ${response.status}`,
      response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      axiosResponse,
    );
  }

  return axiosResponse;
};

/** Point every shared axios instance at the mobile transport. */
let adapterInstalled = false;

/** Used by the diagnostics panel: false means API calls fall back to the
 *  WebView's own stack (CORS-blocked on device). */
export const isHttpAdapterInstalled = () => adapterInstalled;

export async function installHttpAdapter() {
  const { axiosInstance, apiRequest, biliRequest, passportRequest, searchRequest, memberRequest } =
    await import("@/service/request");

  for (const instance of [axiosInstance, apiRequest, biliRequest, passportRequest, searchRequest, memberRequest]) {
    instance.defaults.adapter = mobileAdapter;
  }

  if (Capacitor.isNativePlatform()) {
    // Native requests need a real UA; the WebView UA is fine but Bilibili is
    // picky about the "Capacitor" token, so keep a plain Chrome UA.
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
    for (const instance of [apiRequest, biliRequest, passportRequest, searchRequest, memberRequest]) {
      instance.defaults.headers.common["User-Agent"] = ua;
    }
  }

  adapterInstalled = true;
}
