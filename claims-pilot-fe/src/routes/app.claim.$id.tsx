import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Panel, StatusPill } from "@/components/app/Primitives";
import { ChevronLeft, FileText, Image as ImageIcon, FileAudio, Bot, ShieldAlert, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/claim/$id")({
  head: () => ({ meta: [{ title: "Claim Details — ClaimPilot AI" }] }),
  component: ClaimDetails,
  notFoundComponent: () => <div className="p-12 text-center text-muted-foreground">Claim not found.</div>,
});

const TABS = ["Overview", "Evidence", "Investigation", "Fraud Analysis", "Policy Review", "Timeline", "Audit Logs"] as const;

function ClaimDetails() {
  const { id } = useParams({ from: "/app/claim/$id" });
  const [claim, setClaim] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]>("Overview");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.claims.get(id).catch(() => null),
      api.investigations.timeline(id).catch(() => []),
      api.audit.forEntity("claim", id).catch(() => []),
    ]).then(([claimData, tl, al]) => {
      if (cancelled) return;
      setClaim(claimData);
      setTimeline(Array.isArray(tl) ? tl : []);
      setAuditLogs(Array.isArray(al) ? al : []);
      // Extract debates from timeline
      setDebates((Array.isArray(tl) ? tl : []).filter((e: any) => e.kind === "debate"));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading claim…
      </div>
    );
  }

  if (!claim) return <div className="p-12 text-center text-muted-foreground">Claim not found.</div>;

  const fraudScore = claim.fraudScore ?? claim.fraud_score ?? 0;
  const confidence = claim.confidence ?? 0;
  const customer = claim.customerName || claim.customer_name || claim.customer || "";
  const policy = claim.policyNumber || claim.policy_number || claim.policy || "";
  const vehicle = claim.vehicle || "—";
  const assignedAgents = claim.assignedAgents || claim.assigned_agents || [];
  const tone = fraudScore > 80 ? "danger" : fraudScore > 50 ? "warning" : "success";

  return (
    <div className="p-6 max-w-[1500px] mx-auto space-y-4">
      <Link to="/app/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-3" /> Back to operations
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary">Claim</div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">{claim.id} · {customer}</h1>
          <p className="text-sm text-muted-foreground">{claim.type} · {claim.region} · Policy {policy}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={tone}>Fraud {fraudScore}</StatusPill>
          <StatusPill tone="info">{claim.status}</StatusPill>
          <StatusPill tone="cyan">Confidence {confidence}%</StatusPill>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-3">
        {[
          ["Quoted amount", `R ${(claim.amount || 0).toLocaleString()}`],
          ["Vehicle", vehicle],
          ["Opened", new Date(claim.createdAt || claim.created_at || Date.now()).toLocaleString("en-ZA")],
          ["Assigned agents", assignedAgents.join(" · ") || "—"],
        ].map(([k, v]) => (
          <div key={k} className="glass rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
            <div className="text-sm font-medium mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm border-b-2 -mb-px ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>

      <div className="space-y-4">
        {tab === "Overview" && <Overview claim={claim} />}
        {tab === "Evidence" && <Evidence evidence={claim.evidence || []} />}
        {tab === "Investigation" && <InvestigationTab debates={debates} />}
        {tab === "Fraud Analysis" && <FraudA />}
        {tab === "Policy Review" && <PolicyR />}
        {tab === "Timeline" && <TimelineTab timeline={timeline} />}
        {tab === "Audit Logs" && <AuditTab logs={auditLogs} />}
      </div>
    </div>
  );
}

function Overview({ claim }: { claim: any }) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Panel title="Description" className="lg:col-span-2">
        <p className="p-4 text-sm leading-relaxed">{claim.description || "No description provided."}</p>
      </Panel>
      <Panel title="AI summary">
        <div className="p-4 text-sm space-y-2">
          <p>Three independent agents flagged repair scope inconsistencies. Recommend human escalation before settlement.</p>
          <div className="text-xs text-muted-foreground font-mono">consensus 71% · 4/7 agents agree</div>
        </div>
      </Panel>
    </div>
  );
}
function Evidence({ evidence }: { evidence: any[] }) {
  if (evidence.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No evidence uploaded for this claim.</div>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {evidence.map((e: any) => {
        const kind = e.kind || "document";
        const Icon = kind === "image" ? ImageIcon : kind === "audio" ? FileAudio : FileText;
        return (
          <div key={e.id} className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="size-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="size-5" /></div>
            <div>
              <div className="text-sm font-medium">{e.fileName || e.file_name || e.name || "file"}</div>
              <div className="text-xs text-muted-foreground">{kind} · {e.analysisConfidence != null ? `analyzed · ${Math.round((e.analysisConfidence ?? e.analysis_confidence ?? 0) * 100)}% conf` : "pending analysis"}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
function InvestigationTab({ debates }: { debates: any[] }) {
  return (
    <Panel title="Agent debate log">
      <div className="p-4 space-y-2">
        {debates.length === 0 && <div className="text-sm text-muted-foreground">No agent debates recorded yet.</div>}
        {debates.map((m: any, i: number) => (
          <div key={m.id || i} className="rounded-md border border-border bg-background/40 p-3">
            <div className="text-[10px] font-mono uppercase" style={{ color: `var(--${m.color || "info"})` }}>{m.agent} · conf {Math.round((m.confidence || 0)*100)}%</div>
            <p className="text-sm mt-1">{m.text}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
function FraudA() {
  return (
    <Panel title="Fraud signals">
      <div className="p-4 space-y-3">
        {[
          { s: "Invoice 38% above regional average", sev: "danger" },
          { s: "Vendor V-2241 in active fraud cluster CL-118", sev: "danger" },
          { s: "Dashcam timestamp mismatch (47 min)", sev: "warning" },
          { s: "Customer prior claims: 0", sev: "success" },
        ].map((x) => (
          <div key={x.s} className="flex items-center gap-3 p-3 rounded-md border border-border bg-background/40">
            <ShieldAlert className="size-4" style={{ color: `var(--${x.sev})` }} />
            <span className="text-sm">{x.s}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
function PolicyR() {
  return (
    <Panel title="Policy reasoning chain">
      <div className="p-4 text-sm space-y-2 font-mono text-xs">
        {[
          "→ Locate policy POL-554120 in policy graph",
          "→ Check active status: ACTIVE (premium current)",
          "→ Apply coverage type: Comprehensive",
          "→ Evaluate exclusions §4.2(a-f): none triggered",
          "→ Apply excess: R 3,500",
          "→ Coverage decision: VALID",
        ].map((l) => <div key={l} className="text-success">{l}</div>)}
      </div>
    </Panel>
  );
}
function TimelineTab({ timeline }: { timeline: any[] }) {
  return (
    <Panel title="Activity timeline">
      <div className="p-4 space-y-2">
        {timeline.length === 0 && <div className="text-sm text-muted-foreground">No timeline events yet.</div>}
        {timeline.map((s: any, i: number) => (
          <div key={s.id || i} className="flex gap-3 text-sm border-b border-border py-2">
            <div className="text-xs font-mono text-muted-foreground w-14">{s.timestamp ? new Date(s.timestamp).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : s.t || ""}</div>
            <Bot className="size-4 text-primary mt-0.5" />
            <div>
              <div className="text-xs text-primary font-mono">{s.agent}</div>
              <div>{s.text || s.action}</div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
function AuditTab({ logs }: { logs: any[] }) {
  return (
    <Panel title="Immutable audit ledger">
      <div className="p-4 font-mono text-xs space-y-1">
        {logs.length === 0 && <div className="text-muted-foreground">No audit logs recorded yet.</div>}
        {logs.map((l: any, i: number) => (
          <div key={l.id || i} className="text-muted-foreground">
            {l.id?.slice(0, 8) || "—"}… · {l.timestamp ? new Date(l.timestamp).toLocaleTimeString("en-ZA") : l.created_at ? new Date(l.created_at).toLocaleTimeString("en-ZA") : "—"} · {l.action} · {l.entityType || l.entity_type || ""} · {JSON.stringify(l.details || {}).slice(0, 60)}
          </div>
        ))}
      </div>
    </Panel>
  );
}
