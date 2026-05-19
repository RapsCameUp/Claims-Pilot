import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, Users, GitBranch, FileWarning, Building2, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { Kpi, Panel, StatusPill } from "@/components/app/Primitives";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/fraud")({
  head: () => ({ meta: [{ title: "Fraud Intelligence — ClaimPilot AI" }] }),
  component: Fraud,
});

function Fraud() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [fraudTrend, setFraudTrend] = useState<any[]>([]);
  const [regionHeatmap, setRegionHeatmap] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.fraud.graph().catch(() => ({ nodes: [], edges: [] })),
      api.analytics.fraudTrend().catch(() => []),
      api.analytics.regionHeatmap().catch(() => []),
      api.fraud.alerts({ resolved: false, limit: 8 }).catch(() => []),
    ]).then(([graph, ft, rh, al]) => {
      if (cancelled) return;
      setNodes((graph as any).nodes || []);
      setEdges((graph as any).edges || []);
      setFraudTrend(Array.isArray(ft) ? ft : []);
      setRegionHeatmap(Array.isArray(rh) ? rh : []);
      setAlerts(Array.isArray(al) ? al : []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading fraud intelligence…
      </div>
    );
  }
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-danger">Fraud Intelligence Center</div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Adversarial signals across your claim network</h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Active fraud clusters" value="12" delta={3} icon={GitBranch} accent="danger" />
        <Kpi label="Suspicious vendors" value="8" delta={1} icon={Building2} accent="warning" />
        <Kpi label="Duplicate evidence" value="34" delta={-12} icon={FileWarning} accent="warning" />
        <Kpi label="Prevented losses" value="R 4.2M" suffix="this qtr" delta={28} icon={ShieldAlert} accent="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Fraud ring detection · Cluster CL-118" className="lg:col-span-2" action={<StatusPill tone="danger">expanding</StatusPill>}>
          <div className="p-4 h-[420px] relative">
          <FraudGraph nodes={nodes} edges={edges} />
          </div>
        </Panel>

        <Panel title="Top suspicious entities">
          <div className="p-3 space-y-2">
            {[
              { n: "Vendor V-2241", t: "RepairShop SDX · Sandton", r: 92, c: "danger" },
              { n: "Adjuster ADJ-44", t: "Gauteng region", r: 78, c: "warning" },
              { n: "Vendor V-1188", t: "Auto Body PE", r: 71, c: "warning" },
              { n: "Cluster CL-118", t: "4 linked claims", r: 88, c: "danger" },
              { n: "Customer C-7732", t: "3 prior claims", r: 64, c: "warning" },
            ].map((e) => (
              <div key={e.n} className="flex items-center gap-3 p-2 rounded-md border border-border bg-background/40">
                <div className="size-8 rounded-md grid place-items-center" style={{ background: `color-mix(in oklab, var(--${e.c}) 15%, transparent)`, color: `var(--${e.c})` }}>
                  <Building2 className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{e.n}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{e.t}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-display font-semibold" style={{ color: `var(--${e.c})` }}>{e.r}</div>
                  <div className="text-[9px] text-muted-foreground">RISK</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Fraud detection vs prevention">
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fraudTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="detected" stackId="a" fill="var(--danger)" radius={[0,0,0,0]} />
                <Bar dataKey="prevented" stackId="a" fill="var(--success)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Regional fraud heatmap">
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {regionHeatmap.map((r: any) => {
              const intensity = Math.min(1, r.fraudRate * 5);
              return (
                <motion.div
                  key={r.region}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-lg border border-border p-3 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, color-mix(in oklab, var(--danger) ${intensity * 30}%, var(--card)), var(--card))` }}
                >
                  <div className="text-xs font-medium">{r.region}</div>
                  <div className="text-[10px] text-muted-foreground">{r.claims} claims</div>
                  <div className="mt-2 flex items-end justify-between">
                    <div className="text-lg font-display font-semibold text-danger">{(r.fraudRate * 100).toFixed(1)}%</div>
                    <div className="text-[9px] text-muted-foreground">FRAUD</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel title="Suspicious claims under review">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4">Claim</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Type</th>
                <th className="text-left">Region</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Fraud</th>
                <th className="text-right pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((c: any) => (
                <tr key={c.id} className="border-b border-border hover:bg-accent/30">
                  <td className="py-2 px-4 font-mono text-primary text-xs">{c.claimId || c.claim_id || c.id}</td>
                  <td>{c.description || c.type || "—"}</td>
                  <td className="text-muted-foreground">{c.severity || "—"}</td>
                  <td className="text-muted-foreground">{c.region || "—"}</td>
                  <td className="text-right font-mono">{c.amount ? `R ${c.amount.toLocaleString()}` : "—"}</td>
                  <td className="text-right">
                    <span className="font-mono font-semibold" style={{ color: c.severity === "critical" ? "var(--danger)" : "var(--warning)" }}>{c.score || c.fraudScore || "—"}</span>
                  </td>
                  <td className="text-right pr-4"><StatusPill tone={c.severity === "critical" ? "danger" : "warning"}>{c.resolved ? "Resolved" : "Active"}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FraudGraph({ nodes: graphNodes, edges: graphEdges }: { nodes: any[]; edges: any[] }) {
  // Simple force-style positions - generate from node IDs
  const defaultPositions: Record<string, [number, number]> = {
    "V-2241": [50, 50],
    "C-118": [50, 30],
    "CP-10268": [22, 18],
    "CP-10219": [78, 18],
    "CP-10202": [22, 75],
    "CP-10180": [78, 75],
    "ADJ-44": [12, 50],
    "REP-Sandton": [88, 50],
  };
  // Generate positions for any nodes not in defaults
  const positions: Record<string, [number, number]> = { ...defaultPositions };
  graphNodes.forEach((n: any, i: number) => {
    const id = n.id || n.nodeId || n.node_id || `node-${i}`;
    if (!positions[id]) {
      const angle = (i / Math.max(graphNodes.length, 1)) * Math.PI * 2;
      positions[id] = [50 + Math.cos(angle) * 35, 50 + Math.sin(angle) * 35];
    }
  });

  const edgePairs = graphEdges.map((e: any) => [e.source || e.from || e[0], e.target || e.to || e[1]]);

  return (
    <svg viewBox="0 0 100 90" className="w-full h-full">
      <defs>
        <radialGradient id="rgrad">
          <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#rgrad)" />
      {edgePairs.map((pair: any, i: number) => {
        const [a, b] = pair;
        const posA = positions[a] || [50, 50];
        const posB = positions[b] || [50, 50];
        return (
          <motion.line
            key={i}
            x1={posA[0]} y1={posA[1]}
            x2={posB[0]} y2={posB[1]}
            stroke="var(--danger)" strokeOpacity="0.5" strokeWidth="0.3"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: i * 0.08 }}
          />
        );
      })}
      {graphNodes.map((n: any, i: number) => {
        const id = n.id || n.nodeId || n.node_id || `node-${i}`;
        const [x, y] = positions[id] || [50, 50];
        const nType = n.type || n.nodeType || n.node_type || "claim";
        const color = nType === "vendor" ? "danger" : nType === "cluster" ? "warning" : nType === "adjuster" ? "info" : "cyan";
        return (
          <g key={id}>
            <motion.circle initial={{ r: 0 }} animate={{ r: 3 }} cx={x} cy={y} fill={`var(--${color})`} opacity="0.2" style={{ r: 4 } as any} />
            <circle cx={x} cy={y} r="1.6" fill={`var(--${color})`} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="2.2" fill="var(--muted-foreground)" fontFamily="monospace">{n.label || id}</text>
          </g>
        );
      })}
    </svg>
  );
}
