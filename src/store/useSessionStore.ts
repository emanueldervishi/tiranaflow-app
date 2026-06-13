import { create } from "zustand";

import { getCurrentSessionUser, signInWithGoogle, signOutRemote } from "@/services/auth";

type SessionStore = {
  userId: string | null;
  email: string | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  setSession: (payload: { userId: string; email: string | null } | null) => void;
  bootstrap: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSessionStore = create<SessionStore>((set) => ({
  userId: null,
  email: null,
  isReady: false,
  isLoading: false,
  error: null,
  setSession: (payload) => set({
    userId: payload?.userId ?? null,
    email: payload?.email ?? null,
    isReady: true,
    error: null,
  }),
  bootstrap: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await getCurrentSessionUser();
      set({
        userId: user?.id ?? null,
        email: user?.email ?? null,
        isReady: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        isReady: true,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to restore session.",
      });
    }
  },
  loginWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await signInWithGoogle();
      set({
        userId: user.id,
        email: user.email,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Google sign-in failed.",
      });
    }
  },
  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await signOutRemote();
      set({
        userId: null,
        email: null,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Failed to sign out." });
    }
  },
}));
