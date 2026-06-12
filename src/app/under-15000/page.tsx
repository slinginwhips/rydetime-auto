import Link from "next/link";
import { generatePageMetadata } from "@/lib/seo";
import { getVehicles } from "@/lib/vehicles";
import VehicleCard from "@/components/VehicleCard";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Used Cars Under $15,000 | RydeTime Auto — Suffolk, VA",
  description:
    "Browse dependable used cars, SUVs, and trucks under $15,000 at RydeTime Auto in Suffolk, VA. Honest pricing and financing options for every budget.",
  path: "/under-15000",
});

export default async function Under15000Page() {
  const vehicles = await getVehicles({ priceMax: 15000, sort: "price_asc", limit: 24 });

  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Budget-Friendly
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Used Cars Under $15,000
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            A good car doesn&apos;t have to break the bank. Every vehicle here
            is priced under $15,000 — solid transportation for commuters,
            first-time buyers, and anyone who wants dependable wheels without a
            dependably painful payment.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {vehicles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border-subtle bg-background-card p-12 text-center">
            <h2 className="text-lg font-semibold text-text-primary">
              Nothing under $15,000 right now.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              Inventory turns over fast in this price range. Check back soon or
              tell us your budget and we&apos;ll reach out when something fits.
            </p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/inventory?priceMax=15000"
            className="inline-flex items-center justify-center rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Browse All Under $15,000 in Inventory →
          </Link>
        </div>
      </section>
    </main>
  );
}
