import { getCookie, setCookie } from "./cookies";
import { rawRequest } from "./http";

const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";

async function fetchBuvid() {
  const res = await rawRequest({
    url: "https://api.bilibili.com/x/frontend/finger/spi_v2",
    headers: { "User-Agent": UA, Referer: "https://www.bilibili.com/" },
    responseType: "json",
    timeout: 10000,
  });

  const data = res.data?.data;
  const expires = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

  if (data?.b_3) setCookie("buvid3", data.b_3, expires);
  if (data?.b_4) setCookie("buvid4", data.b_4, expires);
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(message: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

async function fetchBiliTicket() {
  const ts = Math.floor(Date.now() / 1000);
  const hexsign = await hmacSha256(`ts${ts}`, "XgwSnGZ1p");
  const csrf = getCookie("bili_jct") ?? "";

  const query = new URLSearchParams({
    key_id: "ec02",
    hexsign,
    "context[ts]": String(ts),
    csrf,
  });

  const res = await rawRequest({
    url: `https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket?${query.toString()}`,
    method: "POST",
    headers: {
      "User-Agent": UA,
      Referer: "https://www.bilibili.com/",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: "",
    responseType: "json",
    timeout: 10000,
  });

  const ticket = res.data?.data?.ticket;
  if (ticket) {
    const expires = Math.floor(Date.now() / 1000) + 259200;
    setCookie("bili_ticket", ticket, expires);
    setCookie("bili_ticket_expires", String(expires), expires);
  }
}

let started = false;

/**
 * Bilibili refuses a lot of anonymous traffic without buvid3 / buvid4 and the
 * bili_ticket cookie. Fetch them once per launch (best effort).
 *
 * `force` re-runs the fetch even after the first pass, which is what the guest
 * recovery path uses after clearing a risk-controlled cookie jar.
 */
export async function bootstrapBilibiliCookies({ force = false }: { force?: boolean } = {}) {
  if (started && !force) return;
  started = true;

  const tasks: Array<Promise<unknown>> = [];

  if (force || !getCookie("buvid3") || !getCookie("buvid4")) {
    tasks.push(fetchBuvid().catch(() => undefined));
  }

  const ticketExpires = Number(getCookie("bili_ticket_expires") ?? 0);
  if (force || !getCookie("bili_ticket") || ticketExpires * 1000 < Date.now() + 60_000) {
    tasks.push(fetchBiliTicket().catch(() => undefined));
  }

  await Promise.allSettled(tasks);
}
