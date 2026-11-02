import { useEffect, useRef, useState } from "react";

import { RiCloseLine, RiDeleteBin6Line, RiPlayFill, RiSearchLine, RiTimeLine } from "@remixicon/react";

import type { Track } from "../store/player";

import { fetchSuggest, searchVideos } from "../api/search";
import { MusicRow } from "../components/music/MusicRow";
import { SegmentedControl, Spinner } from "../components/ui/Controls";
import { Screen } from "../components/ui/Screen";
import { useInfiniteSentinel, usePagedFeed } from "../hooks/usePagedFeed";
import { usePlayer } from "../store/player";
import { useSearchHistory } from "../store/search-history";
import { useUiStore } from "../store/ui";

const QUICK_SEARCHES = ["华语流行", "轻音乐", "钢琴", "ACG", "古风", "摇滚", "夜晚", "学习", "白噪音", "说唱"];

type SortKey = "totalrank" | "pubdate" | "click";

function SearchResults({ query, sort }: { query: string; sort: SortKey }) {
  const playNow = usePlayer(state => state.playNow);
  const playAt = usePlayer(state => state.playAt);
  const queue = usePlayer(state => state.queue);
  const index = usePlayer(state => state.index);
  const isPlaying = usePlayer(state => state.isPlaying);
  const openActions = useUiStore(state => state.openActions);

  const feed = usePagedFeed<Track>(page => searchVideos(query, page, sort), `${query}|${sort}`);
  const sentinelRef = useInfiniteSentinel(feed.loadMore, feed.hasMore && !feed.loading);

  if (feed.loading) {
    return (
      <div className="text-label-2 flex flex-col items-center gap-3 py-20">
        <Spinner size={24} />
        <span className="text-footnote">正在搜索「{query}」</span>
      </div>
    );
  }

  if (!feed.items.length) {
    return (
      <div className="px-8 py-20 text-center">
        <p className="text-label text-[19px] font-semibold">没有找到结果</p>
        <p className="text-subhead text-label-2 mt-1.5">换一个关键词试试，或检查网络连接</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-1 flex items-center justify-between px-4 py-2">
        <span className="text-footnote text-label-2">找到约 {feed.items.length} 个结果</span>
        <button
          className="pressable text-footnote text-tint flex items-center gap-1 font-medium"
          type="button"
          onClick={() => void playNow(feed.items, 0)}
        >
          <RiPlayFill size={14} /> 播放全部
        </button>
      </div>

      <div className="pb-2">
        {feed.items.map((track, itemIndex) => (
          <div key={`${track.key}-${itemIndex}`} className="relative">
            <MusicRow
              active={queue[index]?.key === track.key}
              playing={isPlaying}
              track={track}
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

      <div ref={sentinelRef} className="h-8" />
      {feed.loadingMore && (
        <div className="flex justify-center py-4">
          <Spinner size={20} />
        </div>
      )}
    </>
  );
}

export function SearchPage() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("totalrank");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);

  const history = useSearchHistory();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = input.trim();
    if (!term) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchSuggest(term).then(items => setSuggestions(items));
    }, 260);

    return () => window.clearTimeout(timer);
  }, [input]);

  const submit = (keyword: string) => {
    const value = keyword.trim();
    if (!value) return;
    setInput(value);
    setQuery(value);
    setShowSuggest(false);
    history.add(value);
    inputRef.current?.blur();
  };

  return (
    <Screen
      largeTitle={!query}
      right={
        query ? (
          <button
            className="pressable text-tint px-2 text-[16px]"
            type="button"
            onClick={() => {
              setQuery("");
              setInput("");
            }}
          >
            取消
          </button>
        ) : null
      }
      title="搜索"
    >
      {/* search field */}
      <div className="px-4 pb-3">
        <div className="bg-fill flex h-10 items-center gap-2 rounded-[11px] px-3">
          <RiSearchLine className="text-label-2 shrink-0" size={18} />
          <input
            ref={inputRef}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="text-label placeholder:text-label-3 min-w-0 flex-1 bg-transparent text-[17px] outline-none"
            enterKeyHint="search"
            placeholder="搜索视频、UP 主"
            spellCheck={false}
            type="search"
            value={input}
            onChange={event => {
              setInput(event.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onKeyDown={event => {
              if (event.key === "Enter") submit(input);
            }}
          />
          {input && (
            <button
              aria-label="清空"
              className="bg-label-3 text-surface flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              type="button"
              onClick={() => {
                setInput("");
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              <RiCloseLine size={14} />
            </button>
          )}
        </div>
      </div>

      {/* suggestions */}
      {showSuggest && input.trim() && suggestions.length > 0 && (
        <div className="bg-surface mx-4 mb-3 overflow-hidden rounded-[12px]">
          {suggestions.map((item, index) => (
            <button
              key={item}
              className={`pressable-soft flex w-full items-center gap-3 px-4 py-3 text-left ${index !== suggestions.length - 1 ? "border-separator border-b" : ""}`}
              type="button"
              onClick={() => submit(item)}
            >
              <RiSearchLine className="text-label-3 shrink-0" size={16} />
              <span className="text-label truncate text-[15px]">{item}</span>
            </button>
          ))}
        </div>
      )}

      {query ? (
        <>
          <div className="mb-2 px-4">
            <SegmentedControl
              size="sm"
              options={[
                { value: "totalrank", label: "综合" },
                { value: "pubdate", label: "最新" },
                { value: "click", label: "最多播放" },
              ]}
              value={sort}
              onChange={value => setSort(value as SortKey)}
            />
          </div>
          <SearchResults query={query} sort={sort} />
        </>
      ) : (
        <div className="rise-in">
          {history.items.length > 0 && (
            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between px-4">
                <h2 className="text-label-2 text-[13px] font-medium tracking-[0.02em] uppercase">最近搜索</h2>
                <button
                  className="pressable text-footnote text-label-2 flex items-center gap-1"
                  type="button"
                  onClick={history.clear}
                >
                  <RiDeleteBin6Line size={14} /> 清除
                </button>
              </div>
              <div className="bg-surface overflow-hidden rounded-[14px]">
                {history.items.slice(0, 6).map((item, index, arr) => (
                  <div key={item} className="relative">
                    <button
                      className="pressable-soft flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      type="button"
                      onClick={() => submit(item)}
                    >
                      <RiTimeLine className="text-label-3" size={17} />
                      <span className="text-label min-w-0 flex-1 truncate text-[15px]">{item}</span>
                    </button>
                    <button
                      aria-label="删除记录"
                      className="pressable text-label-3 absolute top-1/2 right-2 -translate-y-1/2 p-2"
                      type="button"
                      onClick={() => history.remove(item)}
                    >
                      <RiCloseLine size={16} />
                    </button>
                    {index !== arr.length - 1 && (
                      <span
                        className="bg-separator absolute inset-x-4 bottom-0 h-px"
                        style={{ transform: "scaleY(0.5)" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between px-4">
              <h2 className="text-label-2 text-[13px] font-medium tracking-[0.02em] uppercase">搜索发现</h2>
            </div>
            <div className="flex flex-wrap gap-2 px-4">
              {QUICK_SEARCHES.map(item => (
                <button
                  key={item}
                  className="pressable bg-surface text-label rounded-full px-4 py-2 text-[14px] shadow-[0_1px_2px_rgba(0,0,0,.04)]"
                  type="button"
                  onClick={() => submit(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <div className="text-label-3 mt-10 px-10 text-center text-[12px] leading-[18px]">
            搜索数据来自哔哩哔哩公开接口
          </div>
        </div>
      )}
    </Screen>
  );
}
