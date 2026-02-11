import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
  accentColor?: string;
  testId?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accentColor = "#7C9082",
  testId,
}: StatCardProps) {
  return (
    <Card 
      className="border"
      style={{ 
        background: `linear-gradient(to bottom right, ${accentColor}10, transparent)`,
        borderColor: `${accentColor}30`,
      }}
      data-testid={testId}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" style={{ color: accentColor }} />}
          <p className="text-sm text-stone-500">{label}</p>
        </div>
        <p className="text-2xl font-semibold text-stone-800 mt-1">{value}</p>
        {sublabel && <p className="text-xs text-stone-500 mt-1">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
