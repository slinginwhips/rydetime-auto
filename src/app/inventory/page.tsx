import { Suspense } from "react";
import InventoryClient from "@/components/InventoryClient";
import { getVehiclesPage, getMakesAndModels, type InventoryFilters } from "@/lib/vehicles";
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

  const rawPage = Math.max(1, toNum(first(sp.page)) ?? 1);
  const sortParam = first(sp.sort);
  const validSorts = ["newest", "price_asc", "price_desc", "mileage_asc", "year_desc", "price_reduced"] as const;
  // Default the listing to most-expensive-first when no sort is chosen.
  const sort = validSorts.includes(sortParam as (typeof validSorts)[number])
    ? (sortParam as InventoryFilters["sort"])
    : "price_desc";

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
    limit: PAGE_SIZE,
    offset: (rawPage - 1) * PAGE_SIZE,
  };

  const [{ vehicles, total }, makesAndModels] = await Promise.all([
    getVehiclesPage(filters),
    getMakesAndModels(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(rawPage, totalPages);

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
            page={page}
            totalPages={totalPages}
            total={total}
          />
        </Suspense>
      </div>
    </div>
  );
}
