"use client";

interface CarfaxButtonProps {
  vin: string;
  /** Resolved, partner-attributed Carfax report URL for this VIN. */
  href: string;
}

// Official Carfax "Show me the CARFAX" button image (156x56). Hotlinked from
// Carfax per their subscriber guidance; falls back to a self-hosted copy if
// the remote asset is ever unreachable.
const CARFAX_IMG = "https://www.carfaxonline.com/assets/subscriber/showmethecarfax.jpg";
const CARFAX_IMG_FALLBACK = "/showmethecarfax.jpg";

/**
 * Official "SHOW ME THE CARFAX" button. The official artwork is a white-background
 * JPG, so the graphic itself IS the button face — no padding or pill behind it,
 * just rounded corners and a shadow so its white bg reads as a clean button edge.
 */
export default function CarfaxButton({ vin, href }: CarfaxButtonProps) {
  return (
    <div className="flex justify-center">
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
            if (img.src !== window.location.origin + CARFAX_IMG_FALLBACK) img.src = CARFAX_IMG_FALLBACK;
          }}
          alt="Show me the Carfax"
          width={156}
          height={56}
          className="block h-12 w-auto"
        />
      </a>
    </div>
  );
}
