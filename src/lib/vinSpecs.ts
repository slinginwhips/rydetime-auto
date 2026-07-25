/**
 * NHTSA vPIC VIN decoding — used to fill in the vehicle specs DealerCenter
 * doesn't send us.
 *
 * The DealerCenter sync leaves body_style, drivetrain, engine, doors and seats
 * null on every vehicle, and vehicle_features is empty across the whole lot.
 * That left the description generator with almost nothing concrete to write
 * about. Every vehicle does have a VIN, and vPIC is free and keyless, so we
 * decode on demand and hand the generator real specs instead.
 *
 * SERVER ONLY. Never throws — a decode failure just means we generate copy
 * from what the database already had.
 */

export interface VinSpecs {
  body_style: string | null;
  drivetrain: string | null;
  engine: string | null;
  transmission: string | null;
  fuel_type: string | null;
  doors: number | null;
  seats: number | null;
}

const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;
const NHTSA_ENDPOINT = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

export function normalizeVin(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidVin(vin: string): boolean {
  return VIN_REGEX.test(vin);
}

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || /^(not applicable|n\/?a)$/i.test(trimmed)) return null;
  return trimmed;
}

function toNumber(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** vPIC packs alternates into one string: "Sedan/Saloon" → "Sedan". */
function firstSegment(value: string | null): string | null {
  if (!value) return null;
  return value.split("/")[0].trim() || null;
}

/**
 * "Sport Utility Vehicle [SUV]/Multipurpose Vehicle [MPV]" → "SUV".
 * Bracketed abbreviations read better in customer copy than vPIC's long form.
 */
function formatBodyClass(value: string | null): string | null {
  const segment = firstSegment(value);
  if (!segment) return null;
  const bracketed = segment.match(/\[([^\]]+)\]/);
  if (bracketed) return bracketed[1].trim();
  return segment.replace(/\s*\[[^\]]*\]/g, "").trim() || null;
}

/** "4WD/4-Wheel Drive/4x4" → "4WD". */
function formatDriveType(value: string | null): string | null {
  const segment = firstSegment(value);
  if (!segment) return null;
  if (/^4x4$/i.test(segment)) return "4WD";
  return segment;
}

/**
 * DisplacementL + cylinder count → "3.7L 6-cylinder".
 *
 * Deliberately does NOT emit a V6/I4-style configuration prefix. vPIC's
 * EngineConfiguration is unreliable — it reports "In-Line" for the 2013 Acura
 * MDX, whose J37A is a V6 — and this string goes straight into copy customers
 * read. Cylinder count and displacement are dependable; the layout isn't.
 */
function buildEngine(row: Record<string, string | null>): string | null {
  const liters = toNumber(clean(row.DisplacementL));
  const cylinders = toNumber(clean(row.EngineCylinders));

  const litersLabel = liters != null ? `${(Math.round(liters * 10) / 10).toFixed(1)}L` : null;
  const cylindersLabel = cylinders != null ? `${cylinders}-cylinder` : null;

  const electrification = clean(row.ElectrificationLevel);
  const parts = [litersLabel, cylindersLabel].filter(Boolean) as string[];
  if (electrification && /hybrid|electric/i.test(electrification)) {
    parts.push(/plug-?in/i.test(electrification) ? "plug-in hybrid" : "hybrid");
  }
  return parts.length ? parts.join(" ") : null;
}

/** "Automatic" + 5 speeds → "5-speed automatic". */
function buildTransmission(row: Record<string, string | null>): string | null {
  const style = clean(row.TransmissionStyle);
  if (!style) return null;
  const speeds = toNumber(clean(row.TransmissionSpeeds));
  const label = firstSegment(style)!.toLowerCase();
  return speeds != null && speeds > 0 ? `${speeds}-speed ${label}` : label;
}

/**
 * Decode a VIN. Returns null when the VIN is unusable, vPIC is unreachable, or
 * the response is unparseable — callers carry on with whatever they already had.
 */
export async function decodeVinSpecs(vin: string | null | undefined): Promise<VinSpecs | null> {
  const normalized = normalizeVin(vin ?? "");
  if (!isValidVin(normalized)) return null;

  try {
    const response = await fetch(`${NHTSA_ENDPOINT}/${normalized}?format=json`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { Results?: Record<string, string | null>[] };
    const row = payload.Results?.[0];
    if (!row) return null;

    return {
      body_style: formatBodyClass(clean(row.BodyClass)),
      drivetrain: formatDriveType(clean(row.DriveType)),
      engine: buildEngine(row),
      transmission: buildTransmission(row),
      fuel_type: firstSegment(clean(row.FuelTypePrimary)),
      doors: toNumber(clean(row.Doors)),
      seats: toNumber(clean(row.Seats)),
    };
  } catch {
    return null;
  }
}
