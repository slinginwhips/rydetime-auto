import Image from "next/image";

interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
}

/**
 * RydeTime Auto brand mark — chrome 3D wheel with red triangle at 12 o'clock
 * and RYDETIME AUTO wordmark on a pill background. "dark" = black pill with
 * white text for dark backgrounds, "light" = white pill with black text for
 * light backgrounds. Server-safe (no client hooks).
 */
const VARIANTS = {
  dark: { src: "/logo-header-dark.png", width: 643, height: 192 },
  light: { src: "/logo-header.png", width: 584, height: 192 },
} as const;

export default function Logo({ variant = "dark", className }: LogoProps) {
  const v = VARIANTS[variant];
  return (
    <Image
      src={v.src}
      alt="RydeTime Auto"
      width={v.width}
      height={v.height}
      className={className}
      priority
    />
  );
}
