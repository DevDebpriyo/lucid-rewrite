import { getAccessToken, refresh } from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "https://airewrite-backend.onrender.com/api";

export type ApiKeyEnv = "test" | "live";

export interface CreateKeyResponse {
  id: string;
  name?: string;
  env: ApiKeyEnv;
  key: string; // full secret appears only once on creation
  scopes?: string[];
  createdAt: string;
}

export interface RevokedInfo {
  isRevoked: boolean;
  reason?: string;
  revokedAt?: string;
}

export interface ListedKey {
  _id: string;
  name?: string;
  env: ApiKeyEnv;
  keyId: string; // masked identifier, no secret part
  scopes?: string[];
  createdAt: string;
  lastUsedAt?: string;
  revoked: RevokedInfo;
  rateLimit?: unknown;
  quota?: unknown;
}

export interface ListKeysResponse {
  keys: ListedKey[];
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

export async function listKeys(): Promise<ListedKey[]> {
  const res = await authedFetch("/keys", { method: "GET" });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({} as any));
    const err = new Error(errBody.error || `Failed to list keys`);
    throw attachErrorMeta(err, { status: res.status, body: errBody });
  }
  const data: ListKeysResponse = await res.json();
  return data.keys || [];
}

export async function createKey(payload: { name?: string; env?: ApiKeyEnv; scopes?: string[] }): Promise<CreateKeyResponse> {
  const res = await authedFetch("/keys", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({} as any));
    const err = new Error(errBody.error || `Failed to create key`);
    throw attachErrorMeta(err, { status: res.status, body: errBody });
  }
  const data: CreateKeyResponse = await res.json();
  return data;
}

export async function revokeKey(id: string): Promise<{ revoked: true; id: string }> {
  const res = await authedFetch(`/keys/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({} as any));
    const err = new Error(errBody.error || `Failed to revoke key`);
    throw attachErrorMeta(err, { status: res.status, body: errBody });
  }
  return res.json();
}

// Public Developer API example call (no session). Useful for demo in UI
export async function callRephraseWithApiKey(baseUrl: string, apiKey: string, text: string) {
  const res = await fetch(`${baseUrl}/model/rephrase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ text }),
  });
  let rate: { limit?: string | null; remaining?: string | null; reset?: string | null } | undefined;
  rate = {
    limit: res.headers.get("X-RateLimit-Limit"),
    remaining: res.headers.get("X-RateLimit-Remaining"),
    reset: res.headers.get("X-RateLimit-Reset"),
  };
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body, rate };
}
