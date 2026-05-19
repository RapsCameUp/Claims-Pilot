import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Sparkles, ShieldCheck, Bot, Network, Activity, Zap, ArrowRight,
  FileSearch, BarChart3, Lock, Workflow, Eye, Brain, GitBranch,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClaimPilot AI — Autonomous AI Claims Intelligence Platform" },
      { name: "description", content: "ClaimPilot AI deploys collaborative AI agents that investigate claims, detect fraud, reason over policies, and accelerate insurance operations autonomously." },
      { property: "og:title", content: "ClaimPilot AI — Autonomous Claims Intelligence" },
      { property: "og:description", content: "Multi-agent AI for enterprise insurance operations. Investigate, detect fraud, and settle claims autonomously." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Logos />
      <Features />
      <AgentShowcase />
      <FraudShowcase />
      <Architecture />
      <Analytics />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">ClaimPilot<span className="text-primary"> AI</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground">Platform</a>
          <a href="#agents" className="hover:text-foreground">Agents</a>
          <a href="#fraud" className="hover:text-foreground">Fraud</a>
          <a href="#architecture" className="hover:text-foreground">Architecture</a>
          <a href="#customers" className="hover:text-foreground">Customers</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-sm px-3 py-1.5 rounded-lg hover:bg-accent">Sign in</Link>
          <Link to="/app/dashboard" className="text-sm px-3 py-1.5 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow">
            Launch Platform
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-aurora pointer-events-none" />
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none [mask-image:radial-gradient(ellipse_at_top,white,transparent_70%)]" />
      <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 relative">
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-border glass">
            <span className="size-1.5 rounded-full bg-success pulse-dot" />
            <span className="text-muted-foreground">Live · 7 autonomous agents · 1,284 claims investigated today</span>
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl font-display font-semibold tracking-tight leading-[1.05]">
            Autonomous AI <br />
            <span className="gradient-text">Claims Intelligence</span><br />
            for the future of insurance.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            ClaimPilot AI deploys collaborative AI agents that investigate claims, detect fraud,
            reason over policies, and accelerate insurance operations autonomously — at enterprise scale.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/app/dashboard" className="px-5 py-3 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow inline-flex items-center gap-2">
              Launch Platform <ArrowRight className="size-4" />
            </Link>
            <a href="#features" className="px-5 py-3 rounded-lg border border-border glass font-medium inline-flex items-center gap-2 hover:bg-accent">
              Request Demo
            </a>
          </div>
        </motion.div>

        <HeroDashboard />
      </div>
    </section>
  );
}

function HeroDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="mt-16 glass-strong rounded-2xl p-3 shadow-elegant relative"
    >
      <div className="absolute inset-x-0 -top-10 h-20 bg-aurora opacity-60 pointer-events-none" />
      <div className="rounded-xl bg-card overflow-hidden border border-border">
        <div className="h-9 flex items-center gap-1.5 px-3 border-b border-border bg-muted/30">
          <span className="size-2.5 rounded-full bg-danger/60" />
          <span className="size-2.5 rounded-full bg-warning/60" />
          <span className="size-2.5 rounded-full bg-success/60" />
          <span className="ml-3 text-xs font-mono text-muted-foreground">claimpilot.ai/operations</span>
        </div>
        <div className="grid grid-cols-12 gap-3 p-4">
          <div className="col-span-3 space-y-3">
            {[
              { l: "Claims Today", v: "1,284", d: "+12%" },
              { l: "Fraud Alerts", v: "47", d: "+8%" },
              { l: "Auto-Resolution", v: "78%", d: "+4%" },
            ].map((k) => (
              <div key={k.l} className="rounded-lg border border-border p-3 bg-background/50">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.l}</div>
                <div className="text-2xl font-display font-semibold mt-1">{k.v}</div>
                <div className="text-[10px] text-success mt-1">{k.d}</div>
              </div>
            ))}
          </div>
          <div className="col-span-6 rounded-lg border border-border bg-background/50 p-4 relative overflow-hidden">
            <div className="text-xs text-muted-foreground">Live Agent Activity</div>
            <div className="mt-3 space-y-2">
              {[
                { a: "Fraud Agent", t: "Flagged invoice anomaly · CP-10268", c: "danger" },
                { a: "Policy Agent", t: "Coverage validated · POL-554120", c: "info" },
                { a: "Damage Agent", t: "Severity: Moderate (0.91)", c: "warning" },
                { a: "Settlement Agent", t: "Drafted payout R 84,250", c: "success" },
              ].map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="size-1.5 rounded-full pulse-dot" style={{ background: `var(--${row.c})` }} />
                  <span className="font-mono text-muted-foreground">{row.a}</span>
                  <span className="truncate">{row.t}</span>
                </motion.div>
              ))}
            </div>
            <div className="absolute inset-x-0 top-0 h-px scan-line bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
          <div className="col-span-3 rounded-lg border border-border bg-background/50 p-3">
            <div className="text-xs text-muted-foreground">Fraud Probability</div>
            <div className="mt-3 relative size-32 mx-auto">
              <svg viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none" stroke="var(--danger)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray="263.9" initial={{ strokeDashoffset: 263.9 }}
                  animate={{ strokeDashoffset: 263.9 * 0.13 }} transition={{ duration: 1.6, delay: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-2xl font-display font-semibold">87%</div>
                  <div className="text-[10px] text-muted-foreground">High</div>
                </div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-center text-muted-foreground">Vendor V-2241</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Logos() {
  const logos = ["SANTAM", "OUTSURANCE", "DISCOVERY", "MOMENTUM", "OLD MUTUAL", "HOLLARD"];
  return (
    <section className="border-y border-border py-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Trusted by insurance leaders
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-60">
          {logos.map((l) => (
            <div key={l} className="font-display font-semibold tracking-widest text-sm">{l}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { i: Bot, t: "Multi-Agent Workforce", d: "Specialized AI agents for FNOL, investigation, fraud, policy, damage, and settlement collaborate on every claim." },
    { i: ShieldCheck, t: "Fraud Intelligence", d: "Detect fraud rings, vendor collusion, and anomalous claim patterns with explainable AI." },
    { i: Workflow, t: "Autonomous Workflows", d: "Agents delegate, debate, and escalate — closing routine claims in minutes, not days." },
    { i: Eye, t: "Multimodal Evidence", d: "Vision, document, and voice models analyze accident photos, invoices, police reports and statements." },
    { i: Brain, t: "Policy Reasoning", d: "Symbolic + LLM reasoning over your policy library produces auditable coverage decisions." },
    { i: BarChart3, t: "Process Intelligence", d: "Spot adjuster bottlenecks, fraud hotspots, and operational inefficiencies in real time." },
  ];
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading eyebrow="Platform" title="An operating system for claims" sub="Six surfaces unified into one autonomous claims platform." />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <motion.div
              key={it.t}
              initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="glass rounded-xl p-6 hover:ring-glow transition-all"
            >
              <div className="size-10 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
                <it.i className="size-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 font-display font-semibold">{it.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{it.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentShowcase() {
  return (
    <section id="agents" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-aurora opacity-50 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative">
        <SectionHeading eyebrow="Agent Orchestration" title="Watch agents collaborate in real time" sub="Specialized AI agents debate, delegate, and reason — like an entire claims team in software." />
        <div className="mt-12 glass-strong rounded-2xl p-6">
          <div className="grid lg:grid-cols-7 gap-3">
            {[
              { n: "FNOL", c: "info" },
              { n: "Policy", c: "info" },
              { n: "Damage", c: "warning" },
              { n: "Investigation", c: "cyan" },
              { n: "Fraud", c: "danger" },
              { n: "Settlement", c: "success" },
              { n: "Compliance", c: "info" },
            ].map((a, i) => (
              <motion.div
                key={a.n}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-lg border border-border p-3 bg-background/40 text-center"
              >
                <div className="size-9 mx-auto rounded-full grid place-items-center" style={{ background: `color-mix(in oklab, var(--${a.c}) 15%, transparent)`, color: `var(--${a.c})` }}>
                  <Bot className="size-4" />
                </div>
                <div className="mt-2 text-xs font-medium">{a.n} Agent</div>
                <div className="mt-1 text-[10px] text-muted-foreground font-mono">online</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 grid lg:grid-cols-2 gap-4">
            {[
              { a: "Fraud Agent", t: "Invoice exceeds regional average by 38%. Vendor V-2241 appears in 4 prior flagged claims.", c: "danger" },
              { a: "Damage Agent", t: "Vision: damage classified Moderate (0.91). Repair scope inconsistent with observed impact.", c: "warning" },
              { a: "Policy Agent", t: "Coverage POL-554120 valid. No exclusions triggered. Suspicious repair inflation noted.", c: "info" },
              { a: "Settlement Agent", t: "Recommend HUMAN ESCALATION. Suggested settlement R 52,000. Confidence 71%.", c: "success" },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.15 }}
                className="rounded-lg border border-border bg-background/50 p-4"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="size-1.5 rounded-full" style={{ background: `var(--${m.c})` }} />
                  <span className="font-mono uppercase tracking-wider" style={{ color: `var(--${m.c})` }}>{m.a}</span>
                </div>
                <p className="mt-2 text-sm">{m.t}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FraudShowcase() {
  return (
    <section id="fraud" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading eyebrow="Fraud Intelligence" title="See fraud rings before they cost you" sub="Graph reasoning across vendors, adjusters and claims surfaces collusion that humans miss." />
        <div className="mt-12 grid lg:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            {[
              { i: GitBranch, t: "Entity graph reasoning", d: "Connects vendors, repair shops, adjusters, and claims into a queryable graph." },
              { i: Activity, t: "Anomaly detection", d: "Real-time scoring against regional baselines flags inflated invoices and duplicate evidence." },
              { i: Zap, t: "Network alerts", d: "When a fraud cluster expands, the platform proactively alerts compliance." },
            ].map((it) => (
              <div key={it.t} className="flex gap-4">
                <div className="size-9 rounded-lg bg-danger/10 text-danger grid place-items-center border border-danger/30 shrink-0">
                  <it.i className="size-4" />
                </div>
                <div>
                  <div className="font-display font-semibold">{it.t}</div>
                  <div className="text-sm text-muted-foreground">{it.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="glass rounded-2xl p-6 relative overflow-hidden h-[420px]">
            <FraudGraph />
          </div>
        </div>
      </div>
    </section>
  );
}

function FraudGraph() {
  const nodes = [
    { id: "v", x: 50, y: 50, r: 22, label: "V-2241", color: "danger" },
    { id: "a", x: 20, y: 25, r: 14, label: "CP-10268", color: "warning" },
    { id: "b", x: 82, y: 22, r: 14, label: "CP-10219", color: "warning" },
    { id: "c", x: 18, y: 78, r: 14, label: "CP-10202", color: "warning" },
    { id: "d", x: 82, y: 78, r: 14, label: "CP-10180", color: "warning" },
    { id: "e", x: 50, y: 12, r: 12, label: "ADJ-44", color: "info" },
    { id: "f", x: 50, y: 88, r: 12, label: "RepShop", color: "info" },
  ];
  const edges = [["v","a"],["v","b"],["v","c"],["v","d"],["e","a"],["e","b"],["f","c"],["f","d"]];
  const map = Object.fromEntries(nodes.map(n => [n.id, n]));
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <radialGradient id="glowR" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="var(--danger)" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="url(#glowR)" />
      {edges.map(([a,b], i) => (
        <motion.line
          key={i} x1={map[a].x} y1={map[a].y} x2={map[b].x} y2={map[b].y}
          stroke="var(--danger)" strokeOpacity="0.4" strokeWidth="0.4"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.1 * i }}
        />
      ))}
      {nodes.map((n) => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.r/3} fill={`var(--${n.color})`} opacity="0.2" />
          <circle cx={n.x} cy={n.y} r={n.r/6} fill={`var(--${n.color})`} />
          <text x={n.x} y={n.y + n.r/3 + 3} textAnchor="middle" fontSize="2.6" fill="var(--muted-foreground)" fontFamily="monospace">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Architecture() {
  return (
    <section id="architecture" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading eyebrow="Architecture" title="Built like infrastructure" sub="An agent orchestration layer over your existing claims systems — secure, observable, audit-ready." />
        <div className="mt-12 glass-strong rounded-2xl p-8">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            {[
              { l: "Ingest", i: ["FNOL APIs","Email parser","Voice intake","Document OCR"] },
              { l: "Reason", i: ["Agent runtime","Policy graph","Vision models","Fraud signals"] },
              { l: "Act", i: ["Settlement engine","Escalation router","Audit ledger","Compliance"] },
            ].map((col, idx) => (
              <div key={col.l} className="rounded-xl border border-border p-5 bg-background/40 relative">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Layer {idx + 1}</div>
                <div className="font-display font-semibold text-lg mt-1">{col.l}</div>
                <ul className="mt-4 space-y-2">
                  {col.i.map((x) => (
                    <li key={x} className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-1 rounded-full bg-primary" /> {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {["SOC2 Type II","POPIA","GDPR","ISO 27001","SAML SSO","Audit ledger"].map((b) => (
              <span key={b} className="px-2.5 py-1 rounded-md border border-border glass inline-flex items-center gap-1">
                <Lock className="size-3" /> {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Analytics() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <SectionHeading eyebrow="Process Intelligence" title="Operational truth, instantly" sub="Find adjuster bottlenecks, fraud hotspots, and settlement bottlenecks before they hit your loss ratio." align="left" />
          <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
            <li>• Cycle time down 61% in pilot programs</li>
            <li>• 47% of routine claims auto-resolved end-to-end</li>
            <li>• R 12.8M+ in fraud prevented per quarter</li>
          </ul>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-xs text-muted-foreground">Settlement cycle (hrs)</div>
          <svg viewBox="0 0 300 120" className="w-full mt-3">
            <defs>
              <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,90 C40,60 80,80 120,50 C160,20 200,40 240,30 C260,25 280,35 300,20 L300,120 L0,120 Z" fill="url(#lg)" />
            <path d="M0,90 C40,60 80,80 120,50 C160,20 200,40 240,30 C260,25 280,35 300,20" stroke="var(--primary)" strokeWidth="1.5" fill="none" />
          </svg>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[["Avg cycle","6.4h"],["Auto-rate","78%"],["Fraud caught","R12.8M"]].map(([a,b]) => (
              <div key={a} className="rounded-lg border border-border p-3 bg-background/40">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{a}</div>
                <div className="font-display font-semibold mt-1">{b}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const t = [
    { q: "ClaimPilot cut our routine claim cycle from 4 days to under 6 hours. The fraud agent paid for itself in the first month.", n: "Lerato Mhlongo", r: "Head of Claims, Coastal Mutual" },
    { q: "We finally have an audit trail of WHY a settlement was approved — not just who clicked the button.", n: "Hendrik Pretorius", r: "Chief Risk Officer, Veld Insure" },
    { q: "The agent debate view is what convinced our board. It feels like AI we can actually trust.", n: "Anika Govender", r: "VP Operations, Saharan Re" },
  ];
  return (
    <section id="customers" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeading eyebrow="Customers" title="Trusted by claims teams in production" />
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          {t.map((x) => (
            <div key={x.n} className="glass rounded-xl p-6">
              <p className="text-sm leading-relaxed">"{x.q}"</p>
              <div className="mt-4 text-xs">
                <div className="font-medium">{x.n}</div>
                <div className="text-muted-foreground">{x.r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="glass-strong rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-aurora opacity-60 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-display font-semibold">Deploy your AI claims workforce.</h2>
            <p className="mt-3 text-muted-foreground">See ClaimPilot AI investigate a live claim — agents, evidence, decisions, in one workspace.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/app/dashboard" className="px-5 py-3 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow inline-flex items-center gap-2">
                Launch Platform <ArrowRight className="size-4" />
              </Link>
              <Link to="/register" className="px-5 py-3 rounded-lg border border-border glass font-medium">Request Demo</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10 text-xs text-muted-foreground">
      <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between gap-4">
        <div>© {new Date().getFullYear()} ClaimPilot AI · Johannesburg · Cape Town</div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-foreground">Security</a>
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Status</a>
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, sub, align = "center" }: { eyebrow: string; title: string; sub?: string; align?: "center" | "left" }) {
  return (
    <div className={align === "center" ? "text-center max-w-2xl mx-auto" : ""}>
      <div className="text-[10px] uppercase tracking-widest text-primary font-medium">{eyebrow}</div>
      <h2 className="mt-2 text-3xl md:text-4xl font-display font-semibold tracking-tight">{title}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}
