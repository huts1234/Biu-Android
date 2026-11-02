/** Normalise a Bilibili asset URL (protocol-relative, http, escaped). */
export function formatMediaUrl(url?: string | null, size?: number): string | undefined {
  if (!url) return undefined;

  let result = url.trim();
  if (result.startsWith("//")) result = "https:" + result;
  if (result.startsWith("http://")) result = "https://" + result.slice(7);

  // Bilibili image CDN accepts an @-suffix for on-the-fly resizing.
  if (size && !result.includes("@") && /\.(jpg|jpeg|png|webp|gif)$/i.test(result)) {
    result += `@${size}w_${size}h_1c.webp`;
  }

  return result;
}

/** human readable duration, e.g. 3:07 or 1:02:33 */
export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "--:--";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 12345 -> 1.2万 */
export function formatCount(value?: number): string {
  if (!value || !Number.isFinite(value)) return "";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1).replace(/\.0$/, "")}亿`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(1).replace(/\.0$/, "")}万`;
  return String(Math.round(value));
}

/** Parse "12:34" / "1:02:03" / 754 into seconds. */
export function parseDuration(input?: string | number): number | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input === "number") return input;

  const parts = input.split(":").map(Number);
  if (parts.some(Number.isNaN)) return undefined;

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(input) || undefined;
}

/** Remove the <em> highlight markup Bilibili includes in search results. */
export function stripHighlight(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .trim();
}

/** Relative-ish date used in list rows ("刚刚", "3天前"). */
export function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return "";
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}天前`;
  if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}个月前`;
  return `${Math.floor(diff / (86400 * 365))}年前`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
