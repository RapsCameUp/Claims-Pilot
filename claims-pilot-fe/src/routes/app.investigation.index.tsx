import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { FileSearch, PlusCircle, ArrowRight, Activity, Database, Loader2 } from "lucide-react";
import { Panel, StatusPill } from "@/components/app/Primitives";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/investigation/")({
  head: () => ({ meta: [{ title: "Investigations — ClaimPilot AI" }] }),
  component: InvestigationIndex,
});

const TONE: Record<string, "info" | "warning" | "danger" | "success" | "cyan"> = {
  queued: "info", delegating: "info", investigating: "cyan",
  debating: "warning", deciding: "cyan", complete: "success", escalated: "danger",
};

function InvestigationIndex() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.investigations.list({ limit: 50 }).catch(() => []),
      api.claims.list({ limit: 12 }).catch(() => ({ claims: [] })),
    ]).then(([invs, claimsRes]) => {
      if (!cancelled) {
        setInvestigations(Array.isArray(invs) ? invs : []);
        setClaims((claimsRes as any).claims || []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const queueable = claims.filter((c: any) => c.status !== "Closed").slice(0, 12);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading investigations…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-cyan">Investigations</div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">Live AI investigation workspace</h1>
          <p className="text-sm text-muted-foreground">Open a claim to watch agents delegate, reason, and debate in real time.</p>
        </div>
        <Link to="/app/new-claim"
          className="px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow inline-flex items-center gap-2">
          <PlusCircle className="size-4" /> New claim
        </Link>
      </header>

      {investigations.length === 0 ? (
        <Panel>
          <div className="p-12 text-center space-y-4">
            <div className="size-14 rounded-2xl mx-auto bg-gradient-primary grid place-items-center shadow-glow">
              <FileSearch className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold">No active investigations</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Submit a new claim with evidence and the autonomous agent runtime will spin up a live investigation here.
              </p>
            </div>
            <Link to="/app/new-claim"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow">
              <PlusCircle className="size-4" /> Start a new claim
            </Link>
          </div>
        </Panel>
      ) : (
        <Panel
          title={<span className="flex items-center gap-2"><Activity className="size-3.5 text-primary" /> Active investigations</span>}
          action={<StatusPill tone="cyan">{investigations.length}</StatusPill>}
        >
          <div className="divide-y divide-border">
            {investigations.map((inv: any, i: number) => (
              <motion.div key={inv.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link
                  to="/app/investigation/$id" params={{ id: inv.claimId || inv.claim_id || inv.id }}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{inv.claimId || inv.claim_id || inv.id}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {inv.status} · Started {new Date(inv.startedAt || inv.started_at).toLocaleString("en-ZA")}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    {typeof (inv.fraudScore ?? inv.fraud_score) === "number" && (
                      <StatusPill tone={(inv.fraudScore ?? inv.fraud_score) > 70 ? "danger" : (inv.fraudScore ?? inv.fraud_score) > 40 ? "warning" : "success"}>
                        Fraud {inv.fraudScore ?? inv.fraud_score}
                      </StatusPill>
                    )}
                    <StatusPill tone={TONE[inv.status] || "info"}>{inv.status}</StatusPill>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              </motion.div>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title={<span className="flex items-center gap-2"><Database className="size-3.5 text-primary" /> Active claims queue</span>}
        action={<StatusPill tone="info">{queueable.length}</StatusPill>}
      >
        <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {queueable.map((c: any) => (
            <Link
              key={c.id}
              to="/app/investigation/$id" params={{ id: c.id }}
              className="rounded-lg border border-border bg-background/40 p-3 hover:ring-glow transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-mono text-primary">{c.id}</div>
                <StatusPill tone={(c.fraudScore ?? c.fraud_score ?? 0) > 70 ? "danger" : (c.fraudScore ?? c.fraud_score ?? 0) > 40 ? "warning" : "success"}>
                  Fraud {c.fraudScore ?? c.fraud_score ?? 0}
                </StatusPill>
              </div>
              <div className="text-sm mt-1 truncate">{c.customerName || c.customer_name || c.customer}</div>
              <div className="text-[10px] text-muted-foreground truncate">{c.type} · {c.region} · R {(c.amount || 0).toLocaleString()}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary">
                Run AI investigation <ArrowRight className="size-3" />
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
