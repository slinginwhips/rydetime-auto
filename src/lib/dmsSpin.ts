/**
 * 360 spins shot in the DMS.
 *
 * A spin lives in the DMS (its frames are public objects in the DMS photo
 * bucket). The car page asks the DMS whether this VIN has a live one —
 * "Send to website" on the spin in the DMS makes it live, "Remove from
 * website" takes it down. Any failure or slowness means no spin, never a
 * broken page.
 */

export interface DmsSpin {
  frames: { url: string }[];
  /** width / height of the frames, when the DMS knows it. */
  aspect: number | null;
}

const TIMEOUT_MS = 2500;
const DEFAULT_DMS_ORIGIN = "https://rydetime-dms.vercel.app";

function dmsOrigin(): string {
  const explicit = process.env.DMS_PUBLIC_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const intake = process.env.DMS_INTAKE_URL;
  if (intake) {
    try {
      return new URL(intake).origin;
    } catch {
      // fall through to the default
    }
  }
  return DEFAULT_DMS_ORIGIN;
}

export async function getDmsSpin(vin: string | null | undefined): Promise<DmsSpin | null> {
  if (!vin) return null;
  try {
    const res = await fetch(`${dmsOrigin()}/api/public/spin?vin=${encodeURIComponent(vin)}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { frames?: unknown; aspect?: unknown };
    const frames = Array.isArray(body.frames)
      ? body.frames
          .map((f) => (f as { url?: unknown })?.url)
          .filter((url): url is string => typeof url === "string" && /^https:\/\//.test(url))
          .map((url) => ({ url }))
      : [];
    if (frames.length === 0) return null;
    const aspect = typeof body.aspect === "number" && body.aspect > 0 ? body.aspect : null;
    return { frames, aspect };
  } catch {
    return null;
  }
}
