import { getAnthropic, AI_MODEL, isAIConfigured } from "@/lib/ai";
import { getSupabaseAdmin } from "@/lib/supabase";
import { decodeVinSpecs } from "@/lib/vinSpecs";
import type { Vehicle } from "@/types/vehicle";

/**
 * Shared vehicle-description generation. Used by the admin "Generate AI
 * Description" endpoint AND the inventory sync (which auto-writes copy for any
 * newly added car that doesn't have a description yet), so the voice and rules
 * stay identical everywhere.
 */

export interface GeneratedDescription {
  short_description: string;
  full_description: string;
  ryans_take: string;
  best_fit_for: string;
  what_to_know: string;
  meta_description: string;
}

/**
 * Only facts we actually have. Missing values are OMITTED, never rendered as
 * "unknown"/"not listed" — the model faithfully narrates absent data if it can
 * see it ("we don't have a full feature list in front of us"), which reads
 * like an apology on a customer-facing page. Stock number is deliberately not
 * included: customers quote it back and it means nothing to them.
 */
/** Specs decoded from the VIN, used only where the database has nothing. */
type SpecOverrides = Partial<
  Pick<Vehicle, "body_style" | "drivetrain" | "engine" | "transmission" | "fuel_type" | "doors" | "seats">
>;

function vehicleFacts(v: Vehicle, extra: SpecOverrides = {}): string {
  const pick = <K extends keyof SpecOverrides>(key: K): SpecOverrides[K] =>
    (v[key] ?? extra[key] ?? null) as SpecOverrides[K];
  const confirmedBadges: string[] = [];
  if (v.carfax_badge_one_owner) confirmedBadges.push("confirmed one owner");
  if (v.carfax_badge_accident_free) confirmedBadges.push("confirmed no accidents reported");
  if (v.carfax_badge_service_records) confirmedBadges.push("service records available");
  if (v.carfax_badge_great_value) confirmedBadges.push("great value");
  if (v.carfax_badge_good_value) confirmedBadges.push("good value");
  const features = (v.vehicle_features ?? []).map((f) => f.feature_name).slice(0, 40);

  const spec = (label: string, value: string | number | null | undefined): string | null =>
    value === null || value === undefined || `${value}`.trim() === "" ? null : `${label}: ${value}`;

  const lines: (string | null)[] = [
    `Vehicle: ${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`,
    `Price: $${Number(v.price).toLocaleString()}`,
    `Mileage: ${Number(v.mileage).toLocaleString()} miles`,
    spec("Body style", pick("body_style")),
    spec("Exterior color", v.exterior_color),
    spec("Interior color", v.interior_color),
    spec("Transmission", pick("transmission")),
    spec("Drivetrain", pick("drivetrain")),
    spec("Fuel", pick("fuel_type")),
    spec("Engine", pick("engine")),
    spec("Doors", pick("doors")),
    spec("Seats", pick("seats")),
    confirmedBadges.length > 0 ? `Confirmed vehicle-history badges: ${confirmedBadges.join("; ")}` : null,
    features.length > 0 ? `Features: ${features.join(", ")}` : null,
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) continue;
    try {
      const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

/** cp1252-as-latin1 mojibake seen in copy written by earlier pipelines. */
const MOJIBAKE: Array<[RegExp, string]> = [
  [/â€”/g, "—"],
  [/â€“/g, "–"],
  [/â€™/g, "'"],
  [/â€œ/g, "“"],
  [/â€/g, "”"],
  [/â€¦/g, "…"],
  [/Â/g, ""],
];

/**
 * Last line of defence before copy goes live. The sync writes descriptions
 * unattended, so anything we never want a customer to read gets removed here
 * as well as forbidden in the prompt — notably stock numbers, which customers
 * quote back and which mean nothing outside the lot.
 */
function clean(text: string, stockNumber: string | null | undefined): string {
  let out = text;
  for (const [pattern, replacement] of MOJIBAKE) out = out.replace(pattern, replacement);
  const stock = (stockNumber ?? "").trim();
  if (stock) {
    const escaped = stock.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\s*\\b(?:stock\\s*(?:number|no\\.?|#)?\\s*)?#?${escaped}\\b\\.?`, "gi"), "");
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([.,!?])/g, "$1").trim();
}

function str(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return typeof v === "string" ? v.trim() : "";
}

function buildPrompt(vehicle: Vehicle, extra: SpecOverrides = {}): string {
  return `You write vehicle listings for RydeTime Auto, an independent used car dealership in Suffolk, VA serving Hampton Roads. Ryan, the owner, hand-picks every car on this lot. Your job is to sell this specific car to the person it's right for.

Voice: warm, confident, human — a car-savvy friend who knows this vehicle and is glad to have it. Honest, never hype, never sleazy dealer-speak, never corny. A little dry humor is welcome.

VEHICLE DATA (the ONLY facts you may use):
${vehicleFacts(vehicle, extra)}

TONE — THIS IS THE MOST IMPORTANT SECTION:
Honest does NOT mean apologetic. Every car here is a car Ryan chose to buy, and the copy should read that way. Write about what this vehicle IS and what it DOES for its next owner. Do not warn, hedge, caveat, or talk the reader out of it.

Specifically, NEVER:
- Open by addressing the mileage, the age, or the price as something to get past. No "Let's be honest", "Let's be real", "I'll be straight with you", "X miles sounds like a lot, but…", "isn't for the faint of heart".
- Frame the vehicle as a gamble, a project, or a risk: no "money pit", "eyes wide open", "buyer beware", "due diligence", "go in informed", "if it's the right fit for your situation".
- Recommend a pre-purchase inspection or an independent mechanic. That belongs to the buyer, not our listing, and repeating it on every car reads like we don't trust our own inventory.
- Mention a stock number, or any inventory/lot code.
- Mention or allude to information we DON'T have. If a field isn't in the vehicle data above, it simply doesn't exist for you — write around it. Never say "we don't have a full feature list", "no confirmed history on file", "not listed", or anything similar.
- Talk about pricing negotiation, processing/dealer fees, taxes, financing legalese, or the store address — those live elsewhere on the page.

Mileage and age are neutral facts, not apologies. Mention them only if you have something genuinely useful to say (e.g. a platform known to run well past this mileage), and say it as a positive.

WHAT YOU MAY SAY:
- The model's general reputation (reliability, longevity, ride quality, safety record).
- Who it suits: commuting, family hauling, first car, work vehicle, road trips, weather.
- Fuel-economy characteristics typical of this body style and drivetrain.
- Comfort, convenience, and capability features that actually appear in the data above.
- Body-style practicality: cargo room, seating, ground clearance, parking footprint.
- That it's worth coming to see and drive in person. Say this at most once, as an invitation, not a warning.

HARD HONESTY LIMITS (these are legal, not stylistic — never break them):
- Do NOT claim, imply, or suggest any of these unless it appears in the confirmed data above: clean title, accident-free, one owner, fully serviced, new tires, fresh oil change, no warning lights, included warranty, best/lowest price, guaranteed financing.
- Never invent features, options, condition details, service history, or ownership history.
- Never guarantee approval, rates, or payments.
- Mention the Carfax ONLY if a confirmed vehicle-history badge appears in the data above. If there are no badges, do not mention Carfax, vehicle history, or reports at all.

Write the following and respond with ONLY a JSON object, no other text. Every field is required and must be a non-empty string:
{
  "short_description": "2 sentences for the listing card. Lead with what makes this car worth a look.",
  "full_description": "3-4 paragraphs for the detail page, separated by \\n\\n. Open with a hook about the vehicle itself. Close with an invitation to come drive it.",
  "ryans_take": "1-2 sentences in first person as Ryan, the owner. Why he'd put a customer in this car — specific and confident, not a disclaimer.",
  "best_fit_for": "1 sentence describing who this vehicle is ideal for.",
  "what_to_know": "1-2 sentences of genuinely USEFUL, SPECIFIC information about this vehicle a shopper would be glad to know before visiting — what this trim/drivetrain/body style is and isn't good at, what the cabin or cargo space is like, what kind of driving it suits. This is a helpful note, NOT a disclaimer and NOT a warning. Do not mention inspections, mechanics, mileage concerns, or vehicle history here.",
  "meta_description": "SEO meta description, 155 characters maximum, includes year/make/model and Suffolk VA"
}`;
}

export interface GenerationResult {
  ok: boolean;
  error?: string;
  generated?: GeneratedDescription;
}

/**
 * Generate copy for one vehicle WITHOUT writing it. Split out so the
 * regeneration script can preview a rewrite before it goes live on the site.
 */
export async function generateVehicleDescription(vehicle: Vehicle): Promise<GenerationResult> {
  if (!isAIConfigured()) return { ok: false, error: "AI is not configured" };

  // DealerCenter sends no body style, drivetrain, engine or door count, so
  // fill those from the VIN before writing. Null result = vPIC unavailable;
  // we just write from what the database has.
  const decoded = await decodeVinSpecs(vehicle.vin);
  const extra: SpecOverrides = decoded ?? {};

  try {
    const response = await getAnthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(vehicle, extra) }],
    });

    const text = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("");

    const raw = extractJsonObject(text);
    if (!raw) return { ok: false, error: "AI response could not be parsed" };

    const stock = vehicle.stock_number;
    const generated: GeneratedDescription = {
      short_description: clean(str(raw, "short_description"), stock),
      full_description: clean(str(raw, "full_description"), stock),
      ryans_take: clean(str(raw, "ryans_take"), stock),
      best_fit_for: clean(str(raw, "best_fit_for"), stock),
      what_to_know: clean(str(raw, "what_to_know"), stock),
      meta_description: clean(str(raw, "meta_description"), stock).slice(0, 155),
    };
    // Every field must come back. The detail page hides an empty section
    // rather than erroring, so a blank ryans_take would silently disappear
    // from the live site; failing here lets the caller retry instead.
    const missing = (Object.keys(generated) as Array<keyof GeneratedDescription>).filter(
      (key) => !generated[key]
    );
    if (missing.length > 0) {
      return { ok: false, error: `AI returned an incomplete description (missing: ${missing.join(", ")})` };
    }

    await getSupabaseAdmin().from("ai_generation_logs").insert({
      vehicle_id: vehicle.id,
      generation_type: "vehicle_description",
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
    });

    return { ok: true, generated };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "generation failed" };
  }
}

/** Persist an already-generated description. Exported for the regeneration script. */
export async function saveVehicleDescription(
  vehicleId: string,
  generated: GeneratedDescription
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await getSupabaseAdmin()
    .from("vehicles")
    .update({
      description_ai: generated.full_description,
      ryans_take: generated.ryans_take || null,
      best_fit_for: generated.best_fit_for || null,
      what_to_know: generated.what_to_know || null,
      meta_description: generated.meta_description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Generate copy for one vehicle and persist it (description_ai + supporting
 * fields) to Supabase. Skips silently when AI isn't configured. Never throws —
 * returns { ok:false } so a caller (like the sync loop) can continue.
 */
export async function generateAndSaveVehicleDescription(vehicle: Vehicle): Promise<GenerationResult> {
  const result = await generateVehicleDescription(vehicle);
  if (!result.ok || !result.generated) return result;

  const saved = await saveVehicleDescription(vehicle.id, result.generated);
  if (!saved.ok) return { ok: false, error: saved.error };
  return result;
}
