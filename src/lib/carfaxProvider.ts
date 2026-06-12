/**
 * Carfax provider — builds report URLs and surfaces badge data.
 * Badge data itself comes from the DealerCenter feed and lives on the vehicle record.
 */
export interface CarfaxProvider {
  getReportUrl(vin: string, storedUrl?: string | null): string;
}

export class DefaultCarfaxProvider implements CarfaxProvider {
  getReportUrl(vin: string, storedUrl?: string | null): string {
    // 1. Prefer the URL provided in the DC feed (already partner-attributed).
    if (storedUrl) return storedUrl;

    // 2. VIN-based construction with partner code.
    const partnerCode = process.env.CARFAX_PARTNER_CODE;
    if (partnerCode && !partnerCode.includes("your_carfax")) {
      return `https://www.carfax.com/VehicleHistory/p/Report.cfx?partner=${encodeURIComponent(partnerCode)}&vin=${encodeURIComponent(vin)}`;
    }

    // 3. Generic Carfax lookup fallback.
    return `https://www.carfax.com/vehicle/${encodeURIComponent(vin)}`;
  }
}

export function getCarfaxProvider(): CarfaxProvider {
  return new DefaultCarfaxProvider();
}
