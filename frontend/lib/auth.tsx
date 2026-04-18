"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "./api";
import type { User } from "./types";

const MOCK_USER: User = {
  user_id: "dev-user-001",
  username: "dev_user",
  bio: "開発用モックユーザー",
  profile_img: "https://picsum.photos/seed/devuser/150/150",
  is_private: false,
  is_verified: false,
  follower_count: 0,
  following_count: 0,
  created_at: new Date().toISOString(),
};

const IS_MOCK_AUTH = process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (IS_MOCK_AUTH) {
      setUser(MOCK_USER);
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("access_token");
    if (token) {
      fetchMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  const login = useCallback(async (username: string, password: string) => {
    if (IS_MOCK_AUTH) {
      setUser(MOCK_USER);
      router.push("/");
      return;
    }
    const res = await authApi.login(username, password);
    localStorage.setItem("access_token", res.data.access);
    localStorage.setItem("refresh_token", res.data.refresh);
    await fetchMe();
    router.push("/");
  }, [fetchMe, router]);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
    router.push("/login");
  }, [router]);

  const refresh = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
