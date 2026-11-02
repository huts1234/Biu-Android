import { create } from "zustand";
import { persist } from "zustand/middleware";

import { getUserInfo, type UserInfo } from "@/service/user-info";

import { createPersistStorage } from "../lib/storage";

interface UserState {
  user: UserInfo | null;
  /** true while the first /nav request after launch is in flight */
  loading: boolean;
}

interface Action {
  updateUser: () => Promise<void>;
  clear: () => void;
}

/**
 * Mobile replacement for `src/store/user.ts`.
 * The desktop version persists through Electron IPC; here we use localStorage.
 */
export const useUser = create<UserState & Action>()(
  persist(
    set => ({
      user: null,
      loading: false,
      updateUser: async () => {
        set({ loading: true });
        try {
          const res = await getUserInfo();
          if (res?.code === 0 && res.data?.isLogin) {
            set({ user: res.data });
          } else {
            set({ user: null });
          }
        } catch {
          // keep the cached user on transient network failures
        } finally {
          set({ loading: false });
        }
      },
      clear: () => set({ user: null }),
    }),
    {
      name: "user",
      storage: createPersistStorage("user"),
      partialize: state => ({ user: state.user }),
    },
  ),
);

export const isLoggedIn = () => Boolean(useUser.getState().user?.isLogin);
