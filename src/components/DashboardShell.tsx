import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LogOut,
  Settings as SettingsIcon,
  LayoutDashboard,
  UserCircle,
  Menu,
  X,
  Loader2,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { bootstrapOfflineData } from "@/lib/offline/bootstrap";
import { startSyncEngine } from "@/lib/offline/syncEngine";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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
  const [mobileOpen, setMobileOpen] = useState(false);

  // Kick off offline bootstrap once we have a school, and start the sync
  // engine so queued changes flush whenever connectivity returns.
  useEffect(() => {
    startSyncEngine(() => profile?.school_id ?? null);
  }, [profile?.school_id]);
  useEffect(() => {
    if (!profile?.school_id) return;
    void bootstrapOfflineData({ schoolId: profile.school_id }).catch((e) => {
      console.warn("Offline bootstrap failed", e);
    });
  }, [profile?.school_id]);

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  };

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  const sidebarNav: NavItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/attendance-record", label: "Attendance record", icon: ClipboardList },
    { to: "/courses", label: "Courses", icon: BookOpen },
    { to: "/settings", label: "My Profile", icon: UserCircle },
    ...nav,
  ];

  const SidebarBody = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <div className="leading-tight">
          <div className="font-display font-bold text-sm">EdoSAS</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{roleLabel}</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {sidebarNav.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground font-medium shadow-card"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="px-2 py-1.5 mb-2 leading-tight">
          <div className="text-sm font-medium truncate">{profile?.full_name ?? "—"}</div>
          <div className="text-xs text-muted-foreground truncate">{profile?.designation ?? roleLabel}</div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1.5" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border sticky top-0 h-dvh pt-safe pb-safe pl-safe">
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85%] bg-sidebar border-r border-sidebar-border h-full pt-safe pb-safe pl-safe">
            <button
              className="absolute top-3 right-3 p-1 rounded-md hover:bg-sidebar-accent tap-target"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarBody}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col md:ml-4">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-card border-b border-border h-14 px-4 pr-safe pl-safe pt-safe flex items-center justify-between">
          <button
            className="p-2 -ml-2 rounded-md hover:bg-muted tap-target"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Logo className="h-7 w-7" />
            <span className="font-display font-bold text-sm">EdoSAS</span>
          </div>
          <NotificationsBell />
        </header>

        <div className="hidden md:flex sticky top-0 z-30 bg-card/60 backdrop-blur border-b border-border h-14 px-6 items-center justify-end">
          <NotificationsBell />
        </div>

        <main className="flex-1 p-5 sm:p-8 lg:p-10 xl:p-12 pr-safe pl-safe pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <SyncStatusBar className="mb-4" />
          {children}
        </main>
      </div>
    </div>
  );
}

export function roleLabelFor(role: ReturnType<typeof primaryRole>) {
  switch (role) {
    case "admin":
      return "EdoSAS Administrator";
    case "head_teacher":
      return "Head Teacher";
    default:
      return "Teacher";
  }
}
