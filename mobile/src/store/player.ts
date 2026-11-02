import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getAudioUrl, getDashUrl } from "@/common/utils/audio";
import { getLyricsByBili } from "@/components/lyrics/get-lyrics";
import { getAudioSongInfo } from "@/service/audio-song-info";
import { axiosInstance } from "@/service/request";
import { getWebInterfaceView } from "@/service/web-interface-view";
import { useSettings } from "@/store/settings";
import { useUser } from "@/store/user";

import { getPlayableAudioUrl } from "../lib/audio-source";
import { bootstrapBilibiliCookies } from "../lib/bili-bootstrap";
import { clearCookies } from "../lib/cookies";
import { findActiveLine, parseLrc, type LyricLine } from "../lib/lyrics";
import { formatMediaUrl } from "../lib/media";
import { createPersistStorage } from "../lib/storage";
import { useRecent } from "./recent";
import { toastError } from "./toast";

export type TrackKind = "mv" | "audio";

export interface Track {
  key: string;
  kind: TrackKind;
  title: string;
  artist?: string;
  artistMid?: number;
  cover?: string;
  /** seconds */
  duration?: number;
  bvid?: string;
  aid?: number;
  cid?: number;
  sid?: number;
  playCount?: number;
  publishedAt?: number;
  pageTitle?: string;
  pageIndex?: number;
}

export interface PlayableTrack extends Track {
  url?: string;
  isLossless?: boolean;
}

export const PlayMode = {
  Sequence: 1,
  Loop: 2,
  Random: 3,
  Single: 4,
} as const;

export type PlayModeValue = (typeof PlayMode)[keyof typeof PlayMode];

export const PLAY_MODE_LABEL: Record<PlayModeValue, string> = {
  [PlayMode.Sequence]: "顺序播放",
  [PlayMode.Loop]: "列表循环",
  [PlayMode.Random]: "随机播放",
  [PlayMode.Single]: "单曲循环",
};

interface PlayerState {
  queue: PlayableTrack[];
  index: number;
  isPlaying: boolean;
  isLoading: boolean;
  /** seconds */
  progress: number;
  duration: number;
  volume: number;
  rate: number;
  mode: PlayModeValue;
  lyrics: LyricLine[];
  lyricsLoading: boolean;
  /** index of the highlighted lyric line */
  activeLyric: number;
  error?: string;
  /** last playback failure and when it happened (for the diagnostics panel) */
  lastErrorAt?: number;

  init: () => void;
  playNow: (tracks: Track[], startIndex?: number) => Promise<void>;
  enqueue: (tracks: Track[]) => void;
  playNext: (track: Track) => void;
  playAt: (index: number) => Promise<void>;
  /** Re-resolve the current stream and try again (used by auto recovery / UI). */
  retry: () => Promise<void>;
  toggle: () => Promise<void>;
  next: (manual?: boolean) => Promise<void>;
  prev: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setRate: (rate: number) => void;
  cycleMode: () => void;
  removeAt: (index: number) => void;
  move: (from: number, to: number) => void;
  clear: () => void;
  current: () => PlayableTrack | undefined;
}

const audio: HTMLAudioElement = new Audio();
audio.preload = "metadata";

let loadToken = 0;
let initialized = false;

/**
 * A hung native HTTP call must never leave the player spinning forever: the
 * user would tap play and see nothing happen, with no error to report.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * When the WebView rejects a stream (expired signature, revoked blob, CDN
 * hiccup) we transparently resolve a fresh URL and retry. Resetting the counter
 * on every successful load keeps this from looping forever.
 */
const mediaRetries = new Map<string, number>();
const MAX_MEDIA_RETRIES = 2;

const keyOf = (track: Track) =>
  track.key || `${track.kind}:${track.bvid ?? ""}:${track.sid ?? ""}:${track.cid ?? ""}:${track.title}`;

const randomKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const withKey = (track: Track): PlayableTrack => ({ ...track, key: keyOf(track) || randomKey() });

const updateMediaSession = (track?: PlayableTrack) => {
  if (!track || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.pageTitle || track.title,
      artist: track.artist ?? "Biu",
      album: "Biu",
      artwork: track.cover ? [{ src: formatMediaUrl(track.cover)!, sizes: "512x512" }] : [],
    });
  } catch {
    /* unsupported */
  }
};

async function resolveTrack(track: PlayableTrack): Promise<{
  url: string;
  isLossless?: boolean;
  patch: Partial<PlayableTrack>;
}> {
  const quality = useSettings.getState().audioQuality ?? "auto";

  if (track.kind === "audio" && track.sid) {
    const res = await getAudioUrl(track.sid);
    if (!res?.audioUrl) throw new Error("无法获取音频播放链接");
    return { url: res.audioUrl, isLossless: res.isLossless, patch: { isLossless: res.isLossless } };
  }

  if (track.kind === "mv" && track.bvid) {
    const patch: Partial<PlayableTrack> = {};
    let cid = track.cid;

    if (!cid) {
      const view = await getWebInterfaceView({ bvid: track.bvid });
      cid = view?.data?.pages?.[0]?.cid;
      if (!cid) throw new Error("无法解析视频分集信息");

      patch.cid = cid;
      patch.aid = view?.data?.aid;
      patch.title = track.title || view?.data?.title || "";
      patch.artist = track.artist || view?.data?.owner?.name;
      patch.artistMid = track.artistMid ?? view?.data?.owner?.mid;
      patch.cover = track.cover || formatMediaUrl(view?.data?.pic);
      patch.duration = track.duration ?? view?.data?.duration;
    }

    const res = await getDashUrl(track.bvid, cid, quality);
    if (!res?.audioUrl) throw new Error("无法获取音频播放链接");

    return {
      url: res.audioUrl,
      isLossless: res.isLossless,
      patch: { ...patch, cid, isLossless: res.isLossless },
    };
  }

  throw new Error("不支持的播放类型");
}

/**
 * Anonymous sessions can get risk-controlled (-352 / -412): Bilibili sometimes
 * stops honouring the buvid3 / bili_ticket values it handed out earlier, which
 * looks like "it played right after install and then never again" while every
 * playurl request fails. Re-issue the guest cookies once and retry the resolve.
 */
let lastGuestCookieReset = 0;
const GUEST_RESET_COOLDOWN = 10 * 60_000;

async function resolveWithGuestRecovery(track: PlayableTrack) {
  try {
    return await resolveTrack(track);
  } catch (error) {
    const loggedIn = Boolean(useUser.getState().user);
    const onCooldown = Date.now() - lastGuestCookieReset < GUEST_RESET_COOLDOWN;
    if (loggedIn || onCooldown) throw error;

    lastGuestCookieReset = Date.now();
    clearCookies();
    await bootstrapBilibiliCookies({ force: true }).catch(() => undefined);
    return resolveTrack(track);
  }
}

async function fetchLyrics(track: PlayableTrack, cid?: number): Promise<LyricLine[]> {
  try {
    if (track.kind === "mv" && track.bvid && cid) {
      const lines = await getLyricsByBili({ bvid: track.bvid, cid });
      return lines ?? [];
    }

    if (track.kind === "audio" && track.sid) {
      const info = await getAudioSongInfo({ sid: track.sid });
      const lyricUrl = formatMediaUrl(info?.data?.lyric);
      if (lyricUrl) {
        const lrc = await axiosInstance.get<string>(lyricUrl, { responseType: "text", timeout: 12000 });
        return parseLrc(typeof lrc === "string" ? lrc : "");
      }
    }
  } catch {
    /* lyrics are optional */
  }
  return [];
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => {
      const load = async (track: PlayableTrack, autoplay: boolean, download = false) => {
        const token = ++loadToken;
        set({
          isLoading: true,
          progress: 0,
          duration: track.duration ?? 0,
          lyrics: [],
          activeLyric: -1,
          error: undefined,
        });

        try {
          // Always resolve a fresh stream. CDN links carry a signature that
          // expires within hours, so a URL that came back from storage or an
          // older queue entry must never be reused.
          const resolved = await withTimeout(resolveWithGuestRecovery(track), 40_000, "获取播放链接超时，请检查网络");

          if (token !== loadToken) return;

          // Resolved CDN URLs carry a short signature, so they are never cached
          // in the queue: every playback resolves a fresh stream.
          const patched = { ...track, ...resolved.patch, isLossless: resolved.isLossless };
          set(state => ({
            queue: state.queue.map((item, i) => (i === state.index ? patched : item)),
            duration: patched.duration ?? state.duration,
          }));

          // Native builds let the WebView stream the CDN response through the
          // native client, so playback starts after the first few kilobytes.
          // `download` re-resolves into a buffered blob as the fallback path.
          const playableUrl = await getPlayableAudioUrl(resolved.url, { download });
          if (token !== loadToken) return;

          // Retry counters reset on the "play" event once audio really starts,
          // so a permanently broken stream cannot loop forever.
          audio.src = playableUrl;
          audio.playbackRate = get().rate;
          audio.volume = get().volume;
          audio.loop = get().mode === PlayMode.Single;

          updateMediaSession(patched);
          useRecent.getState().add(patched);

          if (autoplay) {
            try {
              await audio.play();
            } catch (error) {
              if ((error as DOMException)?.name !== "AbortError") {
                const message = (error as Error)?.message || "无法开始播放";
                set({ isPlaying: false, error: message, lastErrorAt: Date.now() });
                toastError("播放失败", message);
              }
            }
          }

          void fetchLyrics(patched, patched.cid).then(lines => {
            if (token === loadToken) set({ lyrics: lines, lyricsLoading: false });
          });
          set({ lyricsLoading: true });
        } catch (error) {
          if (token === loadToken) {
            const message = error instanceof Error ? error.message : "获取播放链接失败";
            set({ error: message, isPlaying: false, lastErrorAt: Date.now() });
            toastError("播放失败", message);
          }
        } finally {
          if (token === loadToken) set({ isLoading: false });
        }
      };

      const playIndex = async (index: number, autoplay = true, download = false) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) {
          // Never fail silently: a restored queue with a stale index used to
          // leave the play button doing nothing at all.
          set({ isLoading: false, isPlaying: false });
          toastError("无法播放", "播放队列为空，请重新选择歌曲");
          return;
        }
        set({ index });
        await load(queue[index], autoplay, download);
      };

      return {
        queue: [],
        index: -1,
        isPlaying: false,
        isLoading: false,
        progress: 0,
        duration: 0,
        volume: 0.8,
        rate: 1,
        mode: PlayMode.Loop,
        lyrics: [],
        lyricsLoading: false,
        activeLyric: -1,

        init: () => {
          if (initialized) return;
          initialized = true;

          audio.volume = get().volume;
          audio.playbackRate = get().rate;

          audio.addEventListener("timeupdate", () => {
            const p = Math.round(audio.currentTime * 100) / 100;
            const active = findActiveLine(get().lyrics, p * 1000);
            set({ progress: p, activeLyric: active });

            if ("mediaSession" in navigator && Number.isFinite(audio.duration) && audio.duration > 0) {
              try {
                navigator.mediaSession.setPositionState({
                  duration: audio.duration,
                  playbackRate: audio.playbackRate,
                  position: Math.min(audio.currentTime, audio.duration),
                });
              } catch {
                /* noop */
              }
            }
          });

          audio.addEventListener("durationchange", () => {
            if (Number.isFinite(audio.duration)) set({ duration: Math.round(audio.duration * 100) / 100 });
          });

          audio.addEventListener("play", () => {
            set({ isPlaying: true });
            const playing = get().queue[get().index];
            if (playing?.key) mediaRetries.delete(playing.key);
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
          });

          audio.addEventListener("pause", () => {
            set({ isPlaying: false });
            if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
          });

          audio.addEventListener("ended", () => {
            void get().next(false);
          });

          /*
           * A dead source (expired signature, revoked blob, interrupted
           * download) used to stop playback with no feedback at all. Re-resolve
           * the same track transparently, and only report after the retries are
           * exhausted.
           */
          audio.addEventListener("error", () => {
            const { queue, index } = get();
            const track = queue[index];
            if (!track) return;

            // Swapping `src` aborts the previous load and surfaces as error 1;
            // that is not a playback failure.
            const code = audio.error?.code;
            if (code === 1) return;

            console.warn("[player] media error", code, audio.error?.message, audio.src.slice(0, 140));

            const key = track.key ?? "";
            const tries = (mediaRetries.get(key) ?? 0) + 1;
            mediaRetries.set(key, tries);

            if (tries > MAX_MEDIA_RETRIES) {
              const message = code ? `音源无法播放（错误码 ${code}）` : "音源无法播放";
              set({ isPlaying: false, error: message, lastErrorAt: Date.now() });
              toastError("播放失败", message);
              return;
            }

            // Streaming is the fast path, but if the WebView rejected it (the
            // interception bridge is unavailable on some ROMs) fall back to the
            // slower buffered download instead of retrying the same way.
            set({ isLoading: true });
            void playIndex(index, true, true);
          });

          if ("mediaSession" in navigator) {
            const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
              ["play", () => void get().toggle()],
              ["pause", () => void get().toggle()],
              ["previoustrack", () => void get().prev()],
              ["nexttrack", () => void get().next(true)],
              [
                "seekto",
                details => {
                  if (typeof details.seekTime === "number") get().seek(details.seekTime);
                },
              ],
            ];

            for (const [action, handler] of handlers) {
              try {
                navigator.mediaSession.setActionHandler(action, handler);
              } catch {
                /* unsupported action */
              }
            }
          }

          const current = get().queue[get().index];
          if (current) {
            set({ duration: current.duration ?? 0 });
            updateMediaSession(current);
          }
        },

        playNow: async (tracks, startIndex = 0) => {
          const queue = tracks.map(withKey);
          if (!queue.length) return;
          set({ queue, index: Math.min(Math.max(startIndex, 0), queue.length - 1) });
          await playIndex(Math.min(Math.max(startIndex, 0), queue.length - 1), true);
        },

        enqueue: tracks => {
          const existing = new Set(get().queue.map(item => item.key));
          const additions = tracks.map(withKey).filter(item => !existing.has(item.key));
          if (!additions.length) return;
          set(state => ({ queue: [...state.queue, ...additions] }));
        },

        playNext: track => {
          const item = withKey(track);
          const { queue, index } = get();
          const without = queue.filter(entry => entry.key !== item.key);
          const insertAt = index + 1;
          set({ queue: [...without.slice(0, insertAt), item, ...without.slice(insertAt)] });
        },

        playAt: async index => {
          await playIndex(index, true);
        },

        retry: async () => {
          const { index, queue, mode } = get();
          if (index < 0 || index >= queue.length) {
            await playIndex(0, true);
            return;
          }
          // A manual retry should not inherit the automatic retry budget.
          const key = queue[index]?.key;
          if (key) mediaRetries.delete(key);
          audio.loop = mode === PlayMode.Single;
          await playIndex(index, true);
        },

        toggle: async () => {
          const { queue, index } = get();
          if (!queue.length) {
            toastError("无法播放", "播放队列为空，请先选择歌曲");
            return;
          }

          if (index < 0) {
            await playIndex(0, true);
            return;
          }

          if (audio.src) {
            if (audio.paused) {
              try {
                await audio.play();
              } catch {
                // The assigned source can die (expired stream, evicted blob).
                // Silently ignoring it made the play button look broken, so
                // resolve a fresh URL and try once more.
                await get().retry();
              }
            } else {
              audio.pause();
            }
            return;
          }

          await playIndex(index, true);
        },

        next: async manual => {
          const { queue, index, mode } = get();
          if (!queue.length) return;

          if (mode === PlayMode.Single && !manual) {
            audio.currentTime = 0;
            await audio.play().catch(() => undefined);
            return;
          }

          if (mode === PlayMode.Random) {
            if (queue.length === 1) {
              audio.currentTime = 0;
              await audio.play().catch(() => undefined);
              return;
            }
            let nextIndex = index;
            while (nextIndex === index) nextIndex = Math.floor(Math.random() * queue.length);
            await playIndex(nextIndex, true);
            return;
          }

          const nextIndex = index + 1;
          if (nextIndex >= queue.length) {
            if (mode === PlayMode.Sequence && !manual) {
              set({ isPlaying: false, progress: 0 });
              audio.pause();
              audio.currentTime = 0;
              return;
            }
            await playIndex(0, true);
            return;
          }

          await playIndex(nextIndex, true);
        },

        prev: async () => {
          const { index, queue, progress } = get();
          if (!queue.length) return;

          if (progress > 5) {
            get().seek(0);
            return;
          }

          await playIndex(index <= 0 ? queue.length - 1 : index - 1, true);
        },

        seek: seconds => {
          if (!Number.isFinite(seconds)) return;
          audio.currentTime = Math.max(0, seconds);
          set({ progress: Math.max(0, seconds), activeLyric: findActiveLine(get().lyrics, seconds * 1000) });
        },

        setVolume: volume => {
          const clamped = Math.min(1, Math.max(0, volume));
          audio.volume = clamped;
          set({ volume: clamped });
        },

        setRate: rate => {
          audio.playbackRate = rate;
          set({ rate });
        },

        cycleMode: () => {
          const order: PlayModeValue[] = [PlayMode.Loop, PlayMode.Single, PlayMode.Random, PlayMode.Sequence];
          const current = get().mode;
          const next = order[(order.indexOf(current) + 1) % order.length] ?? PlayMode.Loop;
          audio.loop = next === PlayMode.Single;
          set({ mode: next });
        },

        removeAt: index => {
          const { queue, index: currentIndex } = get();
          if (index < 0 || index >= queue.length) return;

          const nextQueue = queue.filter((_, i) => i !== index);
          if (!nextQueue.length) {
            get().clear();
            return;
          }

          if (index < currentIndex) {
            set({ queue: nextQueue, index: currentIndex - 1 });
          } else if (index === currentIndex) {
            const nextIndex = Math.min(currentIndex, nextQueue.length - 1);
            set({ queue: nextQueue, index: nextIndex });
            void load(nextQueue[nextIndex], get().isPlaying);
          } else {
            set({ queue: nextQueue });
          }
        },

        move: (from, to) => {
          const { queue, index } = get();
          if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;

          const nextQueue = [...queue];
          const [moved] = nextQueue.splice(from, 1);
          nextQueue.splice(to, 0, moved);

          let nextIndex = index;
          if (index === from) nextIndex = to;
          else if (from < index && to >= index) nextIndex = index - 1;
          else if (from > index && to <= index) nextIndex = index + 1;

          set({ queue: nextQueue, index: nextIndex });
        },

        clear: () => {
          loadToken += 1;
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          set({
            queue: [],
            index: -1,
            isPlaying: false,
            progress: 0,
            duration: 0,
            lyrics: [],
            activeLyric: -1,
            error: undefined,
          });
          updateMediaSession(undefined);
        },

        current: () => get().queue[get().index],
      };
    },
    {
      name: "player",
      storage: createPersistStorage("player"),
      partialize: state => ({
        // Resolved media URLs expire quickly and must never be persisted.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
        queue: state.queue.map(({ url, ...rest }) => rest),
        index: state.index,
        volume: state.volume,
        rate: state.rate,
        mode: state.mode,
      }),
    },
  ),
);

/** Convenience flag: has the user ever logged in to Bilibili in this session? */
export const hasVip = () => Boolean(useUser.getState().user?.vipStatus);
