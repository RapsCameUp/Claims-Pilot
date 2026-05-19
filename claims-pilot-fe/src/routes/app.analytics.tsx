import { createFileRoute } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, RadialBar, RadialBarChart, Legend } from "recharts";
import { Sparkles, BarChart3, Zap, Clock, Bot, AlertCircle, Loader2 } from "lucide-react";
import { Kpi, Panel } from "@/components/app/Primitives";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({ meta: [{ title: "Process Intelligence — ClaimPilot AI" }] }),
  component: Analytics,
});

const automationData = [
  { name: "Auto", value: 78, fill: "var(--primary)" },
];

function Analytics() {
  const [settlementTrend, setSettlementTrend] = useState<any[]>([]);
  const [regionHeatmap, setRegionHeatmap] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.analytics.settlementTrend().catch(() => []),
      api.analytics.regionHeatmap().catch(() => []),
      api.analytics.dashboard().catch(() => null),
    ]).then(([settle, rh, dash]) => {
      if (cancelled) return;
      setSettlementTrend(Array.isArray(settle) ? settle : []);
      setRegionHeatmap(Array.isArray(rh) ? rh : []);
      setInsights(dash?.insights || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading analytics…
      </div>
    );
  }
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-primary">Process Intelligence</div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Operational truth</h1>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Cycle reduction" value="61%" suffix="QoQ" delta={11} icon={Zap} accent="success" />
        <Kpi label="Automation rate" value="78%" delta={4} icon={Bot} accent="info" />
        <Kpi label="Fraud accuracy" value="94.2%" delta={2} icon={Sparkles} accent="cyan" />
        <Kpi label="Avg human touch" value="2.1" suffix="per claim" delta={-19} icon={Clock} accent="success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="AI vs Manual settlement throughput" className="lg:col-span-2">
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={settlementTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="ai" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="manual" stroke="var(--muted-foreground)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Automation rate">
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="60%" outerRadius="100%" data={automationData} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "var(--muted)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="-mt-44 text-center">
              <div className="text-4xl font-display font-semibold gradient-text">78%</div>
              <div className="text-xs text-muted-foreground">claims auto-resolved</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Cycle time trend (hrs)">
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={settlementTrend}>
                <defs>
                  <linearGradient id="ct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="cycleHrs" stroke="var(--success)" fill="url(#ct)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Adjuster workload by region">
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionHeatmap}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="region" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="claims" fill="var(--primary)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="AI Operational Insights" action={<span className="text-xs text-muted-foreground">generated by Insight Agent · 2m ago</span>}>
        <div className="p-4 grid md:grid-cols-2 gap-3">
          {(insights.length > 0 ? insights : ["Process claims to generate operational insights."]).map((t: string, i: number) => (
            <div key={i} className="rounded-lg border border-border bg-background/40 p-4 flex gap-3">
              <div className="size-8 rounded-md bg-primary/10 text-primary border border-primary/20 grid place-items-center shrink-0"><Sparkles className="size-4" /></div>
              <p className="text-sm leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
