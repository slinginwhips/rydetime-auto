import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";
import { getCreditAppProvider } from "@/lib/creditAppProvider";
import LeadForm from "@/components/LeadForm";

export const metadata = generatePageMetadata({
  title: "Credit Application | RydeTime Auto — Suffolk, VA",
  description:
    "Apply for used car financing at RydeTime Auto. First-time buyers and rebuilding credit welcome. No pressure, no obligation.",
  path: "/credit-application",
});

export default function CreditApplicationPage() {
  const creditAppUrl = getCreditAppProvider().getCreditAppUrl();

  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Credit Application
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Get Approved — On Your Terms.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            Applying doesn&apos;t commit you to anything. It just tells us your
            situation so we can show you real options. Your sensitive
            information — SSN, date of birth — is never entered or stored on
            this website.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Lead capture */}
          <div className="md:col-span-3">
            <div className="rounded-lg border border-border-subtle bg-background-card p-6 sm:p-8">
              <h2 className="text-lg font-bold text-text-primary">
                Step 1 — Tell us who you are
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Quick contact info so we know to look out for your application
                and can follow up with your options. No SSN, no date of birth —
                that stays inside the secure application.
              </p>
              <div className="mt-6">
                <LeadForm leadType="finance" ctaLabel="Save My Info" />
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-border-subtle bg-background-card p-6 sm:p-8">
              <h2 className="text-lg font-bold text-text-primary">
                Step 2 — We finish it together
              </h2>
              {creditAppUrl ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    The application opens a secure portal in a new tab. It
                    takes about five minutes.
                  </p>
                  <a
                    href={creditAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
                  >
                    Continue to Secure Application →
                  </a>
                  <p className="mt-3 text-center text-xs text-text-muted">
                    Secure encrypted application
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    Once you save your info above, we&apos;ll reach out — usually
                    the same day — and take the rest of your application securely
                    over the phone. Your sensitive details (SSN, date of birth)
                    are never entered on this website.
                  </p>
                  <a
                    href={DEALERSHIP.phoneHref}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
                  >
                    Or call us now: {DEALERSHIP.phone}
                  </a>
                  <p className="mt-3 text-center text-xs text-text-muted">
                    Prefer texting? Same number.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Side info */}
          <aside className="md:col-span-2">
            <div className="rounded-lg border border-border-subtle bg-background-card p-6">
              <h2 className="text-base font-bold text-text-primary">
                First-Time Buyer?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                No credit history isn&apos;t the same as bad credit. Several of
                our lenders have programs built for first-time buyers — steady
                income and a reasonable down payment are usually the keys.
              </p>
            </div>
            <div className="mt-4 rounded-lg border border-border-subtle bg-background-card p-6">
              <h2 className="text-base font-bold text-text-primary">
                Rebuilding Credit?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Past credit problems don&apos;t automatically disqualify you.
                We work with lenders who look at your whole picture — income,
                stability, and down payment — not just a score. We&apos;ll be
                honest with you about what&apos;s realistic.
              </p>
            </div>
            <div className="mt-4 rounded-lg border border-border-subtle bg-surface p-6">
              <h2 className="text-base font-bold text-text-primary">
                Rather talk to a person?
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Call or text us at{" "}
                <a
                  href={DEALERSHIP.phoneHref}
                  className="font-semibold text-accent hover:underline"
                >
                  {DEALERSHIP.phone}
                </a>{" "}
                and we&apos;ll walk you through it.
              </p>
            </div>
          </aside>
        </div>

        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-text-muted">
          Submitting a credit application does not guarantee approval.
          Financing is subject to lender credit approval, and final terms —
          including APR, term length, and required down payment — are
          determined by the lender based on your application. RydeTime Auto
          does not collect or store Social Security numbers, dates of birth, or
          other sensitive application data on this website.
        </p>
      </section>
    </main>
  );
}
