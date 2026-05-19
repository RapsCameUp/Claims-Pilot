import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { useState, FormEvent } from "react";
import { api, setToken } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — ClaimPilot AI" }] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("aisha@gmail.com");
  const [pw, setPw] = useState("Password@20");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const result = await api.auth.login(email, pw);
      setToken(result.token);
      try { localStorage.setItem("cp_user", JSON.stringify(result.user)); } catch {}
      navigate({ to: "/app/dashboard" });
    } catch (error: any) {
      setErr(error.message || "Invalid credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:block bg-aurora overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">ClaimPilot AI</span>
        </Link>
        <div className="absolute inset-0 grid place-items-center p-12">
          <div className="max-w-md">
            <div className="text-[10px] uppercase tracking-widest text-primary">Platform</div>
            <h1 className="mt-3 text-4xl font-display font-semibold">Operate your AI claims workforce.</h1>
            <p className="mt-4 text-muted-foreground">7 specialized agents. Live across investigation, fraud and settlement. One enterprise control plane.</p>
            <div className="mt-8 glass rounded-xl p-4 text-sm">
              <div className="flex items-center gap-2 text-success">
                <ShieldCheck className="size-4" /> SOC2 · POPIA · ISO 27001
              </div>
              <div className="mt-2 text-xs text-muted-foreground font-mono">Demo · aisha@gmail.com · Password@20</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid place-items-center p-8 bg-background">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-2xl font-display font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your ClaimPilot workspace.</p>
          <div className="mt-6 space-y-3">
            <Field label="Work email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input" />
            </Field>
            <Field label="Password">
              <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" className="input" />
            </Field>
            {err && <div className="text-xs text-danger">{err}</div>}
            <button disabled={loading} className="w-full h-10 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? "Signing in…" : <>Sign in <ArrowRight className="size-4" /></>}
            </button>
            <div className="text-center text-xs text-muted-foreground">
              No account? <Link to="/register" className="text-primary hover:underline">Request access</Link>
            </div>
          </div>
        </form>
      </div>

      <style>{`.input{height:40px;width:100%;background:color-mix(in oklab, var(--muted) 60%, transparent);border:1px solid var(--border);border-radius:.5rem;padding:0 .75rem;font-size:.875rem;color:var(--foreground);outline:none}.input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklab, var(--primary) 20%, transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
