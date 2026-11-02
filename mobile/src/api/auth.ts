import moment from "moment";

import { postPassportLoginExit } from "@/service/passport-login-exit";
import {
  getPassportLoginWebQrcodeGenerate,
  type QrcodeGenerateResponse,
} from "@/service/passport-login-web-qrcode-generate";
import { getPassportLoginWebQrcodePoll, type QrcodePollResponse } from "@/service/passport-login-web-qrcode-poll";
import { useToken } from "@/store/token";
import { useUser } from "@/store/user";

import { allCookies, clearCookies, getCookie, isNative, setCookie } from "../lib/cookies";

export type QrData = QrcodeGenerateResponse["data"];
export type QrPollData = QrcodePollResponse["data"];

export async function generateLoginQr(): Promise<QrData> {
  const res = await getPassportLoginWebQrcodeGenerate();
  return res.data;
}

export async function pollLoginQr(qrcodeKey: string): Promise<QrPollData> {
  const res = await getPassportLoginWebQrcodePoll({ qrcode_key: qrcodeKey });
  return res.data;
}

export async function finishLogin(refreshToken?: string) {
  if (refreshToken) {
    useToken.getState().updateToken({
      tokenData: { refresh_token: refreshToken },
      nextCheckRefreshTime: moment().add(2, "days").unix(),
    });
  }

  await useUser.getState().updateUser();
}

/** Debug / fallback login: paste a `SESSDATA=...; bili_jct=...` cookie string. */
export async function importCookieString(raw: string) {
  const pairs = raw
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const index = part.indexOf("=");
      return index === -1 ? null : ([part.slice(0, index), part.slice(index + 1)] as const);
    })
    .filter((pair): pair is readonly [string, string] => Boolean(pair));

  if (!pairs.some(([name]) => name === "SESSDATA")) {
    throw new Error("Cookie 中缺少 SESSDATA");
  }

  for (const [name, value] of pairs) {
    setCookie(name, value, Math.floor(Date.now() / 1000) + 30 * 24 * 3600);
  }

  await finishLogin();
  return Boolean(useUser.getState().user?.isLogin);
}

export async function logout() {
  try {
    const csrf = await Promise.resolve(getCookie("bili_jct"));
    if (csrf) {
      await postPassportLoginExit({ biliCSRF: csrf });
    }
  } catch {
    /* best effort */
  }

  clearCookies();
  useToken.getState().clear();
  useUser.getState().clear();
}

export function cookieDebugInfo() {
  return {
    native: isNative(),
    cookies: allCookies().map(cookie => cookie.name),
    hasSession: Boolean(getCookie("SESSDATA")),
  };
}
