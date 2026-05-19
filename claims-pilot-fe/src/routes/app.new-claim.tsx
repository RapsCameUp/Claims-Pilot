import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Image as ImageIcon, FileAudio, MapPin, X, Sparkles,
  ArrowRight, Bot, ShieldCheck, CheckCircle2, Loader2, Film,
} from "lucide-react";
import { Panel, StatusPill } from "@/components/app/Primitives";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/new-claim")({
  head: () => ({ meta: [{ title: "New Claim — ClaimPilot AI" }] }),
  component: NewClaim,
});

const TYPES = ["Auto Collision", "Theft", "Property Damage", "Hail Storm", "Liability", "Medical", "Windscreen"];
const REGIONS = ["Gauteng", "Johannesburg", "Cape Town", "Durban", "Pretoria", "Sandton", "Stellenbosch"];

type LocalEvidence = {
  id: string;
  name: string;
  size: number;
  kind: "image" | "document" | "audio" | "video" | "geo" | "other";
  preview?: string;
  file: File;
};

function classifyFile(name: string, type: string): LocalEvidence["kind"] {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (/\.json$|geo|location/i.test(name)) return "geo";
  if (type === "application/pdf" || /\.(pdf|docx?|txt|csv)$/i.test(name)) return "document";
  return "other";
}

function NewClaim() {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState("");
  const [policy, setPolicy] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [region, setRegion] = useState(REGIONS[0]);
  const [amount, setAmount] = useState<number | "">("");
  const [vehicle, setVehicle] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<LocalEvidence[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function ingest(files: FileList | File[]) {
    const arr: LocalEvidence[] = Array.from(files).map((f, i) => ({
      id: `ev-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      name: f.name,
      size: f.size,
      kind: classifyFile(f.name, f.type),
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      file: f,
    }));
    setEvidence((e) => [...e, ...arr]);
  }

  function remove(id: string) {
    setEvidence((e) => e.filter((x) => x.id !== id));
  }

  const valid = customer.trim() && policy.trim() && typeof amount === "number" && amount > 0 && description.trim().length > 10;

  async function launch() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const claim = await api.claims.create({
        customerName: customer.trim(),
        policyNumber: policy.trim(),
        type,
        region,
        amount: typeof amount === "number" ? amount : 0,
        vehicle: vehicle.trim() || undefined,
        description: description.trim(),
      });
      const claimId = claim.id;
      // Upload evidence files if any
      if (evidence.length > 0) {
        try {
          await api.claims.uploadEvidence(claimId, evidence.map((e) => e.file));
        } catch {
          // Evidence upload failure shouldn't block investigation
        }
      }
      // Start investigation
      try {
        await api.investigations.start(claimId);
      } catch {
        // Investigation start failure - still navigate
      }
      navigate({ to: "/app/investigation/$id", params: { id: claimId } });
    } catch (err: any) {
      setSubmitting(false);
      alert(err.message || "Failed to create claim");
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-4">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
            <Sparkles className="size-3" /> New Claim Intake
          </div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">File a new claim</h1>
          <p className="text-sm text-muted-foreground">Capture FNOL details and supporting evidence. AI agents will autonomously investigate on submit.</p>
        </div>
        <StatusPill tone="cyan">Multi-agent ready</StatusPill>
      </header>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <Panel title="Claimant & policy">
            <div className="p-5 grid sm:grid-cols-2 gap-4">
              <Field label="Customer name" value={customer} onChange={setCustomer} placeholder="e.g. Thandi Mokoena" />
              <Field label="Policy number" value={policy} onChange={setPolicy} placeholder="POL-554120" mono />
              <Select label="Claim type" value={type} onChange={setType} options={TYPES} />
              <Select label="Region" value={region} onChange={setRegion} options={REGIONS} />
              <Field label="Estimated amount (ZAR)" value={amount === "" ? "" : String(amount)} onChange={(v) => setAmount(v === "" ? "" : Math.max(0, Number(v.replace(/[^0-9]/g, ""))))} placeholder="78400" mono />
              <Field label="Vehicle / asset (optional)" value={vehicle} onChange={setVehicle} placeholder="Toyota Hilux 2.8 GD-6" />
            </div>
          </Panel>

          <Panel title="Incident description">
            <div className="p-5">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened. Include time, place, parties involved, witnesses, and any third-party damage."
                rows={5}
                className="w-full bg-background/40 border border-border rounded-lg p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
              <div className="mt-2 text-[10px] text-muted-foreground font-mono">
                {description.trim().length} chars · agents weight keywords like "witness", "police", "dashcam" positively
              </div>
            </div>
          </Panel>

          <Panel title="Evidence" action={<StatusPill tone={evidence.length ? "info" : "muted"}>{evidence.length} file{evidence.length === 1 ? "" : "s"}</StatusPill>}>
            <div className="p-5 space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) ingest(e.dataTransfer.files); }}
                onClick={() => inputRef.current?.click()}
                className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? "border-primary bg-primary/5 ring-glow" : "border-border bg-background/30 hover:bg-background/50"}`}
              >
                <input ref={inputRef} type="file" multiple hidden onChange={(e) => e.target.files && ingest(e.target.files)} />
                <Upload className="size-7 mx-auto text-primary" />
                <div className="mt-3 text-sm font-medium">Drop photos, PDFs, audio, dashcam clips here</div>
                <div className="text-xs text-muted-foreground mt-1">or click to browse · accepted by FNOL, Damage, Investigation, Compliance agents</div>
                <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                  Max video size: 100 MB · images ≤ 25 MB · audio ≤ 50 MB · documents ≤ 20 MB
                </div>
              </div>

              {evidence.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-2">
                  <AnimatePresence>
                    {evidence.map((ev) => {
                      const Icon = ev.kind === "image" ? ImageIcon : ev.kind === "audio" ? FileAudio : ev.kind === "video" ? Film : ev.kind === "geo" ? MapPin : FileText;
                      return (
                        <motion.li
                          key={ev.id}
                          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -10 }}
                          className="flex gap-3 p-2 rounded-lg border border-border bg-background/40 group"
                        >
                          <div className="size-12 rounded-md grid place-items-center overflow-hidden shrink-0 border border-border bg-background/60">
                            {ev.preview ? <img src={ev.preview} alt="" className="size-full object-cover" /> : <Icon className="size-5 text-primary" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium truncate">{ev.name}</div>
                            <div className="text-[10px] text-muted-foreground">{(ev.size / 1024).toFixed(1)} KB · {ev.kind}</div>
                            <div className="mt-1">
                              <StatusPill tone="info">queued for {ev.kind === "image" ? "vision" : ev.kind === "audio" ? "transcription" : "extraction"}</StatusPill>
                            </div>
                          </div>
                          <button onClick={() => remove(ev.id)} className="size-7 rounded-md grid place-items-center text-muted-foreground hover:text-danger hover:bg-danger/10">
                            <X className="size-3.5" />
                          </button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </Panel>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Panel title="Agents that will investigate">
            <ul className="p-4 space-y-2">
              {[
                { name: "FNOL Agent", role: "Authenticates customer & policy", color: "info" as const },
                { name: "Policy Agent", role: "Coverage + exclusions analysis", color: "info" as const },
                { name: "Damage Agent", role: "Multimodal vision on photos", color: "warning" as const },
                { name: "Investigation Agent", role: "Evidence correlation & timeline", color: "cyan" as const },
                { name: "Fraud Agent", role: "Anomaly + ring detection", color: "danger" as const },
                { name: "Compliance Agent", role: "POPIA · FSCA validation", color: "info" as const },
                { name: "Settlement Agent", role: "Recommends payout or escalation", color: "success" as const },
              ].map((a) => (
                <li key={a.name} className="flex items-center gap-3 p-2 rounded-md border border-border bg-background/40">
                  <div className="size-8 rounded-md grid place-items-center" style={{ background: `color-mix(in oklab, var(--${a.color}) 15%, transparent)`, color: `var(--${a.color})` }}>
                    <Bot className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{a.role}</div>
                  </div>
                  <StatusPill tone={a.color}>idle</StatusPill>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="What happens next">
            <ol className="p-4 space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary font-mono">1.</span> Orchestrator delegates tasks to specialists.</li>
              <li className="flex gap-2"><span className="text-primary font-mono">2.</span> Agents reason in parallel and surface findings.</li>
              <li className="flex gap-2"><span className="text-primary font-mono">3.</span> Conflicting agents debate openly with confidence scores.</li>
              <li className="flex gap-2"><span className="text-primary font-mono">4.</span> Settlement Agent issues a recommendation (or escalates).</li>
            </ol>
          </Panel>

          <button
            onClick={launch}
            disabled={!valid || submitting}
            className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {submitting ? "Dispatching agents…" : "Launch AI investigation"}
            <ArrowRight className="size-4" />
          </button>
          {!valid && (
            <p className="text-[10px] text-muted-foreground text-center">Customer, policy, amount and a description &gt; 10 chars are required.</p>
          )}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3 text-success" /> POPIA-compliant intake · audit trail recorded
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-10 bg-background/40 border border-border rounded-lg px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 bg-background/40 border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
