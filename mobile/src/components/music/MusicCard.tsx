import { RiPlayFill } from "@remixicon/react";

import type { Track } from "../../store/player";

import { useLongPress } from "../../hooks/useLongPress";
import { Cover } from "../ui/Cover";
import { PlayingBars } from "./PlayingBars";

interface MusicCardProps {
  track: Track;
  onPress: () => void;
  onLongPress?: () => void;
  active?: boolean;
  playing?: boolean;
  className?: string;
  showArtist?: boolean;
}

export function MusicCard({
  track,
  onPress,
  onLongPress,
  active = false,
  playing = false,
  className = "",
  showArtist = true,
}: MusicCardProps) {
  const press = useLongPress(onLongPress, onPress);

  return (
    <button
      aria-label={`${track.title}${track.artist ? ` - ${track.artist}` : ""}`}
      className={`pressable group w-full min-w-0 text-left ${className}`}
      type="button"
      {...press}
      onContextMenu={event => {
        if (!onLongPress) return;
        event.preventDefault();
        onLongPress();
      }}
    >
      <div className="relative">
        <Cover alt={track.title} className="aspect-square w-full" rounded={12} size={420} src={track.cover} />
        {active ? (
          <div className="absolute inset-0 flex items-end rounded-[12px] bg-gradient-to-t from-black/45 via-transparent to-transparent p-2.5">
            <span className="flex h-7 items-center rounded-full bg-black/35 px-2 backdrop-blur-md">
              <PlayingBars playing={playing} />
            </span>
          </div>
        ) : (
          <div className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white opacity-0 backdrop-blur-md transition-opacity duration-200 group-active:opacity-100 md:group-hover:opacity-100">
            <RiPlayFill size={15} />
          </div>
        )}
      </div>

      <div className="mt-2 min-w-0 px-0.5">
        <div className={`line-clamp-1 text-[14px] leading-[19px] font-medium ${active ? "text-tint" : "text-label"}`}>
          {track.title}
        </div>
        {showArtist && (
          <div className="text-label-2 mt-0.5 line-clamp-1 text-[12px]">{track.artist ?? "未知 UP 主"}</div>
        )}
      </div>
    </button>
  );
}
