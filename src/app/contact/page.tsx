import { generatePageMetadata, autoDealerSchema } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";
import LeadForm from "@/components/LeadForm";

export const metadata = generatePageMetadata({
  title: "Contact RydeTime Auto | 1913 Holland Road, Suffolk, VA",
  description:
    "Visit, call, or text RydeTime Auto at 1913 Holland Road, Suffolk, VA 23434. Phone: (757) 937-8664. Open Mon-Fri 10AM-6PM, Sat 10AM-5PM.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(autoDealerSchema()) }}
      />

      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Contact
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Come See Us — Or Just Say Hello.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            Question about a vehicle, financing, or a trade? Call, text, stop
            by, or drop a note below. A real person answers.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={DEALERSHIP.phoneHref}
              className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Call {DEALERSHIP.phone}
            </a>
            <a
              href={DEALERSHIP.smsHref}
              className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
            >
              Text Us
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Info + map */}
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Address
                </h2>
                <p className="mt-2 text-sm font-semibold text-text-primary">
                  {DEALERSHIP.address.street}
                  <br />
                  {DEALERSHIP.address.city}, {DEALERSHIP.address.state}{" "}
                  {DEALERSHIP.address.zip}
                </p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-background-card p-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Phone &amp; Email
                </h2>
                <p className="mt-2 text-sm font-semibold text-text-primary">
                  <a href={DEALERSHIP.phoneHref} className="hover:text-accent">
                    {DEALERSHIP.phone}
                  </a>
                  <br />
                  <a
                    href={`mailto:${DEALERSHIP.email}`}
                    className="hover:text-accent"
                  >
                    {DEALERSHIP.email}
                  </a>
                </p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-background-card p-6 sm:col-span-2">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  Hours
                </h2>
                <dl className="mt-2 space-y-1 text-sm">
                  {DEALERSHIP.hours.map((h) => (
                    <div key={h.days} className="flex justify-between gap-4">
                      <dt className="text-text-secondary">{h.days}</dt>
                      <dd className="tabular font-semibold text-text-primary">
                        {h.hours}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-border-subtle bg-background-card">
              <iframe
                title="RydeTime Auto location map"
                src="https://www.google.com/maps?q=1913+Holland+Road,+Suffolk,+VA+23434&output=embed"
                className="h-72 w-full border-0 grayscale invert-[0.9] contrast-[0.9]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>

          {/* Lead form */}
          <div className="rounded-lg border border-border-subtle bg-background-card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-text-primary">
              Send Us a Message
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              We usually respond within a few business hours.
            </p>
            <div className="mt-6">
              <LeadForm leadType="inquiry" ctaLabel="Send Message" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
