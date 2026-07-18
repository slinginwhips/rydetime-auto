interface CarfaxBadgesProps {
  oneOwner: boolean;
  accidentFree: boolean;
  serviceRecords: boolean;
  greatValue: boolean;
  goodValue: boolean;
  /** Optional Carfax report link — badges become clickable when provided. */
  href?: string;
  className?: string;
}

interface BadgeDef {
  label: string;
  /** "value" badges get the highlighted (fox-orange) treatment. */
  highlight?: boolean;
}

/**
 * Per-vehicle Carfax trust badges. Driven by the carfax_badge_* flags on the
 * vehicle record (sourced from the DealerCenter / Carfax feed), so each car
 * shows only the badges it actually qualifies for. Styled for the dark theme.
 */
export default function CarfaxBadges({
  oneOwner,
  accidentFree,
  serviceRecords,
  greatValue,
  goodValue,
  href,
  className = "",
}: CarfaxBadgesProps) {
  const badges: BadgeDef[] = [];
  if (greatValue) badges.push({ label: "CARFAX Great Value", highlight: true });
  if (goodValue) badges.push({ label: "CARFAX Good Value", highlight: true });
  if (oneOwner) badges.push({ label: "CARFAX 1-Owner" });
  if (accidentFree) badges.push({ label: "No Accidents Reported" });
  if (serviceRecords) badges.push({ label: "Service History" });

  if (badges.length === 0) return null;

  const Wrapper = href ? "a" : "div";
  const wrapperProps = href
    ? { href, target: "_blank", rel: "noopener noreferrer", "aria-label": "View the Carfax report (opens in a new tab)" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`flex flex-wrap gap-2 ${href ? "group cursor-pointer" : ""} ${className}`}
    >
      {badges.map((b) => (
        <span
          key={b.label}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
            b.highlight
              ? "border-[#F47B20]/40 bg-[#F47B20]/10 text-[#F9A05B]"
              : "border-border-subtle bg-surface text-text-secondary group-hover:border-[#1C448C]/60"
          }`}
        >
          {/* Carfax fox-orange check mark */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="#F47B20" />
            <path
              d="M7 12.5 L10.5 16 L17 8.5"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          {b.label}
        </span>
      ))}
    </Wrapper>
  );
}
