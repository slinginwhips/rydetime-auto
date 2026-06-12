import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { getInventoryProvider } from "@/lib/inventoryProvider";
import { sendNotification } from "@/lib/notificationProvider";
import { generateVehicleSlug } from "@/lib/vehicleSlug";
import type { DCVehicle, SyncSummary } from "@/types/dealercenter";
import type { VehicleStatus } from "@/types/vehicle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ExistingVehicleRow {
  id: string;
  vin: string;
  price: number;
  mileage: number;
  original_price: number | null;
  price_reduced: boolean;
  status: VehicleStatus;
  days_in_inventory: number;
  created_at: string;
}

function daysSince(dateStr: string | undefined | null, fallback: number): number {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return fallback;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function buildVehicleRow(
  dc: DCVehicle,
  prior: ExistingVehicleRow | undefined,
  now: string
): Record<string, unknown> {
  // Days in inventory: prefer the feed's date_in_stock, then prior record age.
  const fallbackDays = prior
    ? daysSince(prior.created_at, prior.days_in_inventory)
    : 0;
  const days = daysSince(dc.date_in_stock, fallbackDays);

  // Price-drop tracking: when the feed price drops below the stored price,
  // flag it and remember the first (highest known) original price.
  let priceReduced = prior?.price_reduced ?? false;
  let originalPrice: number | null = prior?.original_price ?? null;
  if (prior && dc.price > 0 && Number(prior.price) > dc.price) {
    priceReduced = true;
    originalPrice = originalPrice ?? Number(prior.price);
  }

  // Status: feed-marked sold wins; manual hold_pending is preserved;
  // otherwise fresh_arrival for the first week, then active.
  let status: VehicleStatus;
  let soldAt: string | null = null;
  if (dc.status && /sold/i.test(dc.status)) {
    status = "sold";
    soldAt = now;
  } else if (prior?.status === "hold_pending") {
    status = "hold_pending";
  } else {
    status = days <= 7 ? "fresh_arrival" : "active";
  }

  return {
    vin: dc.vin,
    stock_number: dc.stock_number,
    year: dc.year,
    make: dc.make,
    model: dc.model,
    trim: dc.trim ?? null,
    body_style: dc.body_style ?? null,
    exterior_color: dc.exterior_color ?? null,
    interior_color: dc.interior_color ?? null,
    mileage: dc.mileage,
    price: dc.price,
    msrp: dc.msrp ?? null,
    status,
    sold_at: soldAt,
    transmission: dc.transmission ?? null,
    drivetrain: dc.drivetrain ?? null,
    fuel_type: dc.fuel_type ?? null,
    engine: dc.engine ?? null,
    doors: dc.doors ?? null,
    seats: dc.seats ?? null,
    description_dc: dc.description ?? null,
    slug: generateVehicleSlug({
      year: dc.year,
      make: dc.make,
      model: dc.model,
      trim: dc.trim,
      stock_number: dc.stock_number,
    }),
    carfax_url: dc.carfax_url ?? null,
    carfax_badge_one_owner: dc.carfax_one_owner ?? false,
    carfax_badge_accident_free: dc.carfax_accident_free ?? false,
    carfax_badge_service_records: dc.carfax_service_records ?? false,
    carfax_badge_great_value: dc.carfax_great_value ?? false,
    dc_vehicle_url: dc.dc_vehicle_url ?? null,
    video_url: dc.video_url ?? null,
    days_in_inventory: days,
    price_reduced: priceReduced,
    original_price: originalPrice,
    updated_at: now,
    dc_last_synced: now,
  };
}

async function runSync(req: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase is not configured. Add SUPABASE_SERVICE_ROLE_KEY to enable inventory sync." },
      { status: 503 }
    );
  }

  const supabase = getSupabaseAdmin();
  const summary: SyncSummary = { added: 0, updated: 0, sold: 0, unchanged: 0, errors: [] };
  const feedUrl = process.env.DEALERCENTER_INVENTORY_FEED_URL ?? null;
  let logId: string | null = null;

  try {
    const { data: log } = await supabase
      .from("inventory_sync_logs")
      .insert({ started_at: new Date().toISOString(), status: "running", feed_url: feedUrl })
      .select("id")
      .single();
    logId = (log as { id: string } | null)?.id ?? null;

    const feed = await getInventoryProvider().fetchInventory();
    const now = new Date().toISOString();

    const { data: existingData, error: existingErr } = await supabase
      .from("vehicles")
      .select("id, vin, price, mileage, original_price, price_reduced, status, days_in_inventory, created_at");
    if (existingErr) throw existingErr;
    const existingRows = (existingData ?? []) as ExistingVehicleRow[];
    const existingByVin = new Map(existingRows.map((r) => [r.vin, r]));

    // Admin overrides: field values the dealership has pinned in the admin UI.
    // Re-applied after every upsert so the feed never clobbers them.
    const { data: overrideData, error: overrideErr } = await supabase
      .from("admin_overrides")
      .select("vehicle_id, field_name, override_value");
    if (overrideErr) throw overrideErr;
    const overridesByVehicle = new Map<string, Record<string, unknown>>();
    for (const o of (overrideData ?? []) as { vehicle_id: string; field_name: string; override_value: string }[]) {
      const fields = overridesByVehicle.get(o.vehicle_id) ?? {};
      fields[o.field_name] = o.override_value;
      overridesByVehicle.set(o.vehicle_id, fields);
    }

    const feedVins = new Set<string>();

    for (const dc of feed.vehicles) {
      try {
        if (!dc.vin || !dc.year || !dc.make || !dc.model) {
          summary.errors.push(`Skipped feed record with missing required fields (vin=${dc.vin || "?"})`);
          continue;
        }
        feedVins.add(dc.vin);
        const prior = existingByVin.get(dc.vin);
        const row = buildVehicleRow(dc, prior, now);

        const { data: upserted, error: upsertErr } = await supabase
          .from("vehicles")
          .upsert(row, { onConflict: "vin" })
          .select("id")
          .single();
        if (upsertErr || !upserted) {
          throw upsertErr ?? new Error("Upsert returned no row");
        }
        const vehicleId = (upserted as { id: string }).id;

        // Re-apply admin overrides so synced data never overwrites them.
        const overrides = overridesByVehicle.get(vehicleId);
        if (overrides && Object.keys(overrides).length > 0) {
          const { error: ovErr } = await supabase.from("vehicles").update(overrides).eq("id", vehicleId);
          if (ovErr) summary.errors.push(`${dc.vin}: failed to re-apply overrides — ${ovErr.message}`);
        }

        // Replace photos.
        await supabase.from("vehicle_photos").delete().eq("vehicle_id", vehicleId);
        if (dc.photo_urls.length > 0) {
          const { error: photoErr } = await supabase.from("vehicle_photos").insert(
            dc.photo_urls.map((url, i) => ({
              vehicle_id: vehicleId,
              url,
              sort_order: i,
              is_primary: i === 0,
            }))
          );
          if (photoErr) summary.errors.push(`${dc.vin}: photo insert failed — ${photoErr.message}`);
        }

        // Replace features.
        await supabase.from("vehicle_features").delete().eq("vehicle_id", vehicleId);
        if (dc.features.length > 0) {
          const { error: featErr } = await supabase.from("vehicle_features").insert(
            dc.features.map((feature_name) => ({ vehicle_id: vehicleId, feature_name }))
          );
          if (featErr) summary.errors.push(`${dc.vin}: feature insert failed — ${featErr.message}`);
        }

        if (!prior) {
          summary.added++;
        } else if (
          Number(prior.price) !== dc.price ||
          Number(prior.mileage) !== dc.mileage ||
          prior.status !== (row.status as VehicleStatus)
        ) {
          summary.updated++;
        } else {
          summary.unchanged++;
        }
      } catch (err) {
        summary.errors.push(`${dc.vin}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }

    // Mark vehicles missing from the feed as sold — but only when the feed
    // actually returned data, so an empty/unconfigured feed never mass-sells.
    if (feed.vehicles.length > 0) {
      const missing = existingRows.filter((r) => !feedVins.has(r.vin) && r.status !== "sold");
      if (missing.length > 0) {
        const { error: soldErr } = await supabase
          .from("vehicles")
          .update({ status: "sold", sold_at: now, updated_at: now })
          .in("id", missing.map((m) => m.id));
        if (soldErr) {
          summary.errors.push(`Failed to mark sold vehicles — ${soldErr.message}`);
        } else {
          summary.sold = missing.length;
        }
      }
    }

    if (logId) {
      await supabase
        .from("inventory_sync_logs")
        .update({
          completed_at: new Date().toISOString(),
          status: summary.errors.length > 0 ? "error" : "success",
          vehicles_added: summary.added,
          vehicles_updated: summary.updated,
          vehicles_sold: summary.sold,
          vehicles_unchanged: summary.unchanged,
          error_message: summary.errors.length > 0 ? summary.errors.join("; ").slice(0, 2000) : null,
        })
        .eq("id", logId);
    }

    if (summary.errors.length > 0) {
      await sendNotification({
        subject: `Inventory sync completed with ${summary.errors.length} error(s)`,
        body: `Added: ${summary.added}, Updated: ${summary.updated}, Sold: ${summary.sold}, Unchanged: ${summary.unchanged}\n\nErrors:\n${summary.errors.join("\n")}`,
      });
    }

    return NextResponse.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inventory sync failed";
    console.error("[inventory/sync] failed:", err);

    try {
      if (logId) {
        await getSupabaseAdmin()
          .from("inventory_sync_logs")
          .update({
            completed_at: new Date().toISOString(),
            status: "error",
            vehicles_added: summary.added,
            vehicles_updated: summary.updated,
            vehicles_sold: summary.sold,
            vehicles_unchanged: summary.unchanged,
            error_message: message.slice(0, 2000),
          })
          .eq("id", logId);
      }
      await sendNotification({
        subject: "Inventory sync FAILED",
        body: `The DealerCenter inventory sync failed: ${message}`,
      });
    } catch (notifyErr) {
      console.error("[inventory/sync] failed to record failure:", notifyErr);
    }

    return NextResponse.json({ error: message, ...summary }, { status: 500 });
  }
}

/** Vercel cron trigger. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return runSync(req);
}

/** Manual trigger from the admin dashboard. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  return runSync(req);
}
