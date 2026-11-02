import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createPersistStorage } from "../lib/storage";

interface SearchHistoryState {
  items: string[];
  add: (keyword: string) => void;
  remove: (keyword: string) => void;
  clear: () => void;
}

export const useSearchHistory = create<SearchHistoryState>()(
  persist(
    set => ({
      items: [],
      add: keyword => {
        const value = keyword.trim();
        if (!value) return;
        set(state => ({ items: [value, ...state.items.filter(item => item !== value)].slice(0, 12) }));
      },
      remove: keyword => set(state => ({ items: state.items.filter(item => item !== keyword) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "search-history",
      storage: createPersistStorage("search-history"),
    },
  ),
);
