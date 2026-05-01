import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TwitchUser, Session, UserRole } from '../types';

interface AppStore {
  // Auth
  twitchUser: TwitchUser | null;
  setTwitchUser: (user: TwitchUser | null) => void;

  // Role in session
  role: UserRole | null;
  setRole: (role: UserRole) => void;

  // Active session
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

  // Full session state (synced from socket)
  session: Session | null;
  setSession: (session: Session | null) => void;

  // Connection status
  connected: boolean;
  setConnected: (v: boolean) => void;

  // Reset
  reset: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      twitchUser: null,
      setTwitchUser: (user) => set({ twitchUser: user }),

      role: null,
      setRole: (role) => set({ role }),

      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),

      session: null,
      setSession: (session) => set({ session }),

      connected: false,
      setConnected: (v) => set({ connected: v }),

      reset: () => set({
        role: null,
        sessionId: null,
        session: null,
        connected: false,
      }),
    }),
    {
      name: 'quizshow-store',
      partialize: (state) => ({
        twitchUser: state.twitchUser,
        role: state.role,
        sessionId: state.sessionId,
      }),
    }
  )
);
