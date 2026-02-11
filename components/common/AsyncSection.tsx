import { ReactNode } from "react";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface AsyncSectionProps {
  loading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  children: ReactNode;
  loadingMessage?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptyAccentColor?: string;
  onRetry?: () => void;
  className?: string;
}

export function AsyncSection({
  loading,
  error,
  isEmpty,
  children,
  loadingMessage,
  emptyIcon,
  emptyTitle = "No items found",
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  emptyAccentColor,
  onRetry,
  className,
}: AsyncSectionProps) {
  if (loading) {
    return <LoadingState message={loadingMessage} />;
  }

  if (error) {
    return (
      <Card className={`border-red-200 bg-red-50 ${className || ""}`}>
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="font-medium text-stone-800 mb-1">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} data-testid="button-retry">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isEmpty && emptyIcon) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription || ""}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        accentColor={emptyAccentColor}
      />
    );
  }

  if (isEmpty) {
    return (
      <Card className={`border-dashed ${className || ""}`}>
        <CardContent className="py-8 text-center">
          <h3 className="font-medium text-stone-800 mb-1">{emptyTitle}</h3>
          {emptyDescription && (
            <p className="text-sm text-muted-foreground">{emptyDescription}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
