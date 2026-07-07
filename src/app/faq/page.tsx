import Link from "next/link";
import { generatePageMetadata, faqSchema } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";
import { FAQS } from "@/lib/faq";

export const metadata = generatePageMetadata({
  title: "Frequently Asked Questions | RydeTime Auto — Suffolk, VA",
  description:
    "Honest answers about financing with bad credit, trade-ins, warranties, holds, Carfax reports, fees, test drives, and more at RydeTime Auto in Suffolk, VA.",
  path: "/faq",
});

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
