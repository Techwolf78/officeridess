import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Link } from "wouter";

interface DriverBadgeProps {
  verificationStatus?: "basic" | "pending" | "verified";
  userId?: string;
  size?: "sm" | "md";
  clickable?: boolean; // If true, unverified badge links to verification page
  simplifiedDisplay?: boolean; // If true, show only "Basic/Verified" (hides "Pending" as "Basic")
}

export function DriverBadge({
  verificationStatus = "basic",
  userId,
  size = "sm",
  clickable = false,
  simplifiedDisplay = false,
}: DriverBadgeProps) {
  // Map status to display status (for simplified view, basic + pending both show as "Basic")
  const displayStatus = simplifiedDisplay
    ? verificationStatus === "verified"
      ? "verified"
      : "basic" // Both "basic" and "pending" show as "basic"
    : verificationStatus;

  const badgeConfig = {
    basic: {
      icon: <AlertCircle className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />,
      label: "Basic",
      variant: "secondary" as const,
      className: "bg-gray-100 text-gray-700 border-gray-200",
    },
    pending: {
      icon: <Clock className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />,
      label: "Pending",
      variant: "destructive" as const,
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    verified: {
      icon: <CheckCircle className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />,
      label: "Verified",
      variant: "default" as const,
      className: "bg-green-50 text-green-700 border-green-200",
    },
  };

  const config = badgeConfig[displayStatus];

  const badgeContent = (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1 whitespace-nowrap ${config.className} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      }`}
    >
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );

  // Only make basic badges clickable if clickable prop is true
  if (clickable && displayStatus === "basic") {
    return <Link href="/verification-required">{badgeContent}</Link>;
  }

  return badgeContent;
}
