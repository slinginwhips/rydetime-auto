interface CarfaxButtonProps {
  vin: string;
  carfaxUrl: string | null;
}

/**
 * "SHOW ME THE CARFAX" button following Carfax brand guidance:
 * white background, Carfax dark blue text, fox orange accent.
 */
export default function CarfaxButton({ vin, carfaxUrl }: CarfaxButtonProps) {
  const href = carfaxUrl || `https://www.carfax.com/vehicle/${encodeURIComponent(vin)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="shimmer-hover flex w-full items-center justify-center gap-2 rounded-md border border-[#D8D8D8] bg-white px-4 py-3 text-sm font-bold tracking-wide text-[#1C448C] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30"
      aria-label={`View the Carfax vehicle history report for VIN ${vin} (opens in a new tab)`}
    >
      {/* Fox-orange check accent */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
      SHOW ME THE CARFAX
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}
