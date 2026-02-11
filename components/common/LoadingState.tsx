import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  minHeight?: string;
  showSpinner?: boolean;
}

export function LoadingState({
  message = "Loading...",
  minHeight = "200px",
  showSpinner = true,
}: LoadingStateProps) {
  return (
    <div 
      className="flex flex-col items-center justify-center text-muted-foreground gap-3"
      style={{ minHeight }}
    >
      {showSpinner && <Loader2 className="h-6 w-6 animate-spin" />}
      <span>{message}</span>
    </div>
  );
}
