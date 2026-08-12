import { create } from "zustand";

const STORAGE_KEY = "maphpro3d-ui";

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
}

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { sidebarCollapsed?: boolean };
    return !!parsed.sidebarCollapsed;
  } catch {
    return false;
  }
}

function persist(sidebarCollapsed: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarCollapsed }));
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: readInitial(),
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    persist(next);
  },
  setSidebarCollapsed: (v) => {
    set({ sidebarCollapsed: v });
    persist(v);
  },
}));
