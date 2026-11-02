import { useEffect, useState } from "react";

import { RiArrowRightSLine, RiPlayFill, RiRefreshLine } from "@remixicon/react";

import { fetchBanners, fetchChart, fetchNewMusic, fetchRecommend } from "../api/home";
import { MusicCard } from "../components/music/MusicCard";
import { IconButton } from "../components/ui/Buttons";
import { SegmentedControl, Skeleton } from "../components/ui/Controls";
import { Cover } from "../components/ui/Cover";
import { SectionHeader } from "../components/ui/List";
import { Screen } from "../components/ui/Screen";
import { useInfiniteSentinel, usePagedFeed } from "../hooks/usePagedFeed";
import { usePlayer, type Track } from "../store/player";
import { useUiStore } from "../store/ui";

type FeedTab = "recommend" | "chart";

export function DiscoverPage() {
  const [tab, setTab] = useState<FeedTab>("recommend");
  const [banners, setBanners] = useState<Track[]>([]);
  const [newMusic, setNewMusic] = useState<Track[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  const openActions = useUiStore(state => state.openActions);

  const playNow = usePlayer(state => state.playNow);
  const currentKey = usePlayer(state => state.queue[state.index]?.key);
  const isPlaying = usePlayer(state => state.isPlaying);

  const feed = usePagedFeed<Track>(page => (tab === "recommend" ? fetchRecommend(page) : fetchChart(page)), tab);
  const sentinelRef = useInfiniteSentinel(feed.loadMore, feed.hasMore && !feed.loading);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchBanners(), fetchNewMusic()]).then(([bannerList, newList]) => {
      if (cancelled) return;
      setBanners(bannerList);
      setNewMusic(newList);
      setLoadingTop(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const play = (track: Track, list: Track[]) => {
    const index = Math.max(
      0,
      list.findIndex(item => item.key === track.key),
    );
    void playNow(list.length ? list : [track], index);
  };

  return (
    <Screen
      largeTitle
      right={
        <IconButton label="刷新" size={36} onClick={() => feed.refresh()}>
          <RiRefreshLine size={20} />
        </IconButton>
      }
      subtitle="为今天推荐的声音"
      title="发现"
    >
      {/* banner carousel */}
      {loadingTop ? (
        <div className="mb-5 flex gap-3 px-4">
          <Skeleton className="h-[150px] w-[86%] rounded-[16px]" />
          <Skeleton className="h-[150px] w-[86%] rounded-[16px]" />
        </div>
      ) : banners.length > 0 ? (
        <div className="no-scrollbar mb-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
          {banners.map(track => (
            <button
              key={track.key}
              className="pressable relative aspect-[16/9] w-[86%] shrink-0 snap-start overflow-hidden rounded-[16px] text-left"
              type="button"
              onClick={() => play(track, banners)}
            >
              <Cover
                alt={track.title}
                className="absolute inset-0 h-full w-full"
                rounded={16}
                size={720}
                src={track.cover}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/10 to-transparent" />
              <div className="absolute right-3 bottom-3 left-3">
                <div className="mb-1 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                  新歌首发
                </div>
                <div className="line-clamp-1 text-[18px] leading-[23px] font-semibold text-white">{track.title}</div>
                <div className="mt-0.5 line-clamp-1 text-[12px] text-white/70">{track.artist}</div>
              </div>
              <div className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
                <RiPlayFill size={16} />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {/* new music rail */}
      {loadingTop ? (
        <div className="mb-6 px-4">
          <Skeleton className="mb-3 h-6 w-32 rounded-md" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[150px] w-[116px] shrink-0 rounded-[12px]" />
            ))}
          </div>
        </div>
      ) : newMusic.length ? (
        <section className="mb-6">
          <SectionHeader
            title="新歌速递"
            action={
              <button
                className="pressable text-footnote text-tint flex items-center"
                type="button"
                onClick={() => void playNow(newMusic, 0)}
              >
                播放全部 <RiArrowRightSLine size={16} />
              </button>
            }
          />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {newMusic.slice(0, 12).map(track => (
              <div key={track.key} className="w-[118px] shrink-0">
                <MusicCard
                  active={currentKey === track.key}
                  playing={isPlaying}
                  showArtist
                  track={track}
                  onLongPress={() => openActions(track)}
                  onPress={() => play(track, newMusic)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* feed */}
      <div className="mb-4 px-4">
        <SegmentedControl
          options={[
            { value: "recommend", label: "为你推荐" },
            { value: "chart", label: "热门榜单" },
          ]}
          value={tab}
          onChange={value => setTab(value as FeedTab)}
        />
      </div>

      {feed.loading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="aspect-square w-full rounded-[12px]" />
              <Skeleton className="mt-2 h-3.5 w-4/5 rounded" />
              <Skeleton className="mt-1.5 h-3 w-3/5 rounded" />
            </div>
          ))}
        </div>
      ) : feed.items.length === 0 ? (
        <div className="text-label-2 px-8 py-16 text-center">
          <p className="text-subhead">{feed.error ?? "暂时没有内容"}</p>
          <button className="text-tint mt-3" type="button" onClick={feed.refresh}>
            重新加载
          </button>
        </div>
      ) : (
        <section className="px-4">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="section-title text-label">{tab === "recommend" ? "为你推荐" : "音乐热榜"}</h2>
            <button
              className="pressable text-footnote text-tint"
              type="button"
              onClick={() => void playNow(feed.items, 0)}
            >
              播放全部
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4 xl:grid-cols-5">
            {feed.items.map((track, index) => (
              <MusicCard
                key={`${track.key}-${index}`}
                active={currentKey === track.key}
                playing={isPlaying}
                track={track}
                onLongPress={() => openActions(track)}
                onPress={() => play(track, feed.items)}
              />
            ))}
          </div>
        </section>
      )}

      <div ref={sentinelRef} className="h-10" />

      {feed.loadingMore && (
        <div className="flex justify-center py-4">
          <span className="border-label-4 border-t-tint h-5 w-5 animate-spin rounded-full border-2" />
        </div>
      )}
      {!feed.hasMore && feed.items.length > 0 && (
        <div className="text-caption text-label-3 py-6 text-center">已经到底了 · 共 {feed.items.length} 首</div>
      )}
    </Screen>
  );
}
