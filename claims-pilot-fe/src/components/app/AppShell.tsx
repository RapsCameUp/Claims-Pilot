import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileSearch, ShieldAlert, BarChart3, Settings,
  Sparkles, Bell, Search, ChevronRight, Command, PlusCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

const NAV = [
  { to: "/app/dashboard", label: "Operations", icon: LayoutDashboard },
  { to: "/app/new-claim", label: "New Claim", icon: PlusCircle, badge: "AI" },
  { to: "/app/investigation", label: "Investigation", icon: FileSearch, badge: "LIVE" },
  { to: "/app/fraud", label: "Fraud Intelligence", icon: ShieldAlert },
  { to: "/app/analytics", label: "Process Intelligence", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) => path.startsWith(n.to))?.label ?? "Operations";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">ClaimPilot AI</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Claims Intelligence</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 mb-2">Workspace</div>
          {NAV.map((item) => {
            const active = path === item.to || (item.to !== "/app/dashboard" && path.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                }`}
              >
                {active && (
                  <motion.span layoutId="nav-glow" className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-primary shadow-glow" />
                )}
                <item.icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-danger/10 text-danger border border-danger/30">
                    <span className="inline-block size-1 rounded-full bg-danger pulse-dot mr-1 align-middle" />
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="glass rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">AK</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">Adriaan Kruger</div>
                <div className="text-[10px] text-muted-foreground truncate">Senior Adjuster · admin</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border glass-strong flex items-center px-6 gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>ClaimPilot</span>
            <ChevronRight className="size-3" />
            <span className="text-foreground font-medium">{current}</span>
          </div>
          <div className="flex-1 max-w-md mx-auto relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search claims, policies, vendors…"
              className="w-full h-9 bg-muted/50 border border-border rounded-lg pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground flex items-center gap-1">
              <Command className="size-3" /> K
            </kbd>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="size-2 rounded-full bg-success pulse-dot" />
              <span className="text-muted-foreground">7 agents online</span>
            </div>
            <button className="relative size-9 rounded-lg border border-border grid place-items-center hover:bg-accent">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-danger" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-mesh">
          {children}
        </main>
      </div>
    </div>
  );
}
