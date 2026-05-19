import { motion } from "framer-motion";
import { ReactNode } from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export function Kpi({
  label, value, delta, icon: Icon, accent = "info", suffix,
}: {
  label: string; value: string | number; delta?: number; icon: LucideIcon;
  accent?: "info" | "success" | "warning" | "danger" | "cyan"; suffix?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4 relative overflow-hidden group"
    >
      <div className={`absolute -top-10 -right-10 size-32 rounded-full blur-3xl opacity-40 bg-${accent}/10`} style={{ background: `color-mix(in oklab, var(--${accent}) 20%, transparent)` }} />
      <div className="flex items-start justify-between relative">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold font-display tracking-tight">
            {value}{suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
          </div>
        </div>
        <div className={`size-9 rounded-lg grid place-items-center border border-border`} style={{ background: `color-mix(in oklab, var(--${accent}) 15%, transparent)`, color: `var(--${accent})` }}>
          <Icon className="size-4" />
        </div>
      </div>
      {typeof delta === "number" && (
        <div className={`mt-3 flex items-center gap-1 text-xs ${positive ? "text-success" : "text-danger"}`}>
          {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          <span className="font-medium">{positive ? "+" : ""}{delta}%</span>
          <span className="text-muted-foreground">vs last 7d</span>
        </div>
      )}
    </motion.div>
  );
}

export function Panel({ title, children, action, className = "" }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-xl ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: "info" | "success" | "warning" | "danger" | "cyan" | "muted"; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border"
      style={{
        background: tone === "muted" ? "color-mix(in oklab, var(--muted) 60%, transparent)" : `color-mix(in oklab, var(--${tone}) 12%, transparent)`,
        borderColor: tone === "muted" ? "var(--border)" : `color-mix(in oklab, var(--${tone}) 40%, transparent)`,
        color: tone === "muted" ? "var(--muted-foreground)" : `var(--${tone})`,
      }}
    >
      {tone !== "muted" && <span className="size-1.5 rounded-full pulse-dot" style={{ background: `var(--${tone})` }} />}
      {children}
    </span>
  );
}
