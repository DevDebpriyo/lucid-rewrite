// Lightweight payments client to talk to your backend only (never Dodo directly)
import { getAccessToken } from "./auth";

const rawApiBase = (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || "";

// Normalize so we can safely append `/api/...`
export const API_BASE: string = String(rawApiBase).replace(/\/$/, "").replace(/\/(api)\/?$/, "");

// GET {API_BASE}/api/payments/products
export async function listProducts(): Promise<any[]> {
  const headers: HeadersInit = { Accept: "application/json" };
  const token = getAccessToken?.();
  if (token) (headers as any).Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/payments/products`, {
    cache: "no-store",
    credentials: "include",
    headers,
  });
  let data: any;
  try {
    data = await res.json();
  } catch (_) {
    // ignore
  }
  if (!res.ok) {
    throw new Error((data && (data.message || data.error)) || `Failed to fetch products (${res.status})`);
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.products)) return data.products;
  return [];
}

// GET {API_BASE}/api/payments/checkout/{onetime|subscription}?productId=...
export async function startCheckout(productId: string, isRecurring: boolean): Promise<void> {
  const type = isRecurring ? "subscription" : "onetime";
  const url = `${API_BASE}/api/payments/checkout/${type}?productId=${encodeURIComponent(productId)}`;
  const headers: HeadersInit = { Accept: "application/json" };
  const token = getAccessToken?.();
  if (token) (headers as any).Authorization = `Bearer ${token}`;

  const res = await fetch(url, { cache: "no-store", credentials: "include", headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Checkout failed (${res.status})`);
  }
  if (!data?.payment_link) {
    throw new Error("No payment link returned by server");
  }
  window.location.href = data.payment_link as string;
}
