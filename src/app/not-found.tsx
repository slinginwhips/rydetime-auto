import Link from "next/link";
import Logo from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      <Logo variant="dark" className="h-12 w-auto opacity-50" />
      <p className="mt-8 text-xs font-bold uppercase tracking-widest2 text-accent">404</p>
      <h1 className="mt-3 text-3xl font-bold text-text-primary sm:text-4xl">
        That page took a different exit.
      </h1>
      <p className="mt-4 max-w-md text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist — or the vehicle may have sold.
        Our inventory moves fast.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/inventory"
          className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Browse Inventory
        </Link>
        <Link
          href="/"
          className="rounded-md border border-border-subtle px-6 py-3 text-sm font-medium text-text-primary transition-colors hover:border-accent"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
