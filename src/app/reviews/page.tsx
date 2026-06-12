import Link from "next/link";
import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";
import ReviewsSection from "@/components/ReviewsSection";

export const metadata = generatePageMetadata({
  title: "Customer Reviews | RydeTime Auto — Suffolk, VA",
  description:
    "See what customers say about buying a used car at RydeTime Auto in Suffolk, VA. Honest vehicles, no-pressure process, and a family-operated experience.",
  path: "/reviews",
});

const WHY = [
  {
    title: "Honest about used cars",
    body: "We tell you what we know about each vehicle — including the things to keep an eye on, not just the highlights.",
  },
  {
    title: "No-pressure process",
    body: "Browse, test drive, bring your mechanic, think it over. The decision is yours, on your timeline.",
  },
  {
    title: "Real people, family-operated",
    body: "No sales towers, no manager shuffle. You deal directly with the people who run the lot.",
  },
  {
    title: "Fair, market-based pricing",
    body: "Prices set from real market data — not inflated sticker numbers designed for a negotiation show.",
  },
];

export default function ReviewsPage() {
  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Reviews
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            What Our Customers Say.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            Our reputation in Hampton Roads is built one honest deal at a time.
            Here&apos;s what people who&apos;ve bought from us have to say.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <ReviewsSection />
      </section>

      <section className="border-t border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
            Why Customers Choose RydeTime
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-border-subtle bg-background-card p-6"
              >
                <span className="block h-1 w-8 rounded bg-accent" />
                <h3 className="mt-4 text-base font-semibold text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-lg border border-border-subtle bg-background-card p-8 text-center md:p-10">
          <h2 className="text-xl font-bold text-text-primary md:text-2xl">
            Bought a Vehicle From Us?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary">
            A quick review helps other Hampton Roads shoppers find us — and it
            genuinely means a lot to a small family business.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {/* Review request link placeholder — replace href with the Google review short link when available */}
            <a
              href="https://www.google.com/maps/search/RydeTime+Auto+Suffolk+VA"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Leave a Google Review
            </a>
            <Link
              href="/inventory"
              className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
            >
              Browse Inventory
            </Link>
          </div>
          <p className="mt-4 text-xs text-text-muted">
            Or call us at{" "}
            <a href={DEALERSHIP.phoneHref} className="text-accent hover:underline">
              {DEALERSHIP.phone}
            </a>{" "}
            — we answer.
          </p>
        </div>
      </section>
    </main>
  );
}
