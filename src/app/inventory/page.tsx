import { Suspense } from "react";
import InventoryClient from "@/components/InventoryClient";
import { getVehicles, getMakesAndModels, type InventoryFilters } from "@/lib/vehicles";
import { generatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Used Car Inventory in Suffolk, VA",
  description:
    "Browse our full inventory of quality used cars, trucks, SUVs, and vans in Suffolk, VA. Filter by price, payment, make, mileage, and more. Serving all of Hampton Roads.",
  path: "/inventory",
});

const PAGE_SIZE = 12;

interface InventorySearchParams {
  [key: string]: string | string[] | undefined;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function toNum(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<InventorySearchParams>;
}) {
  const sp = await searchParams;

  const page = Math.max(1, toNum(first(sp.page)) ?? 1);
  const sortParam = first(sp.sort);
  const validSorts = ["newest", "price_asc", "price_desc", "mileage_asc", "year_desc", "price_reduced"] as const;
  const sort = validSorts.includes(sortParam as (typeof validSorts)[number])
    ? (sortParam as InventoryFilters["sort"])
    : "newest";

  const filters: InventoryFilters = {
    priceMin: toNum(first(sp.priceMin)),
    priceMax: toNum(first(sp.priceMax)),
    yearMin: toNum(first(sp.yearMin)),
    yearMax: toNum(first(sp.yearMax)),
    make: first(sp.make) || undefined,
    model: first(sp.model) || undefined,
    mileageMax: toNum(first(sp.mileageMax)),
    bodyStyles: first(sp.body) ? first(sp.body)!.split(",").filter(Boolean) : undefined,
    fuelType: first(sp.fuel) || undefined,
    transmission: first(sp.trans) || undefined,
    drivetrain: first(sp.drive) || undefined,
    freshArrivals: first(sp.fresh) === "1" || undefined,
    priceReduced: first(sp.reduced) === "1" || undefined,
    sort,
    // Fetch one extra row to detect whether more pages exist
    limit: page * PAGE_SIZE + 1,
    offset: 0,
  };

  const [rows, makesAndModels] = await Promise.all([
    getVehicles(filters),
    getMakesAndModels(),
  ]);

  const hasMore = rows.length > page * PAGE_SIZE;
  const vehicles = rows.slice(0, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Inventory</h1>
      <p className="mt-2 max-w-2xl text-text-secondary">
        Every vehicle on this page is on our lot in Suffolk right now. Prices and availability
        update as inventory changes.
      </p>
      <div className="mt-8">
        <Suspense>
          <InventoryClient
            vehicles={vehicles}
            makesAndModels={makesAndModels}
            pageSize={PAGE_SIZE}
            page={page}
            hasMore={hasMore}
          />
        </Suspense>
      </div>
    </div>
  );
}
