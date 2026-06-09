import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Settings as SettingsIcon, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ReactNode } from "react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function DashboardShell({
  children,
  nav,
  roleLabel,
}: {
  children: ReactNode;
  nav: NavItem[];
  roleLabel: string;
}) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-card sticky top-0 z-40 pt-safe">
        <div className="container mx-auto px-4 pl-safe pr-safe h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <Logo className="h-10 w-10" />
            <div className="leading-tight">
              <div className="font-display font-bold text-sm">EdoSUBEB</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{roleLabel}</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right leading-tight">
              <div className="text-sm font-medium">{profile?.full_name ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{profile?.designation ?? roleLabel}</div>
            </div>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center h-9 px-3 rounded-md text-sm hover:bg-muted text-muted-foreground hover:text-foreground tap-target"
              aria-label="Settings"
            >
              <SettingsIcon className="h-4 w-4 md:mr-1.5" />
              <span className="hidden md:inline">Settings</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="tap-target">
              <LogOut className="h-4 w-4 md:mr-1.5" />
              <span className="hidden md:inline">Sign out</span>
            </Button>
          </div>
        </div>
        {nav.length > 0 && (
          <nav className="container mx-auto px-4 pl-safe pr-safe flex gap-1 overflow-x-auto">
            {nav.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap tap-target ${
                    active
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 pl-safe pr-safe py-6 md:py-8 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {children}
      </main>
    </div>
  );
}

export function roleLabelFor(role: ReturnType<typeof primaryRole>) {
  switch (role) {
    case "admin":
      return "EdoSUBEB Administrator";
    case "head_teacher":
      return "Head Teacher";
    default:
      return "Teacher";
  }
}
