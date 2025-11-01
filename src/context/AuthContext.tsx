import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@/lib/auth";
import { login as apiLogin, register as apiRegister, me as apiMe, refresh as apiRefresh, logout as apiLogout, clearAccessToken, googleAuth as apiGoogleAuth } from "@/lib/auth";

type Status = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: Status;
  initializing: boolean;
  signIn: (payload: { email: string; password: string }) => Promise<User>;
  signUp: (payload: { name: string; email: string; password: string }) => Promise<User>;
  signInUsingGoogle: (credential: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [initializing, setInitializing] = useState(true);

  // On mount: try refresh -> me
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await apiRefresh();
        const u = await apiMe();
        if (!active) return;
        setUser(u);
        setStatus("authenticated");
      } catch {
        if (!active) return;
        clearAccessToken();
        setUser(null);
        setStatus("unauthenticated");
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (payload: { email: string; password: string }) => {
    setStatus("loading");
    const u = await apiLogin(payload);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const signUp = useCallback(async (payload: { name: string; email: string; password: string }) => {
    setStatus("loading");
    const u = await apiRegister(payload);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const signInUsingGoogle = useCallback(async (credential: string) => {
    setStatus("loading");
    const u = await apiGoogleAuth(credential);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const signOut = useCallback(async () => {
    setStatus("loading");
    await apiLogout();
    clearAccessToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      await apiRefresh();
      const u = await apiMe();
      setUser(u);
      setStatus("authenticated");
      return u;
    } catch {
      clearAccessToken();
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, initializing, signIn, signUp, signInUsingGoogle, signOut, refreshUser }),
    [user, status, initializing, signIn, signUp, signInUsingGoogle, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
