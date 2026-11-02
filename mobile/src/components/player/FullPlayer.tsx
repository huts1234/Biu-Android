import {
  RiArrowDownSLine,
  RiHeart3Line,
  RiMoreFill,
  RiPauseFill,
  RiPlayFill,
  RiPlayListLine,
  RiQuoteText,
  RiRepeatOneLine,
  RiRepeat2Line,
  RiShuffleLine,
  RiSkipBackFill,
  RiSkipForwardFill,
  RiVipCrownLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

import { formatDuration, formatMediaUrl } from "../../lib/media";
import { PLAY_MODE_LABEL, PlayMode, usePlayer } from "../../store/player";
import { toast } from "../../store/toast";
import { useUiStore } from "../../store/ui";
import { Slider } from "../ui/Controls";
import { Cover } from "../ui/Cover";
import { LyricsView } from "./LyricsView";

export function FullPlayer() {
  const open = useUiStore(state => state.fullPlayerOpen);
  const close = useUiStore(state => state.closeFullPlayer);
  const lyricsMode = useUiStore(state => state.lyricsMode);
  const toggleLyrics = useUiStore(state => state.toggleLyrics);
  const openQueue = useUiStore(state => state.openQueue);
  const openActions = useUiStore(state => state.openActions);

  const track = usePlayer(state => state.queue[state.index]);
  const isPlaying = usePlayer(state => state.isPlaying);
  const isLoading = usePlayer(state => state.isLoading);
  const progress = usePlayer(state => state.progress);
  const duration = usePlayer(state => state.duration || track?.duration || 0);
  const mode = usePlayer(state => state.mode);
  const hasNext = usePlayer(state => state.queue.length > 1);
  const queueLength = usePlayer(state => state.queue.length);

  const toggle = usePlayer(state => state.toggle);
  const next = usePlayer(state => state.next);
  const prev = usePlayer(state => state.prev);
  const seek = usePlayer(state => state.seek);
  const cycleMode = usePlayer(state => state.cycleMode);

  const ModeIcon =
    mode === PlayMode.Single ? RiRepeatOneLine : mode === PlayMode.Random ? RiShuffleLine : RiRepeat2Line;

  return (
    <AnimatePresence>
      {open && track && (
        <motion.section
          animate={{ y: 0 }}
          className="fixed inset-0 z-[70] overflow-hidden bg-black text-white"
          exit={{ y: "100%" }}
          initial={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }}
        >
          {/* blurred artwork backdrop */}
          <div className="absolute inset-0">
            {track.cover ? (
              <img
                alt=""
                className="h-full w-full scale-[1.7] object-cover"
                referrerPolicy="no-referrer"
                src={formatMediaUrl(track.cover, 640)}
                style={{ filter: "blur(64px) saturate(160%)", opacity: 0.66 }}
              />
            ) : (
              <div className="h-full w-full" style={{ background: "linear-gradient(160deg,#3a3a3c,#1c1c1e)" }} />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(0,0,0,.38) 0%, rgba(0,0,0,.18) 30%, rgba(0,0,0,.55) 72%, rgba(0,0,0,.86) 100%)",
              }}
            />
          </div>

          <div
            className="pb-safe relative flex h-full flex-col"
            style={{ paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))" }}
          >
            {/* header */}
            <motion.header
              className="relative flex h-[52px] shrink-0 items-center px-3"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.08, bottom: 0.55 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 700) close();
              }}
            >
              <button
                aria-label="收起播放器"
                className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-xl"
                type="button"
                onClick={close}
              >
                <RiArrowDownSLine size={24} />
              </button>

              <div className="pointer-events-none absolute inset-x-20 text-center">
                <div className="text-[11px] font-medium tracking-[0.08em] text-white/55 uppercase">正在播放</div>
                <div className="mt-0.5 truncate text-[13px] text-white/85">
                  {track.kind === "mv" ? "Bilibili 视频音频" : "Bilibili 音频"}
                  {track.isLossless ? " · 无损" : ""}
                </div>
              </div>

              <button
                aria-label="更多"
                className="pressable ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur-xl"
                type="button"
                onClick={() => openActions(track)}
              >
                <RiMoreFill size={20} />
              </button>
            </motion.header>

            {/* artwork / lyrics */}
            <div className="relative mx-auto min-h-0 w-full max-w-[620px] flex-1 px-6">
              <AnimatePresence initial={false} mode="wait">
                {lyricsMode ? (
                  <motion.div
                    key="lyrics"
                    animate={{ opacity: 1 }}
                    className="absolute inset-0"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    <LyricsView track={track} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="art"
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex h-full items-center justify-center"
                    exit={{ opacity: 0, scale: 0.98 }}
                    initial={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.26 }}
                  >
                    <motion.button
                      aria-label="显示歌词"
                      className="block"
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={{ top: 0.05, bottom: 0.4 }}
                      type="button"
                      onClick={toggleLyrics}
                      onDragEnd={(_, info) => {
                        if (info.offset.y > 110 || info.velocity.y > 700) close();
                      }}
                    >
                      <Cover
                        alt={track.title}
                        className="album-shadow"
                        glossy
                        rounded={16}
                        size={640}
                        src={track.cover}
                        style={{
                          width: "min(76vw, 43vh, 380px)",
                          height: "min(76vw, 43vh, 380px)",
                        }}
                      />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* title + progress + controls */}
            <div className="mx-auto w-full max-w-[620px] shrink-0 px-6 pt-5 pb-2">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-[22px] leading-[28px] font-semibold" style={{ letterSpacing: "-0.3px" }}>
                    {track.pageTitle || track.title}
                  </h1>
                  <div className="mt-1 flex items-center gap-1.5 text-[16px] text-white/60">
                    <span className="truncate">{track.artist ?? "未知 UP 主"}</span>
                    {track.isLossless && <RiVipCrownLine className="shrink-0 text-[#ffd60a]" size={15} />}
                  </div>
                </div>

                <button
                  aria-label="收藏"
                  className="pressable mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/12 text-white/90"
                  type="button"
                  onClick={() => toast("已加入我喜欢的音乐", { tone: "success" })}
                >
                  <RiHeart3Line size={19} />
                </button>
              </div>

              <div className="mt-2">
                <Slider
                  ariaLabel="播放进度"
                  height={4}
                  max={Math.max(duration, 0.01)}
                  tint="rgba(255,255,255,.92)"
                  trackColor="rgba(255,255,255,.22)"
                  value={Math.min(progress, duration || progress)}
                  onChange={seek}
                />
                <div className="-mt-0.5 flex justify-between text-[11px] text-white/50 tabular-nums">
                  <span>{formatDuration(progress)}</span>
                  <span>-{formatDuration(Math.max(0, duration - progress))}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  aria-label={PLAY_MODE_LABEL[mode]}
                  className="pressable flex h-11 w-11 items-center justify-center rounded-full text-white/75"
                  type="button"
                  onClick={cycleMode}
                >
                  <ModeIcon size={22} />
                </button>

                <button
                  aria-label="上一首"
                  className="pressable flex h-14 w-14 items-center justify-center rounded-full text-white"
                  type="button"
                  onClick={() => void prev()}
                >
                  <RiSkipBackFill size={34} />
                </button>

                <button
                  aria-label={isPlaying ? "暂停" : "播放"}
                  className="pressable relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-black"
                  style={{ boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}
                  type="button"
                  onClick={() => void toggle()}
                >
                  {isLoading ? (
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  ) : isPlaying ? (
                    <RiPauseFill size={34} />
                  ) : (
                    <RiPlayFill className="ml-0.5" size={34} />
                  )}
                </button>

                <button
                  aria-label="下一首"
                  className="pressable flex h-14 w-14 items-center justify-center rounded-full text-white disabled:opacity-30"
                  disabled={!hasNext}
                  type="button"
                  onClick={() => void next(true)}
                >
                  <RiSkipForwardFill size={34} />
                </button>

                <button
                  aria-label="播放队列"
                  className="pressable flex h-11 w-11 items-center justify-center rounded-full text-white/75"
                  type="button"
                  onClick={openQueue}
                >
                  <RiPlayListLine size={23} />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-center gap-16 pb-1">
                <button
                  aria-label="歌词"
                  className="pressable flex h-10 items-center gap-1.5 rounded-full px-2 text-[12px] font-medium"
                  style={{ color: lyricsMode ? "#fff" : "rgba(255,255,255,.45)" }}
                  type="button"
                  onClick={toggleLyrics}
                >
                  <RiQuoteText size={18} />
                  歌词
                </button>
                <button
                  aria-label="队列"
                  className="pressable flex h-10 items-center gap-1.5 rounded-full px-2 text-[12px] font-medium text-white/45"
                  type="button"
                  onClick={openQueue}
                >
                  <RiPlayListLine size={18} />
                  待播 · {queueLength}
                </button>
              </div>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
