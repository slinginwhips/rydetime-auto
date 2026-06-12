import Link from "next/link";
import { generatePageMetadata } from "@/lib/seo";
import { getVehicles } from "@/lib/vehicles";
import VehicleCard from "@/components/VehicleCard";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Fresh Arrivals | Just-Landed Used Cars — RydeTime Auto, Suffolk VA",
  description:
    "The newest used cars, trucks, and SUVs to hit the lot at RydeTime Auto in Suffolk, VA. Fresh arrivals move fast — see what just came in.",
  path: "/fresh-arrivals",
});

export default async function FreshArrivalsPage() {
  const vehicles = await getVehicles({ freshArrivals: true, limit: 24 });

  return (
    <main className="bg-background">
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-18">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            Just In
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            Fresh Arrivals
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary">
            These vehicles just landed on the lot — some are still going
            through our preparation process. Good vehicles at fair prices move
            fast, so if something catches your eye, ask about it today.
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
              Nothing brand-new on the lot this week.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
              Inventory changes constantly — check the full lineup or tell us
              what you&apos;re looking for and we&apos;ll keep an eye out.
            </p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/inventory?fresh=1"
            className="inline-flex items-center justify-center rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            View All Fresh Arrivals in Inventory →
          </Link>
        </div>
      </section>
    </main>
  );
}
