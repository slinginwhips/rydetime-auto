import { getAnthropic, AI_MODEL, isAIConfigured } from "@/lib/ai";
import { getSupabaseAdmin } from "@/lib/supabase";
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

function vehicleFacts(v: Vehicle): string {
  const confirmedBadges: string[] = [];
  if (v.carfax_badge_one_owner) confirmedBadges.push("confirmed one owner");
  if (v.carfax_badge_accident_free) confirmedBadges.push("confirmed no accidents reported");
  if (v.carfax_badge_service_records) confirmedBadges.push("service records available");
  if (v.carfax_badge_great_value) confirmedBadges.push("great value");
  if (v.carfax_badge_good_value) confirmedBadges.push("good value");
  const features = (v.vehicle_features ?? []).map((f) => f.feature_name).slice(0, 40);
  return [
    `Vehicle: ${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""}`,
    `Price: $${Number(v.price).toLocaleString()} | Mileage: ${Number(v.mileage).toLocaleString()} miles | Stock #: ${v.stock_number}`,
    `Body style: ${v.body_style ?? "unknown"} | Exterior: ${v.exterior_color ?? "unknown"} | Interior: ${v.interior_color ?? "unknown"}`,
    `Transmission: ${v.transmission ?? "unknown"} | Drivetrain: ${v.drivetrain ?? "unknown"} | Fuel: ${v.fuel_type ?? "unknown"} | Engine: ${v.engine ?? "unknown"}`,
    `Doors: ${v.doors ?? "unknown"} | Seats: ${v.seats ?? "unknown"}`,
    `Confirmed history badges: ${confirmedBadges.length > 0 ? confirmedBadges.join("; ") : "NONE — you may not claim any history facts"}`,
    features.length > 0 ? `Features: ${features.join(", ")}` : "Features: not listed",
  ].join("\n");
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

function str(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return typeof v === "string" ? v.trim() : "";
}

function buildPrompt(vehicle: Vehicle): string {
  return `You write vehicle listings for RydeTime Auto, an honest, no-pressure independent used car dealership in Suffolk, VA serving Hampton Roads. Voice: warm, witty, and human with real personality — like a car-savvy friend who tells it straight, not a salesman. Grab attention from the first line and let a little tasteful humor through, while staying genuinely honest about buying a used car. Never hype, never sleazy dealer-speak, never corny or cringe.

VEHICLE DATA (the ONLY facts you may use):
${vehicleFacts(vehicle)}

WRITING RULES — STRICT:
- Open with a short, punchy HOOK that grabs the shopper — not a flat "This 2018 Honda Accord is a great car." Give it character.
- A little humor or personality is encouraged, but keep it classy and never at the customer's expense.
- Do NOT mention pricing negotiation, processing/dealer fees, taxes, financing legalese, or the store address — those live elsewhere on the page.
- You MAY highlight: the model's general reliability reputation, suitability for commuting or family use, fuel economy characteristics of this type of vehicle, comfort and convenience features actually listed, body style practicality, and overall value at this price point.
- You may NOT claim, imply, or suggest ANY of the following unless it appears in the confirmed data above: clean title, accident-free, one owner, fully serviced, new tires, fresh oil change, no warning lights, included warranty, best/lowest price, or guaranteed financing.
- Never invent features, options, condition details, or history.
- Never guarantee approval, rates, or payments.
- Mention that customers can review the Carfax (when available), inspect, and test drive.

Write the following and respond with ONLY a JSON object, no other text:
{
  "short_description": "2 sentences for the listing card",
  "full_description": "3-4 paragraphs for the detail page, separated by \\n\\n",
  "ryans_take": "1-2 sentences in first person as Ryan, the owner — personal, direct, honest",
  "best_fit_for": "1 sentence starting naturally, describing who this vehicle is ideal for",
  "what_to_know": "1-2 honest sentences a buyer should keep in mind about this vehicle",
  "meta_description": "SEO meta description, 155 characters maximum, includes year/make/model and Suffolk VA"
}`;
}

export interface GenerationResult {
  ok: boolean;
  error?: string;
  generated?: GeneratedDescription;
}

/**
 * Generate copy for one vehicle and persist it (description_ai + supporting
 * fields) to Supabase. Skips silently when AI isn't configured. Never throws —
 * returns { ok:false } so a caller (like the sync loop) can continue.
 */
export async function generateAndSaveVehicleDescription(vehicle: Vehicle): Promise<GenerationResult> {
  if (!isAIConfigured()) return { ok: false, error: "AI is not configured" };

  try {
    const response = await getAnthropic().messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(vehicle) }],
    });

    const text = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("");

    const raw = extractJsonObject(text);
    if (!raw) return { ok: false, error: "AI response could not be parsed" };

    const generated: GeneratedDescription = {
      short_description: str(raw, "short_description"),
      full_description: str(raw, "full_description"),
      ryans_take: str(raw, "ryans_take"),
      best_fit_for: str(raw, "best_fit_for"),
      what_to_know: str(raw, "what_to_know"),
      meta_description: str(raw, "meta_description").slice(0, 155),
    };
    if (!generated.full_description || !generated.short_description) {
      return { ok: false, error: "AI returned an incomplete description" };
    }

    const supabase = getSupabaseAdmin();
    const { error: updateErr } = await supabase
      .from("vehicles")
      .update({
        description_ai: generated.full_description,
        ryans_take: generated.ryans_take || null,
        best_fit_for: generated.best_fit_for || null,
        what_to_know: generated.what_to_know || null,
        meta_description: generated.meta_description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicle.id);
    if (updateErr) return { ok: false, error: updateErr.message };

    await supabase.from("ai_generation_logs").insert({
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
