/**
 * Credit application provider — RydeTime uses DealerCenter's hosted, secure
 * credit application. We never build a custom form or store sensitive data.
 */
export interface CreditAppProvider {
  getCreditAppUrl(): string;
  isConfigured(): boolean;
}

export class DealerCenterCreditAppProvider implements CreditAppProvider {
  isConfigured(): boolean {
    const url = process.env.DEALERCENTER_CREDIT_APP_URL;
    return Boolean(url && !url.includes("your_hosted"));
  }

  getCreditAppUrl(): string {
    const url = process.env.DEALERCENTER_CREDIT_APP_URL;
    if (url && !url.includes("your_hosted")) return url;
    // Fallback: DealerCenter consumer credit app portal keyed by company ID.
    const companyId = process.env.DEALERCENTER_COMPANY_ID || "16936663";
    return `https://www.dealercenter.net/creditapp?dealerId=${encodeURIComponent(companyId)}`;
  }
}

export function getCreditAppProvider(): CreditAppProvider {
  return new DealerCenterCreditAppProvider();
}
