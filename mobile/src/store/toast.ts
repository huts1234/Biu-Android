import { create } from "zustand";

export type ToastTone = "default" | "success" | "danger";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }) => void;
  dismiss: (id: number) => void;
}

let seed = 0;

export const useToastStore = create<ToastState>()(set => ({
  items: [],
  push: ({ title, description, tone = "default" }) => {
    if (!title) return;
    const id = ++seed;
    // Android snackbars are shown one at a time; a new message replaces the
    // current one instead of stacking.
    set({ items: [{ id, title, description, tone }] });
    setTimeout(() => {
      set(state => ({ items: state.items.filter(item => item.id !== id) }));
    }, 2600);
  },
  dismiss: id => set(state => ({ items: state.items.filter(item => item.id !== id) })),
}));

export const toast = (title: string, options?: { description?: string; tone?: ToastTone }) =>
  useToastStore.getState().push({ title, description: options?.description, tone: options?.tone });

export const toastError = (title: string, description?: string) =>
  useToastStore.getState().push({ title, description, tone: "danger" });

export const toastSuccess = (title: string, description?: string) =>
  useToastStore.getState().push({ title, description, tone: "success" });
