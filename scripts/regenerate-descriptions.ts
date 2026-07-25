/**
 * Rewrite the AI vehicle copy for the live lot.
 *
 * Uses the SAME generator the site and the DealerCenter sync use
 * (src/lib/aiVehicleDescription.ts), so what you preview here is exactly what
 * new arrivals will get written automatically.
 *
 *   npx tsx scripts/regenerate-descriptions.ts                # dry run, 3 cars, prints copy
 *   npx tsx scripts/regenerate-descriptions.ts --limit 5      # dry run, 5 cars
 *   npx tsx scripts/regenerate-descriptions.ts --stock 1471   # dry run, one car
 *   npx tsx scripts/regenerate-descriptions.ts --all          # dry run, whole lot
 *   npx tsx scripts/regenerate-descriptions.ts --all --apply  # WRITES to the live site
 *
 * Dry run is the default on purpose: this writes copy that customers read.
 */

import { config as loadEnv } from "dotenv";
import type { Vehicle } from "../src/types/vehicle";

// src/lib/supabase.ts reads process.env at module scope, and static imports are
// hoisted above this call — so the app modules are imported dynamically inside
// main(), after the env is loaded. Moving these to `import` breaks the script.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const value = (flag: string): string | null => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

const APPLY = has("--apply");
const ALL = has("--all");
const STOCK = value("--stock");
const LIMIT = Number.parseInt(value("--limit") ?? "3", 10);

/** Phrases the old copy leaned on. Flagged so a bad rewrite is obvious. */
const HEDGE_PATTERNS: Array<[string, RegExp]> = [
  ["pre-purchase inspection", /pre-?purchase inspection|independent mechanic|have (?:your own |a )?mechanic/i],
  ["let's be honest/real", /let'?s be (?:honest|real)|i'?ll be (?:straight|honest) with you/i],
  ["risk framing", /money pit|eyes (?:wide )?open|buyer beware|due diligence|faint of heart|going in blind/i],
  ["missing-data leak", /don'?t have (?:a |the )?(?:full )?(?:feature|list)|not listed|no confirmed|on file|can'?t make promises/i],
  ["mileage apology", /miles? (?:sounds?|is|are) a lot|higher mileage can|real-world use behind/i],
];

function flagHedges(text: string): string[] {
  return HEDGE_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

  const { getAllActiveVehicles, getVehicleById } = await import("../src/lib/vehicles");
  const { generateVehicleDescription, saveVehicleDescription } = await import(
    "../src/lib/aiVehicleDescription"
  );

  const active = await getAllActiveVehicles();
  let selected: Vehicle[];
  if (STOCK) {
    selected = active.filter((v) => v.stock_number === STOCK);
    if (selected.length === 0) throw new Error(`No active vehicle with stock number ${STOCK}`);
  } else {
    selected = ALL ? active : active.slice(0, Number.isFinite(LIMIT) ? LIMIT : 3);
  }
  console.log(
    `${APPLY ? "APPLY" : "DRY RUN"} — ${selected.length} vehicle(s)` +
      (APPLY ? " will be WRITTEN to the live site\n" : " (nothing will be written)\n")
  );

  let ok = 0;
  let failed = 0;
  const flagged: string[] = [];

  for (const listed of selected) {
    const label = `${listed.year} ${listed.make} ${listed.model}${listed.trim ? ` ${listed.trim}` : ""}`;

    // getAllActiveVehicles omits vehicle_features / prep badges; re-read the
    // full row so the generator sees everything the site would show.
    const vehicle = (await getVehicleById(listed.id)) ?? listed;

    // One retry: the model occasionally drops a field, which the generator
    // now rejects rather than writing blank.
    let result = await generateVehicleDescription(vehicle);
    if (!result.ok) {
      console.log(`… ${label} — ${result.error}; retrying`);
      result = await generateVehicleDescription(vehicle);
    }
    if (!result.ok || !result.generated) {
      failed++;
      console.log(`✗ ${label} — ${result.error}\n`);
      continue;
    }

    const g = result.generated;
    const hedges = flagHedges(
      [g.full_description, g.ryans_take, g.what_to_know, g.best_fit_for, g.short_description].join("\n")
    );

    console.log("=".repeat(72));
    console.log(`${label} — ${Number(vehicle.mileage).toLocaleString()} mi — $${Number(vehicle.price).toLocaleString()}`);
    console.log("=".repeat(72));
    console.log(`\n[description_ai]\n${g.full_description}`);
    console.log(`\n[ryans_take]\n${g.ryans_take}`);
    console.log(`\n[best_fit_for]\n${g.best_fit_for}`);
    console.log(`\n[what_to_know]\n${g.what_to_know}`);
    console.log(`\n[meta_description]\n${g.meta_description}`);

    if (hedges.length > 0) {
      flagged.push(`${label}: ${hedges.join(", ")}`);
      console.log(`\n⚠ HEDGING DETECTED: ${hedges.join(", ")}`);
    }

    if (APPLY) {
      const saved = await saveVehicleDescription(vehicle.id, g);
      if (!saved.ok) {
        failed++;
        console.log(`\n✗ save failed — ${saved.error}\n`);
        continue;
      }
      console.log("\n✓ saved");
    }
    console.log("");
    ok++;
  }

  console.log("-".repeat(72));
  console.log(`${APPLY ? "written" : "generated"}: ${ok} | failed: ${failed}`);
  if (flagged.length > 0) {
    console.log(`\n⚠ ${flagged.length} vehicle(s) still contain hedging language:`);
    for (const line of flagged) console.log(`  - ${line}`);
  } else {
    console.log("no hedging language detected");
  }
  if (!APPLY) console.log("\nDry run. Re-run with --apply to write these to the live site.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
