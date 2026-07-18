import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_VEHICLES } from "@/lib/mockInventory";
import { getCarfaxProvider } from "@/lib/carfaxProvider";
import type { Vehicle, VehicleCard, VehicleStatus } from "@/types/vehicle";

/**
 * Server-side vehicle data access. All public pages read through these
 * helpers. Falls back to mock inventory when Supabase isn't configured so
 * the site renders in development before keys are added.
 */

const PUBLIC_STATUSES: VehicleStatus[] = ["active", "fresh_arrival", "hold_pending"];

export interface InventoryFilters {
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  make?: string;
  model?: string;
  mileageMax?: number;
  bodyStyles?: string[];
  fuelType?: string;
  transmission?: string;
  drivetrain?: string;
  freshArrivals?: boolean;
  priceReduced?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "mileage_asc" | "year_desc" | "price_reduced";
  limit?: number;
  offset?: number;
}

function toCard(v: Vehicle): VehicleCard {
  const primary =
    v.vehicle_photos?.find((p) => p.is_primary) ??
    [...(v.vehicle_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
  return {
    id: v.id,
    vin: v.vin,
    stock_number: v.stock_number,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    body_style: v.body_style,
    mileage: v.mileage,
    price: Number(v.price),
    status: v.status,
    slug: v.slug,
    carfax_url: v.carfax_url,
    carfax_report_url: getCarfaxProvider().getReportUrl(v.vin, v.carfax_url),
    carfax_badge_one_owner: v.carfax_badge_one_owner ?? false,
    carfax_badge_accident_free: v.carfax_badge_accident_free ?? false,
    carfax_badge_service_records: v.carfax_badge_service_records ?? false,
    carfax_badge_great_value: v.carfax_badge_great_value ?? false,
    carfax_badge_good_value: v.carfax_badge_good_value ?? false,
    featured: v.featured,
    ryans_pick: v.ryans_pick,
    price_reduced: v.price_reduced,
    original_price: v.original_price ? Number(v.original_price) : null,
    days_in_inventory: v.days_in_inventory,
    fuel_type: v.fuel_type,
    transmission: v.transmission,
    drivetrain: v.drivetrain,
    primary_photo_url: primary?.url ?? null,
  };
}

/** Apply all inventory filters + sort to the mock list (no pagination slice). */
function filterSortMock(vehicles: Vehicle[], f: InventoryFilters): Vehicle[] {
  let out = vehicles.filter((v) => PUBLIC_STATUSES.includes(v.status));
  if (f.priceMin != null) out = out.filter((v) => v.price >= f.priceMin!);
  if (f.priceMax != null) out = out.filter((v) => v.price <= f.priceMax!);
  if (f.yearMin != null) out = out.filter((v) => v.year >= f.yearMin!);
  if (f.yearMax != null) out = out.filter((v) => v.year <= f.yearMax!);
  if (f.make) out = out.filter((v) => v.make.toLowerCase() === f.make!.toLowerCase());
  if (f.model) out = out.filter((v) => v.model.toLowerCase() === f.model!.toLowerCase());
  if (f.mileageMax != null) out = out.filter((v) => v.mileage <= f.mileageMax!);
  if (f.bodyStyles?.length)
    out = out.filter((v) => f.bodyStyles!.some((b) => (v.body_style ?? "").toLowerCase() === b.toLowerCase()));
  if (f.fuelType) out = out.filter((v) => (v.fuel_type ?? "").toLowerCase() === f.fuelType!.toLowerCase());
  if (f.transmission)
    out = out.filter((v) => (v.transmission ?? "").toLowerCase().includes(f.transmission!.toLowerCase()));
  if (f.drivetrain) out = out.filter((v) => (v.drivetrain ?? "").toLowerCase() === f.drivetrain!.toLowerCase());
  if (f.freshArrivals) out = out.filter((v) => v.days_in_inventory <= 7 || v.status === "fresh_arrival");
  if (f.priceReduced) out = out.filter((v) => v.price_reduced);
  switch (f.sort) {
    case "price_asc": out.sort((a, b) => a.price - b.price); break;
    case "price_desc": out.sort((a, b) => b.price - a.price); break;
    case "mileage_asc": out.sort((a, b) => a.mileage - b.mileage); break;
    case "year_desc": out.sort((a, b) => b.year - a.year); break;
    case "price_reduced": out.sort((a, b) => Number(b.price_reduced) - Number(a.price_reduced)); break;
    default: out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }
  return out;
}

/**
 * Paginated inventory read. Returns the requested page of vehicle cards plus
 * the total match count (drives numbered pagination). Falls back to mock data
 * when Supabase isn't configured.
 */
export async function getVehiclesPage(
  filters: InventoryFilters = {}
): Promise<{ vehicles: VehicleCard[]; total: number }> {
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 24;

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const all = filterSortMock(MOCK_VEHICLES, filters);
    return { vehicles: all.slice(offset, offset + limit).map(toCard), total: all.length };
  }
  try {
    const supabase = getSupabaseAdmin();
    let q = supabase
      .from("vehicles")
      .select("*, vehicle_photos(*)", { count: "exact" })
      .in("status", PUBLIC_STATUSES);

    if (filters.priceMin != null) q = q.gte("price", filters.priceMin);
    if (filters.priceMax != null) q = q.lte("price", filters.priceMax);
    if (filters.yearMin != null) q = q.gte("year", filters.yearMin);
    if (filters.yearMax != null) q = q.lte("year", filters.yearMax);
    if (filters.make) q = q.ilike("make", filters.make);
    if (filters.model) q = q.ilike("model", filters.model);
    if (filters.mileageMax != null) q = q.lte("mileage", filters.mileageMax);
    if (filters.bodyStyles?.length) q = q.in("body_style", filters.bodyStyles);
    if (filters.fuelType) q = q.ilike("fuel_type", filters.fuelType);
    if (filters.transmission) q = q.ilike("transmission", `%${filters.transmission}%`);
    if (filters.drivetrain) q = q.ilike("drivetrain", filters.drivetrain);
    if (filters.freshArrivals) q = q.lte("days_in_inventory", 7);
    if (filters.priceReduced) q = q.eq("price_reduced", true);

    switch (filters.sort) {
      case "price_asc": q = q.order("price", { ascending: true }); break;
      case "price_desc": q = q.order("price", { ascending: false }); break;
      case "mileage_asc": q = q.order("mileage", { ascending: true }); break;
      case "year_desc": q = q.order("year", { ascending: false }); break;
      case "price_reduced": q = q.order("price_reduced", { ascending: false }).order("created_at", { ascending: false }); break;
      default: q = q.order("created_at", { ascending: false });
    }

    q = q.range(offset, offset + limit - 1);

    const { data, error, count } = await q;
    if (error) throw error;
    const vehicles = (data as Vehicle[]).map(toCard);
    return { vehicles, total: count ?? vehicles.length };
  } catch (err) {
    console.error("[vehicles] getVehiclesPage failed, returning empty:", err);
    return { vehicles: [], total: 0 };
  }
}

export async function getVehicles(filters: InventoryFilters = {}): Promise<VehicleCard[]> {
  return (await getVehiclesPage(filters)).vehicles;
}

export async function getFeaturedVehicles(limit = 4): Promise<VehicleCard[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return MOCK_VEHICLES.filter((v) => v.featured).slice(0, limit).map(toCard);
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_photos(*)")
      .in("status", PUBLIC_STATUSES)
      .eq("featured", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Vehicle[]).map(toCard);
  } catch (err) {
    console.error("[vehicles] getFeaturedVehicles failed:", err);
    return [];
  }
}

export async function getVehicleBySlug(slug: string): Promise<Vehicle | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return MOCK_VEHICLES.find((v) => v.slug === slug) ?? null;
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_photos(*), vehicle_features(*), vehicle_prep_badges(*)")
      .eq("slug", slug)
      .in("status", PUBLIC_STATUSES)
      .maybeSingle();
    if (error) throw error;
    return data as Vehicle | null;
  } catch (err) {
    console.error("[vehicles] getVehicleBySlug failed:", err);
    return null;
  }
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return MOCK_VEHICLES.find((v) => v.id === id) ?? null;
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_photos(*), vehicle_features(*), vehicle_prep_badges(*)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as Vehicle | null;
  } catch (err) {
    console.error("[vehicles] getVehicleById failed:", err);
    return null;
  }
}

export async function getSimilarVehicles(vehicle: Vehicle, limit = 4): Promise<VehicleCard[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return MOCK_VEHICLES.filter(
      (v) =>
        v.id !== vehicle.id &&
        (v.make === vehicle.make || Math.abs(v.price - vehicle.price) <= 5000)
    )
      .slice(0, limit)
      .map(toCard);
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_photos(*)")
      .in("status", PUBLIC_STATUSES)
      .neq("id", vehicle.id)
      .or(`make.eq.${vehicle.make},and(price.gte.${vehicle.price - 5000},price.lte.${vehicle.price + 5000})`)
      .limit(limit);
    if (error) throw error;
    return (data as Vehicle[]).map(toCard);
  } catch (err) {
    console.error("[vehicles] getSimilarVehicles failed:", err);
    return [];
  }
}

export async function getAllActiveVehicles(): Promise<Vehicle[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return MOCK_VEHICLES.filter((v) => PUBLIC_STATUSES.includes(v.status));
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("vehicles")
      .select("*, vehicle_photos(*)")
      .in("status", PUBLIC_STATUSES)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Vehicle[];
  } catch (err) {
    console.error("[vehicles] getAllActiveVehicles failed:", err);
    return [];
  }
}

/** Distinct makes (and models per make) for filter dropdowns. */
export async function getMakesAndModels(): Promise<{ make: string; models: string[] }[]> {
  const vehicles = await getAllActiveVehicles();
  const map = new Map<string, Set<string>>();
  for (const v of vehicles) {
    if (!map.has(v.make)) map.set(v.make, new Set());
    map.get(v.make)!.add(v.model);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([make, models]) => ({ make, models: [...models].sort() }));
}

export { toCard as vehicleToCard };
