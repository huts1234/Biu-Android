import { useState } from "react";
import { useNavigate } from "react-router";

import {
  RiCodeLine,
  RiDeleteBin6Line,
  RiErrorWarningLine,
  RiGithubLine,
  RiInformationLine,
  RiLogoutBoxRLine,
  RiLoginCircleLine,
  RiMusic2Line,
  RiPaletteLine,
  RiRefreshLine,
  RiShieldCheckLine,
  RiUser3Line,
} from "@remixicon/react";

import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";

import { logout } from "../api/auth";
import { IconButton } from "../components/ui/Buttons";
import { SegmentedControl, Switch } from "../components/ui/Controls";
import { Cover } from "../components/ui/Cover";
import { ListGroup, ListRow } from "../components/ui/List";
import { Screen } from "../components/ui/Screen";
import { ConfirmSheet } from "../components/ui/Sheet";
import { PAD_MIN_WIDTH } from "../hooks/useEffectiveTarget";
import { getAudioDiagnostics } from "../lib/audio-source";
import { APP_VERSION, BUILD_TARGET } from "../lib/env";
import { isHttpAdapterInstalled } from "../lib/http";
import { useAppStore, type ThemeMode, type UiTarget } from "../store/app";
import { usePlayer } from "../store/player";
import { useRecent } from "../store/recent";
import { useSearchHistory } from "../store/search-history";
import { toast, toastError, toastSuccess } from "../store/toast";
import { useUiStore } from "../store/ui";

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

const TARGET_OPTIONS: Array<{ value: UiTarget; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "phone", label: "手机" },
  { value: "pad", label: "平板" },
];

const QUALITY_OPTIONS: Array<{ value: AudioQuality; label: string }> = [
  { value: "auto", label: "自动" },
  { value: "lossless", label: "无损" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

type ConfirmKind = "cache" | "queue" | "logout" | null;

/** Human readable "x 分钟前" for the diagnostics group. */
function formatSince(timestamp?: number) {
  if (!timestamp) return "暂无记录";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;

  return new Date(timestamp).toLocaleDateString("zh-CN");
}

export function SettingsPage() {
  const navigate = useNavigate();

  const themeMode = useAppStore(state => state.themeMode);
  const setThemeMode = useAppStore(state => state.setThemeMode);
  const uiTarget = useAppStore(state => state.uiTarget);
  const setUiTarget = useAppStore(state => state.setUiTarget);
  const motion = useAppStore(state => state.motion);
  const setMotion = useAppStore(state => state.setMotion);
  const lyricTranslation = useAppStore(state => state.showLyricTranslation);
  const toggleLyricTranslation = useAppStore(state => state.toggleLyricTranslation);
  const keepAwake = useAppStore(state => state.keepScreenAwake);
  const toggleKeepAwake = useAppStore(state => state.toggleKeepScreenAwake);

  const audioQuality = useSettings(state => state.audioQuality);
  const updateSettings = useSettings(state => state.update);

  const user = useUser(state => state.user);
  const updateUser = useUser(state => state.updateUser);
  const openLogin = useUiStore(state => state.openLogin);

  const recentCount = useRecent(state => state.items.length);
  const searchCount = useSearchHistory(state => state.items.length);
  const queueCount = usePlayer(state => state.queue.length);

  const clearRecent = useRecent(state => state.clear);
  const clearSearch = useSearchHistory(state => state.clear);
  const clearQueue = usePlayer(state => state.clear);

  const playError = usePlayer(state => state.error);
  const playErrorAt = usePlayer(state => state.lastErrorAt);
  const retryPlayback = usePlayer(state => state.retry);
  const hasTrack = usePlayer(state => state.index >= 0 && state.queue.length > 0);

  const audioDiagnostics = getAudioDiagnostics();

  const [confirming, setConfirming] = useState<ConfirmKind>(null);

  const handleLogout = async () => {
    try {
      await logout();
      toastSuccess("已退出登录");
    } catch {
      toastError("退出失败", "请稍后重试");
    } finally {
      setConfirming(null);
    }
  };

  return (
    <Screen
      onBack={() => navigate(-1)}
      right={
        <IconButton label="刷新账号" size={36} onClick={() => void updateUser()}>
          <RiUser3Line size={19} />
        </IconButton>
      }
      subtitle={BUILD_TARGET === "pad" ? "Biu for Pad" : "Biu for Phone"}
      title="设置"
    >
      {/* ---------- appearance ---------- */}
      <ListGroup className="mb-6" title="外观">
        <div className="px-4 pt-4 pb-1">
          <div className="text-label-2 mb-2 flex items-center gap-1.5 text-[13px]">
            <RiPaletteLine size={15} />
            主题
          </div>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={themeMode}
            onChange={value => {
              setThemeMode(value);
              updateSettings({ themeMode: value });
            }}
          />
        </div>

        <div className="px-4 pt-4 pb-4">
          <div className="text-label-2 mb-2 text-[13px]">界面布局</div>
          <SegmentedControl
            options={TARGET_OPTIONS}
            value={uiTarget}
            onChange={value => {
              if (value === "pad" && window.innerWidth < PAD_MIN_WIDTH) {
                toast("当前窗口太窄", { description: "平板布局需要至少 720px 宽度，已保持手机布局" });
                return;
              }
              setUiTarget(value);
            }}
          />
          <p className="text-label-3 mt-2 text-[12px] leading-[17px]">
            自动：这个安装包默认使用{BUILD_TARGET === "pad" ? "平板" : "手机"}布局，也可手动切换预览另一种。
          </p>
        </div>

        <ListRow
          last
          accessory={
            <Switch
              checked={motion === "reduced"}
              label="减少动态效果"
              onChange={value => setMotion(value ? "reduced" : "full")}
            />
          }
          subtitle="降低动画幅度与过渡效果"
          title="减少动态效果"
        />
      </ListGroup>

      {/* ---------- playback ---------- */}
      <ListGroup className="mb-6" title="播放">
        <div className="px-4 pt-4 pb-4">
          <div className="text-label-2 mb-2 flex items-center gap-1.5 text-[13px]">
            <RiMusic2Line size={15} />
            音质偏好
          </div>
          <SegmentedControl
            options={QUALITY_OPTIONS}
            size="sm"
            value={audioQuality}
            onChange={value => updateSettings({ audioQuality: value })}
          />
          <p className="text-label-3 mt-2 text-[12px] leading-[17px]">
            无损与杜比音轨需要哔哩哔哩大会员账号，不可用时将自动降级。
          </p>
        </div>

        <ListRow
          accessory={<Switch checked={lyricTranslation} label="歌词翻译" onChange={toggleLyricTranslation} />}
          subtitle="在原文下方显示翻译歌词"
          title="歌词翻译"
        />
        <ListRow
          last
          accessory={<Switch checked={keepAwake} label="保持屏幕常亮" onChange={toggleKeepAwake} />}
          subtitle="播放时阻止屏幕自动熄灭"
          title="保持屏幕常亮"
        />
      </ListGroup>

      {/* ---------- account ---------- */}
      <ListGroup className="mb-6" title="账号">
        {user?.isLogin ? (
          <>
            <div className="border-separator flex items-center gap-3.5 border-b px-4 py-3.5">
              <Cover alt={user.uname} className="h-11 w-11 shrink-0" rounded={999} size={160} src={user.face} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-label truncate text-[16px] font-semibold">{user.uname}</span>
                  {user.vipStatus ? (
                    <span className="rounded-[4px] bg-gradient-to-r from-[#ff375f] to-[#ff9f0a] px-1 py-px text-[9px] font-bold text-white">
                      大会员
                    </span>
                  ) : null}
                </div>
                <div className="text-label-2 mt-0.5 text-[12px]">
                  LV{user.level_info?.current_level ?? 0} · UID {user.mid}
                </div>
              </div>
            </div>
            <ListRow
              last
              danger
              icon={<RiLogoutBoxRLine size={20} />}
              title="退出登录"
              onClick={() => setConfirming("logout")}
            />
          </>
        ) : (
          <ListRow
            last
            chevron
            icon={<RiLoginCircleLine className="text-tint" size={20} />}
            subtitle="同步收藏夹、稍后再看与播放历史"
            title="登录哔哩哔哩"
            onClick={openLogin}
          />
        )}
      </ListGroup>

      {/* ---------- storage ---------- */}
      <ListGroup className="mb-6" title="存储">
        <ListRow
          icon={<RiDeleteBin6Line className="text-ios-orange" size={19} />}
          subtitle={`${recentCount} 首最近播放 · ${searchCount} 条搜索记录`}
          title="清除本地缓存"
          value="清除"
          onClick={() => setConfirming("cache")}
        />
        <ListRow
          last
          icon={<RiDeleteBin6Line className="text-ios-red" size={19} />}
          subtitle={`${queueCount} 首待播歌曲`}
          title="清空播放队列"
          value="清空"
          onClick={() => setConfirming("queue")}
        />
      </ListGroup>

      {/* ---------- playback diagnostics ---------- */}
      <ListGroup className="mb-6" title="播放诊断">
        <ListRow
          icon={
            isHttpAdapterInstalled() ? (
              <RiShieldCheckLine className="text-ios-green" size={19} />
            ) : (
              <RiErrorWarningLine className="text-ios-orange" size={19} />
            )
          }
          subtitle={isHttpAdapterInstalled() ? "原生网络通道已启用" : "原生网络通道未就绪，接口请求可能失败"}
          title="网络通道"
          value={isHttpAdapterInstalled() ? "正常" : "异常"}
        />
        <div className="border-separator relative border-t px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex w-7 shrink-0 items-center justify-center">
              {playError ? (
                <RiErrorWarningLine className="text-ios-red" size={19} />
              ) : (
                <RiMusic2Line className="text-ios-blue" size={19} />
              )}
            </span>
            <span className="text-label min-w-0 flex-1 truncate text-[17px] leading-[22px]">最近播放错误</span>
            <span className="text-label-2 shrink-0 text-[17px]">{playError ? "已记录" : "无"}</span>
          </div>
          <p className="text-footnote text-label-2 mt-1 ml-10 break-words select-text">
            {playError ?? "暂无错误记录"}
            {playErrorAt ? ` · ${formatSince(playErrorAt)}` : ""}
          </p>
        </div>
        <ListRow
          icon={<RiRefreshLine className="text-ios-blue" size={19} />}
          subtitle={hasTrack ? "重新解析音源地址并播放当前歌曲" : "播放队列为空，先选择一首歌"}
          title="重新加载当前歌曲"
          value={hasTrack ? "重试" : "不可用"}
          onClick={() => {
            if (!hasTrack) {
              toastError("无法重试", "播放队列为空，请先选择歌曲");
              return;
            }
            void retryPlayback();
            toast("正在重新加载音源");
          }}
        />
        <ListRow
          last
          icon={<RiMusic2Line className="text-ios-purple" size={19} />}
          subtitle={
            audioDiagnostics.lastMode === "download"
              ? `整段下载兼容模式 · 缓存 ${audioDiagnostics.cacheSize} 段`
              : "边下边播 · 首字节到达即出声"
          }
          title="音频通道"
          value={audioDiagnostics.lastMode === "download" ? "整段下载" : "流式"}
        />
      </ListGroup>

      {/* ---------- about ---------- */}
      <ListGroup className="mb-6" title="关于">
        <ListRow icon={<RiInformationLine className="text-ios-blue" size={19} />} title="版本" value={APP_VERSION} />
        <ListRow
          icon={<RiShieldCheckLine className="text-ios-green" size={19} />}
          subtitle="Cookie 与播放记录仅保存在本机"
          title="隐私"
          onClick={() => toast("你的数据只保存在本机", { description: "Biu 不收集、不上传账号信息" })}
        />
        <ListRow
          icon={<RiCodeLine className="text-ios-purple" size={19} />}
          subtitle="PolyForm Noncommercial 1.0.0"
          title="开源许可"
          onClick={() => toast("Biu 基于哔哩哔哩公开接口", { description: "仅供学习与个人使用" })}
        />
        <ListRow
          last
          chevron
          icon={<RiGithubLine size={19} />}
          title="GitHub 项目主页"
          onClick={() => {
            window.open("https://github.com/huts1234/biu-android", "_blank", "noopener,noreferrer");
          }}
        />
      </ListGroup>

      <div className="text-label-3 px-8 pb-8 text-center text-[11px] leading-[17px]">
        Biu {APP_VERSION} · Made with React &amp; Capacitor
        <br />
        音乐与视频版权归哔哩哔哩及原 UP 主所有
      </div>

      <ConfirmSheet
        danger
        confirmLabel={confirming === "logout" ? "退出登录" : "清除"}
        description={
          confirming === "cache"
            ? "将清除最近播放、搜索历史与本地缓存"
            : confirming === "queue"
              ? "当前播放也会停止"
              : "退出后需要重新扫码登录"
        }
        open={confirming !== null}
        title={
          confirming === "logout" ? "退出哔哩哔哩账号？" : confirming === "queue" ? "清空播放队列？" : "清除本地缓存？"
        }
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming === "cache") {
            clearRecent();
            clearSearch();
            toastSuccess("本地缓存已清除");
            setConfirming(null);
          } else if (confirming === "queue") {
            clearQueue();
            toastSuccess("播放队列已清空");
            setConfirming(null);
          } else if (confirming === "logout") {
            void handleLogout();
          }
        }}
      />
    </Screen>
  );
}
