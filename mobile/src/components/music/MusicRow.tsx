import { RiMoreFill } from "@remixicon/react";

import type { Track } from "../../store/player";

import { useLongPress } from "../../hooks/useLongPress";
import { formatCount, formatDuration } from "../../lib/media";
import { IconButton } from "../ui/Buttons";
import { Cover } from "../ui/Cover";
import { PlayingBars } from "./PlayingBars";

interface MusicRowProps {
  track: Track;
  onPress: () => void;
  onMore?: () => void;
  onLongPress?: () => void;
  active?: boolean;
  playing?: boolean;
  index?: number;
  showCover?: boolean;
  subtitle?: string;
  trailing?: string;
}

export function MusicRow({
  track,
  onPress,
  onMore,
  onLongPress,
  active = false,
  playing = false,
  index,
  showCover = true,
  subtitle,
  trailing,
}: MusicRowProps) {
  const press = useLongPress(onLongPress, onPress);

  return (
    <div className="group relative flex w-full items-center">
      <button
        aria-label={`${track.title}${track.artist ? ` - ${track.artist}` : ""}`}
        className="pressable-soft flex min-w-0 flex-1 items-center gap-3 rounded-[12px] px-4 py-2 text-left"
        type="button"
        {...press}
        onContextMenu={event => {
          if (!onLongPress) return;
          event.preventDefault();
          onLongPress();
        }}
      >
        {typeof index === "number" && !showCover && (
          <span className={`text-subhead w-5 shrink-0 text-center ${active ? "text-tint" : "text-label-3"}`}>
            {active && playing ? <PlayingBars playing /> : index + 1}
          </span>
        )}

        {showCover && (
          <div className="relative shrink-0">
            <Cover alt={track.title} className="h-12 w-12" rounded={7} size={96} src={track.cover} />
            {active && (
              <div className="absolute inset-0 flex items-center justify-center rounded-[7px] bg-black/45">
                <PlayingBars playing={playing} />
              </div>
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-[16px] leading-[21px] font-medium ${active ? "text-tint" : "text-label"}`}
            style={{ letterSpacing: "-0.1px" }}
          >
            {track.title}
          </div>
          <div className="text-footnote text-label-2 mt-0.5 flex items-center gap-1.5">
            <span className="truncate">{subtitle ?? track.artist ?? "未知 UP 主"}</span>
            {track.playCount ? <span className="text-label-3 shrink-0">· {formatCount(track.playCount)}</span> : null}
          </div>
        </div>

        <div className="text-caption text-label-3 ml-1 flex shrink-0 items-center gap-1">
          {trailing ?? (track.duration ? formatDuration(track.duration) : "")}
        </div>
      </button>

      {onMore && (
        <IconButton
          className="mr-1 opacity-70"
          label="更多操作"
          size={32}
          onClick={event => {
            event.stopPropagation();
            onMore();
          }}
        >
          <RiMoreFill size={18} />
        </IconButton>
      )}
    </div>
  );
}
