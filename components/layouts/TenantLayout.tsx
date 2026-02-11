import { Link, useLocation } from "wouter";
import { ReactNode, useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Users, 
  GraduationCap,
  Palette,
  Globe,
  Receipt,
  Settings,
  MessageSquare,
  LogOut,
  Leaf,
  CalendarDays,
  Home,
  CreditCard,
  PlusCircle,
  DollarSign,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RoleSwitcher } from "@/components/common/RoleSwitcher";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

interface PendingCounts {
  pendingFamilies: number;
  pendingInstructors: number;
  pendingClasses: number;
  pendingEvents: number;
}

const adminNavigation = [
  { name: "Dashboard", href: "/app/admin", icon: LayoutDashboard, badgeKey: null },
  { name: "Calendar", href: "/app/admin/calendar", icon: CalendarDays, badgeKey: null },
  { name: "Course Library", href: "/app/admin/courses", icon: BookOpen, badgeKey: "pendingClasses" },
  { name: "Events", href: "/app/admin/events", icon: Calendar, badgeKey: "pendingEvents" },
  { name: "Families", href: "/app/admin/families", icon: Users, badgeKey: "pendingFamilies" },
  { name: "Instructors", href: "/app/admin/instructors", icon: GraduationCap, badgeKey: "pendingInstructors" },
  { name: "Communications", href: "/app/admin/communications", icon: MessageSquare, badgeKey: null },
  { name: "Payments", href: "/app/admin/payments", icon: Receipt, badgeKey: null },
  { name: "Providers", href: "/app/admin/providers", icon: Building2, badgeKey: null },
  { name: "Branding", href: "/app/admin/branding", icon: Palette, badgeKey: null },
  { name: "Landing Page", href: "/app/admin/landing-page", icon: Globe, badgeKey: null },
  { name: "Settings", href: "/app/admin/settings", icon: Settings, badgeKey: null },
];

const instructorNavigation = [
  { name: "Dashboard", href: "/app/instructor", icon: LayoutDashboard },
  { name: "My Classes", href: "/app/instructor/classes", icon: BookOpen },
  { name: "Calendar", href: "/app/instructor/calendar", icon: CalendarDays },
  { name: "Propose Class", href: "/app/instructor/propose", icon: PlusCircle },
  { name: "Payouts", href: "/app/instructor/payouts", icon: DollarSign },
];

const familyNavigation = [
  { name: "Dashboard", href: "/app/family", icon: Home },
  { name: "Classes", href: "/app/family/classes", icon: BookOpen },
  { name: "Calendar", href: "/app/family/calendar", icon: CalendarDays },
  { name: "Messages", href: "/app/family/messages", icon: MessageSquare },
  { name: "Payments", href: "/app/family/payments", icon: CreditCard },
];

interface TenantLayoutProps {
  children: ReactNode;
  role: "COOP_ADMIN" | "INSTRUCTOR" | "FAMILY";
  tenantName?: string;
}

export function TenantLayout({ children, role, tenantName = "Oak Hollow" }: TenantLayoutProps) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [pendingCounts, setPendingCounts] = useState<PendingCounts | null>(null);

  useEffect(() => {
    if (role === "COOP_ADMIN") {
      apiFetch<PendingCounts>("/api/tenant/pending-counts").then(({ data, error }) => {
        if (data && !error) {
          setPendingCounts(data);
        }
      });
    }
  }, [role]);

  const navigation = role === "COOP_ADMIN" 
    ? adminNavigation 
    : role === "INSTRUCTOR" 
      ? instructorNavigation 
      : familyNavigation;

  const roleLabel = role === "COOP_ADMIN" 
    ? "Co-op Admin" 
    : role === "INSTRUCTOR" 
      ? "Instructor" 
      : "Family";

  const getBadgeCount = (key: string | null | undefined) => {
    if (!key || !pendingCounts) return 0;
    return pendingCounts[key as keyof PendingCounts] || 0;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border/50">
          <Leaf className="h-6 w-6 text-sidebar-primary mr-2" />
          <span className="text-lg font-serif font-semibold tracking-tight">{user?.tenantName || tenantName}</span>
        </div>
        
        <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
          <div className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {roleLabel}
          </div>
          {navigation.map((item) => {
            const baseHref = role === "COOP_ADMIN" ? "/app/admin" : role === "INSTRUCTOR" ? "/app/instructor" : "/app/family";
            const isActive = location === item.href || (item.href !== baseHref && location.startsWith(item.href));
            const badgeCount = 'badgeKey' in item ? getBadgeCount((item as { badgeKey?: string | null }).badgeKey) : 0;
            
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="flex items-center gap-3">
                  <item.icon className={cn("h-4 w-4", isActive ? "text-sidebar-primary" : "text-muted-foreground")} />
                  {item.name}
                </span>
                {badgeCount > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center">
                    {badgeCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border/50 space-y-3">
          <RoleSwitcher currentPortal={role} variant="sidebar" />
          <button 
            onClick={logout}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer w-full"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
