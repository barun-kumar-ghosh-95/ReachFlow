"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiFetch } from "./utils";

export type RoleName = "admin" | "hr" | "security" | "employee";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string | null;
  role_id: number;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  role: RoleName | null;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setToken: (t: string | null) => void;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      role: null,
      initialized: false,
      login: async (username, password) => {
        const body = new FormData();
        body.append("username", username);
        body.append("password", password);
        const data = await apiFetch("/auth/login", {
          method: "POST",
          body,
        });
        set({
          token: data.access_token,
          refreshToken: data.refresh_token,
          user: data.user,
          role: data.role_name as RoleName,
          initialized: true,
        });
      },
      logout: () =>
        set({
          token: null,
          refreshToken: null,
          user: null,
          role: null,
          initialized: true,
        }),
      setToken: (t) => set({ token: t }),
      hydrate: async () => {
        const { token } = get();
        if (token) {
          try {
            const user = await apiFetch("/auth/me", { token });
            set({ user, initialized: true });
          } catch (e) {
            set({ token: null, refreshToken: null, user: null, role: null, initialized: true });
          }
        } else {
          set({ initialized: true });
        }
      },
    }),
    {
      name: "visionattend.auth",
      partialize: (s) => ({
        token: s.token,
        refreshToken: s.refreshToken,
        user: s.user,
        role: s.role,
      }),
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : (undefined as any)
      ),
    }
  )
);
