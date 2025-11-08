import { getAccessToken, refresh } from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "https://airewrite-backend.onrender.com";

function mergeHeaders(base: HeadersInit | undefined, extra: Record<string, string>): HeadersInit {
  const out: Record<string, string> = {};
  if (base) {
    if (Array.isArray(base)) {
      for (const [k, v] of base) out[k] = v as string;
    } else if (base instanceof Headers) {
      base.forEach((v, k) => (out[k] = v));
    } else {
      Object.assign(out, base);
    }
  }
  Object.assign(out, extra);
  return out;
}

export async function authedJsonFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const url = `${API_URL}${path}`;
  const token = getAccessToken();
  const headers = mergeHeaders(init.headers, {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
  const res = await fetch(url, { ...init, headers, credentials: "include" });
  if (res.status === 401 && retry) {
    const newToken = await refresh();
    if (newToken) {
      return authedJsonFetch(path, init, false);
    }
  }
  return res;
}
