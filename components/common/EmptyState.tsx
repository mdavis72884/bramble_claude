import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
  testId?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor = "#7C9082",
  testId,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 text-center">
        <div 
          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Icon className="w-8 h-8" style={{ color: accentColor }} />
        </div>
        <h3 className="font-medium text-stone-800 mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} data-testid={testId}>
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
