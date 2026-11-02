import {
  RiExpandDiagonalLine,
  RiMoreFill,
  RiPauseFill,
  RiPlayFill,
  RiPlayListLine,
  RiRepeat2Line,
  RiRepeatOneLine,
  RiShuffleLine,
  RiSkipBackFill,
  RiSkipForwardFill,
  RiVolumeDownLine,
  RiVolumeUpLine,
} from "@remixicon/react";

import { formatDuration } from "../../lib/media";
import { PLAY_MODE_LABEL, PlayMode, usePlayer } from "../../store/player";
import { useUiStore } from "../../store/ui";
import { IconButton } from "../ui/Buttons";
import { Slider } from "../ui/Controls";
import { Cover } from "../ui/Cover";

export function NowPlayingPanel() {
  const queue = usePlayer(state => state.queue);
  const index = usePlayer(state => state.index);
  const track = usePlayer(state => state.queue[state.index]);
  const isPlaying = usePlayer(state => state.isPlaying);
  const isLoading = usePlayer(state => state.isLoading);
  const progress = usePlayer(state => state.progress);
  const duration = usePlayer(state => state.duration || track?.duration || 0);
  const volume = usePlayer(state => state.volume);
  const mode = usePlayer(state => state.mode);
  const lyrics = usePlayer(state => state.lyrics);
  const activeLyric = usePlayer(state => state.activeLyric);

  const toggle = usePlayer(state => state.toggle);
  const next = usePlayer(state => state.next);
  const prev = usePlayer(state => state.prev);
  const seek = usePlayer(state => state.seek);
  const setVolume = usePlayer(state => state.setVolume);
  const playAt = usePlayer(state => state.playAt);
  const cycleMode = usePlayer(state => state.cycleMode);

  const openFullPlayer = useUiStore(state => state.openFullPlayer);
  const openQueue = useUiStore(state => state.openQueue);
  const openActions = useUiStore(state => state.openActions);

  const ModeIcon =
    mode === PlayMode.Single ? RiRepeatOneLine : mode === PlayMode.Random ? RiShuffleLine : RiRepeat2Line;
  const lyricLine = activeLyric >= 0 ? lyrics[activeLyric]?.text : undefined;
  const upcoming = track ? queue.slice(index + 1, index + 4) : [];

  return (
    <aside className="border-separator bg-surface/60 hidden h-full w-[336px] shrink-0 flex-col border-l min-[1100px]:flex">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <span className="text-label-3 text-[11px] font-semibold tracking-[0.12em] uppercase">正在播放</span>
        <IconButton disabled={!track} label="展开播放器" size={32} variant="fill" onClick={openFullPlayer}>
          <RiExpandDiagonalLine size={16} />
        </IconButton>
      </div>

      {track ? (
        <div className="flex min-h-0 flex-1 flex-col px-5 pb-4">
          <button
            aria-label="展开播放器"
            className="pressable block w-full text-left"
            type="button"
            onClick={openFullPlayer}
          >
            <Cover
              alt={track.title}
              className="album-shadow aspect-square w-full"
              glossy
              rounded={18}
              size={640}
              src={track.cover}
            />
          </button>

          <div className="mt-5 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2
                className="text-label truncate text-[19px] leading-[24px] font-semibold"
                style={{ letterSpacing: "-0.3px" }}
              >
                {track.pageTitle || track.title}
              </h2>
              <p className="text-subhead text-label-2 mt-0.5 truncate">{track.artist ?? "未知 UP 主"}</p>
            </div>
            <IconButton label="更多" size={32} onClick={() => openActions(track)}>
              <RiMoreFill size={18} />
            </IconButton>
          </div>

          <p
            className="text-tint mt-2 h-[18px] truncate text-center text-[12px] transition-opacity duration-300"
            style={{ opacity: lyricLine ? 1 : 0 }}
          >
            {lyricLine ?? " "}
          </p>

          <div className="mt-1">
            <Slider
              ariaLabel="播放进度"
              height={4}
              max={Math.max(duration, 0.01)}
              value={Math.min(progress, duration || progress)}
              onChange={seek}
            />
            <div className="text-label-3 -mt-0.5 flex justify-between text-[11px] tabular-nums">
              <span>{formatDuration(progress)}</span>
              <span>-{formatDuration(Math.max(0, duration - progress))}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <IconButton label={PLAY_MODE_LABEL[mode]} size={40} onClick={cycleMode}>
              <ModeIcon size={19} />
            </IconButton>

            <IconButton label="上一首" size={44} onClick={() => void prev()}>
              <RiSkipBackFill size={28} />
            </IconButton>

            <button
              aria-label={isPlaying ? "暂停" : "播放"}
              className="pressable flex h-14 w-14 items-center justify-center rounded-full text-white disabled:opacity-50"
              disabled={isLoading}
              style={{ background: "var(--tint)", boxShadow: "0 6px 18px var(--tint-soft)" }}
              type="button"
              onClick={() => void toggle()}
            >
              {isLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : isPlaying ? (
                <RiPauseFill size={26} />
              ) : (
                <RiPlayFill className="ml-0.5" size={26} />
              )}
            </button>

            <IconButton label="下一首" size={44} onClick={() => void next(true)}>
              <RiSkipForwardFill size={28} />
            </IconButton>

            <IconButton label="待播清单" size={40} onClick={openQueue}>
              <RiPlayListLine size={20} />
            </IconButton>
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <RiVolumeDownLine className="text-label-3 shrink-0" size={16} />
            <div className="min-w-0 flex-1">
              <Slider ariaLabel="音量" height={3} max={1} value={volume} onChange={setVolume} />
            </div>
            <RiVolumeUpLine className="text-label-3 shrink-0" size={16} />
          </div>

          <div className="border-separator mt-5 min-h-0 flex-1 border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label-2 text-[13px] font-medium">接下来播放</span>
              <button className="pressable text-tint text-[12px]" type="button" onClick={openQueue}>
                全部 {queue.length} 首
              </button>
            </div>

            {upcoming.length === 0 ? (
              <p className="text-label-3 py-4 text-center text-[12px]">队列里没有更多歌曲了</p>
            ) : (
              <div className="no-scrollbar flex flex-col gap-1 overflow-y-auto">
                {upcoming.map((item, offset) => (
                  <button
                    key={item.key}
                    className="pressable-soft flex items-center gap-2.5 rounded-[10px] p-1.5 text-left"
                    type="button"
                    onClick={() => void playAt(index + 1 + offset)}
                  >
                    <Cover alt={item.title} className="h-9 w-9 shrink-0" rounded={6} size={96} src={item.cover} />
                    <span className="min-w-0 flex-1">
                      <span className="text-label block truncate text-[13px] font-medium">{item.title}</span>
                      <span className="text-label-2 block truncate text-[11px]">{item.artist ?? "未知 UP 主"}</span>
                    </span>
                    {item.duration ? (
                      <span className="text-label-3 shrink-0 text-[11px] tabular-nums">
                        {formatDuration(item.duration)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="bg-fill text-label-3 flex h-16 w-16 items-center justify-center rounded-full">
            <RiPlayListLine size={28} />
          </div>
          <div>
            <p className="text-label text-[16px] font-semibold">没有正在播放的音乐</p>
            <p className="text-label-2 mt-1 text-[13px] leading-[18px]">从发现、搜索或资料库中选择一首开始</p>
          </div>
        </div>
      )}
    </aside>
  );
}
