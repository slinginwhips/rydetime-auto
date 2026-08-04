/**
 * EPA fueleconomy.gov lookup — fills the MPG DealerCenter never sends.
 *
 * Three-step, free, keyless API:
 *  1. List the exact model strings fueleconomy.gov has for year+make. It
 *     folds drivetrain (and sometimes a dash) into the model itself —
 *     "F150" is filed as "F-150 2WD" / "F-150 4WD", "Grand Cherokee" as
 *     "Grand Cherokee 4WD" / "Grand Cherokee SRT 4WD", etc. — so our plain
 *     DB model never matches it exactly and has to be resolved first.
 *  2. For each candidate model string, list its engine/trim options.
 *  3. Fetch city/highway for the option(s) matching the VIN-decoded engine
 *     (cylinders + displacement, from vinSpecs.ts) — a V6 Camry must never
 *     get the 4-cylinder's rating.
 *
 * SERVER ONLY. Never throws — a lookup failure just leaves MPG blank; the
 * caller retries on a later sync.
 */

const MODEL_ENDPOINT = "https://www.fueleconomy.gov/ws/rest/vehicle/menu/model";
const OPTIONS_ENDPOINT = "https://www.fueleconomy.gov/ws/rest/vehicle/menu/options";
const VEHICLE_ENDPOINT = "https://www.fueleconomy.gov/ws/rest/vehicle";

export interface MpgResult {
  city_mpg: number;
  highway_mpg: number;
}

export interface EngineHint {
  liters: number | null;
  cylinders: number | null;
  /** VIN-decoded drivetrain ("FWD"/"AWD"/"4WD"/"RWD") — narrows which of
   *  fueleconomy.gov's 2WD/4WD/AWD model variants to search. */
  drivetrain?: string | null;
  /** VIN-decoded hybrid/electrified flag — a non-hybrid Camry and a Camry
   *  Hybrid can share the same cylinder count and displacement, so this is
   *  the only thing stopping their very different MPG from being averaged
   *  together. */
  hybrid?: boolean;
}

interface MenuItem {
  text: string;
  value: string;
}

/** Fetches at most this many candidate models' option lists per lookup — a
 *  sanity bound, not a tight one: trucks like the F-150 list 15-20 model
 *  variants (payload class × drivetrain × fuel), and the real match could be
 *  any of them. The final cost stays small regardless, since only entries
 *  whose engine matches the VIN ever reach a detail fetch. */
const MAX_CANDIDATE_MODELS = 40;

/** VIN-decoded drivetrain labels → the tokens fueleconomy.gov's model
 *  strings actually use ("RWD" trucks are filed under "2WD"). */
const DRIVETRAIN_TOKENS: Record<string, string[]> = {
  RWD: ["2WD", "RWD"],
  "4WD": ["4WD", "4X4"],
  AWD: ["AWD"],
  FWD: ["FWD", "2WD"],
};

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

/** fueleconomy.gov returns a bare object instead of a 1-item array when there's only one match. */
function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Lowercase, strip everything but letters/digits — "F-150 2WD" → "f1502wd". */
function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * DealerCenter folds cab style into the model field for pickups — "F150
 * Regular Cab", "F150 Super Cab", "Sierra 1500 Crew Cab" — but
 * fueleconomy.gov's listings never spell out cab style (they differentiate
 * by drivetrain/GVWR/engine instead), so the raw model never prefix-matches
 * anything. Strip it back to the base line name before searching.
 */
function stripCabStyle(model: string): string {
  return model
    .replace(/\s+(regular|super|extended|double|quad|access|king|mega|crew)\s+cab\b/i, "")
    .replace(/\s+supercrew\b/i, "")
    .trim();
}

/**
 * GM half-ton pickups are catalogued under their old chassis codes on
 * fueleconomy.gov — "Sierra 1500"/"Silverado 1500" as DealerCenter (and every
 * customer) knows them is filed as "Sierra C15"/"Sierra K15" (2WD/4WD) or
 * "Silverado C15"/"Silverado K15" — across essentially every model year, not
 * just older ones. Base model-name matching alone never finds these.
 */
function modelSearchBases(make: string, model: string): string[] {
  const base = stripCabStyle(model);
  const bases = [base, model];
  if (/^(gmc|chevrolet)$/i.test(make) && /^(sierra|silverado)\s*1500$/i.test(base)) {
    const line = base.match(/^(sierra|silverado)/i)![1];
    bases.push(`${line} C15`, `${line} K15`);
  }
  return bases;
}

/**
 * Which of fueleconomy.gov's model strings for this year+make are our model?
 * A candidate must start with one of our (squashed) model search bases —
 * "Grand Cherokee" matches "Grand Cherokee 4WD" and "Grand Cherokee SRT 4WD"
 * alike; the wrong engine on a same-prefix trim (like SRT) is filtered out
 * later by cylinders/displacement, not here. When a VIN-decoded drivetrain is
 * available and at least one candidate mentions it, narrow to those — trims
 * a 2WD/4WD F-150 down to the one that matches instead of averaging across
 * both (their MPG differs by more than a transmission sub-variant does).
 * Flex-fuel (FFV/E85) variants are dropped whenever a non-FFV variant of the
 * same model also exists — our lot runs on gasoline, and E85 city/highway
 * numbers are materially worse than the gasoline rating for the identical
 * engine.
 */
function resolveCandidateModels(
  allModels: string[],
  make: string,
  ourModel: string,
  drivetrain: string | null | undefined,
  hybrid: boolean | undefined
): string[] {
  const wanted = modelSearchBases(make, ourModel).map(squash).filter(Boolean);
  if (wanted.length === 0) return [];
  let candidates = allModels.filter((m) => {
    const s = squash(m);
    return wanted.some((w) => s.startsWith(w));
  });

  if (drivetrain) {
    const tokens = DRIVETRAIN_TOKENS[drivetrain.toUpperCase()] ?? [drivetrain.toUpperCase()];
    const narrowed = candidates.filter((m) => tokens.some((t) => m.toUpperCase().includes(t)));
    if (narrowed.length > 0) candidates = narrowed;
  }

  // A hybrid and non-hybrid trim of the same model (Camry vs Camry Hybrid)
  // often share cylinder count and displacement — model-name filtering is
  // the only thing that keeps their very different MPG from being averaged.
  const hybridMatch = candidates.filter((m) => /hybrid/i.test(m));
  const nonHybridMatch = candidates.filter((m) => !/hybrid/i.test(m));
  if (hybrid && hybridMatch.length > 0) candidates = hybridMatch;
  else if (!hybrid && nonHybridMatch.length > 0) candidates = nonHybridMatch;

  const nonFfv = candidates.filter((m) => !/\bFFV\b|\bE85\b/i.test(m));
  if (nonFfv.length > 0) candidates = nonFfv;

  return candidates.slice(0, MAX_CANDIDATE_MODELS);
}

/** "3.5 L, 6 cyl, Automatic (S8), Regular Gasoline" → { liters: 3.5, cylinders: 6 }. */
function parseOptionEngine(text: string): { liters: number | null; cylinders: number | null } {
  const litersMatch = text.match(/([\d.]+)\s*L\b/i);
  const cylMatch = text.match(/(\d+)\s*cyl/i);
  return {
    liters: litersMatch ? Number.parseFloat(litersMatch[1]) : null,
    cylinders: cylMatch ? Number.parseInt(cylMatch[1], 10) : null,
  };
}

/**
 * Picks every option matching the VIN-decoded engine (cylinders AND
 * displacement). A single listed option is used as-is (nothing to
 * disambiguate). fueleconomy.gov often lists the SAME engine twice under
 * different transmission sub-variants (e.g. two 2.4L/4-cyl Honda Accord rows,
 * "Automatic (AV-S7)" vs "Automatic (variable gear ratios)", 1 mpg apart) —
 * those are averaged by the caller rather than picked between. A model that
 * genuinely offers more than one distinct engine (e.g. 4-cyl AND V6) and
 * can't be narrowed to one contributes nothing, so the car goes without an
 * MPG rather than risk the wrong engine's rating.
 */
function selectOptions(options: MenuItem[], hint: EngineHint): MenuItem[] {
  if (options.length === 0) return [];
  if (options.length === 1) return options;
  if (hint.cylinders == null && hint.liters == null) return [];

  return options.filter((o) => {
    const parsed = parseOptionEngine(o.text);
    if (parsed.cylinders == null && parsed.liters == null) return false;
    const cylOk = hint.cylinders == null || parsed.cylinders == null || parsed.cylinders === hint.cylinders;
    const litersOk =
      hint.liters == null || parsed.liters == null || Math.abs(parsed.liters - hint.liters) < 0.15;
    return cylOk && litersOk;
  });
}

/**
 * Look up EPA city/highway MPG for a year/make/model, matched to `hint`
 * (from decodeVinSpecs) when the model has more than one engine on file.
 * Returns null when fueleconomy.gov has nothing, or the right engine can't
 * be confidently identified.
 */
export async function lookupMpg(
  year: number,
  make: string,
  model: string,
  hint: EngineHint
): Promise<MpgResult | null> {
  const modelMenu = await fetchJson(
    `${MODEL_ENDPOINT}?year=${year}&make=${encodeURIComponent(make)}`
  );
  if (!modelMenu || typeof modelMenu !== "object") return null;
  const allModels = asArray((modelMenu as { menuItem?: MenuItem | MenuItem[] }).menuItem)
    .map((m) => m?.value)
    .filter((v): v is string => Boolean(v));

  const candidateModels = resolveCandidateModels(allModels, make, model, hint.drivetrain, hint.hybrid);
  if (candidateModels.length === 0) return null;

  const optionLists = await Promise.all(
    candidateModels.map((m) =>
      fetchJson(`${OPTIONS_ENDPOINT}?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(m)}`)
    )
  );
  const chosen = optionLists.flatMap((menu) => {
    if (!menu || typeof menu !== "object") return [];
    const options = asArray((menu as { menuItem?: MenuItem | MenuItem[] }).menuItem).filter(
      (o): o is MenuItem => Boolean(o && o.value)
    );
    return selectOptions(options, hint);
  });
  if (chosen.length === 0) return null;

  const details = await Promise.all(chosen.map((o) => fetchJson(`${VEHICLE_ENDPOINT}/${o.value}`)));
  const readings = details
    .filter((d): d is Record<string, unknown> => Boolean(d && typeof d === "object"))
    .map((row) => ({ city: Number(row.city08), highway: Number(row.highway08) }))
    .filter((r) => Number.isFinite(r.city) && Number.isFinite(r.highway) && r.city > 0 && r.highway > 0);
  if (readings.length === 0) return null;

  const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
  return {
    city_mpg: Math.round(avg(readings.map((r) => r.city))),
    highway_mpg: Math.round(avg(readings.map((r) => r.highway))),
  };
}
