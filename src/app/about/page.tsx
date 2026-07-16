import Link from "next/link";
import Image from "next/image";
import { generatePageMetadata } from "@/lib/seo";
import { DEALERSHIP, HOW_WE_PREPARE_COPY } from "@/lib/dealership";
import ReviewsSection from "@/components/ReviewsSection";

export const metadata = generatePageMetadata({
  title: "About RydeTime Auto | Family-Owned & Operated Used Car Dealer — Suffolk, VA",
  description:
    "RydeTime Auto is a family-owned and operated independent used car dealership at 1913 Holland Road, Suffolk, VA. Honest cars, no-pressure process, serving Hampton Roads and northeastern North Carolina.",
  path: "/about",
});

const VALUES = [
  {
    title: "Honest",
    body: "Used cars have history. We share what we know — Carfax when available, honest condition notes, and straight answers when you ask.",
  },
  {
    title: "Direct",
    body: "Clear prices, clear terms, plain English. If a vehicle or a deal isn't right for you, we'd rather tell you than sell you.",
  },
  {
    title: "No-Pressure",
    body: "Browse as long as you want. Bring your mechanic. Sleep on it. The right car is still the right car tomorrow.",
  },
  {
    title: "Community",
    body: "We live here too. Our reputation in Suffolk and Hampton Roads is worth more than any single sale, and we run the business that way.",
  },
];

export default function AboutPage() {
  return (
    <main className="bg-background">
      {/* Hero / story */}
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            About Us
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-text-primary md:text-5xl">
            A Different Kind of Used Car Lot.
          </h1>
          <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-text-secondary">
            <p>
              RydeTime Auto is a family-owned and operated independent dealership at 1913
              Holland Road in Suffolk, Virginia. We&apos;re not a chain,
              we&apos;re not a franchise, and we don&apos;t have a tower of
              managers to &quot;go check with.&quot; When you deal with us, you
              deal with the people who actually picked out, prepared, and
              priced the vehicles on the lot.
            </p>
            <p>
              We started RydeTime because we were tired of how used car
              shopping usually feels — the pressure, the games, the fine print.
              Our idea was simple: sell honest used vehicles at fair prices,
              tell people the truth about what they&apos;re buying, and let the
              cars and the experience do the selling. That&apos;s still the
              whole playbook.
            </p>
            <p>
              We serve Suffolk, Virginia Beach, Chesapeake, Norfolk,
              Portsmouth, the greater Hampton Roads area, and northeastern North
              Carolina — and a lot of our business comes from repeat customers
              and their families, which is exactly how we want it.
            </p>
          </div>
        </div>
      </section>

      {/* Ryan's section */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <Image
              src="/images/ryan.jpg"
              alt="Ryan, owner of RydeTime Auto, at work in the dealership office"
              width={900}
              height={900}
              className="aspect-square w-full rounded-lg border border-border-subtle object-cover"
            />
          </div>
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
              Meet Ryan
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-text-secondary">
              <p>
                Ryan runs RydeTime day to day — he&apos;s the one sourcing
                vehicles, checking them over, and probably the one answering
                when you call{" "}
                <a
                  href={DEALERSHIP.phoneHref}
                  className="text-accent hover:underline"
                >
                  {DEALERSHIP.phone}
                </a>
                . He&apos;s a car person first and a salesperson somewhere
                around fifth, which is why you&apos;ll find his honest take —
                &quot;Ryan&apos;s Take&quot; — written on many of the vehicle
                pages on this site, including the things you should know, not
                just the things that sound good.
              </p>
              <p>
                His rule for the lot is simple: if he wouldn&apos;t put a
                family member in the car at that price, it doesn&apos;t go up
                for sale.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dawn's section */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid items-center gap-8 md:grid-cols-3">
          <div className="md:order-2 md:col-span-1">
            <Image
              src="/images/dawn.jpg"
              alt="Dawn, co-owner of RydeTime Auto"
              width={900}
              height={900}
              className="aspect-square w-full rounded-lg border border-border-subtle object-cover"
            />
          </div>
          <div className="md:order-1 md:col-span-2">
            <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
              Meet Dawn
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-text-secondary">
              <p>
                Dawn is co-owner and operator of RydeTime Auto — and she&apos;s
                been in the car business for forty years. There isn&apos;t a
                title problem, a paperwork knot, or a tough situation she
                hasn&apos;t already seen and solved a few hundred times. While
                Ryan is out on the lot, Dawn is the one keeping the whole
                dealership running.
              </p>
              <p>
                Ask anyone who&apos;s bought from us: Dawn goes above and
                beyond for every customer, every time. If RydeTime feels
                different from other lots you&apos;ve walked onto, she&apos;s
                the reason the business works the way it does.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
            What We Stand On
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-lg border border-border-subtle bg-background-card p-6"
              >
                <span className="block h-1 w-8 rounded bg-accent" />
                <h3 className="mt-4 text-base font-semibold text-text-primary">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How we prepare */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-lg border border-border-subtle bg-background-card p-8 md:p-10">
          <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
            How We Prepare Our Vehicles
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-relaxed text-text-secondary">
            {HOW_WE_PREPARE_COPY}
          </p>
        </div>
      </section>

      {/* Service area */}
      <section className="border-t border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-text-primary md:text-3xl">
            Where You&apos;ll Find Us
          </h2>
          <p className="mt-2 max-w-2xl text-text-secondary">
            {DEALERSHIP.address.full} — easy to reach from anywhere in Hampton
            Roads via Route 58.
          </p>
          <div className="mt-8 flex aspect-[16/7] items-center justify-center rounded-lg border border-border-subtle bg-background-card">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface text-xl">
                📍
              </div>
              <p className="mt-3 text-sm font-semibold text-text-primary">
                Serving {DEALERSHIP.serviceAreas.join(" · ")}
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-text-muted">
                Interactive service area map coming soon
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex items-center justify-center rounded-md border border-accent px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
              >
                Get Directions
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews teaser */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <ReviewsSection teaser />
      </section>
    </main>
  );
}
