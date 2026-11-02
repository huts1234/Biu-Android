import { useNavigate } from "react-router";

import { RiHistoryLine, RiLoginCircleLine } from "@remixicon/react";

import { useUser } from "@/store/user";

import { fetchHistory } from "../api/library";
import { MusicRow } from "../components/music/MusicRow";
import { Spinner } from "../components/ui/Controls";
import { Cover } from "../components/ui/Cover";
import { EmptyState, SectionHeader } from "../components/ui/List";
import { Screen } from "../components/ui/Screen";
import { useInfiniteSentinel, usePagedFeed } from "../hooks/usePagedFeed";
import { usePlayer, type Track } from "../store/player";
import { useUiStore } from "../store/ui";

export function HistoryPage() {
  const navigate = useNavigate();
  const user = useUser(state => state.user);
  const openLogin = useUiStore(state => state.openLogin);
  const openActions = useUiStore(state => state.openActions);

  const playNow = usePlayer(state => state.playNow);
  const playAt = usePlayer(state => state.playAt);
  const queue = usePlayer(state => state.queue);
  const index = usePlayer(state => state.index);
  const isPlaying = usePlayer(state => state.isPlaying);

  const feed = usePagedFeed<Track>(page => fetchHistory(page), `history-${Boolean(user?.isLogin)}`);
  const sentinelRef = useInfiniteSentinel(feed.loadMore, feed.hasMore && !feed.loading);

  const recentForRail = feed.items.slice(0, 8);

  return (
    <Screen
      onBack={() => navigate(-1)}
      onRefresh={feed.refresh}
      refreshing={feed.loading}
      subtitle={user?.isLogin ? "你在哔哩哔哩播放过的内容" : "登录后显示播放历史"}
      title="播放历史"
    >
      {feed.loading ? (
        <div className="text-label-2 flex flex-col items-center gap-3 py-20">
          <Spinner size={24} />
          <span className="text-footnote">正在载入历史…</span>
        </div>
      ) : feed.items.length === 0 ? (
        <EmptyState
          action={
            user?.isLogin ? undefined : (
              <button
                className="pressable bg-tint inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[15px] font-semibold text-white"
                type="button"
                onClick={openLogin}
              >
                <RiLoginCircleLine size={17} />
                立即登录
              </button>
            )
          }
          description={user?.isLogin ? "听过歌曲后会出现在这里" : "登录后可同步播放历史"}
          icon={<RiHistoryLine size={28} />}
          title={user?.isLogin ? "还没有播放记录" : "尚未登录"}
        />
      ) : (
        <>
          {recentForRail.length > 0 && (
            <section className="mb-6">
              <SectionHeader title="最近播放" />
              <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
                {recentForRail.map(track => (
                  <button
                    key={track.key}
                    className="pressable w-[112px] shrink-0 text-left"
                    type="button"
                    onClick={() =>
                      void playNow(
                        feed.items,
                        feed.items.findIndex(item => item.key === track.key),
                      )
                    }
                    onContextMenu={event => {
                      event.preventDefault();
                      openActions(track);
                    }}
                  >
                    <Cover
                      alt={track.title}
                      className="aspect-square w-full"
                      rounded={10}
                      size={320}
                      src={track.cover}
                    />
                    <div className="text-label mt-1.5 line-clamp-1 text-[13px] font-medium">{track.title}</div>
                    <div className="text-label-2 line-clamp-1 text-[11px]">{track.artist ?? "未知 UP 主"}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mb-1 flex items-center justify-between px-4 py-2">
            <span className="text-footnote text-label-2">全部记录</span>
            <button
              className="pressable text-footnote text-tint font-medium"
              type="button"
              onClick={() => void playNow(feed.items, 0)}
            >
              播放全部
            </button>
          </div>

          <div className="pb-2">
            {feed.items.map((track, itemIndex) => (
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
                    else void playNow(feed.items, itemIndex);
                  }}
                />
                <span className="bg-separator absolute inset-x-4 bottom-0 h-px" style={{ transform: "scaleY(0.5)" }} />
              </div>
            ))}
          </div>
        </>
      )}

      <div ref={sentinelRef} className="h-8" />

      {feed.loadingMore && (
        <div className="flex justify-center py-4">
          <Spinner size={20} />
        </div>
      )}
    </Screen>
  );
}
