import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bot, Sparkles, ArrowRight, MessageSquare, GitBranch, Brain, ShieldAlert,
  CheckCircle2, AlertTriangle, FileText, Image as ImageIcon, FileAudio, Film, MapPin,
  Activity, Zap, ExternalLink, Network as NetworkIcon, X, Eye, ScanEye, Loader2,
} from "lucide-react";
import { Panel, StatusPill } from "@/components/app/Primitives";
import { useInvestigationData, type AgentEvent, type EvidenceFile } from "@/lib/use-api";

const AGENTS_DEF = [
  { key: "fnol", name: "FNOL Intake Agent", role: "First Notice of Loss", color: "info" as const },
  { key: "policy", name: "Policy Reasoning Agent", role: "Coverage analysis", color: "info" as const },
  { key: "damage", name: "Damage Assessment Agent", role: "Multimodal vision", color: "warning" as const },
  { key: "investigation", name: "Claims Investigation Agent", role: "Evidence correlation", color: "cyan" as const },
  { key: "fraud", name: "Fraud Intelligence Agent", role: "Anomaly detection", color: "danger" as const },
  { key: "compliance", name: "Compliance Agent", role: "Regulatory validation", color: "info" as const },
  { key: "settlement", name: "Settlement Agent", role: "Payout recommendation", color: "success" as const },
  { key: "reviewer", name: "Decision Reviewer Agent", role: "Final audit & sign-off", color: "cyan" as const },
];

export const Route = createFileRoute("/app/investigation/$id")({
  head: ({ params }) => ({ meta: [{ title: `Investigation ${params.id} — ClaimPilot AI` }] }),
  errorComponent: ({ error }) => <div className="p-10 text-sm">Failed: {error.message}</div>,
  notFoundComponent: () => (
    <div className="p-10 text-center space-y-3">
      <div className="text-2xl font-display">Claim not found</div>
      <p className="text-sm text-muted-foreground">It may have been removed. Start a new one.</p>
      <Link to="/app/new-claim" className="inline-block px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-sm">+ New claim</Link>
    </div>
  ),
  component: Investigation,
});

const STATUS_LABEL: Record<string, { label: string; tone: "info" | "warning" | "danger" | "success" | "cyan" }> = {
  queued:        { label: "Queued",        tone: "info" },
  delegating:    { label: "Delegating",    tone: "info" },
  investigating: { label: "Investigating", tone: "cyan" },
  debating:      { label: "Debating",      tone: "warning" },
  deciding:      { label: "Deciding",      tone: "cyan" },
  complete:      { label: "Complete",      tone: "success" },
  escalated:     { label: "Escalated",     tone: "danger" },
};

function Investigation() {
  const { id } = Route.useParams();
  const { data: claim, loading, error } = useInvestigationData(id);
  const [openAgent, setOpenAgent] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (!claim) return 0;
    const order = ["queued", "delegating", "investigating", "debating", "deciding", "complete"];
    const idx = order.indexOf(claim.status === "escalated" ? "complete" : claim.status);
    return Math.round(((idx + 1) / order.length) * 100);
  }, [claim?.status]);

  if (loading && !claim) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading investigation…
      </div>
    );
  }

  if (error && !claim) throw notFound();
  if (!claim) throw notFound();

  const status = STATUS_LABEL[claim.status];
  const debates = claim.events.filter((e) => e.kind === "debate");

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-4">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-danger pulse-dot" /> Live AI Investigation
          </div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">{claim.id} · {claim.customer}</h1>
          <p className="text-sm text-muted-foreground">{claim.type} · {claim.region} · Policy {claim.policy} · R {claim.amount.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          {typeof claim.fraudScore === "number" && (
            <StatusPill tone={claim.fraudScore > 70 ? "danger" : claim.fraudScore > 40 ? "warning" : "success"}>
              Fraud {claim.fraudScore}
            </StatusPill>
          )}
          <Link
            to="/app/claim/$id" params={{ id: claim.id }}
            className="px-3 py-1.5 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-medium shadow-glow inline-flex items-center gap-1.5"
          >
            <ExternalLink className="size-3.5" /> Open full claim
          </Link>
          <Link to="/app/new-claim" className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent">+ New claim</Link>
        </div>
      </header>

      {/* Progress bar */}
      <div className="glass rounded-xl p-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
          <span>Orchestration progress</span><span className="font-mono">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} className="h-full bg-gradient-primary" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: Evidence + Claim meta */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Panel title="Evidence" action={<StatusPill tone="info">{claim.evidence.length}</StatusPill>}>
            <div className="p-3 space-y-2 max-h-[420px] overflow-auto">
              {claim.evidence.length === 0 && (
                <div className="text-xs text-muted-foreground p-2">No evidence attached. Agents will lean on description only.</div>
              )}
              {claim.evidence.map((e) => {
                const Icon = e.kind === "image" ? ImageIcon : e.kind === "audio" ? FileAudio : e.kind === "video" ? Film : e.kind === "geo" ? MapPin : FileText;
                return (
                  <div key={e.id} className="rounded-md border border-border bg-background/40 overflow-hidden">
                    <div className="flex gap-2 p-2">
                      <div className="size-9 rounded-md grid place-items-center overflow-hidden bg-background/60 border border-border shrink-0">
                        {e.preview ? <img src={e.preview} alt="" className="size-full object-cover" /> : <Icon className="size-4 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{e.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{(e.size / 1024).toFixed(1)} KB · {e.kind}</div>
                      </div>
                      {typeof e.analysisConfidence === "number" && (
                        <StatusPill tone="cyan">{Math.round(e.analysisConfidence * 100)}%</StatusPill>
                      )}
                    </div>
                    {e.findings && e.findings.length > 0 && (
                      <div className="border-t border-border bg-background/30 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-primary font-mono">
                          <ScanEye className="size-3" /> Multimodal AI findings
                        </div>
                        <ul className="space-y-1">
                          {e.findings.map((f, i) => (
                            <li key={i} className="flex gap-1.5 text-[11px] leading-snug">
                              <span className="text-primary mt-0.5">·</span>
                              <span className="text-foreground/85">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Claim metadata">
            <dl className="p-4 text-xs space-y-2">
              {[
                ["Customer", claim.customer],
                ["Policy", claim.policy],
                ["Type", claim.type],
                ["Region", claim.region],
                ["Amount", `R ${claim.amount.toLocaleString()}`],
                ...(claim.vehicle ? [["Vehicle", claim.vehicle]] : []),
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="px-4 pb-4 text-xs text-muted-foreground border-t border-border pt-3">
              <div className="text-[10px] uppercase tracking-widest mb-1">Description</div>
              <p className="leading-relaxed">{claim.description}</p>
            </div>
          </Panel>
        </div>

        {/* CENTER: Agent stream */}
        <div className="col-span-12 lg:col-span-6">
          <Panel
            title={<span className="flex items-center gap-2"><Activity className="size-3.5 text-primary" /> Agent stream</span>}
            action={<StatusPill tone={status.tone}>{claim.activeAgents.length} agent{claim.activeAgents.length === 1 ? "" : "s"} active</StatusPill>}
          >
            <AgentStream events={claim.events} status={claim.status} />
          </Panel>

          {claim.recommendation && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <Panel title={<span className="flex items-center gap-2"><Sparkles className="size-3.5 text-primary" /> Final recommendation</span>}>
                <div className="p-4">
                  <div className={`rounded-lg border p-4 ${
                    claim.recommendation.tone === "success" ? "border-success/30 bg-success/10" :
                    claim.recommendation.tone === "warning" ? "border-warning/30 bg-warning/10" :
                    "border-danger/30 bg-danger/10"
                  }`}>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider"
                         style={{ color: claim.recommendation.tone === "success" ? "var(--success)" : claim.recommendation.tone === "warning" ? "var(--warning)" : "var(--danger)" }}>
                      {claim.recommendation.tone === "success" ? <CheckCircle2 className="size-3.5" /> : claim.recommendation.tone === "warning" ? <AlertTriangle className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                      {claim.recommendation.action}
                    </div>
                    <div className="mt-2 text-2xl font-display font-semibold">R {claim.recommendation.amount?.toLocaleString()}</div>
                    <p className="text-sm text-foreground/80 mt-1">{claim.recommendation.reason}</p>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <button className="text-xs px-3 py-1.5 rounded-md bg-gradient-primary text-primary-foreground font-medium">Approve</button>
                      <button className="text-xs px-3 py-1.5 rounded-md border border-border">Override</button>
                      <Link
                        to="/app/claim/$id" params={{ id: claim.id }}
                        className="ml-auto text-xs px-3 py-1.5 rounded-md border border-border inline-flex items-center gap-1.5 hover:bg-accent"
                      >
                        <ExternalLink className="size-3" /> Open full claim
                      </Link>
                    </div>
                  </div>
                </div>
              </Panel>
            </motion.div>
          )}
        </div>

        {/* RIGHT: Delegation + active agents */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Panel title={<span className="flex items-center gap-2"><GitBranch className="size-3.5 text-primary" /> Delegation</span>}>
            <DelegationList events={claim.events} />
          </Panel>
          <Panel title={<span className="flex items-center gap-2"><Brain className="size-3.5 text-primary" /> Active agents</span>}>
            <ActiveAgents activeAgents={claim.activeAgents} events={claim.events} />
          </Panel>
        </div>
      </div>

      {/* WORKFLOW GRAPH (live) */}
      <Panel
        title={<span className="flex items-center gap-2"><NetworkIcon className="size-3.5 text-primary" /> Workflow graph · live</span>}
        action={
          <span className="text-xs text-muted-foreground font-mono">
            {["complete", "escalated"].includes(claim.status)
              ? "complete · click any agent to inspect"
              : `routing · ${claim.activeAgents.length}/8 agents engaged · click active agents to inspect`}
          </span>
        }
      >
      <WorkflowGraph
          activeAgents={claim.activeAgents}
          events={claim.events}
          onSelect={(agentName) => setOpenAgent(agentName)}
        />
      </Panel>

      {/* AGENT DEBATES (bottom) */}
      <Panel
        title={<span className="flex items-center gap-2"><MessageSquare className="size-3.5 text-primary" /> Agent debates · live transcript</span>}
        action={<StatusPill tone={debates.length ? "cyan" : "muted"}>{debates.length || "awaiting"}</StatusPill>}
      >
        <DebatePanel debates={debates} status={claim.status} />
      </Panel>

      <AgentDetailModal
        agentName={openAgent}
        events={claim.events}
        evidence={claim.evidence}
        onClose={() => setOpenAgent(null)}
      />
    </div>
  );
}

function AgentStream({ events, status }: { events: AgentEvent[]; status: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events.length]);

  const KIND_ICON: Record<AgentEvent["kind"], any> = {
    delegate: ArrowRight, reason: Brain, evidence: FileText, debate: MessageSquare, decision: CheckCircle2, escalate: ShieldAlert,
  };

  return (
    <div ref={ref} className="p-4 space-y-2.5 max-h-[560px] overflow-auto">
      {events.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="size-3.5 text-primary animate-pulse" /> Awaiting orchestrator…
        </div>
      )}
      <AnimatePresence initial={false}>
        {events.map((ev) => {
          const Icon = KIND_ICON[ev.kind];
          return (
            <motion.div
              key={ev.id}
              layout
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider">
                <span className="size-1.5 rounded-full pulse-dot" style={{ background: `var(--${ev.color})` }} />
                <span style={{ color: `var(--${ev.color})` }}>{ev.agent}</span>
                {ev.targetAgent && (
                  <>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{ev.targetAgent}</span>
                  </>
                )}
                <span className="ml-auto text-muted-foreground">
                  {ev.kind} · {Math.round(ev.t / 1000)}s
                  {typeof ev.confidence === "number" && <> · conf {Math.round(ev.confidence * 100)}%</>}
                </span>
              </div>
              <div className="mt-1.5 flex gap-2 items-start">
                <Icon className="size-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <p className="text-sm leading-relaxed">{ev.text}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {!["complete", "escalated"].includes(status) && events.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono pt-2">
          <span className="inline-flex gap-0.5">
            <span className="size-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="size-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
            <span className="size-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
          </span>
          agents reasoning…
        </div>
      )}
    </div>
  );
}

function DelegationList({ events }: { events: AgentEvent[] }) {
  const delegations = events.filter((e) => e.kind === "delegate" && e.targetAgent);
  return (
    <ul className="p-3 space-y-2">
      {delegations.length === 0 && <li className="text-xs text-muted-foreground p-1">No delegations yet.</li>}
      {delegations.map((d) => (
        <motion.li key={d.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[10px]" style={{ color: `var(--${d.color})` }}>{d.agent}</span>
          <ArrowRight className="size-3 text-muted-foreground" />
          <span className="font-medium">{d.targetAgent}</span>
        </motion.li>
      ))}
    </ul>
  );
}

function ActiveAgents({ activeAgents, events }: { activeAgents: string[]; events: AgentEvent[] }) {
  const agentColor = (n: string): AgentEvent["color"] => {
    const last = [...events].reverse().find((e) => e.agent === n);
    return last?.color ?? "info";
  };
  if (activeAgents.length === 0) return <div className="p-3 text-xs text-muted-foreground">No agents engaged yet.</div>;
  return (
    <ul className="p-3 space-y-2">
      {activeAgents.map((a) => {
        const last = [...events].reverse().find((e) => e.agent === a);
        const color = agentColor(a);
        return (
          <motion.li key={a} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-md border border-border p-2 bg-background/40 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px scan-line bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-md grid place-items-center" style={{ background: `color-mix(in oklab, var(--${color}) 15%, transparent)`, color: `var(--${color})` }}>
                <Bot className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{a}</div>
                <div className="text-[10px] text-muted-foreground truncate">{last?.kind ?? "idle"}</div>
              </div>
              <StatusPill tone={color}>active</StatusPill>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}

// ----- Workflow Graph (live, scoped to this investigation) -----
const NODES = [
  { key: "fnol",          name: "FNOL Agent",          x: 7,  y: 50 },
  { key: "policy",        name: "Policy Agent",        x: 24, y: 22 },
  { key: "damage",        name: "Damage Agent",        x: 24, y: 78 },
  { key: "investigation", name: "Investigation Agent", x: 44, y: 50 },
  { key: "fraud",         name: "Fraud Agent",         x: 64, y: 22 },
  { key: "compliance",    name: "Compliance Agent",    x: 64, y: 78 },
  { key: "settlement",    name: "Settlement Agent",    x: 81, y: 50 },
  { key: "reviewer",      name: "Decision Reviewer Agent", x: 95, y: 50 },
];
const EDGES: [string, string][] = [
  ["fnol", "policy"], ["fnol", "damage"],
  ["policy", "investigation"], ["damage", "investigation"],
  ["investigation", "fraud"], ["investigation", "compliance"],
  ["fraud", "settlement"], ["compliance", "settlement"],
  ["settlement", "reviewer"],
];

function WorkflowGraph({
  activeAgents, events, onSelect,
}: {
  activeAgents: string[]; events: AgentEvent[];
  onSelect?: (agentName: string) => void;
}) {
  const nodeMap = Object.fromEntries(NODES.map((n) => [n.key, n]));
  const agentMap = Object.fromEntries(AGENTS_DEF.map((a) => [a.key, a]));
  const activeSet = new Set(activeAgents.map((n) => n.toLowerCase()));
  const isActive = (key: string) => {
    const a = agentMap[key];
    if (!a) return false;
    return activeSet.has(a.name.toLowerCase()) || activeSet.has(`${key} agent`);
  };

  // Track which agents have events so we can make them clickable
  const agentsWithEvents = new Set(events.map((e) => e.agent));

  const lastDelegate = [...events].reverse().find((e) => e.kind === "delegate" && e.targetAgent);
  const keyOf = (label?: string | null) => label?.toLowerCase().replace(/ agent$/, "").replace("decision reviewer", "reviewer");
  const fromKey = keyOf(lastDelegate?.agent);
  const toKey = keyOf(lastDelegate?.targetAgent);

  return (
    <div className="p-4 overflow-x-auto">
      <div className="h-[440px] relative grid-bg min-w-[920px]">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        {EDGES.map(([a, b], i) => {
          const A = nodeMap[a], B = nodeMap[b];
          const both = isActive(a) && isActive(b);
          const pulsing = (a === fromKey && b === toKey) || (a === toKey && b === fromKey);
          return (
            <g key={i}>
              <line x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke={both ? "color-mix(in oklab, var(--primary) 70%, transparent)" : "var(--border)"}
                strokeWidth={both ? 0.35 : 0.2} />
              {pulsing && (
                <motion.circle r="0.9" fill="var(--primary)"
                  initial={{ cx: A.x, cy: A.y }}
                  animate={{ cx: B.x, cy: B.y }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} />
              )}
            </g>
          );
        })}
      </svg>
      {NODES.map((n) => {
        const a = agentMap[n.key];
        const active = isActive(n.key);
        const hasEvents = agentsWithEvents.has(a.name);
        const clickable = hasEvents;
        const Tag: any = clickable ? "button" : "div";
        return (
          <div key={n.key} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
            <motion.div
              animate={active ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 1.6, repeat: active ? Infinity : 0 }}
            >
              <Tag
                onClick={clickable ? () => onSelect?.(a.name) : undefined}
                className={`glass rounded-xl p-2.5 w-40 text-center block ${active ? "shadow-glow ring-1" : ""} ${clickable ? "cursor-pointer hover:ring-1 hover:ring-primary/60 hover:-translate-y-0.5 transition-transform" : ""}`}
                style={active ? { borderColor: `var(--${a.color})` } : undefined}
              >
                <div className="size-8 mx-auto rounded-full grid place-items-center"
                  style={{ background: `color-mix(in oklab, var(--${a.color}) 15%, transparent)`, color: `var(--${a.color})` }}>
                  <Bot className="size-3.5" />
                </div>
                <div className="mt-1 text-[11px] font-semibold leading-tight">{a.name.replace(" Agent", "")}</div>
                <div className="text-[9px] text-muted-foreground leading-tight">{a.role}</div>
                <div className="mt-1.5 flex items-center justify-center gap-1 text-[9px]">
                  <span className="size-1.5 rounded-full pulse-dot" style={{ background: active ? `var(--${a.color})` : hasEvents ? "var(--primary)" : "var(--muted-foreground)" }} />
                  <span style={{ color: active ? `var(--${a.color})` : hasEvents ? "var(--primary)" : "var(--muted-foreground)" }}>
                    {hasEvents ? "inspect" : active ? "engaged" : "standby"}
                  </span>
                  {hasEvents && <Eye className="size-2.5 text-primary ml-0.5" />}
                </div>
              </Tag>
            </motion.div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

// ----- Conversational debate transcript -----
function DebatePanel({ debates, status }: { debates: AgentEvent[]; status: string }) {
  // Assign each unique agent to a side (left / right) to look like a chat thread.
  const sides = useMemo(() => {
    const map: Record<string, "left" | "right"> = {};
    let toggle: "left" | "right" = "left";
    for (const d of debates) {
      if (!map[d.agent]) {
        map[d.agent] = toggle;
        toggle = toggle === "left" ? "right" : "left";
      }
    }
    return map;
  }, [debates]);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [debates.length]);

  if (debates.length === 0) {
    return (
      <div className="p-6 text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="size-3.5 text-primary" />
        {status === "debating" ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            Agents are deliberating — live transcript loading…
          </span>
        ) : ["complete", "escalated"].includes(status) ? (
          "No agent disagreements recorded."
        ) : (
          "Debates open once specialists return findings…"
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="p-5 space-y-3 max-w-4xl mx-auto max-h-[500px] overflow-auto">
      <AnimatePresence initial={false}>
        {debates.map((d) => {
          const side = sides[d.agent] ?? "left";
          const isLeft = side === "left";
          return (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 6, x: isLeft ? -8 : 8 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2.5 items-start ${isLeft ? "" : "flex-row-reverse"}`}
            >
              <div className="size-8 rounded-full grid place-items-center shrink-0 border"
                style={{
                  background: `color-mix(in oklab, var(--${d.color}) 18%, transparent)`,
                  borderColor: `color-mix(in oklab, var(--${d.color}) 45%, transparent)`,
                  color: `var(--${d.color})`,
                }}>
                <Bot className="size-3.5" />
              </div>
              <div className={`max-w-[78%] ${isLeft ? "" : "items-end text-right"} flex flex-col`}>
                <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider mb-1 ${isLeft ? "" : "flex-row-reverse"}`}>
                  <span style={{ color: `var(--${d.color})` }}>{d.agent}</span>
                  {d.targetAgent && (
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <ArrowRight className="size-3" /> @{d.targetAgent}
                    </span>
                  )}
                  <span className="text-muted-foreground">· {Math.round(d.t / 1000)}s</span>
                </div>
                <div
                  className={`relative rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed border ${isLeft ? "rounded-tl-sm" : "rounded-tr-sm"}`}
                  style={{
                    background: `color-mix(in oklab, var(--${d.color}) 10%, var(--background))`,
                    borderColor: `color-mix(in oklab, var(--${d.color}) 30%, transparent)`,
                  }}
                >
                  {d.text}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
      {status === "debating" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 pt-2 justify-center"
        >
          <span className="inline-flex gap-0.5">
            <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
            <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">agents debating…</span>
        </motion.div>
      )}
    </div>
  );
}

// ----- Agent detail modal (post-investigation inspection) -----
function AgentDetailModal({
  agentName, events, evidence, onClose,
}: {
  agentName: string | null; events: AgentEvent[]; evidence: EvidenceFile[]; onClose: () => void;
}) {
  const open = !!agentName;
  const [activeTab, setActiveTab] = useState<"actions" | "logs" | "decisions" | "responses">("actions");
  const agentEvents = useMemo(
    () => (agentName ? events.filter((e) => e.agent === agentName || e.targetAgent === agentName) : []),
    [agentName, events],
  );
  const meta = useMemo(() => AGENTS_DEF.find((a) => a.name === agentName), [agentName]);
  const ownEvents = agentEvents.filter((e) => e.agent === agentName);
  const inbound = agentEvents.filter((e) => e.targetAgent === agentName && e.agent !== agentName);
  const lastConfidence = [...ownEvents].reverse().find((e) => typeof e.confidence === "number")?.confidence;

  // Categorize events
  const actions = ownEvents.filter((e) => e.kind === "delegate" || e.kind === "escalate");
  const logs = ownEvents.filter((e) => e.kind === "reason" || e.kind === "evidence");
  const decisions = ownEvents.filter((e) => e.kind === "decision");
  const responses = ownEvents.filter((e) => e.kind === "debate");
  const linkedEvidence = agentName?.startsWith("Damage") ? evidence.filter((e) => e.findings?.length) : [];

  const TABS = [
    { key: "actions" as const, label: "Actions", count: actions.length + inbound.length },
    { key: "logs" as const, label: "Logs", count: logs.length },
    { key: "decisions" as const, label: "Decisions", count: decisions.length },
    { key: "responses" as const, label: "Responses", count: responses.length },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.22 }}
            className="relative glass rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-border shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-5 border-b border-border overflow-hidden">
              <div
                className="absolute -top-16 -right-16 size-56 rounded-full blur-3xl opacity-30"
                style={{ background: `var(--${meta?.color ?? "primary"})` }}
              />
              <div className="relative flex items-start gap-3">
                <div
                  className="size-12 rounded-xl grid place-items-center border"
                  style={{
                    background: `color-mix(in oklab, var(--${meta?.color ?? "primary"}) 18%, transparent)`,
                    borderColor: `color-mix(in oklab, var(--${meta?.color ?? "primary"}) 45%, transparent)`,
                    color: `var(--${meta?.color ?? "primary"})`,
                  }}
                >
                  <Bot className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-primary">Agent dossier</div>
                  <h2 className="text-lg font-display font-semibold tracking-tight">{agentName}</h2>
                  <p className="text-xs text-muted-foreground">{meta?.role ?? "Specialist agent"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {typeof lastConfidence === "number" && (
                    <StatusPill tone={(meta?.color as any) ?? "info"}>
                      Confidence {Math.round(lastConfidence * 100)}%
                    </StatusPill>
                  )}
                  <button
                    onClick={onClose}
                    className="size-8 grid place-items-center rounded-lg border border-border hover:bg-accent"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="relative grid grid-cols-4 gap-2 mt-4 text-[10px] uppercase tracking-widest font-mono">
                <Stat label="Actions" value={actions.length + inbound.length} />
                <Stat label="Reasoning" value={logs.length} />
                <Stat label="Decisions" value={decisions.length} />
                <Stat label="Debates" value={responses.length} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border bg-background/40">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors relative ${
                    activeTab === tab.key
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-1.5 text-[9px] rounded-full px-1.5 py-0.5 bg-primary/10 text-primary font-semibold">
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="agent-tab-indicator"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="overflow-auto p-5 space-y-5">
              {/* ACTIONS TAB */}
              {activeTab === "actions" && (
                <>
                  {actions.length > 0 && (
                    <Section title="Outbound actions">
                      <div className="space-y-2">
                        {actions.map((ev) => (
                          <EventCard key={ev.id} event={ev} color={meta?.color ?? "info"} />
                        ))}
                      </div>
                    </Section>
                  )}
                  {inbound.length > 0 && (
                    <Section title="Tasks received">
                      <div className="space-y-2">
                        {inbound.map((ev) => (
                          <EventCard key={ev.id} event={ev} color={meta?.color ?? "info"} />
                        ))}
                      </div>
                    </Section>
                  )}
                  {actions.length === 0 && inbound.length === 0 && (
                    <p className="text-xs text-muted-foreground">No actions recorded for this agent.</p>
                  )}
                </>
              )}

              {/* LOGS TAB */}
              {activeTab === "logs" && (
                <>
                  {logs.length > 0 ? (
                    <Section title="Reasoning & evidence trace">
                      <ol className="space-y-2.5">
                        {logs.map((f, i) => (
                          <li key={f.id} className="flex gap-3">
                            <div className="text-[10px] font-mono text-muted-foreground pt-1 w-6 shrink-0">{String(i + 1).padStart(2, "0")}</div>
                            <div className="flex-1 rounded-md border border-border bg-background/40 p-2.5">
                              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                <span style={{ color: `var(--${f.color})` }}>{f.kind}</span>
                                <span>· {Math.round(f.t / 1000)}s</span>
                                {typeof f.confidence === "number" && <span>· conf {Math.round(f.confidence * 100)}%</span>}
                              </div>
                              <p className="text-sm leading-relaxed mt-1">{f.text}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </Section>
                  ) : (
                    <p className="text-xs text-muted-foreground">No reasoning logs recorded yet.</p>
                  )}

                  {linkedEvidence.length > 0 && (
                    <Section title="Linked multimodal findings">
                      <div className="space-y-2">
                        {linkedEvidence.map((e) => (
                          <div key={e.id} className="rounded-md border border-border bg-background/40 p-3">
                            <div className="flex items-center gap-2 text-xs font-medium">
                              <ScanEye className="size-3.5 text-primary" /> {e.name}
                              {typeof e.analysisConfidence === "number" && (
                                <StatusPill tone="cyan">{Math.round(e.analysisConfidence * 100)}%</StatusPill>
                              )}
                            </div>
                            <ul className="mt-2 space-y-1">
                              {e.findings!.map((f, i) => (
                                <li key={i} className="text-xs leading-snug flex gap-1.5">
                                  <span className="text-primary">·</span><span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}

              {/* DECISIONS TAB */}
              {activeTab === "decisions" && (
                <>
                  {decisions.length > 0 ? (
                    decisions.map((d) => (
                      <Section key={d.id} title="Final ruling" tone="success">
                        <div className={`rounded-lg border p-4 ${
                          d.color === "success" ? "border-success/30 bg-success/10" :
                          d.color === "warning" ? "border-warning/30 bg-warning/10" :
                          d.color === "danger" ? "border-danger/30 bg-danger/10" :
                          "border-border bg-background/40"
                        }`}>
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                            <CheckCircle2 className="size-3.5" style={{ color: `var(--${d.color})` }} />
                            <span>Decision · {Math.round(d.t / 1000)}s</span>
                            {typeof d.confidence === "number" && <span>· confidence {Math.round(d.confidence * 100)}%</span>}
                          </div>
                          <p className="text-sm leading-relaxed">{d.text}</p>
                        </div>
                      </Section>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No decisions recorded yet. This agent may still be processing.</p>
                  )}
                </>
              )}

              {/* RESPONSES TAB */}
              {activeTab === "responses" && (
                <>
                  {responses.length > 0 ? (
                    <Section title="Debate contributions">
                      <div className="space-y-3">
                        {responses.map((d) => (
                          <div key={d.id} className="rounded-lg border border-border bg-background/40 p-3">
                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                              <MessageSquare className="size-3" style={{ color: `var(--${d.color})` }} />
                              <span>→ @{d.targetAgent ?? "all"}</span>
                              <span>· {Math.round(d.t / 1000)}s</span>
                            </div>
                            <p className="text-sm leading-relaxed">{d.text}</p>
                          </div>
                        ))}
                      </div>
                    </Section>
                  ) : (
                    <p className="text-xs text-muted-foreground">No debate responses from this agent.</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EventCard({ event, color }: { event: AgentEvent; color: string }) {
  const KIND_ICON: Record<string, any> = {
    delegate: ArrowRight, reason: Brain, evidence: FileText,
    debate: MessageSquare, decision: CheckCircle2, escalate: ShieldAlert,
  };
  const Icon = KIND_ICON[event.kind] || Zap;
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" style={{ color: `var(--${event.color})` }} />
        <span style={{ color: `var(--${event.color})` }}>{event.agent}</span>
        {event.targetAgent && (
          <>
            <ArrowRight className="size-3 text-muted-foreground" />
            <span>{event.targetAgent}</span>
          </>
        )}
        <span className="ml-auto">{event.kind} · {Math.round(event.t / 1000)}s</span>
        {typeof event.confidence === "number" && <span>· conf {Math.round(event.confidence * 100)}%</span>}
      </div>
      <p className="text-sm leading-relaxed mt-1.5">{event.text}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-base font-display font-semibold text-foreground normal-case tracking-normal mt-0.5">{value}</div>
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone?: "success"; children: ReactNode }) {
  return (
    <section>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2 flex items-center gap-2">
        {tone === "success" && <CheckCircle2 className="size-3 text-success" />}
        {title}
      </div>
      {children}
    </section>
  );
}
