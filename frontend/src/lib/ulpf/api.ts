import type { UlpfState } from "./types";

const rawBase = (import.meta.env["VITE_API_BASE_URL"] ?? "/api/v1").trim().replace(/\/+$/, "");
const BASE = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase}/api/v1`;
const API_ROOT = BASE.replace(/\/api\/v1\/?$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "content-type": "application/json" } : {}), ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { message?: string }).message ?? `Request failed (${response.status})`);
  return payload as T;
}

export const ulpfApi = {
  state: () => request<UlpfState>("/state"),
  ingest: (text: string, opts?: { transport?: string; file?: string }) => request<{ ingestion_id: string; accepted: number; rejected: number; events: UlpfState["events"] }>("/events", { method: "POST", body: JSON.stringify({ text, ...opts }) }),
  ingestFile: async (file: File) => {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`${API_ROOT}/api/v1/ingest/file`, { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message ?? `Request failed (${response.status})`);
    return result as { accepted: number; rejected: number; events: UlpfState["events"] };
  },
  approve: (id: string, suggestions?: UlpfState["proposals"][number]["suggestions"]) => request<{ ok: boolean }>(`/proposals/${encodeURIComponent(id)}/approve`, { method: "POST", body: JSON.stringify({ suggestions }) }),
  reject: (id: string) => request<{ ok: boolean }>(`/proposals/${encodeURIComponent(id)}/reject`, { method: "POST", body: "{}" }),
  reprocess: () => request<{ count: number }>("/reprocess", { method: "POST", body: "{}" }),
  retryDlq: () => request<{ ok: boolean }>("/dlq/retry", { method: "POST", body: "{}" }),
  reset: () => request<{ ok: boolean }>("/reset", { method: "POST", body: "{}" }),
};
