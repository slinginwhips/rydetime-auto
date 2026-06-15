/**
 * Carfax provider — builds report URLs and surfaces badge data.
 * Badge data itself comes from the DealerCenter feed and lives on the vehicle record.
 */
export interface CarfaxProvider {
  getReportUrl(vin: string, storedUrl?: string | null): string;
}

// RydeTime Auto's Carfax partner code. Public (it appears in the report URL),
// so it is safe to ship; override via the CARFAX_PARTNER_CODE env var if it
// ever changes.
const DEFAULT_PARTNER_CODE = "DVW_1";

export class DefaultCarfaxProvider implements CarfaxProvider {
  getReportUrl(vin: string, storedUrl?: string | null): string {
    const envCode = process.env.CARFAX_PARTNER_CODE;
    const partnerCode = envCode && !envCode.includes("your_carfax") ? envCode : DEFAULT_PARTNER_CODE;

    // 1. Partner-attributed report URL built from the VIN (preferred — this is
    //    what credits RydeTime Auto and renders the dealer-facing report).
    if (partnerCode) {
      return `https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=${encodeURIComponent(partnerCode)}&vin=${encodeURIComponent(vin)}`;
    }

    // 2. Fall back to a stored feed URL, then a generic lookup.
    if (storedUrl) return storedUrl;
    return `https://www.carfax.com/vehicle/${encodeURIComponent(vin)}`;
  }
}

export function getCarfaxProvider(): CarfaxProvider {
  return new DefaultCarfaxProvider();
}
