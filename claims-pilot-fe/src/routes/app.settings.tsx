import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Panel, StatusPill } from "@/components/app/Primitives";
import { Bot, Bell, Lock, Plug, Users, Sliders, ShieldAlert, Plus, Trash2, Pencil, Check, X, FileText, Upload, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — ClaimPilot AI" }] }),
  component: Settings,
});

const SECTIONS = [
  { k: "agents", n: "AI Agent Configuration", i: Bot },
  { k: "policies", n: "Policy Documents", i: FileText },
  { k: "fraud", n: "Fraud Sensitivity", i: ShieldAlert },
  { k: "rules", n: "Escalation Rules", i: Sliders },
  { k: "compliance", n: "Compliance", i: Lock },
  { k: "integrations", n: "API Integrations", i: Plug },
  { k: "team", n: "Team Management", i: Users },
  { k: "notifications", n: "Notifications", i: Bell },
];

function Settings() {
  const [tab, setTab] = useState("agents");
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Settings</div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">Workspace</h1>
      </header>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <button key={s.k} onClick={() => setTab(s.k)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all ${tab === s.k ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50"}`}>
              <s.i className="size-4" />{s.n}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          {tab === "agents" && <AgentsConfig />}
          {tab === "policies" && <PolicyDocsConfig />}
          {tab === "fraud" && <FraudConfig />}
          {tab === "rules" && <RulesConfig />}
          {tab === "compliance" && <ComplianceConfig />}
          {tab === "integrations" && <IntegrationsConfig />}
          {tab === "team" && <TeamConfig />}
          {tab === "notifications" && <NotificationsConfig />}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, desc, on = true }: { label: string; desc?: string; on?: boolean }) {
  const [v, setV] = useState(on);
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <button onClick={() => setV(!v)} className={`w-10 h-6 rounded-full transition-all relative ${v ? "bg-gradient-primary shadow-glow" : "bg-muted"}`}>
        <span className={`absolute top-1 size-4 rounded-full bg-background transition-all ${v ? "left-5" : "left-1"}`} />
      </button>
    </div>
  );
}

function Slider({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const [v, setV] = useState(value);
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-primary">{v}{suffix}</span>
      </div>
      <input type="range" min={0} max={100} value={v} onChange={(e) => setV(+e.target.value)} className="w-full mt-2 accent-[var(--primary)]" />
    </div>
  );
}

function AgentsConfig() {
  return (
    <Panel title="AI Agent Configuration" action={<StatusPill tone="cyan">8 agents</StatusPill>}>
      <div className="p-4">
        <Toggle label="FNOL Intake Agent" desc="Auto-open claims from mobile, web and email channels" />
        <Toggle label="Policy Reasoning Agent" desc="Coverage analysis, exclusions, premium status checks" />
        <Toggle label="Damage Assessment Agent" desc="Multimodal vision analysis on uploaded photos and dashcam video" />
        <Toggle label="Claims Investigation Agent" desc="Cross-references police reports, repair invoices and timelines" />
        <Toggle label="Fraud Intelligence Agent" desc="Real-time anomaly detection across vendors and clusters" />
        <Toggle label="Compliance Agent" desc="POPIA, FSCA, GDPR and SOC2 enforcement on every decision" />
        <Toggle label="Settlement Agent · auto-approve under R 5,000" desc="Auto-approve low-value windscreen and minor claims" on={false} />
        <Toggle label="Decision Reviewer Agent" desc="Final audit and sign-off on every settlement before payout" />
      </div>
    </Panel>
  );
}

function PolicyDocsConfig() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const data = await api.policyDocuments.list();
      setDocs(data);
    } catch {
      setError("Failed to load policy documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.policyDocuments.upload(file, name || file.name, description || undefined);
      setFile(null);
      setName("");
      setDescription("");
      await fetchDocs();
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.policyDocuments.delete(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Failed to delete document");
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <Panel title="Upload Policy Document" action={<StatusPill tone="emerald">{docs.length} document{docs.length !== 1 ? "s" : ""}</StatusPill>}>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload policy documents (PDF, text files) that the Policy Reasoning Agent will reference when evaluating claims coverage, exclusions, and terms.
          </p>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <X className="size-4" />{error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">Document Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Comprehensive Motor Policy 2025"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Covers motor, windscreen, theft, 3rd party"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">File</label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="size-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : "Choose a PDF or text file..."}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-glow hover:brightness-110 transition-all"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {uploading ? "Uploading…" : "Upload Document"}
            </button>
          </div>
        </div>
      </Panel>

      <Panel title="Uploaded Policy Documents">
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" /> Loading documents…
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <FileText className="size-10 mx-auto mb-2 opacity-40" />
              No policy documents uploaded yet. Upload a document above so the Policy Reasoning Agent can reference it during investigations.
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 py-3 px-3 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="size-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{doc.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{doc.fileName}</span>
                        <span>·</span>
                        <span>{formatSize(doc.fileSize)}</span>
                        <span>·</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        {doc.extractedText && (
                          <>
                            <span>·</span>
                            <StatusPill tone="emerald">text extracted</StatusPill>
                          </>
                        )}
                      </div>
                      {doc.description && <div className="text-xs text-muted-foreground mt-0.5">{doc.description}</div>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    title="Delete document"
                  >
                    {deleting === doc.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function FraudConfig() {
  return (
    <Panel title="Fraud Sensitivity">
      <div className="p-4">
        <Slider label="Anomaly threshold" value={72} suffix="%" />
        <Slider label="Vendor risk weight" value={64} suffix="%" />
        <Slider label="Cluster expansion sensitivity" value={88} suffix="%" />
        <Toggle label="Auto-escalate clusters above threshold" />
      </div>
    </Panel>
  );
}

function RulesConfig() {
  const [rules, setRules] = useState<string[]>([
    "If fraud_score > 80 AND amount > R 50,000 → escalate to senior adjuster",
    "If vendor in cluster CL-* → freeze settlement, notify compliance",
    "If decision confidence < 70% → require human approval",
    "If POPIA consent missing → block payout",
  ]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newRule, setNewRule] = useState("");

  function startEdit(i: number) { setEditing(i); setDraft(rules[i]); }
  function saveEdit() {
    if (editing === null) return;
    if (!draft.trim()) return;
    setRules(rules.map((r, i) => (i === editing ? draft.trim() : r)));
    setEditing(null); setDraft("");
  }
  function remove(i: number) { setRules(rules.filter((_, idx) => idx !== i)); }
  function addRule() {
    if (!newRule.trim()) return;
    setRules([...rules, newRule.trim()]);
    setNewRule(""); setAdding(false);
  }

  return (
    <Panel
      title="Escalation Rules"
      action={
        <button
          onClick={() => { setAdding(true); setNewRule(""); }}
          className="text-xs px-2.5 py-1 rounded-md bg-gradient-primary text-primary-foreground inline-flex items-center gap-1 shadow-glow"
        >
          <Plus className="size-3" /> New rule
        </button>
      }
    >
      <div className="p-4 space-y-2">
        {rules.length === 0 && !adding && (
          <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border rounded-md">
            No escalation rules defined. Click "New rule" to add one.
          </div>
        )}
        {rules.map((r, i) => (
          <div key={i} className="rounded-md border border-border bg-background/40 p-3 group">
            {editing === i ? (
              <div className="flex gap-2 items-start">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  className="flex-1 bg-background/60 border border-border rounded-md px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                  autoFocus
                />
                <button onClick={saveEdit} className="size-7 grid place-items-center rounded-md bg-success/15 text-success hover:bg-success/25" aria-label="Save">
                  <Check className="size-3.5" />
                </button>
                <button onClick={() => { setEditing(null); setDraft(""); }} className="size-7 grid place-items-center rounded-md border border-border hover:bg-accent" aria-label="Cancel">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3 items-start">
                <span className="text-[10px] font-mono text-muted-foreground pt-0.5 w-6 shrink-0">R{String(i + 1).padStart(2, "0")}</span>
                <p className="flex-1 font-mono text-xs leading-relaxed">{r}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(i)} className="size-7 grid place-items-center rounded-md border border-border hover:bg-accent" aria-label="Edit">
                    <Pencil className="size-3" />
                  </button>
                  <button onClick={() => remove(i)} className="size-7 grid place-items-center rounded-md border border-border text-danger hover:bg-danger/10 hover:border-danger/40" aria-label="Delete">
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {adding && (
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3 flex gap-2 items-start">
            <textarea
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              rows={2}
              placeholder="If <condition> → <action>"
              className="flex-1 bg-background/60 border border-border rounded-md px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              autoFocus
            />
            <button onClick={addRule} className="size-7 grid place-items-center rounded-md bg-success/15 text-success hover:bg-success/25" aria-label="Add">
              <Check className="size-3.5" />
            </button>
            <button onClick={() => { setAdding(false); setNewRule(""); }} className="size-7 grid place-items-center rounded-md border border-border hover:bg-accent" aria-label="Cancel">
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}

function ComplianceConfig() {
  return (
    <Panel title="Compliance">
      <div className="p-4">
        <Toggle label="POPIA logging" desc="Persist consent and access logs for 7 years" />
        <Toggle label="GDPR right-to-erasure handler" />
        <Toggle label="FSCA quarterly export" desc="Auto-generate FSCA-format claim register" />
        <Toggle label="SOC2 evidence collector" />
      </div>
    </Panel>
  );
}

function IntegrationsConfig() {
  return (
    <Panel title="API Integrations">
      <div className="p-4 grid sm:grid-cols-2 gap-3">
        {[
          { n: "Guidewire ClaimCenter", s: "Connected" },
          { n: "Salesforce Service Cloud", s: "Connected" },
          { n: "TransUnion Risk", s: "Connected" },
          { n: "SAPS police report API", s: "Connected" },
          { n: "Twilio voice intake", s: "Connected" },
          { n: "DocuSign settlements", s: "Configure" },
        ].map((i) => (
          <div key={i.n} className="rounded-lg border border-border p-3 bg-background/40 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{i.n}</div>
              <div className="text-xs text-muted-foreground">{i.s === "Connected" ? "Healthy · last sync 12s ago" : "Action required"}</div>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${i.s === "Connected" ? "border-success/40 text-success bg-success/10" : "border-warning/40 text-warning bg-warning/10"}`}>{i.s}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function TeamConfig() {
  return (
    <Panel title="Team Management">
      <div className="p-4 space-y-2">
        {[
          { n: "Adriaan Kruger", e: "adriaan@coastalmutual.co.za", r: "Admin" },
          { n: "Lerato Mhlongo", e: "lerato@coastalmutual.co.za", r: "Senior Adjuster" },
          { n: "Hendrik Pretorius", e: "hendrik@coastalmutual.co.za", r: "Compliance" },
          { n: "Anika Govender", e: "anika@coastalmutual.co.za", r: "Operations" },
        ].map((u) => (
          <div key={u.e} className="flex items-center gap-3 p-2 rounded-md border border-border bg-background/40">
            <div className="size-8 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">{u.n.split(" ").map(s=>s[0]).join("")}</div>
            <div className="flex-1">
              <div className="text-sm">{u.n}</div>
              <div className="text-xs text-muted-foreground">{u.e}</div>
            </div>
            <span className="text-xs px-2 py-0.5 rounded border border-border">{u.r}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function NotificationsConfig() {
  return (
    <Panel title="Notifications">
      <div className="p-4">
        <Toggle label="Fraud cluster alerts" />
        <Toggle label="Human escalation required" />
        <Toggle label="Daily operations digest" on={false} />
        <Toggle label="Compliance audit ready" />
      </div>
    </Panel>
  );
}
