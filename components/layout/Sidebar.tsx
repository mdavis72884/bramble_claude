import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  FileText, 
  Shield, 
  LogOut,
  Mail,
  Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { RoleSwitcher } from "@/components/RoleSwitcher";

const navigation = [
  { name: "Dashboard", href: "/operator", icon: LayoutDashboard },
  { name: "Tenants", href: "/operator/tenants", icon: Users },
  { name: "Payments", href: "/operator/payments", icon: CreditCard },
  { name: "Email System", href: "/operator/email", icon: Mail },
  { name: "Fees", href: "/operator/fees", icon: FileText },
  { name: "Audit Logs", href: "/operator/audit", icon: Shield },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border/50">
        <Leaf className="h-6 w-6 text-sidebar-primary mr-2" />
        <span className="text-lg font-serif font-semibold tracking-tight">Bramble</span>
      </div>
      
      <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        <div className="px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Platform
        </div>
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-sidebar-primary" : "text-muted-foreground")} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border/50 space-y-3">
        <RoleSwitcher currentPortal="BRAMBLE_OPERATOR" variant="sidebar" />
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
  );
}
