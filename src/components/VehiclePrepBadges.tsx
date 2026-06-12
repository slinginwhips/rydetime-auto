import Reveal from "@/components/Reveal";
import type { VehiclePrepBadge, PrepBadgeType } from "@/types/vehicle";

interface VehiclePrepBadgesProps {
  badges: VehiclePrepBadge[];
}

const BADGE_LABELS: Record<PrepBadgeType, string> = {
  state_inspection: "VA State Inspection",
  oil_change: "Fresh Oil Change",
  new_tires: "New Tires",
  new_brakes: "New Brakes",
  detailed: "Fully Detailed",
  multi_point_review: "Multi-Point Review",
  battery_checked: "Battery Checked",
  fluids_topped: "Fluids Topped Off",
};

function BadgeIcon({ type }: { type: PrepBadgeType }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (type) {
    case "state_inspection":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      );
    case "oil_change":
      return (
        <svg {...common}>
          <path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0L12 2.7z" />
          <circle cx="12" cy="14" r="2" />
        </svg>
      );
    case "new_tires":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="3" x2="12" y2="8" />
          <line x1="12" y1="16" x2="12" y2="21" />
          <line x1="3" y1="12" x2="8" y2="12" />
          <line x1="16" y1="12" x2="21" y2="12" />
        </svg>
      );
    case "new_brakes":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3a9 9 0 0 1 9 9" strokeWidth="3" />
        </svg>
      );
    case "detailed":
      return (
        <svg {...common}>
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          <path d="M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z" />
        </svg>
      );
    case "multi_point_review":
      return (
        <svg {...common}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "battery_checked":
      return (
        <svg {...common}>
          <rect x="2" y="7" width="18" height="12" rx="2" />
          <line x1="22" y1="11" x2="22" y2="15" />
          <line x1="6" y1="11" x2="6" y2="15" />
          <line x1="4" y1="13" x2="8" y2="13" />
          <line x1="14" y1="13" x2="18" y2="13" />
        </svg>
      );
    case "fluids_topped":
      return (
        <svg {...common}>
          <path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0L12 2.7z" />
          <path d="M8 14a4 4 0 0 0 4 4" />
        </svg>
      );
  }
}

export default function VehiclePrepBadges({ badges }: VehiclePrepBadgesProps) {
  if (!badges.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {badges.map((badge, i) => (
        <Reveal key={badge.id} variant="pop" delay={i * 70}>
          <div className="shimmer-hover flex items-center gap-2.5 rounded-md border border-border-subtle bg-background-card px-3 py-2.5">
            <span className="text-accent">
              <BadgeIcon type={badge.badge_type} />
            </span>
            <span className="text-sm font-medium text-text-primary">
              {BADGE_LABELS[badge.badge_type]}
            </span>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
