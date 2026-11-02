/**
 * Mobile override for `@/common/utils/geetest`.
 *
 * The desktop implementation is a straight pass-through: every API response
 * carrying a `v_voucher` opens its own Geetest panel. On phones a burst of
 * parallel requests (search + suggestions, for example) can therefore stack
 * several captchas on top of each other, which is impossible to dismiss.
 *
 * This version keeps a single global verification session:
 *  - while a panel is open, further `verifyGeetest` calls resolve with `null`
 *    immediately instead of opening a second panel;
 *  - any leftover panel DOM from a previous round is destroyed first;
 *  - a stuck panel is released after `VERIFY_TIMEOUT` so the app never locks
 *    itself out of the network layer.
 */
import { addToast } from "@heroui/react";

export interface GeetestResult {
  validate: string;
  seccode: string;
  challenge: string;
  token: string;
  gt: string;
}

interface GetCaptchaParamsResponse {
  code: number;
  message: string;
  data: {
    type: string;
    token: string;
    geetest: {
      gt: string;
      challenge: string;
    };
  };
}

const GEETEST_SCRIPT = "https://static.geetest.com/static/tools/gt.js";
const VERIFY_TIMEOUT = 120_000;

interface CaptchaValidate {
  geetest_challenge?: string;
  geetest_validate?: string;
  geetest_seccode?: string;
}

/** Subset of the Geetest widget API we rely on. */
interface CaptchaWidget {
  onReady(cb: () => void): void;
  onSuccess(cb: () => void): void;
  onError(cb: () => void): void;
  onClose?(cb: () => void): void;
  verify(): void;
  getValidate(): CaptchaValidate | null | false;
  destroy?(): void;
}

let activeSession: Promise<GeetestResult | null> | null = null;
let activeCaptcha: CaptchaWidget | null = null;

export const loadGeetestScript = () => {
  if (typeof window.initGeetest === "function") return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GEETEST_SCRIPT}"]`);
  if (existing) {
    return new Promise<void>(resolve => {
      if (typeof window.initGeetest === "function") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GEETEST_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("极验组件加载失败"));
    document.body.appendChild(script);
  });
};

/** Destroy the previous widget and drop any panel it left behind. */
const releaseCaptcha = () => {
  try {
    activeCaptcha?.destroy?.();
  } catch {
    /* widget already gone */
  }
  activeCaptcha = null;

  document
    .querySelectorAll(
      ".geetest_panel, .geetest_panel_box, .geetest_mask, .geetest_holder, .geetest_fade, .geetest_box, [class^='geetest_'], [class*=' geetest_']",
    )
    .forEach(node => {
      // Never remove our own script tag.
      if (node.tagName === "SCRIPT") return;
      node.remove();
    });
};

const runVerification = async (
  getCaptchaParams: () => Promise<GetCaptchaParamsResponse>,
): Promise<GeetestResult | null> => {
  try {
    await loadGeetestScript();

    const res = await getCaptchaParams();
    if (res.code !== 0 || !res.data?.geetest) {
      addToast({ title: res.message || "获取验证码失败", color: "danger" });
      return null;
    }

    const { gt, challenge } = res.data.geetest;
    const { token } = res.data;

    if (typeof window.initGeetest !== "function") {
      addToast({ title: "极验组件加载失败", color: "danger" });
      return null;
    }

    releaseCaptcha();

    return await new Promise<GeetestResult | null>(resolve => {
      let settled = false;
      const finish = (value: GeetestResult | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        window.removeEventListener("pagehide", onPageHide);
        resolve(value);
      };

      const onPageHide = () => {
        releaseCaptcha();
      };

      // Safety net: a captcha that is never touched must not block the app.
      const timer = window.setTimeout(() => {
        releaseCaptcha();
        finish(null);
      }, VERIFY_TIMEOUT);

      window.addEventListener("pagehide", onPageHide, { once: true });

      try {
        window.initGeetest(
          {
            gt,
            challenge,
            offline: false,
            new_captcha: true,
            product: "bind",
            https: true,
            lang: "zh-cn",
          },
          captchaObj => {
            activeCaptcha = captchaObj;

            captchaObj.onReady(() => {
              captchaObj.verify();
            });

            captchaObj.onSuccess(() => {
              const result = captchaObj.getValidate();
              if (result && typeof result !== "boolean") {
                finish({
                  validate: result.geetest_validate || "",
                  seccode: result.geetest_seccode || "",
                  challenge: result.geetest_challenge || challenge,
                  token,
                  gt,
                });
              } else {
                finish(null);
              }
              releaseCaptcha();
            });

            captchaObj.onError(() => {
              addToast({ title: "验证出错", color: "danger" });
              finish(null);
              releaseCaptcha();
            });

            captchaObj.onClose?.(() => {
              finish(null);
              releaseCaptcha();
            });
          },
        );
      } catch (err) {
        addToast({ title: err instanceof Error ? err.message : "验证组件初始化失败", color: "danger" });
        releaseCaptcha();
        finish(null);
      }
    });
  } catch (err) {
    addToast({ title: err instanceof Error ? err.message : "验证过程异常", color: "danger" });
    return null;
  }
};

export const verifyGeetest = async (
  getCaptchaParams: () => Promise<GetCaptchaParamsResponse>,
): Promise<GeetestResult | null> => {
  // One captcha at a time: drop duplicate requests made while a panel is open.
  if (activeSession) return null;

  const session = runVerification(getCaptchaParams);
  activeSession = session;

  try {
    return await session;
  } finally {
    if (activeSession === session) activeSession = null;
  }
};

/** Used by the player/settings "reset" paths when the app returns to foreground. */
export const cancelGeetest = () => {
  releaseCaptcha();
};
