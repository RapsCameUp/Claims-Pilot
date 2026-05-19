import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FileText, ShieldAlert, Clock, Bot, Banknote, AlertTriangle,
  Activity, ArrowRight, ChevronRight, Bot as BotIcon, PlusCircle, Loader2,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar as RBar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Kpi, Panel, StatusPill } from "@/components/app/Primitives";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/dashboard")({
  head: () => ({ meta: [{ title: "Operations — ClaimPilot AI" }] }),
  component: Dashboard,
});

const AGENTS_DEF = [
  { key: "fnol", name: "FNOL Intake Agent", role: "First Notice of Loss", status: "Active" as const, workload: 64, confidence: 96, processed: 1284, task: "Verifying policies", color: "info" as const },
  { key: "investigation", name: "Claims Investigation Agent", role: "Evidence correlation", status: "Reasoning" as const, workload: 78, confidence: 91, processed: 942, task: "Cross-referencing invoices", color: "cyan" as const },
  { key: "fraud", name: "Fraud Intelligence Agent", role: "Anomaly detection", status: "Escalating" as const, workload: 88, confidence: 87, processed: 612, task: "Cluster analysis", color: "danger" as const },
  { key: "policy", name: "Policy Reasoning Agent", role: "Coverage analysis", status: "Active" as const, workload: 52, confidence: 94, processed: 1102, task: "Exclusion checking", color: "info" as const },
  { key: "damage", name: "Damage Assessment Agent", role: "Multimodal vision", status: "Reasoning" as const, workload: 71, confidence: 89, processed: 880, task: "Cost estimation", color: "warning" as const },
  { key: "settlement", name: "Settlement Agent", role: "Payout recommendation", status: "Active" as const, workload: 45, confidence: 92, processed: 734, task: "Drafting settlements", color: "success" as const },
  { key: "compliance", name: "Compliance Agent", role: "Regulatory validation", status: "Idle" as const, workload: 22, confidence: 99, processed: 1530, task: "Awaiting audit", color: "info" as const },
  { key: "reviewer", name: "Decision Reviewer Agent", role: "Final audit & sign-off", status: "Active" as const, workload: 38, confidence: 97, processed: 691, task: "Reviewing consensus", color: "cyan" as const },
];

const PIPELINE_STAGES = [
  { stage: "FNOL" }, { stage: "Investigation" }, { stage: "Fraud Review" }, { stage: "Policy Validation" },
  { stage: "Settlement Review" }, { stage: "Escalated" }, { stage: "Closed" },
];

function Dashboard() {
  const [kpi, setKpi] = useState<any>(null);
  const [settlementTrend, setSettlementTrend] = useState<any[]>([]);
  const [fraudTrend, setFraudTrend] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.analytics.dashboard().catch(() => null),
      api.analytics.settlementTrend().catch(() => []),
      api.analytics.fraudTrend().catch(() => []),
      api.claims.list({ limit: 32 }).catch(() => ({ claims: [] })),
      api.investigations.recentActivity(10).catch(() => []),
    ]).then(([dash, settle, fraud, claimsRes, activity]) => {
      if (cancelled) return;
      setKpi(dash);
      setSettlementTrend(Array.isArray(settle) ? settle : []);
      setFraudTrend(Array.isArray(fraud) ? fraud : []);
      setClaims((claimsRes as any).claims || []);
      setRecentActivity(Array.isArray(activity) ? activity : []);
      setInsights(dash?.insights || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);
  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading dashboard…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary">Command Center</div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Claims Operations</h1>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })} · {new Date().toLocaleTimeString("en-ZA")} · Johannesburg</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/new-claim" className="px-4 py-2 rounded-lg border border-primary/40 text-primary text-sm font-medium inline-flex items-center gap-2 hover:bg-primary/10">
            <PlusCircle className="size-4" /> New claim
          </Link>
          <Link to="/app/investigation" className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow inline-flex items-center gap-2">
            Live investigation <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Investigated Today" value={kpi?.investigatedToday?.toLocaleString?.() ?? "0"} delta={12} icon={FileText} accent="info" />
        <Kpi label="Fraud Alerts" value={kpi?.fraudAlerts ?? "0"} delta={8} icon={ShieldAlert} accent="danger" />
        <Kpi label="Avg Settlement" value={kpi?.avgSettlementHrs ?? "0"} suffix="hrs" delta={-31} icon={Clock} accent="success" />
        <Kpi label="AI Automation" value={`${kpi?.automationRate ?? 0}%`} delta={4} icon={Bot} accent="cyan" />
        <Kpi label="Estimated Savings" value={`R ${((kpi?.estimatedSavings || 0)/1_000_000).toFixed(1)}M`} delta={22} icon={Banknote} accent="success" />
        <Kpi label="Human Escalations" value={kpi?.escalations ?? "0"} delta={-6} icon={AlertTriangle} accent="warning" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Settlement throughput · 14 days" className="lg:col-span-2">
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={settlementTrend}>
                <defs>
                  <linearGradient id="ai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="man" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="ai" name="AI-resolved" stroke="var(--primary)" fill="url(#ai)" strokeWidth={2} />
                <Area type="monotone" dataKey="manual" name="Manual" stroke="var(--muted-foreground)" fill="url(#man)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Live agent activity" action={<StatusPill tone="success">streaming</StatusPill>}>
          <ActivityFeed recentActivity={recentActivity} />
        </Panel>
      </div>

      <Panel title="AI Agent Status" action={<span className="text-xs text-muted-foreground">8 agents · auto-orchestrated</span>}>
        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {AGENTS_DEF.map((a) => <AgentCard key={a.key} a={a} />)}
        </div>
      </Panel>

      <Panel title="Claims pipeline" action={<Link to="/app/investigation" className="text-xs text-primary hover:underline">View workspace →</Link>}>
        <Pipeline claims={claims} />
      </Panel>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Fraud detection trend" className="lg:col-span-2">
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fraudTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <RBar dataKey="detected" fill="var(--danger)" radius={[4,4,0,0]} />
                <RBar dataKey="prevented" fill="var(--success)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="AI operational insights">
          <div className="p-4 space-y-3">
            {(insights.length > 0 ? insights : ["No insights available yet. Process claims to generate operational intelligence."]).slice(0, 4).map((t: string, i: number) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="size-7 rounded-md bg-primary/10 text-primary border border-primary/20 grid place-items-center shrink-0"><BotIcon className="size-3.5" /></div>
                <p className="text-muted-foreground leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ActivityFeed({ recentActivity }: { recentActivity: any[] }) {
  const [items, setItems] = useState(() =>
    recentActivity.slice(0, 6).map((t: any, i: number) => ({
      agent: t.agent || "Agent",
      text: t.text || t.action || "",
      level: t.color || t.level || "info",
      id: t.id || Date.now() + i,
      time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString("en-ZA") : tAgo(i * 12),
    }))
  );

  useEffect(() => {
    // Poll for new activity every 5s
    const id = setInterval(async () => {
      try {
        const fresh = await api.investigations.recentActivity(8);
        if (Array.isArray(fresh) && fresh.length > 0) {
          setItems(fresh.map((t: any, i: number) => ({
            agent: t.agent || "Agent",
            text: t.text || t.action || "",
            level: t.color || t.level || "info",
            id: t.id || Date.now() + i,
            time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString("en-ZA") : "just now",
          })).slice(0, 8));
        }
      } catch { /* ignore polling errors */ }
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-4 max-h-[340px] overflow-hidden">
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.li
              key={it.id}
              layout
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex gap-3"
            >
              <span className="mt-1 size-1.5 rounded-full pulse-dot shrink-0" style={{ background: `var(--${it.level})` }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs">
                  <span className="font-mono uppercase tracking-wider text-[10px]" style={{ color: `var(--${it.level})` }}>{it.agent}</span>
                  <span className="text-muted-foreground"> · {it.time}</span>
                </div>
                <div className="text-sm text-foreground/90 truncate">{it.text}</div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function tAgo(s: number) { return s < 60 ? `${s}s ago` : `${Math.floor(s/60)}m ago`; }

function AgentCard({ a }: { a: typeof AGENTS_DEF[number] }) {
  const tone = a.color;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-lg border border-border p-3 bg-background/50 relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px scan-line bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="flex items-start justify-between">
        <div className="size-8 rounded-md grid place-items-center" style={{ background: `color-mix(in oklab, var(--${tone}) 15%, transparent)`, color: `var(--${tone})` }}>
          <Bot className="size-4" />
        </div>
        <StatusPill tone={tone}>{a.status}</StatusPill>
      </div>
      <div className="mt-2 text-xs font-semibold leading-tight">{a.name}</div>
      <div className="text-[10px] text-muted-foreground">{a.role}</div>
      <div className="mt-3 space-y-1.5">
        <Bar label="Workload" pct={a.workload} tone={tone} />
        <Bar label="Confidence" pct={a.confidence} tone="success" />
      </div>
      <div className="mt-3 text-[10px] text-muted-foreground font-mono truncate">› {a.task}</div>
      <div className="mt-1 text-[10px] text-muted-foreground">{a.processed.toLocaleString()} processed</div>
    </motion.div>
  );
}

function Bar({ label, pct, tone }: { label: string; pct: number; tone: string }) {
  return (
    <div>
      <div className="flex justify-between text-[10px] text-muted-foreground"><span>{label}</span><span>{pct}%</span></div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full" style={{ background: `var(--${tone})` }} />
      </div>
    </div>
  );
}

function Pipeline({ claims }: { claims: any[] }) {
  return (
    <div className="p-4 grid grid-cols-7 gap-3">
      {PIPELINE_STAGES.map((stage) => {
        const stageClaims = claims.filter((c: any) => c.status === stage.stage).slice(0, 3);
        return (
          <div key={stage.stage} className="rounded-lg border border-border bg-background/40 p-2 min-h-[200px]">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="text-[10px] uppercase tracking-widest font-medium">{stage.stage}</div>
              <span className="text-[10px] text-muted-foreground font-mono">{claims.filter((c: any)=>c.status===stage.stage).length}</span>
            </div>
            <div className="space-y-2">
              {stageClaims.map((c: any) => (
                <Link key={c.id} to="/app/investigation/$id" params={{ id: c.id }} className="block rounded-md border border-border bg-card p-2 hover:ring-glow transition-all">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-mono text-primary">{c.id}</div>
                    <div className={`text-[10px] font-mono ${(c.fraudScore ?? c.fraud_score ?? 0) > 70 ? "text-danger" : (c.fraudScore ?? c.fraud_score ?? 0) > 40 ? "text-warning" : "text-success"}`}>{c.fraudScore ?? c.fraud_score ?? 0}</div>
                  </div>
                  <div className="text-xs mt-1 truncate">{c.customerName || c.customer_name || c.customer}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{c.type} · {c.region}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">R {(c.amount || 0).toLocaleString()}</div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
