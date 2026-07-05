import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Map,
  BarChart3,
  Building2,
  School as SchoolIcon,
  UserPlus,
  LogOut,
  Menu,
  X,
  Loader2,
  Settings as SettingsIcon,
  GraduationCap,
  Clock,
  FileDown,
  CalendarDays,
  Bot,
  Activity,
  UploadCloud,
  BookOpen,
} from "lucide-react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth, primaryRole } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  useSchools,
  useTeacherProfiles,
  useStudents,
  useTeacherAttendanceToday,
  useStudentAttendanceToday,
} from "@/lib/admin-data";
import { useAttendanceRealtime } from "@/lib/use-attendance-realtime";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/lga", label: "By LGA", icon: Building2, end: false },
  { to: "/admin/school-type", label: "By School Type", icon: SchoolIcon, end: false },
  { to: "/admin/flagged", label: "Late & Out of Range", icon: AlertTriangle, end: false },
  { to: "/admin/students", label: "Admitted Pupils", icon: GraduationCap, end: false },
  { to: "/admin/pupil-attendance", label: "Attendance (Deep Dive)", icon: Clock, end: false },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, end: false },
  { to: "/admin/reports", label: "Reports", icon: FileDown, end: false },
  { to: "/admin/map", label: "Map", icon: Map, end: false },
  { to: "/admin/calendar", label: "Academic Calendar", icon: CalendarDays, end: false },
  { to: "/admin/assign", label: "Assign Teachers", icon: UserPlus, end: false },
  { to: "/admin/onboarding", label: "Bulk Onboarding", icon: UploadCloud, end: false },
  { to: "/admin/active-users", label: "Active Users", icon: Activity, end: false },
  { to: "/admin/courses", label: "Courses", icon: BookOpen, end: false },
  { to: "/admin/assistant", label: "AI Assistant", icon: Bot, end: false },
];



export function AdminShell() {
  const { session, loading, roles, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Warm the shared admin caches once the shell mounts so every sidebar
  // section navigates instantly from cached data.
  useSchools();
  useTeacherProfiles();
  useStudents();
  useTeacherAttendanceToday();
  useStudentAttendanceToday();

  // Live-refresh today's attendance the moment new rows are inserted/updated.
  useAttendanceRealtime();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (roles.length > 0 && primaryRole(roles) !== "admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, roles, navigate]);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (loading || !session || !profile) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  };

  const isActive = (to: string, end: boolean) =>
    end ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const SidebarBody = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-2.5">
        <Logo className="h-9 w-9" />
        <div className="leading-tight">
          <div className="font-display font-bold text-sm">EdoSAS</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Administrator</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = isActive(item.to, item.end);
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
          <div className="text-sm font-medium truncate">{profile.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">{profile.designation ?? "Administrator"}</div>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <SettingsIcon className="h-4 w-4" /> Settings
        </Link>
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pr-safe pl-safe pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, icon: Icon, actions }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      {Icon && (
        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold font-display truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="hidden md:block">
        <NotificationsBell />
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  );
}
