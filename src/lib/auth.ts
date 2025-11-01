// Simple fetch-based auth client that keeps accessToken in memory and
// includes refresh-once retry logic for 401s.

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface AccessTokenResponse {
  accessToken: string;
}

export interface MeResponse {
  user: User;
}

const API_URL = import.meta.env.VITE_API_URL ?? "https://airewrite-backend.onrender.com";

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

async function apiFetch(input: string, init?: RequestInit, retry = true): Promise<Response> {
  const url = `${API_URL}${input}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers || {}),
  };
  if (accessToken) {
    (headers as any).Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "include", // allow cookies for login/register/refresh/logout and safe for others
  });

  if (res.status === 401 && retry) {
    const ok = await refresh();
    if (ok) {
      return apiFetch(input, init, false);
    }
  }

  return res;
}

export async function register(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "Register failed");
  const data: AuthResponse = await res.json();
  accessToken = data.accessToken;
  return data.user;
}

export async function login(payload: { email: string; password: string }): Promise<User> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "Login failed");
  const data: AuthResponse = await res.json();
  accessToken = data.accessToken;
  return data.user;
}

export async function refresh(): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  const data: AccessTokenResponse = await res.json();
  accessToken = data.accessToken;
  return accessToken;
}

export async function me(): Promise<User> {
  const res = await apiFetch("/auth/me", { method: "GET" });
  if (!res.ok) throw new Error((await res.text()) || "Failed to fetch user");
  const data: MeResponse = await res.json();
  return data.user;
}

export async function logout(): Promise<void> {
  accessToken = null;
  await apiFetch("/auth/logout", { method: "POST" }, false);
}

export async function googleAuth(credential: string): Promise<User> {
  const res = await apiFetch("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) throw new Error((await res.text()) || "Google auth failed");
  const data: AuthResponse = await res.json();
  accessToken = data.accessToken;
  return data.user;
}
