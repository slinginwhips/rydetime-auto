import Stripe from "stripe";

/**
 * Payment provider — Stripe for hold deposits. Runs in mock mode until real
 * keys are provided so the hold flow works end-to-end in development.
 */
export interface PaymentIntentResult {
  success: boolean;
  payment_intent_id: string;
  client_secret?: string;
  mock: boolean;
  error?: string;
}

export interface PaymentProvider {
  isConfigured(): boolean;
  createHoldDeposit(amountUsd: number, metadata: Record<string, string>): Promise<PaymentIntentResult>;
}

class StripePaymentProvider implements PaymentProvider {
  private stripe: Stripe | null = null;

  isConfigured(): boolean {
    const key = process.env.STRIPE_SECRET_KEY;
    return Boolean(key && key.startsWith("sk_"));
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
    }
    return this.stripe;
  }

  async createHoldDeposit(
    amountUsd: number,
    metadata: Record<string, string>
  ): Promise<PaymentIntentResult> {
    if (!this.isConfigured()) {
      // Mock mode: deterministic fake intent so the flow completes in dev.
      const mockId = `pi_mock_${Math.random().toString(36).slice(2, 12)}`;
      console.log(`[payment] MOCK hold deposit $${amountUsd} — ${mockId}`, metadata);
      return { success: true, payment_intent_id: mockId, mock: true };
    }
    try {
      const intent = await this.getStripe().paymentIntents.create({
        amount: Math.round(amountUsd * 100),
        currency: "usd",
        metadata,
        description: `RydeTime Auto vehicle hold deposit — ${metadata.vehicle ?? ""}`,
      });
      return {
        success: true,
        payment_intent_id: intent.id,
        client_secret: intent.client_secret ?? undefined,
        mock: false,
      };
    } catch (err) {
      return {
        success: false,
        payment_intent_id: "",
        mock: false,
        error: err instanceof Error ? err.message : "Stripe error",
      };
    }
  }
}

export function getPaymentProvider(): PaymentProvider {
  return new StripePaymentProvider();
}
