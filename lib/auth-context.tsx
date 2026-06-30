"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { UserRead } from "./types";
import { getMe, getToken, removeToken, setToken, login as apiLogin, ApiError } from "./api";

interface AuthContextValue {
  user: UserRead | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserRead | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  // On mount, check if we have a valid token and fetch user
  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => {
        removeToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = React.useCallback(
    async (username: string, password: string) => {
      const tokenData = await apiLogin(username, password);
      setToken(tokenData.access_token);
      const me = await getMe();
      setUser(me);
    },
    []
  );

  const logout = React.useCallback(() => {
    removeToken();
    setUser(null);
    router.push("/");
  }, [router]);

  const value = React.useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
