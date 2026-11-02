import { create } from "zustand";

import type { Track } from "./player";

interface UiState {
  fullPlayerOpen: boolean;
  queueOpen: boolean;
  loginOpen: boolean;
  lyricsMode: boolean;
  actions: { track: Track; queueIndex?: number } | null;

  openFullPlayer: () => void;
  closeFullPlayer: () => void;
  toggleLyrics: () => void;
  setLyrics: (value: boolean) => void;

  openQueue: () => void;
  closeQueue: () => void;
  openLogin: () => void;
  closeLogin: () => void;

  openActions: (track: Track, queueIndex?: number) => void;
  closeActions: () => void;
}

export const useUiStore = create<UiState>()(set => ({
  fullPlayerOpen: false,
  queueOpen: false,
  loginOpen: false,
  lyricsMode: false,
  actions: null,

  openFullPlayer: () => set({ fullPlayerOpen: true }),
  closeFullPlayer: () => set({ fullPlayerOpen: false, queueOpen: false }),
  toggleLyrics: () => set(state => ({ lyricsMode: !state.lyricsMode })),
  setLyrics: value => set({ lyricsMode: value }),

  openQueue: () => set({ queueOpen: true }),
  closeQueue: () => set({ queueOpen: false }),
  openLogin: () => set({ loginOpen: true }),
  closeLogin: () => set({ loginOpen: false }),

  openActions: (track, queueIndex) => set({ actions: { track, queueIndex } }),
  closeActions: () => set({ actions: null }),
}));
