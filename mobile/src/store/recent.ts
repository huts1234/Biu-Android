import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Track } from "./player";

import { createPersistStorage } from "../lib/storage";

interface RecentState {
  items: Track[];
  add: (track: Track) => void;
  clear: () => void;
}

export const useRecent = create<RecentState>()(
  persist(
    set => ({
      items: [],
      add: track =>
        set(state => ({
          items: [track, ...state.items.filter(item => item.key !== track.key)].slice(0, 30),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "recent",
      storage: createPersistStorage("recent"),
    },
  ),
);
