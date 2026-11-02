import { RiPauseFill, RiPlayFill, RiSkipForwardFill } from "@remixicon/react";

import { formatMediaUrl } from "../../lib/media";
import { usePlayer } from "../../store/player";
import { useUiStore } from "../../store/ui";
import { Cover } from "../ui/Cover";

export function MiniPlayer() {
  const track = usePlayer(state => state.queue[state.index]);
  const isPlaying = usePlayer(state => state.isPlaying);
  const progress = usePlayer(state => state.progress);
  const duration = usePlayer(state => state.duration);
  const toggle = usePlayer(state => state.toggle);
  const next = usePlayer(state => state.next);
  const openPlayer = useUiStore(state => state.openFullPlayer);

  if (!track) return null;

  const percent = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="px-2 pb-1">
      <div
        aria-label={`打开播放器：${track.pageTitle || track.title}`}
        className="pressable glass-strong relative flex h-[58px] items-center gap-2.5 overflow-hidden rounded-[14px] px-2.5"
        role="button"
        style={{ boxShadow: "0 6px 22px rgba(0,0,0,.14), 0 0 0 0.5px var(--separator)" }}
        tabIndex={0}
        onClick={openPlayer}
        onKeyDown={event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openPlayer();
        }}
      >
        <Cover alt={track.title} className="h-10 w-10 shrink-0" rounded={6} size={96} src={track.cover} />

        <div className="min-w-0 flex-1">
          <div
            className="text-label truncate text-[14px] leading-[18px] font-semibold"
            style={{ letterSpacing: "-0.1px" }}
          >
            {track.pageTitle || track.title}
          </div>
          <div className="text-label-2 mt-0.5 truncate text-[12px] leading-[15px]">{track.artist ?? "Biu"}</div>
        </div>

        <button
          aria-label={isPlaying ? "暂停" : "播放"}
          className="pressable text-label flex h-9 w-9 items-center justify-center rounded-full"
          type="button"
          onClick={event => {
            event.stopPropagation();
            void toggle();
          }}
        >
          {isPlaying ? <RiPauseFill size={24} /> : <RiPlayFill size={24} />}
        </button>

        <button
          aria-label="下一首"
          className="pressable text-label flex h-9 w-9 items-center justify-center rounded-full"
          type="button"
          onClick={event => {
            event.stopPropagation();
            void next(true);
          }}
        >
          <RiSkipForwardFill size={22} />
        </button>

        <div
          className="bg-tint/70 absolute bottom-0 left-0 h-[2px] transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />

        {/* invisible artwork preloader keeps the full player instant */}
        {track.cover ? <link as="image" href={formatMediaUrl(track.cover, 640)} rel="preload" /> : null}
      </div>
    </div>
  );
}
