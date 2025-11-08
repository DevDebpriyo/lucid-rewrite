import { getAccessToken, refresh } from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "https://airewrite-backend.onrender.com";

export interface UsagePeriod {
  start: string; // ISO
  end: string;   // ISO
}

export interface UsageInfo {
  plan: "free" | "pro" | "enterprise" | string;
  limit: number; // characters allowed in current period
  used: number;  // characters used in current period
  remaining: number; // Math.max(0, limit - used)
  period: UsagePeriod; // current window, e.g., month
  resetsAt?: string; // optional ISO when counter resets
}

function attachErrorMeta(err: Error, meta: Record<string, any>) {
  Object.assign(err, meta);
  return err;
}

async function authedFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const url = `${API_URL}${path}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  const token = getAccessToken();
  if (token) (headers as any).Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  if (res.status === 401 && retry) {
    const newToken = await refresh();
    if (newToken) {
      return authedFetch(path, init, false);
    }
  }

  return res;
}

export async function getUsage(): Promise<UsageInfo> {
  const res = await authedFetch("/usage", { method: "GET" });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({} as any));
    const err = new Error(errBody.error || `Failed to fetch usage`);
    throw attachErrorMeta(err, { status: res.status, body: errBody });
  }
  const data = (await res.json()) as UsageInfo;
  return data;
}

export async function updateUsage(charactersUsed: number): Promise<UsageInfo> {
  const res = await authedFetch("/usage", {
    method: "POST",
    body: JSON.stringify({ charactersUsed }),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({} as any));
    const err = new Error(errBody.error || `Failed to update usage`);
    throw attachErrorMeta(err, { status: res.status, body: errBody });
  }
  const data = (await res.json()) as UsageInfo;
  return data;
}
