// @ts-ignore - Vite provides import.meta.env at runtime
const API_BASE: string = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000/api";

function getToken(): string | null {
  try {
    return localStorage.getItem("cp_token");
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  localStorage.setItem("cp_token", token);
}

export function clearToken() {
  localStorage.removeItem("cp_token");
  localStorage.removeItem("cp_user");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; firstName: string; lastName: string; role: string };
}

export const api = {
  auth: {
    login(email: string, password: string) {
      return request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    register(data: { email: string; password: string; firstName: string; lastName: string; role?: string }) {
      return request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    me() {
      return request<{ id: string; email: string; firstName: string; lastName: string; role: string; createdAt: string }>("/auth/me");
    },
  },

  // ─── Claims ────────────────────────────────────────────────────────────────

  claims: {
    list(params?: { status?: string; region?: string; limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.region) qs.set("region", params.region);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      const q = qs.toString();
      return request<{ claims: any[]; total: number; limit: number; offset: number }>(`/claims${q ? `?${q}` : ""}`);
    },
    get(id: string) {
      return request<any>(`/claims/${encodeURIComponent(id)}`);
    },
    create(data: {
      customerName: string;
      policyNumber: string;
      type: string;
      region: string;
      amount: number;
      vehicle?: string;
      description: string;
    }) {
      return request<any>("/claims", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    updateStatus(id: string, status: string) {
      return request<any>(`/claims/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    uploadEvidence(claimId: string, files: File[]) {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return request<any[]>(`/claims/${encodeURIComponent(claimId)}/evidence`, {
        method: "POST",
        body: form,
      });
    },
    getEvidenceUrl(claimId: string, evidenceId: string) {
      return request<{ url: string }>(`/claims/${encodeURIComponent(claimId)}/evidence/${encodeURIComponent(evidenceId)}/url`);
    },
  },

  // ─── Investigations ────────────────────────────────────────────────────────

  investigations: {
    list(params?: { status?: string; limit?: number; offset?: number }) {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.offset) qs.set("offset", String(params.offset));
      const q = qs.toString();
      return request<any[]>(`/investigations${q ? `?${q}` : ""}`);
    },
    get(id: string) {
      return request<any>(`/investigations/${encodeURIComponent(id)}`);
    },
    getByClaimId(claimId: string) {
      return request<any>(`/investigations/claim/${encodeURIComponent(claimId)}`);
    },
    start(claimId: string) {
      return request<any>(`/investigations/start/${encodeURIComponent(claimId)}`, { method: "POST" });
    },
    timeline(claimId: string) {
      return request<any[]>(`/investigations/timeline/${encodeURIComponent(claimId)}`);
    },
    recentActivity(limit?: number) {
      const qs = limit ? `?limit=${limit}` : "";
      return request<any[]>(`/investigations/activity/recent${qs}`);
    },
  },

  // ─── Fraud ─────────────────────────────────────────────────────────────────

  fraud: {
    graph() {
      return request<{ nodes: any[]; edges: any[] }>("/fraud/graph");
    },
    alerts(params?: { resolved?: boolean; severity?: string; limit?: number }) {
      const qs = new URLSearchParams();
      if (params?.resolved !== undefined) qs.set("resolved", String(params.resolved));
      if (params?.severity) qs.set("severity", params.severity);
      if (params?.limit) qs.set("limit", String(params.limit));
      const q = qs.toString();
      return request<any[]>(`/fraud/alerts${q ? `?${q}` : ""}`);
    },
    resolveAlert(id: string) {
      return request<any>(`/fraud/alerts/${encodeURIComponent(id)}/resolve`, { method: "PATCH" });
    },
    nodes() {
      return request<any[]>("/fraud/nodes");
    },
    edges() {
      return request<any[]>("/fraud/edges");
    },
  },

  // ─── Analytics ─────────────────────────────────────────────────────────────

  analytics: {
    dashboard() {
      return request<any>("/analytics/dashboard");
    },
    settlementTrend(days?: number) {
      const qs = days ? `?days=${days}` : "";
      return request<any[]>(`/analytics/settlement-trend${qs}`);
    },
    fraudTrend(months?: number) {
      const qs = months ? `?months=${months}` : "";
      return request<any[]>(`/analytics/fraud-trend${qs}`);
    },
    regionHeatmap() {
      return request<any[]>("/analytics/region-heatmap");
    },
    agentPerformance() {
      return request<any[]>("/analytics/agent-performance");
    },
  },

  // ─── Audit ─────────────────────────────────────────────────────────────────

  audit: {
    list(limit?: number, offset?: number) {
      const qs = new URLSearchParams();
      if (limit) qs.set("limit", String(limit));
      if (offset) qs.set("offset", String(offset));
      const q = qs.toString();
      return request<any[]>(`/audit${q ? `?${q}` : ""}`);
    },
    forEntity(entityType: string, entityId: string) {
      return request<any[]>(`/audit/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`);
    },
  },

  // ─── Policy Documents ──────────────────────────────────────────────────────

  policyDocuments: {
    list() {
      return request<any[]>("/policy-documents");
    },
    upload(file: File, name: string, description?: string) {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name);
      if (description) form.append("description", description);
      return request<any>("/policy-documents", {
        method: "POST",
        body: form,
      });
    },
    delete(id: string) {
      return request<void>(`/policy-documents/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  },
};
