import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Shield, Users, BookOpen, Home } from "lucide-react";

const portalInfo: Record<string, { label: string; path: string; icon: React.ElementType }> = {
  BRAMBLE_OPERATOR: { label: "Bramble Console", path: "/operator", icon: Shield },
  COOP_ADMIN: { label: "Co-op Admin", path: "/app/admin", icon: Users },
  INSTRUCTOR: { label: "Instructor Portal", path: "/app/instructor", icon: BookOpen },
  FAMILY: { label: "Family Portal", path: "/app/family", icon: Home },
};

interface RoleSwitcherProps {
  currentPortal: string;
  variant?: "default" | "sidebar";
}

export function RoleSwitcher({ currentPortal, variant = "default" }: RoleSwitcherProps) {
  const { availablePortals, switchPortal, user } = useAuth();

  const isImpersonating = user?.isImpersonating || false;
  
  if (availablePortals.length <= 1 && !isImpersonating) {
    return null;
  }

  const currentInfo = portalInfo[currentPortal];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={variant === "sidebar" ? "w-full justify-between text-stone-600 hover:text-stone-900" : ""}
          data-testid="button-switch-portal"
        >
          <span className="flex items-center gap-2">
            {currentInfo && <currentInfo.icon className="w-4 h-4" />}
            <span className="truncate">{currentInfo?.label || currentPortal}</span>
          </span>
          <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Portal</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availablePortals.map((portal) => {
          const info = portalInfo[portal];
          const isActive = portal === currentPortal;
          return (
            <DropdownMenuItem
              key={portal}
              onClick={() => switchPortal(portal)}
              className={isActive ? "bg-stone-100" : ""}
              data-testid={`menu-portal-${portal.toLowerCase()}`}
            >
              {info && <info.icon className="w-4 h-4 mr-2" />}
              {info?.label || portal}
              {isActive && <span className="ml-auto text-xs text-stone-400">(current)</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
