"use client";

interface CarfaxButtonProps {
  vin: string;
  /** Resolved, partner-attributed Carfax report URL for this VIN. */
  href: string;
  /** "md" for vehicle pages, "sm" for inventory cards. */
  size?: "sm" | "md";
}

// Official Carfax "SHOW ME THE CARFAX" logo, cropped tight from Carfax's
// subscriber asset (the raw showmethecarfax.jpg has the logo jammed in the
// top-left of a big white canvas — that baked-in white space was the "white
// box, logo not centered" bug) and upscaled 3x so it stays smooth on hi-DPI
// screens. It's black artwork on white, so it sits on a white button face.
const CARFAX_LOGO = "/showmethecarfax-logo.png";

/**
 * Official "SHOW ME THE CARFAX" button: the black logo centered on a clean
 * white button face (rounded, soft shadow) so it reads as the recognizable
 * Carfax button on the dark theme. Centered on vehicle pages (md); left-aligned
 * on cards (sm).
 */
export default function CarfaxButton({ vin, href, size = "md" }: CarfaxButtonProps) {
  const md = size === "md";
  const link = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-lg bg-white shadow-md shadow-black/30 ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 ${
        md ? "px-4 py-2.5" : "px-3 py-1.5"
      }`}
      aria-label={`Show me the Carfax vehicle history report for VIN ${vin} (opens in a new tab)`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CARFAX_LOGO}
        alt="Show me the Carfax"
        width={264}
        height={93}
        className={`block w-auto ${md ? "h-7" : "h-5"}`}
      />
    </a>
  );

  // md: center it in the VDP action stack. sm: sit inline-left in the card body.
  return md ? <div className="flex justify-center">{link}</div> : link;
}
