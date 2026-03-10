import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  initialized: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  initialized: false,
  setAuth: (user, session) => set({ user, session }),
  setInitialized: (initialized) => set({ initialized }),
  clearAuth: () => set({ user: null, session: null }),
}));

