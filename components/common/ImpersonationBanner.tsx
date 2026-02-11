import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

export function ImpersonationBanner() {
  const { user, stopImpersonation } = useAuth();

  if (!user?.isImpersonating) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-md z-50">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">
          Viewing as: {user.firstName} {user.lastName} ({user.email})
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-white hover:bg-amber-600 hover:text-white"
        onClick={stopImpersonation}
        data-testid="button-stop-impersonation"
      >
        <X className="w-4 h-4 mr-1" />
        Exit View
      </Button>
    </div>
  );
}
