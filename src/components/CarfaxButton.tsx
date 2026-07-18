"use client";

interface CarfaxButtonProps {
  vin: string;
  /** Resolved, partner-attributed Carfax report URL for this VIN. */
  href: string;
  /** "md" for vehicle pages, "sm" for inventory cards. */
  size?: "sm" | "md";
}

/**
 * "SHOW ME THE CARFAX" report link, rendered in crisp HTML/SVG instead of the
 * old low-resolution raster button (which looked pixelated on high-DPI screens
 * next to the vector text buttons). White face so it reads as the recognizable
 * Carfax button on the dark theme, with the signature fox-orange check.
 */
export default function CarfaxButton({ vin, href, size = "md" }: CarfaxButtonProps) {
  const md = size === "md";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Show me the Carfax vehicle history report for VIN ${vin} (opens in a new tab)`}
      className={`inline-flex items-center rounded-lg bg-white text-black shadow-md shadow-black/25 ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 ${
        md ? "gap-2.5 px-4 py-2.5" : "gap-1.5 px-2.5 py-1.5"
      }`}
    >
      {/* Carfax fox-orange check badge */}
      <span
        className={`flex flex-shrink-0 items-center justify-center rounded-md bg-[#F47B20] ${
          md ? "h-7 w-7" : "h-5 w-5"
        }`}
      >
        <svg viewBox="0 0 24 24" className={md ? "h-4 w-4" : "h-3 w-3"} fill="none" aria-hidden="true">
          <path
            d="M5 12.5 L10 17.5 L19 6.5"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex flex-col items-start leading-none">
        <span
          className={`font-semibold uppercase tracking-wide text-[#5B5B5B] ${
            md ? "text-[10px]" : "text-[8px]"
          }`}
        >
          Show me the
        </span>
        <span
          className={`font-extrabold uppercase tracking-tight text-[#111111] ${
            md ? "text-[17px]" : "text-[12px]"
          }`}
        >
          Carfax
          <sup className={md ? "text-[8px]" : "text-[6px]"}>&reg;</sup>
        </span>
      </span>
    </a>
  );
}
