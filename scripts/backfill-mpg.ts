/**
 * Backfill EPA city/highway MPG for cars already on the lot.
 *
 * Uses the same lookup the DealerCenter sync uses going forward
 * (src/lib/mpgLookup.ts + src/lib/vinSpecs.ts), so a car looked up here
 * matches exactly what a fresh sync would have given it.
 *
 *   npx tsx scripts/backfill-mpg.ts                 # dry run, whole lot, prints results
 *   npx tsx scripts/backfill-mpg.ts --stock 1471     # dry run, one car
 *   npx tsx scripts/backfill-mpg.ts --apply          # WRITES to the live site
 *
 * Dry run is the default on purpose. A car whose engine can't be confidently
 * matched against fueleconomy.gov's options is reported as skipped, not
 * guessed — see mpgLookup.ts for why.
 */

import { config as loadEnv } from "dotenv";
import type { Vehicle } from "../src/types/vehicle";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const value = (flag: string): string | null => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const APPLY = has("--apply");
const STOCK = value("--stock");

async function main(): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  const { getAllActiveVehicles } = await import("../src/lib/vehicles");
  const { getSupabaseAdmin } = await import("../src/lib/supabase");
  const { decodeVinSpecs } = await import("../src/lib/vinSpecs");
  const { lookupMpg } = await import("../src/lib/mpgLookup");

  const active = await getAllActiveVehicles();
  const selected: Vehicle[] = STOCK ? active.filter((v) => v.stock_number === STOCK) : active;
  if (STOCK && selected.length === 0) throw new Error(`No active vehicle with stock number ${STOCK}`);

  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — ${selected.length} vehicle(s)` +
      (APPLY ? " will be WRITTEN to the live site\n" : " (nothing will be written)\n")
  );

  let found = 0;
  let skipped = 0;
  const supabase = getSupabaseAdmin();

  for (const v of selected) {
    const label = `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""} (stock ${v.stock_number})`;
    if (v.city_mpg && v.highway_mpg) {
      console.log(`- ${label} — already has ${v.city_mpg}/${v.highway_mpg} mpg, skipping`);
      continue;
    }

    const decoded = await decodeVinSpecs(v.vin);
    const result = await lookupMpg(v.year, v.make, v.model, {
      liters: decoded?.engine_liters ?? null,
      cylinders: decoded?.engine_cylinders ?? null,
      drivetrain: decoded?.drivetrain ?? null,
      hybrid: decoded?.engine_hybrid ?? false,
    });

    if (!result) {
      skipped++;
      console.log(`✗ ${label} — no confident match (engine: ${decoded?.engine ?? "unknown"})`);
      continue;
    }

    found++;
    console.log(`✓ ${label} — ${result.city_mpg} city / ${result.highway_mpg} hwy (engine: ${decoded?.engine ?? "unknown"})`);

    if (APPLY) {
      const { error } = await supabase
        .from("vehicles")
        .update({ city_mpg: result.city_mpg, highway_mpg: result.highway_mpg })
        .eq("id", v.id);
      if (error) console.log(`  ✗ save failed — ${error.message}`);
    }
  }

  console.log("-".repeat(72));
  console.log(`matched: ${found} | skipped (no confident engine match): ${skipped}`);
  if (!APPLY) console.log("\nDry run. Re-run with --apply to write these to the live site.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
