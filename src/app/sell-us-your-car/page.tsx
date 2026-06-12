import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";
import TradeInForm from "@/components/TradeInForm";

export const metadata = generatePageMetadata({
  title: "Sell Us Your Car — No Purchase Necessary | RydeTime Auto",
  description:
    "Sell your car to RydeTime Auto in Suffolk, VA — no purchase necessary. Quick form, estimated offer, honest in-person appraisal. We buy cars across Hampton Roads.",
  path: "/sell-us-your-car",
});

export default function SellUsYourCarPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            We Buy Cars
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            We Buy Cars — No Purchase Necessary.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            You don&apos;t have to buy anything from us to sell us your car. If
            you&apos;ve got a vehicle you&apos;re done with — paid off or not —
            tell us about it below. We&apos;ll review the details and follow up
            with an estimated offer, then confirm it with a quick in-person
            look. Simple, straightforward, and faster than dealing with
            marketplace strangers.
          </p>
          <ul className="mt-6 grid max-w-2xl gap-2 text-sm text-text-secondary sm:grid-cols-3">
            <li className="flex gap-2">
              <span className="text-accent">✓</span> No purchase required
            </li>
            <li className="flex gap-2">
              <span className="text-accent">✓</span> We handle payoff &amp;
              paperwork
            </li>
            <li className="flex gap-2">
              <span className="text-accent">✓</span> Local — Suffolk, VA
            </li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <TradeInForm intent="sell" />
        <p className="mt-8 text-xs leading-relaxed text-text-muted">
          Online offers are estimates only. Final purchase price is determined
          after an in-person inspection. Questions? Call us at{" "}
          <a href={DEALERSHIP.phoneHref} className="text-accent hover:underline">
            {DEALERSHIP.phone}
          </a>
          .
        </p>
      </section>
    </main>
  );
}
