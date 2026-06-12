"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { DEALERSHIP } from "@/lib/dealership";

const NAV_LINKS = [
  { href: "/inventory", label: "Inventory" },
  { href: "/finance", label: "Finance" },
  { href: "/trade-in", label: "Trade-In" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-accent bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          aria-label="RydeTime Auto — Home"
          className="hero-seq hero-seq-1 flex-shrink-0"
        >
          <Image
            src="/logo-header-dark.png"
            alt="RydeTime Auto"
            width={643}
            height={192}
            priority
            className="h-11 w-auto md:h-12"
          />
        </Link>

        {/* Desktop nav */}
        <nav
          className="hero-seq hero-seq-2 hidden items-center gap-7 lg:flex"
          aria-label="Main navigation"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link text-sm font-medium transition-colors hover:text-text-primary ${
                pathname === link.href ? "text-text-primary" : "text-text-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hero-seq hero-seq-2 hidden items-center gap-3 lg:flex">
          <a
            href={DEALERSHIP.phoneHref}
            className="flex items-center gap-2 rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent"
          >
            <PhoneIcon />
            {DEALERSHIP.phone}
          </a>
          <Link
            href="/inventory"
            className="btn-glow rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Browse Inventory
          </Link>
        </div>

        {/* Mobile: call + hamburger */}
        <div className="hero-seq hero-seq-2 flex items-center gap-2 lg:hidden">
          <a
            href={DEALERSHIP.phoneHref}
            aria-label={`Call ${DEALERSHIP.phone}`}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle text-text-primary"
          >
            <PhoneIcon />
          </a>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-border-subtle text-text-primary"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer — kept mounted so the slide/fade transition can run */}
      <div
        className={`fixed inset-x-0 bottom-0 top-[66px] z-40 overflow-y-auto bg-background transition-all duration-300 ease-out lg:hidden ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-3 opacity-0"
        }`}
        aria-hidden={!open}
      >
        <nav className="flex flex-col px-4 py-6" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              tabIndex={open ? 0 : -1}
              className="nav-link border-b border-border-subtle py-4 text-lg font-medium text-text-primary"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/inventory"
              tabIndex={open ? 0 : -1}
              className="btn-glow rounded-md bg-accent px-5 py-3 text-center text-base font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Browse Inventory
            </Link>
            <a
              href={DEALERSHIP.phoneHref}
              tabIndex={open ? 0 : -1}
              className="flex items-center justify-center gap-2 rounded-md border border-border-subtle px-5 py-3 text-base font-medium text-text-primary"
            >
              <PhoneIcon />
              Call {DEALERSHIP.phone}
            </a>
          </div>
          <p className="mt-8 text-sm text-text-muted">
            {DEALERSHIP.address.full} · {DEALERSHIP.hoursShort}
          </p>
        </nav>
      </div>
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
