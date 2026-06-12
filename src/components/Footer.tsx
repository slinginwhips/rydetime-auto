import Link from "next/link";
import Logo from "@/components/Logo";
import Reveal from "@/components/Reveal";
import { DEALERSHIP, FOOTER_DISCLAIMER } from "@/lib/dealership";

const QUICK_LINKS = [
  { href: "/inventory", label: "Inventory" },
  { href: "/fresh-arrivals", label: "Fresh Arrivals" },
  { href: "/under-15000", label: "Under $15,000" },
  { href: "/under-20000", label: "Under $20,000" },
  { href: "/finance", label: "Financing" },
  { href: "/credit-application", label: "Get Approved" },
  { href: "/trade-in", label: "Trade-In" },
  { href: "/sell-us-your-car", label: "Sell Us Your Car" },
  { href: "/about", label: "About" },
  { href: "/reviews", label: "Reviews" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-use", label: "Terms of Use" },
  { href: "/accessibility", label: "Accessibility" },
];

const LOCAL_SEO_LINKS = [
  { href: "/used-cars-suffolk-va", label: "Used Cars Suffolk VA" },
  { href: "/used-cars-virginia-beach-va", label: "Used Cars Virginia Beach VA" },
  { href: "/used-cars-chesapeake-va", label: "Used Cars Chesapeake VA" },
  { href: "/used-cars-norfolk-va", label: "Used Cars Norfolk VA" },
  { href: "/used-cars-portsmouth-va", label: "Used Cars Portsmouth VA" },
  { href: "/used-car-financing-suffolk-va", label: "Used Car Financing Suffolk VA" },
  { href: "/bad-credit-car-loans-suffolk-va", label: "Bad Credit Car Loans Suffolk VA" },
  { href: "/first-time-buyer-car-loans-va", label: "First-Time Buyer Car Loans VA" },
  { href: "/reliable-used-cars-suffolk-va", label: "Reliable Used Cars Suffolk VA" },
  { href: "/used-cars-under-15000-suffolk-va", label: "Used Cars Under $15k Suffolk VA" },
  { href: "/used-cars-under-20000-suffolk-va", label: "Used Cars Under $20k Suffolk VA" },
  { href: "/used-suvs-suffolk-va", label: "Used SUVs Suffolk VA" },
  { href: "/used-trucks-suffolk-va", label: "Used Trucks Suffolk VA" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-background-secondary">
      <Reveal variant="up" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" aria-label="RydeTime Auto — Home">
              <Logo variant="dark" className="h-10 w-auto" />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              Family-operated independent used car dealership in Suffolk, VA.
              Honest vehicles, AI-powered search, and a no-pressure process —
              serving all of Hampton Roads.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
              Quick Links
            </h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-1 lg:grid-cols-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
              Hours
            </h3>
            <ul className="mt-4 space-y-2">
              {DEALERSHIP.hours.map((h) => (
                <li key={h.days} className="flex justify-between gap-4 text-sm">
                  <span className="text-text-secondary">{h.days}</span>
                  <span className="text-text-primary">{h.hours}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
              Visit Us
            </h3>
            <address className="mt-4 space-y-2 not-italic">
              <p className="text-sm text-text-secondary">
                {DEALERSHIP.address.street}
                <br />
                {DEALERSHIP.address.city}, {DEALERSHIP.address.state} {DEALERSHIP.address.zip}
              </p>
              <p>
                <a
                  href={DEALERSHIP.phoneHref}
                  className="text-sm font-medium text-text-primary transition-colors hover:text-accent"
                >
                  {DEALERSHIP.phone}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${DEALERSHIP.email}`}
                  className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                >
                  {DEALERSHIP.email}
                </a>
              </p>
            </address>
          </div>
        </div>

        {/* Local SEO strip */}
        <div className="mt-12 border-t border-border-subtle pt-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
            Serving Hampton Roads
          </h3>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {LOCAL_SEO_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-xs text-text-muted transition-colors hover:text-text-secondary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer + legal */}
        <div className="mt-10 border-t border-border-subtle pt-8">
          <p className="text-xs leading-relaxed text-text-muted">{FOOTER_DISCLAIMER}</p>
          <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-xs text-text-muted">
              © {new Date().getFullYear()} {DEALERSHIP.name}. All rights reserved.
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-text-muted transition-colors hover:text-text-secondary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </footer>
  );
}
