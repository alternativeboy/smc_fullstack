import { create } from 'zustand';
import type { User } from '@/types/auth.types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  ready: boolean; // true once the initial silent-refresh on mount has resolved
  setAuth: (accessToken: string, user: User) => void;
  setToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  setReady: (ready: boolean) => void;
  clear: () => void;
}

/**
 * Access token is kept IN MEMORY ONLY — no persist middleware, never written to
 * localStorage/sessionStorage (CLAUDE.md §2). It's gone on a hard reload and is
 * re-obtained via the httpOnly refresh cookie on mount.
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  ready: false,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ ready }),
  clear: () => set({ accessToken: null, user: null }),
}));
