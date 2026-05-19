import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Building2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { api, setToken } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Request access — ClaimPilot AI" }] }),
  component: Register,
});

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      const result = await api.auth.register({ email, password, firstName, lastName });
      setToken(result.token);
      try { localStorage.setItem("cp_user", JSON.stringify(result.user)); } catch {}
      navigate({ to: "/app/dashboard" });
    } catch (error: any) {
      setErr(error.message || "Registration failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="grid place-items-center p-8 bg-background order-2 lg:order-1">
        <form onSubmit={submit} className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow"><Sparkles className="size-4 text-primary-foreground" /></div>
            <span className="font-semibold">ClaimPilot AI</span>
          </Link>
          <h2 className="text-2xl font-display font-semibold tracking-tight">Request enterprise access</h2>
          <p className="mt-1 text-sm text-muted-foreground">Get a private workspace provisioned for your insurer.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Field label="First name"><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
            <Field label="Last name"><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
            <div className="col-span-2"><Field label="Work email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
            <div className="col-span-2"><Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field></div>
          </div>
          {err && <div className="mt-2 text-xs text-danger">{err}</div>}
          <button disabled={loading} className="mt-5 w-full h-10 rounded-lg bg-gradient-primary text-primary-foreground font-medium shadow-glow inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? "Provisioning workspace…" : <>Create workspace <ArrowRight className="size-4" /></>}
          </button>
          <div className="mt-3 text-center text-xs text-muted-foreground">
            Already a customer? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </div>
        </form>
      </div>

      <div className="relative hidden lg:block bg-aurora overflow-hidden order-1 lg:order-2">
        <div className="absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
        <Link to="/" className="absolute top-8 right-8 flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow"><Sparkles className="size-4 text-primary-foreground" /></div>
          <span className="font-semibold">ClaimPilot AI</span>
        </Link>
        <div className="absolute inset-0 grid place-items-center p-12">
          <div className="max-w-md">
            <div className="text-[10px] uppercase tracking-widest text-primary">Enterprise</div>
            <h1 className="mt-3 text-4xl font-display font-semibold">A claims workforce that scales with you.</h1>
            <div className="mt-8 grid gap-3">
              {["Private cloud or VPC deployment","SAML SSO + role-based access","POPIA & GDPR compliant","White-glove onboarding"].map(x => (
                <div key={x} className="glass rounded-lg p-3 text-sm flex items-center gap-2"><Building2 className="size-4 text-primary" />{x}</div>
              ))}
            </div>
          </div>
        </div>
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
