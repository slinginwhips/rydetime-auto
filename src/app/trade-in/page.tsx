import { generatePageMetadata } from "@/lib/seo";
import TradeInForm from "@/components/TradeInForm";

export const metadata = generatePageMetadata({
  title: "Trade In Your Vehicle | RydeTime Auto — Suffolk, VA",
  description:
    "Get an estimated trade value for your current vehicle and put it toward your next one. Quick form, honest numbers, no obligation. Suffolk and Hampton Roads.",
  path: "/trade-in",
});

export default async function TradeInPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>;
}) {
  const { vehicle } = await searchParams;

  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Trade-In
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Put Your Current Vehicle to Work.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            Tell us about your vehicle and we&apos;ll give you an estimated
            trade value — usually within one business day. The more accurate
            the details (and photos), the more accurate the estimate. Final
            numbers always come after a quick in-person inspection, and
            there&apos;s never an obligation to accept.
          </p>
          <ul className="mt-6 grid max-w-2xl gap-2 text-sm text-text-secondary sm:grid-cols-3">
            <li className="flex gap-2">
              <span className="text-accent">✓</span> Estimated value, fast
            </li>
            <li className="flex gap-2">
              <span className="text-accent">✓</span> Loan payoff? No problem
            </li>
            <li className="flex gap-2">
              <span className="text-accent">✓</span> Zero obligation
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <TradeInForm intent="trade" vehicleOfInterestId={vehicle} />
        <p className="mt-8 text-xs leading-relaxed text-text-muted">
          All trade values provided online are estimates only and are not a
          final offer. Final trade-in value is determined after an in-person
          inspection of the vehicle&apos;s condition, history, and current
          market demand.
        </p>
      </section>
    </main>
  );
}
