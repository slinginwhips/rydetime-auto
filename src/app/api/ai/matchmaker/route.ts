import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropic, AI_MODEL, isAIConfigured } from "@/lib/ai";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { getAllActiveVehicles } from "@/lib/vehicles";
import { getLeadProvider } from "@/lib/leadProvider";
import { sendNotification } from "@/lib/notificationProvider";
import { estimateMonthlyPayment } from "@/types/vehicle";
import type { Vehicle } from "@/types/vehicle";
import type { DCLead } from "@/types/dealercenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const matchmakerSchema = z.object({
  answers: z.object({
    budget_type: z.string().trim().max(100),
    amount: z.string().trim().max(100),
    down_payment: z.string().trim().max(100),
    vehicle_type: z.string().trim().max(100),
    main_use: z.string().trim().max(100),
    credit_situation: z.string().trim().max(100),
    timeline: z.string().trim().max(100),
    contact: z
      .object({
        first_name: z.string().trim().min(1).max(100),
        phone: z.string().trim().max(30).optional(),
        email: z.string().trim().email().max(254).optional().or(z.literal("")),
      })
      .optional(),
  }),
  source_url: z.string().trim().max(2000).optional(),
});

type Answers = z.infer<typeof matchmakerSchema>["answers"];

export interface MatchResult {
  vehicle_id: string;
  slug: string;
  reason: string;
  consider: string;
}

/* ---------------- AI matching ---------------- */

function inventorySummary(vehicles: Vehicle[]): string {
  return vehicles
    .map(
      (v) =>
        `id=${v.id} slug=${v.slug} | ${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""} | $${Number(v.price).toLocaleString()} (~$${estimateMonthlyPayment(Number(v.price))}/mo est.) | ${Number(v.mileage).toLocaleString()} mi | ${v.body_style ?? "n/a"} | ${v.fuel_type ?? "n/a"} | ${v.drivetrain ?? "n/a"}`
    )
    .join("\n");
}

/** Extract the first JSON array found in an AI response, tolerating code fences and prose. */
function extractJsonArray(text: string): unknown[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start === -1 || end <= start) continue;
    try {
      const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // try next candidate
    }
  }
  return null;
}

async function aiMatch(answers: Answers, vehicles: Vehicle[]): Promise<MatchResult[] | null> {
  const prompt = `You are matching a used-car shopper at RydeTime Auto (Suffolk, VA) to current inventory.

CUSTOMER ANSWERS:
- Budget type: ${answers.budget_type}
- Amount: ${answers.amount}
- Down payment: ${answers.down_payment}
- Vehicle type wanted: ${answers.vehicle_type}
- Main use: ${answers.main_use}
- Credit situation: ${answers.credit_situation}
- Timeline: ${answers.timeline}

CURRENT INVENTORY:
${inventorySummary(vehicles)}

Pick the 2-3 BEST matches from the inventory above. Rules:
- Only use vehicles from the list, with their exact id and slug values.
- "reason" = one honest, specific sentence on why it fits this customer's budget, use, and type.
- "consider" = one honest thing to keep in mind (mileage, size, fuel costs, price vs budget, etc). Never invent history; never claim accident-free, one-owner, or clean title.
- Never guarantee financing approval or payments.

Respond with ONLY a JSON array, no other text:
[{"vehicle_id":"...","slug":"...","reason":"...","consider":"..."}]`;

  const response = await getAnthropic().messages.create({
    model: AI_MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");

  const raw = extractJsonArray(text);
  if (!raw) return null;

  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const matches: MatchResult[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const vehicleId = typeof rec.vehicle_id === "string" ? rec.vehicle_id : null;
    if (!vehicleId) continue;
    const vehicle = byId.get(vehicleId);
    if (!vehicle) continue; // never recommend something not in inventory
    matches.push({
      vehicle_id: vehicle.id,
      slug: vehicle.slug,
      reason: typeof rec.reason === "string" ? rec.reason.slice(0, 500) : "A solid fit for what you described.",
      consider: typeof rec.consider === "string" ? rec.consider.slice(0, 500) : "Come take a test drive and make sure it feels right.",
    });
    if (matches.length === 3) break;
  }
  return matches.length > 0 ? matches : null;
}

/* ---------------- Rule-based fallback ---------------- */

function parseAmount(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ruleBasedMatch(answers: Answers, vehicles: Vehicle[]): MatchResult[] {
  let pool = [...vehicles];

  // Budget filter: monthly payment goal or total price cap.
  const amount = parseAmount(answers.amount);
  if (amount != null) {
    if (/month/i.test(answers.budget_type) || amount < 2000) {
      pool = pool.filter((v) => estimateMonthlyPayment(Number(v.price)) <= amount * 1.15);
    } else {
      pool = pool.filter((v) => Number(v.price) <= amount * 1.1);
    }
  }

  // Body style filter (skip for "open to anything").
  const type = answers.vehicle_type.toLowerCase();
  if (type && !/anything|open|not sure/.test(type)) {
    const filtered = pool.filter((v) => {
      const body = (v.body_style ?? "").toLowerCase();
      if (/suv/.test(type)) return /suv|crossover|sport utility/.test(body);
      if (/truck/.test(type)) return /truck|pickup/.test(body);
      if (/van/.test(type)) return /van|minivan/.test(body);
      if (/sedan/.test(type)) return /sedan|coupe|hatchback/.test(body);
      return true;
    });
    if (filtered.length > 0) pool = filtered;
  }

  // Prefer lower mileage within the pool, then lower price.
  pool.sort((a, b) => Number(a.mileage) - Number(b.mileage) || Number(a.price) - Number(b.price));

  // If filters wiped everything out, fall back to cheapest overall.
  if (pool.length === 0) {
    pool = [...vehicles].sort((a, b) => Number(a.price) - Number(b.price));
  }

  return pool.slice(0, 3).map((v) => ({
    vehicle_id: v.id,
    slug: v.slug,
    reason: `The ${v.year} ${v.make} ${v.model} fits your ${answers.vehicle_type.toLowerCase() || "vehicle"} preference at $${Number(v.price).toLocaleString()} (est. $${estimateMonthlyPayment(Number(v.price))}/mo) with ${Number(v.mileage).toLocaleString()} miles.`,
    consider: "Estimates aren't a financing offer — come see it in person, review the Carfax when available, and take a test drive.",
  }));
}

/* ---------------- Lead capture ---------------- */

async function captureMatchmakerLead(
  answers: Answers,
  matches: MatchResult[],
  sourceUrl: string | undefined
): Promise<void> {
  const contact = answers.contact;
  if (!contact) return;

  const serialized = [
    `Budget type: ${answers.budget_type}`,
    `Amount: ${answers.amount}`,
    `Down payment: ${answers.down_payment}`,
    `Vehicle type: ${answers.vehicle_type}`,
    `Main use: ${answers.main_use}`,
    `Credit situation: ${answers.credit_situation}`,
    `Timeline: ${answers.timeline}`,
    `Matched: ${matches.map((m) => m.slug).join(", ") || "none"}`,
  ].join("\n");

  const dcLead: DCLead = {
    first_name: contact.first_name,
    email: contact.email || undefined,
    phone: contact.phone,
    comments: `AI Matchmaker submission:\n${serialized}`,
    lead_type: "matchmaker",
    source: sourceUrl || "website-matchmaker",
  };

  let leadId: string | null = null;
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = getSupabaseAdmin();
    const { data: lead } = await supabase
      .from("leads")
      .insert({
        first_name: contact.first_name,
        email: contact.email || null,
        phone: contact.phone ?? null,
        message: serialized,
        lead_type: "matchmaker",
        budget: answers.amount || null,
        down_payment: answers.down_payment || null,
        monthly_payment_goal: /month/i.test(answers.budget_type) ? answers.amount : null,
        source_url: sourceUrl ?? null,
        dc_pushed: false,
      })
      .select("id")
      .single();
    leadId = (lead as { id: string } | null)?.id ?? null;
    if (leadId) {
      await supabase.from("lead_events").insert({ lead_id: leadId, event_type: "created", notes: null });
    }
  }

  const dcResult = await getLeadProvider().pushLead(dcLead);
  if (leadId && isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = getSupabaseAdmin();
    if (dcResult.success) {
      await supabase.from("leads").update({ dc_pushed: true, dc_pushed_at: new Date().toISOString() }).eq("id", leadId);
      await supabase.from("lead_events").insert({ lead_id: leadId, event_type: "dc_pushed", notes: `method=${dcResult.method}` });
    } else {
      await supabase.from("lead_events").insert({ lead_id: leadId, event_type: "dc_push_failed", notes: dcResult.error ?? "unknown error" });
    }
  }

  await sendNotification({
    subject: `Matchmaker lead: ${contact.first_name} — ${answers.timeline}`,
    body: [
      `Name: ${contact.first_name}`,
      `Phone: ${contact.phone ?? "—"}`,
      `Email: ${contact.email || "—"}`,
      "",
      serialized,
    ].join("\n"),
  });
}

/* ---------------- Route ---------------- */

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = matchmakerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { answers, source_url } = parsed.data;

    const vehicles = await getAllActiveVehicles();
    if (vehicles.length === 0) {
      return NextResponse.json({ matches: [] });
    }

    let matches: MatchResult[] | null = null;
    if (isAIConfigured()) {
      try {
        matches = await aiMatch(answers, vehicles);
      } catch (err) {
        console.error("[api/ai/matchmaker] AI match failed, using rules:", err);
      }
    }
    if (!matches) {
      matches = ruleBasedMatch(answers, vehicles);
    }

    if (answers.contact?.first_name) {
      try {
        await captureMatchmakerLead(answers, matches, source_url);
      } catch (err) {
        console.error("[api/ai/matchmaker] lead capture failed (non-fatal):", err);
      }
    }

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[api/ai/matchmaker] failed:", err);
    return NextResponse.json(
      { error: "Matchmaker is unavailable right now. Browse /inventory or call (757) 937-8664." },
      { status: 500 }
    );
  }
}
