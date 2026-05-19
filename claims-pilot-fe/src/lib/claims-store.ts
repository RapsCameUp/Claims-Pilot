import { useSyncExternalStore } from "react";
import { CLAIMS } from "@/lib/mock-data";

export type EvidenceFile = {
  id: string;
  name: string;
  size: number;
  kind: "image" | "document" | "audio" | "video" | "geo" | "other";
  preview?: string; // object URL for images
  findings?: string[]; // multimodal AI analysis findings (populated during investigation)
  analysisConfidence?: number;
};

export type AgentEvent = {
  id: string;
  t: number; // ms since investigation start
  agent: string;
  color: "info" | "success" | "warning" | "danger" | "cyan";
  kind: "delegate" | "reason" | "evidence" | "debate" | "decision" | "escalate";
  text: string;
  confidence?: number;
  targetAgent?: string;
};

export type InvestigationStatus =
  | "queued"
  | "delegating"
  | "investigating"
  | "debating"
  | "deciding"
  | "complete"
  | "escalated";

export type NewClaim = {
  id: string;
  customer: string;
  policy: string;
  type: string;
  region: string;
  amount: number;
  vehicle?: string;
  description: string;
  createdAt: number;
  evidence: EvidenceFile[];
  status: InvestigationStatus;
  events: AgentEvent[];
  fraudScore?: number;
  confidence?: number;
  recommendation?: { action: string; amount?: number; reason: string; tone: "success" | "warning" | "danger" };
  activeAgents: string[];
};

type State = { claims: NewClaim[] };
let state: State = { claims: [] };
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function setClaim(id: string, fn: (c: NewClaim) => NewClaim) {
  state = { claims: state.claims.map((c) => (c.id === id ? fn(c) : c)) };
  emit();
}

export const claimsStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  snapshot() { return state; },
  list() { return state.claims; },
  get(id: string) { return state.claims.find((c) => c.id === id); },
  create(input: Omit<NewClaim, "id" | "createdAt" | "status" | "events" | "activeAgents">) {
    const id = `CP-${10500 + state.claims.length + Math.floor(Math.random() * 900)}`;
    const claim: NewClaim = {
      ...input,
      id,
      createdAt: Date.now(),
      status: "queued",
      events: [],
      activeAgents: [],
    };
    state = { claims: [claim, ...state.claims] };
    emit();
    return claim;
  },
  startInvestigation(id: string) {
    const claim = state.claims.find((c) => c.id === id);
    if (!claim) return;
    if (claim.status !== "queued") return;
    runInvestigation(id);
  },
  /** If the id refers to a mock CLAIMS entry that hasn't been hydrated into the
   *  live store yet, seed it as a fresh queued investigation so the user can
   *  watch agents process it. Returns the resulting claim, or undefined. */
  ensureFromMock(id: string): NewClaim | undefined {
    const existing = state.claims.find((c) => c.id === id);
    if (existing) return existing;
    const mock = CLAIMS.find((c) => c.id === id);
    if (!mock) return undefined;
    const claim: NewClaim = {
      id: mock.id,
      customer: mock.customer,
      policy: mock.policy,
      type: mock.type,
      region: mock.region,
      amount: mock.amount,
      vehicle: mock.vehicle,
      description: mock.description,
      createdAt: Date.now(),
      status: "queued",
      events: [],
      activeAgents: [],
      evidence: [],
    };
    state = { claims: [claim, ...state.claims] };
    emit();
    return claim;
  },
};

export function useClaims() {
  return useSyncExternalStore(claimsStore.subscribe, () => state.claims, () => state.claims);
}
export function useClaim(id: string) {
  return useSyncExternalStore(
    claimsStore.subscribe,
    () => state.claims.find((c) => c.id === id),
    () => state.claims.find((c) => c.id === id),
  );
}

// ----- Simulation -----
const COLORS: AgentEvent["color"][] = ["info", "cyan", "warning", "danger", "success"];
const AGENT_BY_NAME: Record<string, AgentEvent["color"]> = {
  "Orchestrator": "info",
  "FNOL Agent": "info",
  "Policy Agent": "info",
  "Damage Agent": "warning",
  "Investigation Agent": "cyan",
  "Fraud Agent": "danger",
  "Compliance Agent": "info",
  "Settlement Agent": "success",
  "Decision Reviewer Agent": "cyan",
};

function pushEvent(id: string, ev: Omit<AgentEvent, "id" | "t">) {
  const start = state.claims.find((c) => c.id === id)?.createdAt ?? Date.now();
  setClaim(id, (c) => ({
    ...c,
    events: [
      ...c.events,
      { ...ev, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, t: Date.now() - start },
    ],
  }));
}

function activate(id: string, agents: string[]) {
  setClaim(id, (c) => ({ ...c, activeAgents: Array.from(new Set([...c.activeAgents, ...agents])) }));
}

function runInvestigation(id: string) {
  const claim = state.claims.find((c) => c.id === id);
  if (!claim) return;
  setClaim(id, (c) => ({ ...c, status: "delegating" }));

  const evidenceSummary = claim.evidence.length
    ? `${claim.evidence.length} artefact(s): ${claim.evidence.slice(0, 3).map((e) => e.name).join(", ")}${claim.evidence.length > 3 ? "…" : ""}`
    : "no attached evidence";

  const steps: Array<{ delay: number; run: () => void }> = [
    { delay: 400, run: () => {
      activate(id, ["Orchestrator"]);
      pushEvent(id, { agent: "Orchestrator", color: "info", kind: "delegate",
        text: `Spinning up investigation for ${claim.id} — ${claim.type}, ${claim.region}. Routing to specialised agents.` });
    }},
    { delay: 900, run: () => {
      activate(id, ["FNOL Agent"]);
      pushEvent(id, { agent: "Orchestrator", color: "info", kind: "delegate", targetAgent: "FNOL Agent",
        text: `→ Delegating to FNOL Agent: validate policy ${claim.policy} and authenticate customer.` });
    }},
    { delay: 1500, run: () => {
      pushEvent(id, { agent: "FNOL Agent", color: "info", kind: "reason",
        text: `Policy ${claim.policy} active · premium current · POPIA consent on file.`, confidence: 0.97 });
    }},
    { delay: 2100, run: () => {
      activate(id, ["Policy Agent"]);
      pushEvent(id, { agent: "Orchestrator", color: "info", kind: "delegate", targetAgent: "Policy Agent",
        text: `→ Delegating to Policy Agent: coverage analysis for ${claim.type}.` });
    }},
    { delay: 2900, run: () => {
      pushEvent(id, { agent: "Policy Agent", color: "info", kind: "reason",
        text: `Comprehensive cover applies. No exclusions triggered for ${claim.type}. Excess R 3,500.`, confidence: 0.94 });
    }},
    { delay: 3600, run: () => {
      activate(id, ["Damage Agent", "Investigation Agent"]);
      pushEvent(id, { agent: "Orchestrator", color: "info", kind: "delegate", targetAgent: "Damage Agent",
        text: `→ Parallel dispatch: Damage Agent (multimodal vision) + Investigation Agent (evidence correlation). Inputs: ${evidenceSummary}.` });
    }},
    { delay: 4500, run: () => {
      // Populate per-file multimodal findings on image/video/audio evidence.
      setClaim(id, (c) => ({
        ...c,
        evidence: c.evidence.map((e) => {
          if (e.findings) return e;
          if (e.kind === "image") return { ...e, analysisConfidence: 0.89, findings: [
            "Front-left bumper deformation consistent with low-speed impact (~25–35 km/h)",
            "Paint transfer detected — secondary colour suggests contact with white vehicle",
            "No pre-existing damage in EXIF-matched prior photo",
            "Lighting + shadow direction consistent with stated 14:20 timestamp",
          ]};
          if (e.kind === "video") return { ...e, analysisConfidence: 0.84, findings: [
            "Frame 00:12 — vehicle approaches intersection at moderate speed",
            "Frame 00:18 — third-party vehicle crosses against signal (visible)",
            "Audio peak at 00:19 matches collision impulse signature",
            "No sign of brake light activation prior to impact",
          ]};
          if (e.kind === "audio") return { ...e, analysisConfidence: 0.81, findings: [
            "Caller stress markers within normal range (no fabrication indicators)",
            "Background noise: highway traffic — consistent with claimed location",
            "Mentioned 'third party' in seconds 00:14, 00:42 — corroborates statement",
          ]};
          if (e.kind === "document") return { ...e, analysisConfidence: 0.93, findings: [
            "OCR clean · vendor VAT number validated against SARS registry",
            "Line items match damage scope estimated by vision model (±6%)",
            "No duplicate invoice number in claims history",
          ]};
          return e;
        }),
      }));
      pushEvent(id, { agent: "Damage Agent", color: "warning", kind: "evidence",
        text: claim.evidence.some((e) => e.kind === "image" || e.kind === "video")
          ? `Vision model classified damage severity: Moderate (0.89). Estimated repair envelope R ${Math.round(claim.amount * 0.6).toLocaleString()}–R ${Math.round(claim.amount * 0.85).toLocaleString()}. Findings attached to evidence.`
          : `No photo/video evidence supplied — falling back on textual description, lower confidence.`,
        confidence: claim.evidence.some((e) => e.kind === "image" || e.kind === "video") ? 0.89 : 0.62 });
    }},
    { delay: 5300, run: () => {
      pushEvent(id, { agent: "Investigation Agent", color: "cyan", kind: "evidence",
        text: `Cross-referenced location, timestamp, and ${claim.evidence.length || 0} artefact(s). 1 minor inconsistency between description and metadata.`,
        confidence: 0.78 });
    }},
    { delay: 6100, run: () => {
      activate(id, ["Fraud Agent"]);
      pushEvent(id, { agent: "Orchestrator", color: "info", kind: "delegate", targetAgent: "Fraud Agent",
        text: `→ Delegating to Fraud Agent: anomaly + ring detection on amount R ${claim.amount.toLocaleString()}.` });
    }},
    { delay: 7000, run: () => {
      const fs = computeFraudScore(claim);
      setClaim(id, (c) => ({ ...c, fraudScore: fs, status: "debating" }));
      pushEvent(id, { agent: "Fraud Agent", color: "danger", kind: "reason",
        text: fs > 70
          ? `Anomaly: amount ${Math.round(((claim.amount - 45000) / 45000) * 100)}% above regional baseline. Vendor pattern suspicious.`
          : fs > 40
          ? `Mild signal: amount slightly elevated. No vendor links to known rings.`
          : `Within expected envelope. No ring association.`,
        confidence: fs > 70 ? 0.87 : 0.74 });
    }},
    { delay: 7800, run: () => {
      const fs = state.claims.find((c) => c.id === id)?.fraudScore ?? 0;
      pushEvent(id, { agent: "Damage Agent", color: "warning", kind: "debate", targetAgent: "Fraud Agent",
        text: fs > 70
          ? `I have to push back. The vision model shows genuine structural damage — R ${Math.round(claim.amount * 0.7).toLocaleString()} of repair scope is real. Suggest an invoice audit, not auto-decline.`
          : `Concur. Severity matches the quoted scope.` });
    }},
    { delay: 8400, run: () => {
      const fs = state.claims.find((c) => c.id === id)?.fraudScore ?? 0;
      if (fs > 40) {
        pushEvent(id, { agent: "Fraud Agent", color: "danger", kind: "debate", targetAgent: "Damage Agent",
          text: `Damage is real, agreed — but vendor V-2241 appears in 4 prior flagged claims. The damage isn't the question; the invoiced amount is.` });
      } else {
        pushEvent(id, { agent: "Fraud Agent", color: "danger", kind: "debate", targetAgent: "Damage Agent",
          text: `Acknowledged. Lowering anomaly weighting. No further objection from my side.` });
      }
    }},
    { delay: 9000, run: () => {
      pushEvent(id, { agent: "Investigation Agent", color: "cyan", kind: "debate", targetAgent: "Fraud Agent",
        text: `Splitting the difference — let's pull vendor invoice history before we settle. I can request 3rd-party verification on the quoted parts within the hour.` });
    }},
    { delay: 9500, run: () => {
      const fs = state.claims.find((c) => c.id === id)?.fraudScore ?? 0;
      pushEvent(id, { agent: "Damage Agent", color: "warning", kind: "debate", targetAgent: "Investigation Agent",
        text: fs > 70
          ? `Agreed. I'll defer my repair estimate pending the vendor audit.`
          : `Works for me. My estimate stands either way.` });
    }},
    { delay: 10000, run: () => {
      activate(id, ["Compliance Agent"]);
      pushEvent(id, { agent: "Compliance Agent", color: "info", kind: "reason",
        text: `Regulatory check passed: POPIA, FSCA conduct. Audit trail sealed.`, confidence: 0.99 });
    }},
    { delay: 10800, run: () => {
      activate(id, ["Settlement Agent"]);
      setClaim(id, (c) => ({ ...c, status: "deciding" }));
      pushEvent(id, { agent: "Orchestrator", color: "info", kind: "delegate", targetAgent: "Settlement Agent",
        text: `→ Consensus reached. Routing to Settlement Agent for draft recommendation.` });
    }},
    { delay: 11600, run: () => {
      const c = state.claims.find((c) => c.id === id)!;
      const fs = c.fraudScore ?? 30;
      const recommendation = fs > 70
        ? { action: "Escalate to senior adjuster", amount: Math.round(c.amount * 0.65), reason: "Multiple anomaly signals — invoice audit required before payout.", tone: "danger" as const }
        : fs > 40
        ? { action: "Conditional approval", amount: Math.round(c.amount * 0.92), reason: "Minor inconsistencies. Approve pending vendor verification.", tone: "warning" as const }
        : { action: "Auto-approve settlement", amount: c.amount, reason: "All agents converged. No anomalies detected.", tone: "success" as const };
      pushEvent(id, { agent: "Settlement Agent", color: recommendation.tone === "success" ? "success" : recommendation.tone === "warning" ? "warning" : "danger",
        kind: "reason",
        text: `Drafted recommendation: ${recommendation.action} — R ${recommendation.amount?.toLocaleString()}. Awaiting Decision Reviewer sign-off.` });
      // Stash the draft on the claim temporarily.
      setClaim(id, (cl) => ({ ...cl, recommendation: { ...recommendation } }));
    }},
    { delay: 12200, run: () => {
      activate(id, ["Decision Reviewer Agent"]);
      pushEvent(id, { agent: "Orchestrator", color: "info", kind: "delegate", targetAgent: "Decision Reviewer Agent",
        text: `→ Final audit: Decision Reviewer Agent to validate consensus, evidence chain, and policy alignment.` });
    }},
    { delay: 13000, run: () => {
      const c = state.claims.find((c) => c.id === id)!;
      const fs = c.fraudScore ?? 30;
      pushEvent(id, { agent: "Decision Reviewer Agent", color: "cyan", kind: "reason",
        text: fs > 70
          ? `Reviewed all 6 agent outputs. Evidence chain intact. I concur with escalation — auto-payout would be premature given vendor signals.`
          : fs > 40
          ? `All checks pass. Conditional approval is appropriate. Vendor verification request logged as a hard precondition.`
          : `Full consensus across agents. Evidence corroborated. Sign-off granted for auto-approval.`,
        confidence: 0.96 });
    }},
    { delay: 13700, run: () => {
      const c = state.claims.find((c) => c.id === id)!;
      const fs = c.fraudScore ?? 30;
      const confidence = fs > 70 ? 71 : fs > 40 ? 86 : 95;
      setClaim(id, (cl) => ({
        ...cl,
        confidence,
        status: fs > 70 ? "escalated" : "complete",
      }));
      const r = c.recommendation!;
      pushEvent(id, { agent: "Decision Reviewer Agent", color: r.tone === "success" ? "success" : r.tone === "warning" ? "warning" : "danger",
        kind: "decision",
        text: `Final decision: ${r.action} — R ${r.amount?.toLocaleString()}. ${r.reason}`,
        confidence: confidence / 100 });
    }},
  ];

  steps.forEach((s) => setTimeout(s.run, s.delay));
}

function computeFraudScore(c: NewClaim) {
  // Deterministic-ish heuristic based on amount + evidence count + description keywords.
  let score = 20;
  if (c.amount > 200_000) score += 35;
  else if (c.amount > 100_000) score += 20;
  else if (c.amount > 50_000) score += 10;
  if (c.evidence.length === 0) score += 25;
  else if (c.evidence.length < 3) score += 10;
  const desc = (c.description || "").toLowerCase();
  if (/(stolen|theft|night|alone|no witness|cash)/.test(desc)) score += 15;
  if (/(third party|police|witness|dashcam|cctv)/.test(desc)) score -= 12;
  return Math.max(5, Math.min(96, score));
}
