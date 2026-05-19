import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
import { api } from "./api";

// ─── Types matching what the frontend components expect ──────────────────────

export type AgentEventKind = "delegate" | "reason" | "evidence" | "debate" | "decision" | "escalate";
export type AgentEventColor = "info" | "success" | "warning" | "danger" | "cyan";

export interface AgentEvent {
  id: string;
  kind: AgentEventKind;
  agent: string;
  text: string;
  color: AgentEventColor;
  t: number; // ms elapsed from investigation start
  confidence: number | null;
  targetAgent: string | null;
}

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  kind: "image" | "document" | "audio" | "video" | "geo" | "other";
  preview?: string;
  analysisConfidence?: number;
  findings?: string[];
}

export interface Recommendation {
  action: string;
  amount: number;
  reason: string;
  tone: "success" | "warning" | "danger";
}

export interface InvestigationClaim {
  id: string;
  customer: string;
  policy: string;
  type: string;
  region: string;
  amount: number;
  status: string;
  fraudScore: number;
  confidence: number;
  vehicle?: string;
  description: string;
  evidence: EvidenceFile[];
  events: AgentEvent[];
  activeAgents: string[];
  recommendation: Recommendation | null;
}

// ─── Map backend data to frontend shape ──────────────────────────────────────

function mapClaim(claim: any, investigation: any | null, evidence: any[]): InvestigationClaim {
  const startTime = investigation?.startedAt ? new Date(investigation.startedAt).getTime() : Date.now();
  const events: AgentEvent[] = (investigation?.events || []).map((e: any) => ({
    id: e.id,
    kind: e.kind,
    agent: e.agent,
    text: e.text,
    color: e.color || "info",
    t: new Date(e.timestamp).getTime() - startTime,
    confidence: e.confidence,
    targetAgent: e.targetAgent || e.target_agent || null,
  }));

  const evidenceFiles: EvidenceFile[] = evidence.map((e: any) => ({
    id: e.id,
    name: e.fileName || e.file_name || e.name || "file",
    size: e.fileSize || e.file_size || 0,
    kind: e.kind || "document",
    analysisConfidence: e.analysisConfidence ?? e.analysis_confidence ?? undefined,
    findings: e.findings || undefined,
  }));

  let recommendation: Recommendation | null = null;
  if (investigation?.recommendationAction || investigation?.recommendation_action) {
    recommendation = {
      action: investigation.recommendationAction || investigation.recommendation_action || "",
      amount: investigation.recommendationAmount || investigation.recommendation_amount || 0,
      reason: investigation.recommendationReason || investigation.recommendation_reason || "",
      tone: investigation.recommendationTone || investigation.recommendation_tone || "success",
    };
  }

  return {
    id: claim.id,
    customer: claim.customerName || claim.customer_name || claim.customer || "",
    policy: claim.policyNumber || claim.policy_number || claim.policy || "",
    type: claim.type || "",
    region: claim.region || "",
    amount: claim.amount || 0,
    status: investigation?.status || "queued",
    fraudScore: investigation?.fraudScore ?? investigation?.fraud_score ?? claim.fraudScore ?? claim.fraud_score ?? 0,
    confidence: investigation?.confidence ?? claim.confidence ?? 0,
    vehicle: claim.vehicle || undefined,
    description: claim.description || "",
    evidence: evidenceFiles,
    events,
    activeAgents: investigation?.activeAgents || investigation?.active_agents || [],
    recommendation,
  };
}

// ─── Hook: poll investigation data + SSE live streaming ──────────────────────

export function useInvestigationData(claimId: string) {
  const [data, setData] = useState<InvestigationClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const investigationIdRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch claim, investigation, and evidence in parallel
      const [claim, evidenceList] = await Promise.all([
        api.claims.get(claimId),
        api.claims.list({ limit: 1 }).then(() => [] as any[]).catch(() => []),
      ]);

      let investigation: any = null;
      let evidence: any[] = [];
      try {
        investigation = await api.investigations.getByClaimId(claimId);
      } catch {
        // No investigation yet
      }
      try {
        // Get evidence for the claim - use claim endpoint
        const claimData = await api.claims.get(claimId);
        evidence = claimData.evidence || [];
      } catch {
        evidence = [];
      }

      const mapped = mapClaim(claim, investigation, evidence);
      setData(mapped);
      setError(null);

      // Connect SSE if we have an investigation and it's still running
      if (investigation && !["complete", "escalated"].includes(investigation.status)) {
        investigationIdRef.current = investigation.id;
        connectSSE(investigation.id);
      }

      // Stop polling if investigation is complete
      if (investigation && ["complete", "escalated"].includes(investigation.status)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        disconnectSSE();
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  const connectSSE = useCallback((investigationId: string) => {
    // Don't reconnect if already connected to same investigation
    if (sseRef.current && investigationIdRef.current === investigationId) return;

    disconnectSSE();

    const token = localStorage.getItem("cp_token");
    const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:4000/api";
    // EventSource doesn't support headers, so pass token as query param
    const url = `${API_BASE}/investigations/${encodeURIComponent(investigationId)}/stream?token=${encodeURIComponent(token || "")}`;

    const es = new EventSource(url);
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);
        if (eventData.type === "connected") return;

        // Merge the new event into existing data
        setData((prev) => {
          if (!prev) return prev;
          const startTime = prev.events.length > 0
            ? Date.now() - (prev.events[prev.events.length - 1]?.t || 0)
            : Date.now();

          const newEvent: AgentEvent = {
            id: eventData.id || `sse-${Date.now()}-${Math.random()}`,
            kind: eventData.kind,
            agent: eventData.agent,
            text: eventData.text,
            color: eventData.color || "info",
            t: eventData.t || (Date.now() - startTime),
            confidence: eventData.confidence ?? null,
            targetAgent: eventData.targetAgent || eventData.target_agent || null,
          };

          // Avoid duplicates
          if (prev.events.some((e) => e.id === newEvent.id)) return prev;

          return {
            ...prev,
            events: [...prev.events, newEvent],
          };
        });
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      // SSE connection lost, fall back to polling
      disconnectSSE();
    };
  }, []);

  const disconnectSSE = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 2 seconds while investigation is running
    intervalRef.current = setInterval(fetchData, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      disconnectSSE();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Hook: list claims from API ──────────────────────────────────────────────

export function useClaimsList(params?: { status?: string; region?: string; limit?: number }) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.claims.list(params).then((res) => {
      if (!cancelled) {
        setClaims(res.claims || []);
        setLoading(false);
      }
    }).catch((err) => {
      if (!cancelled) {
        setError(err.message);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [params?.status, params?.region, params?.limit]);

  return { claims, loading, error };
}
