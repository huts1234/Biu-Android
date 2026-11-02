import { useCallback, useEffect, useRef, useState } from "react";

import { RiRefreshLine } from "@remixicon/react";
import { QRCodeSVG } from "qrcode.react";

import { useUser } from "@/store/user";

import { finishLogin, generateLoginQr, importCookieString, pollLoginQr, type QrData } from "../../api/auth";
import { toastError, toastSuccess } from "../../store/toast";
import { useUiStore } from "../../store/ui";
import { PrimaryButton } from "../ui/Buttons";
import { SegmentedControl, Spinner } from "../ui/Controls";
import { Sheet } from "../ui/Sheet";

type LoginMode = "qr" | "cookie";

export function LoginSheet() {
  const open = useUiStore(state => state.loginOpen);
  const close = useUiStore(state => state.closeLogin);
  const user = useUser(state => state.user);

  const [mode, setMode] = useState<LoginMode>("qr");
  const [qr, setQr] = useState<QrData | null>(null);
  const [status, setStatus] = useState("正在获取二维码…");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cookieText, setCookieText] = useState("");
  const [busy, setBusy] = useState(false);
  const polling = useRef(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setStatus("正在获取二维码…");
    setExpired(false);
    try {
      const data = await generateLoginQr();
      setQr(data);
      setStatus("请使用哔哩哔哩手机客户端扫码");
    } catch {
      setStatus("二维码获取失败，请检查网络后重试");
      setQr(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && mode === "qr" && !qr) void generate();
  }, [open, mode, qr, generate]);

  useEffect(() => {
    if (!open || !qr || expired) return;

    const timer = window.setInterval(async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        const data = await pollLoginQr(qr.qrcode_key);

        if (data.code === 86038) {
          setExpired(true);
          setStatus("二维码已失效，请刷新");
        } else if (data.code === 86090) {
          setStatus("已扫码，请在手机上确认登录");
        } else if (data.code === 86101) {
          setStatus("请使用哔哩哔哩手机客户端扫码");
        } else if (data.code === 0) {
          await finishLogin(data.refresh_token);
          toastSuccess("登录成功", "欢迎回来");
          close();
        }
      } catch {
        /* keep polling */
      } finally {
        polling.current = false;
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [open, qr, expired, close]);

  useEffect(() => {
    if (user?.isLogin && open) close();
  }, [user, open, close]);

  const handleCookieLogin = async () => {
    if (!cookieText.trim()) {
      toastError("请先粘贴 Cookie");
      return;
    }
    setBusy(true);
    try {
      const ok = await importCookieString(cookieText);
      if (ok) {
        toastSuccess("登录成功", "欢迎回来");
        close();
      } else {
        toastError("登录失败", "Cookie 无效或已过期");
      }
    } catch (error) {
      toastError("登录失败", error instanceof Error ? error.message : "请检查 Cookie");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} title="登录哔哩哔哩" onClose={close} zIndex={90}>
      <SegmentedControl
        className="mb-5"
        options={[
          { value: "qr", label: "扫码登录" },
          { value: "cookie", label: "Cookie 导入" },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === "qr" ? (
        <div className="flex flex-col items-center pb-2">
          <div className="relative flex h-[212px] w-[212px] items-center justify-center rounded-[20px] bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,.12)]">
            {qr?.url && !expired ? (
              <QRCodeSVG marginSize={0} size={188} value={qr.url} />
            ) : (
              <div className="text-label-3 flex flex-col items-center gap-2">
                {loading ? <Spinner size={26} /> : <span className="text-footnote">暂无二维码</span>}
              </div>
            )}

            {expired && (
              <button
                className="text-label absolute inset-3 flex flex-col items-center justify-center gap-2 rounded-[14px] bg-white/92"
                type="button"
                onClick={() => {
                  setQr(null);
                  void generate();
                }}
              >
                <RiRefreshLine size={26} />
                <span className="text-footnote font-medium">点击刷新</span>
              </button>
            )}
          </div>

          <p className="text-subhead text-label-2 mt-4 text-center">{status}</p>
          <p className="text-label-3 mt-1.5 px-4 text-center text-[12px] leading-[17px]">
            在手机上打开哔哩哔哩 App，使用扫一扫确认登录
          </p>
        </div>
      ) : (
        <div className="pb-1">
          <p className="text-footnote text-label-2 mb-2 ml-1">粘贴浏览器中的 Cookie（需包含 SESSDATA）</p>
          <textarea
            className="bg-fill text-label h-28 w-full resize-none rounded-[12px] p-3 text-[13px] leading-[18px] outline-none"
            placeholder="SESSDATA=xxxx; bili_jct=xxxx; DedeUserID=xxxx"
            spellCheck={false}
            value={cookieText}
            onChange={event => setCookieText(event.target.value)}
          />
          <PrimaryButton className="mt-4" disabled={busy} onClick={handleCookieLogin}>
            {busy ? "正在登录…" : "登录"}
          </PrimaryButton>
          <p className="text-label-3 mt-3 px-2 text-center text-[12px] leading-[17px]">
            Cookie 仅保存在本机，用于调用哔哩哔哩官方接口
          </p>
        </div>
      )}

      <div className="bg-fill/60 text-label-2 mt-5 rounded-[12px] px-3 py-2.5 text-[12px] leading-[18px]">
        登录后可同步收藏夹、稍后再看与播放历史。Biu 不收集、不上传你的账号信息。
      </div>
    </Sheet>
  );
}
