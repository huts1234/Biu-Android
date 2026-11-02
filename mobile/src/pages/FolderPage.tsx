import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { RiFolderMusicLine, RiPlayFill } from "@remixicon/react";

import { fetchFolderTracks } from "../api/library";
import { MusicRow } from "../components/music/MusicRow";
import { IconButton } from "../components/ui/Buttons";
import { Spinner } from "../components/ui/Controls";
import { EmptyState } from "../components/ui/List";
import { Screen } from "../components/ui/Screen";
import { useInfiniteSentinel, usePagedFeed } from "../hooks/usePagedFeed";
import { usePlayer, type Track } from "../store/player";
import { useUiStore } from "../store/ui";

export function FolderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialTitle = (location.state as { title?: string } | null)?.title;
  const [title, setTitle] = useState(initialTitle ?? "收藏夹");

  const playNow = usePlayer(state => state.playNow);
  const playAt = usePlayer(state => state.playAt);
  const queue = usePlayer(state => state.queue);
  const index = usePlayer(state => state.index);
  const isPlaying = usePlayer(state => state.isPlaying);
  const openActions = useUiStore(state => state.openActions);

  const feed = usePagedFeed<Track>(async page => {
    const result = await fetchFolderTracks(Number(id), page);
    if (result.title) setTitle(previous => (previous === result.title ? previous : (result.title as string)));
    return result;
  }, String(id));

  const sentinelRef = useInfiniteSentinel(feed.loadMore, feed.hasMore && !feed.loading);

  return (
    <Screen
      onBack={() => navigate(-1)}
      onRefresh={feed.refresh}
      refreshing={feed.loading}
      right={
        feed.items.length ? (
          <IconButton label="播放全部" size={36} onClick={() => void playNow(feed.items, 0)}>
            <RiPlayFill size={19} />
          </IconButton>
        ) : null
      }
      subtitle={feed.items.length ? `${feed.items.length}${feed.hasMore ? "+" : ""} 首歌曲` : undefined}
      title={title}
    >
      {feed.items.length > 0 && (
        <div className="flex items-center justify-between px-4 pb-2">
          <span className="text-footnote text-label-2">
            共 {feed.items.length}
            {feed.hasMore ? "+" : ""} 首
          </span>
          <button
            className="pressable text-footnote text-tint flex items-center gap-1 font-medium"
            type="button"
            onClick={() => void playNow(feed.items, 0)}
          >
            <RiPlayFill size={14} /> 播放全部
          </button>
        </div>
      )}

      {feed.loading ? (
        <div className="text-label-2 flex flex-col items-center gap-3 py-20">
          <Spinner size={24} />
          <span className="text-footnote">正在载入收藏夹…</span>
        </div>
      ) : feed.items.length === 0 ? (
        <EmptyState
          description="这个收藏夹里还没有可以播放的音频"
          icon={<RiFolderMusicLine size={28} />}
          title="收藏夹是空的"
        />
      ) : (
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
      )}

      <div ref={sentinelRef} className="h-8" />

      {feed.loadingMore && (
        <div className="flex justify-center py-4">
          <Spinner size={20} />
        </div>
      )}

      {!feed.hasMore && feed.items.length > 0 && (
        <div className="text-caption text-label-3 py-6 text-center">已经到底了</div>
      )}
    </Screen>
  );
}
