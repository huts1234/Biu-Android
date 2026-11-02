import moment from "moment";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createPersistStorage } from "../lib/storage";

interface TokenState {
  tokenData?: {
    refresh_token?: string;
  };
  nextCheckRefreshTime?: number;
}

interface Action {
  updateToken: (info: Partial<TokenState>) => void;
  clear: () => void;
}

/** Mobile replacement for `src/store/token.ts` (localStorage instead of IPC). */
export const useToken = create<TokenState & Action>()(
  persist(
    set => ({
      tokenData: {},
      nextCheckRefreshTime: moment().unix(),
      updateToken: (info: Partial<TokenState>) => set(state => ({ ...state, ...info })),
      clear: () => set({ tokenData: undefined, nextCheckRefreshTime: undefined }),
    }),
    {
      name: "user-token",
      storage: createPersistStorage("user-token"),
      partialize: state => ({
        tokenData: state.tokenData,
        nextCheckRefreshTime: state.nextCheckRefreshTime,
      }),
    },
  ),
);
