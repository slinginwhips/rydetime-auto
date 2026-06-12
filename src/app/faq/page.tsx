import Link from "next/link";
import { generatePageMetadata, faqSchema } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";

export const metadata = generatePageMetadata({
  title: "Frequently Asked Questions | RydeTime Auto — Suffolk, VA",
  description:
    "Honest answers about financing with bad credit, trade-ins, warranties, holds, Carfax reports, fees, test drives, and more at RydeTime Auto in Suffolk, VA.",
  path: "/faq",
});

const FAQS = [
  {
    question: "Do you finance bad credit?",
    answer:
      "We work with lenders who handle a wide range of credit situations, including challenged and rebuilding credit. We won't promise everyone gets approved — no honest dealer can — but past credit problems don't automatically disqualify you. Approval and terms depend on your full picture: income, down payment, and how recent any issues are. Apply through our secure DealerCenter application and we'll show you what's realistic.",
  },
  {
    question: "Can I trade in my vehicle?",
    answer:
      "Yes. Fill out our trade-in form with your vehicle's details and we'll give you an estimated trade value, usually within one business day. The final number comes after a quick in-person inspection. We also handle loan payoffs on traded vehicles, even if you owe more than the trade is worth in some cases.",
  },
  {
    question: "Do you offer warranties?",
    answer:
      "Vehicles are typically sold as-is unless stated otherwise in writing on the specific vehicle. Optional extended service contracts may be available on many vehicles — ask us about coverage options for the vehicle you're considering. We'll always be clear about exactly what is and isn't covered before you sign anything.",
  },
  {
    question: "How do I hold a vehicle?",
    answer:
      "You can place a $500 hold deposit on a vehicle through its listing page or by contacting us. The deposit takes the vehicle off active availability while you finalize financing or arrange to come in. Important: the deposit is non-refundable if you choose not to move forward, but it applies in full toward your purchase if the sale is completed. The dealership confirms each hold manually.",
  },
  {
    question: "Can I get a Carfax report?",
    answer:
      "Yes — Carfax reports are available on many of our vehicles, and where available there's a Carfax link right on the vehicle's page. If you don't see one, ask us and we'll get you the history information we have. We only display badges like one-owner or accident-free when the Carfax or DealerCenter data actually confirms it.",
  },
  {
    question: "Do you take cash?",
    answer:
      "Yes, we accept cash purchases, as well as certified funds and financing through our lenders. For larger cash transactions, federal law requires us to file IRS Form 8300 for payments over $10,000 — standard for every dealership, nothing unusual on your end.",
  },
  {
    question: "How do I schedule a test drive?",
    answer:
      "Use the 'Schedule Test Drive' button on any vehicle page, ask our AI assistant, or just call or text us at (757) 937-8664. Tell us when you'd like to come in and we'll have the vehicle ready. Bring a valid driver's license. Walk-ins are welcome too during business hours.",
  },
  {
    question: "Are your prices negotiable?",
    answer:
      "We price our vehicles based on real market data, so our prices are already close to where similar vehicles actually sell. That means we don't build in thousands of dollars of bluff to negotiate away. If you have a fair offer or found a comparable vehicle priced lower, bring it up — we're reasonable people and we'd rather have a conversation than lose a good customer over a few hundred dollars.",
  },
  {
    question: "What fees should I expect?",
    answer:
      "Beyond the advertised price, expect Virginia sales and use tax, title and registration fees, and a documentation (processing) fee. We'll show you every line item before you sign — no surprise add-ons, no mandatory accessories, no hidden 'market adjustments.' If you want the out-the-door number before you come in, just ask.",
  },
  {
    question: "How often does your inventory change?",
    answer:
      "Constantly — our website syncs automatically with our inventory system, so what you see online is what's actually on the lot. Fresh arrivals are flagged on the site, and good vehicles at fair prices tend to move quickly. If you see something you like, don't wait too long; if you don't see what you need, use our AI matchmaker or ask us — we may have something coming in.",
  },
  {
    question: "Can I bring my own mechanic to inspect a vehicle?",
    answer:
      "Absolutely — we encourage it. An independent pre-purchase inspection is one of the smartest things a used car buyer can do, and a dealer who discourages it is telling you something. Coordinate a time with us and we'll make the vehicle available.",
  },
  {
    question: "Do you buy cars without a purchase?",
    answer:
      "Yes. No purchase necessary — if you have a vehicle to sell, fill out the form on our Sell Us Your Car page or bring it by. We'll review the details, give you an estimated offer, and confirm it with a quick in-person appraisal. We handle the title work and can pay off existing loans as part of the deal.",
  },
];

export default function FAQPage() {
  return (
    <main className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(FAQS)) }}
      />

      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            FAQ
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Straight Answers to Real Questions.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            If you don&apos;t see your question here, call or text us at{" "}
            <a href={DEALERSHIP.phoneHref} className="text-accent hover:underline">
              {DEALERSHIP.phone}
            </a>{" "}
            — or ask our AI assistant any time.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border border-border-subtle bg-background-card open:border-accent/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-base font-semibold text-text-primary [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-accent transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-text-secondary">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-border-subtle bg-background-card p-8 text-center">
          <h2 className="text-xl font-bold text-text-primary">
            Still Have a Question?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            We&apos;d rather answer it now than have you wonder. Reach out
            however&apos;s easiest.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={DEALERSHIP.phoneHref}
              className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Call {DEALERSHIP.phone}
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
