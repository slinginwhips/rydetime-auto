import Link from "next/link";
import VehicleCard from "@/components/VehicleCard";
import AIMatchmaker from "@/components/AIMatchmaker";
import ReviewsSection from "@/components/ReviewsSection";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import { getFeaturedVehicles } from "@/lib/vehicles";
import { DEALERSHIP, HOW_WE_PREPARE_COPY } from "@/lib/dealership";
import { generatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "RydeTime Auto | Used Cars in Suffolk, VA — Serving Hampton Roads",
  description:
    "Honest used cars in Suffolk, VA. AI-powered search, no-pressure process, and financing for every credit situation. Serving Virginia Beach, Chesapeake, Norfolk, Portsmouth, and all of Hampton Roads.",
  path: "/",
});

const VALUE_PROPS = [
  {
    title: "No-Pressure Process",
    text: "Nobody follows you around the lot. Look, ask questions, take a test drive — buy when it's right for you, not when it's right for a sales quota.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    title: "AI-Powered Search",
    text: "Our AI assistant knows every vehicle on the lot. Tell it your budget and what you need — it'll match you with real inventory, not a sales pitch.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    title: "Hampton Roads Local",
    text: "Family-operated on Holland Road in Suffolk. We sell to neighbors in Virginia Beach, Chesapeake, Norfolk, and Portsmouth — and we see them around town after.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    title: "Honest About Used Cars",
    text: "These are used vehicles, and we treat you like you know that. Carfax when available, straight answers about condition, and no claims we can't back up.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
];

const LOCAL_LINKS = [
  { href: "/used-cars-suffolk-va", label: "Suffolk" },
  { href: "/used-cars-virginia-beach-va", label: "Virginia Beach" },
  { href: "/used-cars-chesapeake-va", label: "Chesapeake" },
  { href: "/used-cars-norfolk-va", label: "Norfolk" },
  { href: "/used-cars-portsmouth-va", label: "Portsmouth" },
];

export default async function HomePage() {
  const featured = await getFeaturedVehicles(4);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border-subtle bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-3xl">
            <p className="hero-seq hero-seq-3 text-xs font-bold uppercase tracking-widest text-text-secondary">
              Suffolk, VA — Independent Dealer
            </p>
            <h1 className="hero-seq hero-seq-4 mt-4 text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
              Find Your Next Vehicle<span className="period-pulse">.</span>
            </h1>
            <p className="hero-seq hero-seq-5 mt-5 max-w-xl text-lg leading-relaxed text-text-secondary">
              Honest used cars, AI-powered search, no pressure. Serving Suffolk and Hampton
              Roads.
            </p>
            <div className="hero-seq hero-seq-6 mt-8 flex flex-wrap gap-3">
              <Link
                href="/inventory"
                className="btn-glow rounded-md bg-accent px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Browse Inventory
              </Link>
              <a
                href="#matchmaker"
                className="btn-draw rounded-md border border-border-subtle px-7 py-3.5 text-base font-medium text-text-primary transition-colors hover:border-accent"
              >
                Find My Match
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Featured inventory */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <Reveal variant="left">
            <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Featured Vehicles</h2>
            <p className="mt-2 text-text-secondary">Hand-picked from what&apos;s on the lot right now.</p>
          </Reveal>
          <Link
            href="/inventory"
            className="arrow-link hidden flex-shrink-0 text-sm font-semibold text-text-primary transition-colors hover:text-accent sm:block"
          >
            View All Inventory <span className="arrow">→</span>
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((v, i) => (
              <Reveal key={v.id} variant="up" delay={i * 100}>
                <VehicleCard vehicle={v} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-lg border border-border-subtle bg-background-card p-8 text-center text-text-secondary">
            Fresh inventory is on the way.{" "}
            <Link href="/inventory" className="font-medium text-text-primary underline">
              See everything currently available
            </Link>
            .
          </p>
        )}
        <div className="mt-6 text-center sm:hidden">
          <Link href="/inventory" className="arrow-link text-sm font-semibold text-text-primary hover:text-accent">
            View All Inventory <span className="arrow">→</span>
          </Link>
        </div>
      </section>

      {/* AI Matchmaker */}
      <section id="matchmaker" className="border-y border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Find Your Best Match</h2>
            <p className="mx-auto mt-2 max-w-xl text-text-secondary">
              Answer a few quick questions and our AI will match you with real vehicles on our
              lot — with honest reasoning for each pick.
            </p>
          </div>
          <div className="mt-8">
            <AIMatchmaker />
          </div>
        </div>
      </section>

      {/* Why RydeTime */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal variant="left">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">Why RydeTime</h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((prop, i) => (
            <Reveal key={prop.title} variant={i % 2 ? "right" : "left"} delay={i * 80}>
              <div className="h-full rounded-lg border border-border-subtle bg-background-card p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-surface text-accent">
                  {prop.icon}
                </span>
                <h3 className="mt-4 text-base font-semibold text-text-primary">{prop.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{prop.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        {/* Honest stats strip */}
        <Reveal variant="up" delay={200}>
          <div className="mt-10 grid grid-cols-1 gap-6 rounded-lg border border-border-subtle bg-background-card px-6 py-8 text-center sm:grid-cols-3">
            <div>
              <p className="text-3xl font-extrabold text-text-primary">
                <CountUp end={5} />
              </p>
              <p className="mt-1 text-sm text-text-secondary">cities served across Hampton Roads</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-text-primary">
                <CountUp end={500} prefix="$" />
              </p>
              <p className="mt-1 text-sm text-text-secondary">holds any vehicle while you finalize</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-text-primary">
                <CountUp end={1} />
              </p>
              <p className="mt-1 text-sm text-text-secondary">family-operated lot on Holland Road</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* How we prepare */}
      <section className="border-y border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <Reveal variant="left">
            <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">
              How We Prepare Our Vehicles
            </h2>
          </Reveal>
          <p className="mt-5 text-base leading-relaxed text-text-secondary">
            {HOW_WE_PREPARE_COPY.split(". ")
              .map((s, _, arr) => (s.endsWith(".") || arr.length === 1 ? s : `${s}.`))
              .map((sentence, i) => (
                <Reveal key={i} variant="fade" delay={i * 120} as="span">
                  {sentence}{" "}
                </Reveal>
              ))}
          </p>
        </div>
      </section>

      {/* Reviews teaser */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Reveal variant="up">
          <h2 className="text-2xl font-bold text-text-primary sm:text-3xl">What Customers Say</h2>
          <div className="mt-8">
            <ReviewsSection teaser />
          </div>
        </Reveal>
      </section>

      {/* Local area strip */}
      <section className="border-y border-border-subtle bg-background-secondary">
        <Reveal variant="up" className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8">
          <Reveal variant="tracking" as="p" className="text-sm font-semibold uppercase tracking-widest2 text-text-muted">
            Serving Suffolk, Virginia Beach, Chesapeake, Norfolk, Portsmouth & Hampton Roads
          </Reveal>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {LOCAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                Used Cars in {l.label}
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Footer CTA */}
      <Reveal
        variant="up"
        as="section"
        className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8"
      >
        <h2 className="text-3xl font-bold text-text-primary sm:text-4xl">
          Ready to Find Your Vehicle?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          Browse what&apos;s on the lot, or stop by {DEALERSHIP.address.full}. No appointment
          needed — but we&apos;re happy to set one up.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/inventory"
            className="btn-glow rounded-md bg-accent px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Browse Inventory
          </Link>
          <Link
            href="/contact"
            className="btn-draw rounded-md border border-border-subtle px-7 py-3.5 text-base font-medium text-text-primary transition-colors hover:border-accent"
          >
            Contact Us
          </Link>
        </div>
      </Reveal>
    </>
  );
}
