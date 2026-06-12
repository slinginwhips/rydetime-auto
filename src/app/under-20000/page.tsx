import Link from "next/link";
import { generatePageMetadata } from "@/lib/seo";
import { getVehicles } from "@/lib/vehicles";
import VehicleCard from "@/components/VehicleCard";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Used Cars Under $20,000 | RydeTime Auto — Suffolk, VA",
  description:
    "Shop quality used cars, SUVs, and trucks under $20,000 at RydeTime Auto in Suffolk, VA. More room, more features, still a sensible payment.",
  path: "/under-20000",
});

export default async function Under20000Page() {
  const vehicles = await getVehicles({ priceMax: 20000, sort: "price_asc", limit: 24 });

  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Smart Money
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Used Cars Under $20,000
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            The under-$20,000 range is the sweet spot of the used market —
            newer model years, lower mileage, and more features, while keeping
            the payment sensible. Here&apos;s everything on our lot under that
            line right now.
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
              Nothing under $20,000 at the moment.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              Inventory changes constantly. Check the full lineup or tell us
              what you need and we&apos;ll let you know when something arrives.
            </p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/inventory?priceMax=20000"
            className="inline-flex items-center justify-center rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Browse All Under $20,000 in Inventory →
          </Link>
        </div>
      </section>
    </main>
  );
}
