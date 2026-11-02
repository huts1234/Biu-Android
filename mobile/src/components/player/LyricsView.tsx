import { useEffect, useRef, useState } from "react";

import { RiMusic2Line } from "@remixicon/react";

import { usePlayer, type Track } from "../../store/player";

interface LyricsViewProps {
  track: Track;
}

export function LyricsView({ track }: LyricsViewProps) {
  const lines = usePlayer(state => state.lyrics);
  const active = usePlayer(state => state.activeLyric);
  const loading = usePlayer(state => state.lyricsLoading);
  const seek = usePlayer(state => state.seek);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [userScrolling, setUserScrolling] = useState(false);
  const idleTimer = useRef<number | null>(null);

  useEffect(() => {
    lineRefs.current = [];
  }, [track.key]);

  useEffect(() => {
    if (userScrolling || active < 0) return;

    const scroller = scrollerRef.current;
    const node = lineRefs.current[active];
    if (!scroller || !node) return;

    const target = node.offsetTop - scroller.clientHeight / 2 + node.clientHeight / 2;
    scroller.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
  }, [active, userScrolling]);

  const handleScroll = () => {
    setUserScrolling(true);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setUserScrolling(false), 4200);
  };

  if (loading && !lines.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-white/45">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
        <span className="text-footnote">正在加载歌词…</span>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center text-white/50">
        <RiMusic2Line size={44} />
        <div>
          <div className="text-[17px] font-medium text-white/80">暂无歌词</div>
          <div className="text-footnote mt-1.5 leading-[19px]">这首歌在 B 站没有提供字幕或歌词文件</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="no-scrollbar relative h-full overflow-y-auto py-[38%]"
      style={{ scrollBehavior: "smooth" }}
      onScroll={handleScroll}
    >
      {lines.map((line, index) => {
        const isActive = index === active;
        return (
          <button
            key={`${line.time}-${index}`}
            ref={node => {
              lineRefs.current[index] = node;
            }}
            className="block w-full px-2 py-[9px] text-center transition-all duration-300"
            style={{
              color: isActive ? "#fff" : "rgba(255,255,255,.38)",
              fontSize: isActive ? 25 : 21,
              lineHeight: "31px",
              fontWeight: isActive ? 700 : 500,
              letterSpacing: "-0.3px",
              transform: isActive ? "scale(1)" : "scale(0.97)",
              transitionTimingFunction: "var(--ease-ios)",
            }}
            type="button"
            onClick={() => seek(line.time / 1000)}
          >
            {line.text}
          </button>
        );
      })}
      <div className="h-[30%]" />
    </div>
  );
}
