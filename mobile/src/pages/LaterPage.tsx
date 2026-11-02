import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { RiBookmark3Line, RiLoginCircleLine, RiPlayFill, RiRefreshLine } from "@remixicon/react";

import { useUser } from "@/store/user";

import { fetchWatchLater } from "../api/library";
import { MusicRow } from "../components/music/MusicRow";
import { IconButton } from "../components/ui/Buttons";
import { Spinner } from "../components/ui/Controls";
import { EmptyState } from "../components/ui/List";
import { Screen } from "../components/ui/Screen";
import { usePlayer, type Track } from "../store/player";
import { useUiStore } from "../store/ui";

export function LaterPage() {
  const navigate = useNavigate();
  const user = useUser(state => state.user);
  const openLogin = useUiStore(state => state.openLogin);
  const openActions = useUiStore(state => state.openActions);

  const playNow = usePlayer(state => state.playNow);
  const playAt = usePlayer(state => state.playAt);
  const queue = usePlayer(state => state.queue);
  const index = usePlayer(state => state.index);
  const isPlaying = usePlayer(state => state.isPlaying);

  const [items, setItems] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!user?.isLogin) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const list = await fetchWatchLater();
      setItems(list);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "载入失败");
    } finally {
      setLoading(false);
    }
  }, [user?.isLogin]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      onBack={() => navigate(-1)}
      right={
        user?.isLogin ? (
          <IconButton label="刷新" size={36} onClick={() => void load()}>
            <RiRefreshLine size={20} />
          </IconButton>
        ) : null
      }
      subtitle={items.length ? `${items.length} 个视频` : "稍后再看的内容"}
      title="稍后再看"
    >
      {loading ? (
        <div className="text-label-2 flex flex-col items-center gap-3 py-20">
          <Spinner size={24} />
          <span className="text-footnote">正在载入…</span>
        </div>
      ) : !user?.isLogin ? (
        <EmptyState
          action={
            <button
              className="pressable bg-tint inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[15px] font-semibold text-white"
              type="button"
              onClick={openLogin}
            >
              <RiLoginCircleLine size={17} />
              立即登录
            </button>
          }
          description="登录后可同步哔哩哔哩稍后再看列表"
          icon={<RiBookmark3Line size={28} />}
          title="尚未登录"
        />
      ) : items.length === 0 ? (
        <EmptyState
          description={error ?? "在哔哩哔哩中添加稍后再看后会显示在这里"}
          icon={<RiBookmark3Line size={28} />}
          title={error ? "载入失败" : "列表是空的"}
        />
      ) : (
        <>
          <div className="mb-1 flex items-center justify-between px-4 py-2">
            <span className="text-footnote text-label-2">共 {items.length} 个视频</span>
            <button
              className="pressable text-footnote text-tint flex items-center gap-1 font-medium"
              type="button"
              onClick={() => void playNow(items, 0)}
            >
              <RiPlayFill size={14} /> 播放全部
            </button>
          </div>

          <div className="pb-2">
            {items.map((track, itemIndex) => (
              <div key={`${track.key}-${itemIndex}`} className="relative">
                <MusicRow
                  active={queue[index]?.key === track.key}
                  playing={isPlaying}
                  track={track}
                  onLongPress={() => openActions(track)}
                  onMore={() => openActions(track)}
                  onPress={() => {
                    const queueIndex = queue.findIndex(item => item.key === track.key);
                    if (queueIndex >= 0) void playAt(queueIndex);
                    else void playNow(items, itemIndex);
                  }}
                />
                <span className="bg-separator absolute inset-x-4 bottom-0 h-px" style={{ transform: "scaleY(0.5)" }} />
              </div>
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}
