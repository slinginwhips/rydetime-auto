"use client";

interface CarfaxButtonProps {
  vin: string;
  /** Resolved, partner-attributed Carfax report URL for this VIN. */
  href: string;
  /** "md" for vehicle pages, "sm" for inventory cards. */
  size?: "sm" | "md";
}

// Official Carfax "Show me the CARFAX" button artwork (155x56), served from
// Carfax's subscriber assets. Self-hosted from /public as the PRIMARY source:
// Carfax intermittently blocks hotlinking that host, which is what made the
// button render broken/"funky". The remote copy is only a last-resort fallback.
const CARFAX_IMG = "/showmethecarfax.jpg";
const CARFAX_IMG_REMOTE = "https://www.carfaxonline.com/assets/subscriber/showmethecarfax.jpg";

/**
 * Official "SHOW ME THE CARFAX" button. The official artwork is a white-background
 * JPG, so the graphic itself IS the button face — no padding or pill behind it,
 * just rounded corners and a soft shadow so its white edge reads as a clean button
 * on the dark theme. Centered on vehicle pages (md); left-aligned on cards (sm).
 */
export default function CarfaxButton({ vin, href, size = "md" }: CarfaxButtonProps) {
  const md = size === "md";
  const link = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block overflow-hidden rounded-lg shadow-md shadow-black/30 ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
      aria-label={`Show me the Carfax vehicle history report for VIN ${vin} (opens in a new tab)`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CARFAX_IMG}
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.src.endsWith(CARFAX_IMG_REMOTE)) img.src = CARFAX_IMG_REMOTE;
        }}
        alt="Show me the Carfax"
        width={155}
        height={56}
        className={`block w-auto ${md ? "h-12" : "h-9"}`}
      />
    </a>
  );

  // md: center it in the VDP action stack. sm: sit inline-left in the card body.
  return md ? <div className="flex justify-center">{link}</div> : link;
}
