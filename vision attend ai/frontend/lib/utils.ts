import type { ClassValue } from "clsx";
import clsx from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

type FetchInit = RequestInit & {
  token?: string | null;
  raw?: boolean;
  timeoutMs?: number;
};

export async function apiFetch(
  path: string,
  init: FetchInit = {}
): Promise<any> {
  const { token, timeoutMs = 30000, raw, headers, ...rest } = init;
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      credentials: "omit",
      ...rest,
      headers: {
        "Content-Type":
          rest.body && !(rest.body instanceof FormData)
            ? "application/json"
            : (headers as any)?.["Content-Type"] || "application/octet-stream",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      signal: controller.signal,
    } as any);
    if (res.status === 204) return null;
    const text = await res.text();
    let data: any = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}
    if (!res.ok) {
      const detail =
        (data && (data.detail || data.message || data.error)) ||
        res.statusText ||
        "Request failed";
      const err: any = new Error(Array.isArray(detail) ? JSON.stringify(detail) : String(detail));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return raw ? text : data;
  } finally {
    clearTimeout(timeout);
  }
}

export function pct(n?: number | null, digits = 1) {
  if (n == null || isNaN(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtPct(n?: number | null, digits = 1) {
  if (n == null || isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function fmtTime(t?: string | Date | null) {
  if (!t) return "—";
  const d = typeof t === "string" ? new Date(t) : t;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function fmtDate(t?: string | Date | null) {
  if (!t) return "—";
  const d = typeof t === "string" ? new Date(t) : t;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

export function fmtDateTime(t?: string | Date | null) {
  if (!t) return "—";
  const d = typeof t === "string" ? new Date(t) : t;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name?: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  checked_in: { label: "Checked In", cls: "badge-green" },
  checked_out: { label: "Checked Out", cls: "badge-blue" },
  late: { label: "Late", cls: "badge-amber" },
  early_departure: { label: "Early Departure", cls: "badge-amber" },
  present: { label: "Present", cls: "badge-green" },
  absent: { label: "Absent", cls: "badge-red" },
  half_day: { label: "Half Day", cls: "badge-amber" },
  on_leave: { label: "On Leave", cls: "badge-slate" },
  manual_correction: { label: "Manual Correction", cls: "badge-blue" },
  rejected: { label: "Rejected", cls: "badge-red" },
  suspicious: { label: "Suspicious", cls: "badge-red" },
  DUPLICATE: { label: "Duplicate", cls: "badge-slate" },
  REJECTED: { label: "Rejected", cls: "badge-red" },
};

export const SEVERITY_META: Record<string, { label: string; cls: string; dot: string }> = {
  low: { label: "Low", cls: "badge-slate", dot: "bg-slate-400" },
  medium: { label: "Medium", cls: "badge-amber", dot: "bg-amber-500" },
  high: { label: "High", cls: "badge-red", dot: "bg-rose-500" },
  critical: { label: "Critical", cls: "badge-red", dot: "bg-rose-700" },
};

export function useFallback<T>(v: T | null | undefined, f: T): T {
  return v == null ? f : v;
}
