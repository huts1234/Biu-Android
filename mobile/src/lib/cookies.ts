import { Capacitor } from "@capacitor/core";

import { readJSON, writeJSON } from "./storage";

export interface CookieRecord {
  name: string;
  value: string;
  /** hostname without a leading dot, e.g. "bilibili.com" */
  domain: string;
  /** true when the cookie was set without a Domain attribute */
  hostOnly: boolean;
  path: string;
  /** epoch milliseconds, null = session cookie */
  expires: number | null;
}

const STORAGE_KEY = "cookies.v1";

let jar: CookieRecord[] = readJSON<CookieRecord[]>(STORAGE_KEY, []);

const persist = () => writeJSON(STORAGE_KEY, jar);

export const isNative = () => Capacitor.isNativePlatform();

function normalizeDomain(domain: string) {
  return domain.trim().replace(/^\./, "").toLowerCase();
}

function hostMatches(host: string, record: CookieRecord) {
  if (record.hostOnly) return host === record.domain;
  return host === record.domain || host.endsWith("." + record.domain);
}

function pathMatches(path: string, recordPath: string) {
  if (recordPath === "/") return true;
  return path === recordPath || path.startsWith(recordPath.endsWith("/") ? recordPath : recordPath + "/");
}

function isExpired(record: CookieRecord) {
  return record.expires !== null && record.expires <= Date.now();
}

/** Cookies that apply to a URL, formatted for a `Cookie` request header. */
export function getCookieHeader(url: string): string {
  // On the web the browser owns the jar (the Vite dev proxy rewrites cookies
  // to localhost), so we must not duplicate them here.
  if (!isNative()) return "";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname || "/";

  const applicable = jar.filter(c => !isExpired(c) && hostMatches(host, c) && pathMatches(path, c.path));
  // RFC 6265: longer paths first.
  applicable.sort((a, b) => b.path.length - a.path.length);

  const seen = new Set<string>();
  const pairs: string[] = [];
  for (const cookie of applicable) {
    if (seen.has(cookie.name)) continue;
    seen.add(cookie.name);
    pairs.push(`${cookie.name}=${cookie.value}`);
  }
  return pairs.join("; ");
}

/** Split a (possibly comma-joined) Set-Cookie header into individual cookies. */
function splitSetCookieHeader(header: string): string[] {
  // `Expires=Wed, 21 Oct 2015 07:28:00 GMT` contains a comma that must not be
  // treated as a separator, while a new cookie always starts with `name=`.
  return header.split(/,\s*(?=[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/g).filter(Boolean);
}

function parseSetCookie(header: string, requestUrl: string): CookieRecord | null {
  const segments = header.split(";");
  const pair = segments.shift();
  if (!pair) return null;

  const eq = pair.indexOf("=");
  if (eq <= 0) return null;

  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();

  let requestHost = "";
  try {
    requestHost = new URL(requestUrl).hostname.toLowerCase();
  } catch {
    return null;
  }

  let domain = requestHost;
  let hostOnly = true;
  let path = "/";
  let expires: number | null = null;

  for (const raw of segments) {
    const index = raw.indexOf("=");
    const key = (index === -1 ? raw : raw.slice(0, index)).trim().toLowerCase();
    const val = index === -1 ? "" : raw.slice(index + 1).trim();

    if (key === "domain" && val) {
      domain = normalizeDomain(val);
      hostOnly = false;
    } else if (key === "path" && val) {
      path = val;
    } else if (key === "max-age") {
      const seconds = Number(val);
      if (Number.isFinite(seconds)) expires = Date.now() + seconds * 1000;
    } else if (key === "expires") {
      const time = Date.parse(val);
      if (Number.isFinite(time) && expires === null) expires = time;
    }
  }

  return { name, value, domain, hostOnly, path, expires };
}

/** Store every cookie carried by a response. */
export function absorbSetCookie(url: string, headers: Record<string, string | string[] | undefined>) {
  if (!headers) return;

  const raw = headers["set-cookie"] ?? headers["Set-Cookie"];
  if (!raw) return;

  const values = Array.isArray(raw) ? raw : splitSetCookieHeader(String(raw));
  let changed = false;

  for (const value of values) {
    if (!value) continue;
    const record = parseSetCookie(value, url);
    if (!record) continue;

    // A deletion is expressed with an expiry in the past / Max-Age=0.
    jar = jar.filter(c => !(c.name === record.name && c.domain === record.domain && c.path === record.path));

    if (record.expires !== null && record.expires <= Date.now()) {
      changed = true;
      continue;
    }

    if (!record.value) {
      changed = true;
      continue;
    }

    jar.push(record);
    changed = true;
  }

  if (changed) persist();
}

export function getCookie(name: string): string | null {
  if (!isNative()) {
    const match = document.cookie
      .split(";")
      .map(part => part.trim())
      .find(part => part.startsWith(name + "="));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
  }

  const record = jar.filter(c => c.name === name && !isExpired(c)).sort((a, b) => b.path.length - a.path.length)[0];

  return record ? record.value : null;
}

export function setCookie(name: string, value: string, expirationDate?: number) {
  if (!isNative()) {
    const expires =
      expirationDate && Number.isFinite(expirationDate)
        ? `; expires=${new Date(expirationDate * 1000).toUTCString()}`
        : "";
    document.cookie = `${name}=${value}; path=/; domain=localhost${expires}`;
    return;
  }

  jar = jar.filter(c => !(c.name === name && c.domain === "bilibili.com" && c.path === "/"));
  jar.push({
    name,
    value,
    domain: "bilibili.com",
    hostOnly: false,
    path: "/",
    expires: expirationDate ? expirationDate * 1000 : null,
  });
  persist();
}

export function clearCookies() {
  jar = [];
  persist();
}

export function allCookies(): CookieRecord[] {
  return [...jar];
}
