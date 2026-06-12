import Link from "next/link";
import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP, PAYMENT_DISCLAIMER } from "@/lib/dealership";
import PaymentEstimator from "@/components/PaymentEstimator";
import AskAIButton from "@/components/AskAIButton";

export const metadata = generatePageMetadata({
  title: "Used Car Financing in Suffolk, VA | RydeTime Auto",
  description:
    "Honest used car financing for all credit situations — first-time buyers, rebuilding credit, and everything in between. No pressure, no games. Serving Suffolk and Hampton Roads.",
  path: "/finance",
});

const STEPS = [
  {
    title: "Tell us about yourself",
    body: "A quick, secure application through DealerCenter — no obligation, no impact on how we treat you. It takes about five minutes.",
  },
  {
    title: "We shop our lenders",
    body: "We work with lenders who handle a wide range of credit situations and find the options that actually fit your budget — not just the ones that look good on paper.",
  },
  {
    title: "Review real numbers together",
    body: "We walk through the payment, term, and down payment with you. No surprise fees buried in the paperwork, and no pressure to take a deal that doesn't feel right.",
  },
  {
    title: "Drive home",
    body: "Once you're comfortable with the terms and the vehicle, we finish the paperwork and you're on the road. Most deals can be wrapped up the same day.",
  },
];

export default function FinancePage() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Financing
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
            Financing That Starts With Honesty.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary md:text-lg">
            We&apos;re not going to tell you everyone gets approved — no honest
            dealer can. What we will tell you is this: we work with lenders who
            handle a wide range of credit situations, we&apos;ll give you real
            numbers, and we&apos;ll never pressure you into a payment that
            doesn&apos;t fit your life.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/credit-application"
              className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Get Approved
            </Link>
            <AskAIButton label="Ask AI About Financing" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
          How It Works
        </h2>
        <p className="mt-2 max-w-2xl text-text-secondary">
          Four steps. No mystery, no back-room negotiating marathon.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-lg border border-border-subtle bg-background-card p-6"
            >
              <span className="tabular inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-base font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* First-time buyer + rebuilding credit */}
      <section className="border-y border-border-subtle bg-background-secondary">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div className="rounded-lg border border-border-subtle bg-background-card p-8">
            <h2 className="text-xl font-bold text-text-primary">
              First-Time Buyers
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Buying your first car — with little or no credit history — is one
              of the most common situations we see. A steady income and a
              reasonable down payment go a long way, and some lenders we work
              with specialize in first-time buyer programs. We&apos;ll explain
              every line of the deal in plain English, because your first car
              loan shouldn&apos;t be a lesson in fine print.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li className="flex gap-2">
                <span className="text-accent">›</span> No credit history? Some
                of our lenders work with that.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">›</span> We&apos;ll show you how
                the loan builds your credit going forward.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">›</span> Co-signers welcome but
                not always required.
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-border-subtle bg-background-card p-8">
            <h2 className="text-xl font-bold text-text-primary">
              Rebuilding Credit
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              Past credit trouble — a repossession, bankruptcy, medical bills,
              or just a rough stretch — doesn&apos;t define you, and it
              doesn&apos;t automatically disqualify you. Approval and terms
              depend on your full picture: income, down payment, and how recent
              the issues are. We&apos;ll be straight with you about what&apos;s
              realistic, and a well-handled auto loan is one of the better
              tools for rebuilding your score.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              <li className="flex gap-2">
                <span className="text-accent">›</span> Lenders for fair,
                challenged, and rebuilding credit.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">›</span> Honest answers — if a
                deal doesn&apos;t make sense for you, we&apos;ll say so.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">›</span> On-time payments
                reported can help your credit recover.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Trade-in mention */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start gap-6 rounded-lg border border-border-subtle bg-background-card p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Have a Trade-In?
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
              Your current vehicle can lower your down payment or your monthly
              payment. Tell us about it and we&apos;ll give you an estimated
              trade value — final numbers come after a quick in-person look.
            </p>
          </div>
          <Link
            href="/trade-in"
            className="inline-flex shrink-0 items-center justify-center rounded-md border border-accent px-6 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
          >
            Value My Trade
          </Link>
        </div>
      </section>

      {/* Payment estimator */}
      <section className="border-t border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
            Estimate a Payment
          </h2>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Play with the numbers before you ever talk to a lender. This
            example uses a $15,000 vehicle — adjust the down payment and term
            to see what changes.
          </p>
          <div className="mt-8 max-w-xl">
            <PaymentEstimator price={15000} />
          </div>
          <p className="mt-6 max-w-2xl text-xs leading-relaxed text-text-muted">
            {PAYMENT_DISCLAIMER}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
          Ready to See Your Options?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          The application is secure, takes about five minutes, and doesn&apos;t
          obligate you to anything. Questions first? Call us at{" "}
          <a href={DEALERSHIP.phoneHref} className="text-accent hover:underline">
            {DEALERSHIP.phone}
          </a>{" "}
          or ask our AI assistant.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/credit-application"
            className="inline-flex items-center justify-center rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Start My Application
          </Link>
          <AskAIButton label="Ask AI a Question" />
        </div>
      </section>
    </main>
  );
}
