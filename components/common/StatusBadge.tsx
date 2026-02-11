import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "pending"
  | "approved"
  | "published"
  | "draft"
  | "rejected"
  | "active"
  | "inactive"
  | "suspended"
  | "cancelled"
  | "completed"
  | "pending_approval";

interface StatusBadgeProps {
  status: string;
  className?: string;
  testId?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  pending_approval: {
    label: "Pending Approval",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  published: {
    label: "Published",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  draft: {
    label: "Draft",
    className: "bg-stone-100 text-stone-600 hover:bg-stone-100",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  active: {
    label: "Active",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  inactive: {
    label: "Inactive",
    className: "bg-stone-100 text-stone-600 hover:bg-stone-100",
  },
  suspended: {
    label: "Suspended",
    className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
};

function normalizeStatus(status: string): StatusType {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  if (normalized in statusConfig) {
    return normalized as StatusType;
  }
  if (normalized === "pending approval" || normalized === "pendingapproval") {
    return "pending_approval";
  }
  return "draft";
}

export function StatusBadge({ status, className, testId }: StatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status);
  const config = statusConfig[normalizedStatus];

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, className)}
      data-testid={testId || `badge-status-${normalizedStatus}`}
    >
      {config.label}
    </Badge>
  );
}

export function ApplicationStatusBadge({ status, className, testId }: StatusBadgeProps) {
  const statusMap: Record<string, StatusType> = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  };
  const normalizedStatus = statusMap[status.toUpperCase()] || normalizeStatus(status);
  const config = statusConfig[normalizedStatus];

  return (
    <Badge
      variant="secondary"
      className={cn(config.className, className)}
      data-testid={testId || `badge-application-${normalizedStatus}`}
    >
      {config.label}
    </Badge>
  );
}
