import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { getLeadProvider } from "@/lib/leadProvider";
import { sendNotification } from "@/lib/notificationProvider";
import { getVehicleById } from "@/lib/vehicles";
import type { DCLead } from "@/types/dealercenter";
import type { Vehicle } from "@/types/vehicle";

export const dynamic = "force-dynamic";

const tradeSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Phone is required").max(30),
  vin: z.string().trim().max(20).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  make: z.string().trim().max(80).optional(),
  model: z.string().trim().max(80).optional(),
  mileage: z.coerce.number().int().min(0).max(2_000_000).optional(),
  condition: z.enum(["Excellent", "Good", "Fair", "Poor"]).optional(),
  payoff_amount: z.string().trim().max(100).optional(),
  lender: z.string().trim().max(150).optional(),
  warning_lights: z.boolean().optional(),
  accident_history: z.boolean().optional(),
  title_status: z.enum(["Clean", "Salvage", "Rebuilt", "Unknown"]).optional(),
  photos_urls: z.array(z.string().trim().url().max(2000)).max(6).optional(),
  notes: z.string().trim().max(5000).optional(),
  vehicle_of_interest_id: z.string().trim().max(100).optional(),
  preferred_date: z.string().trim().max(50).optional(),
  preferred_time: z.string().trim().max(50).optional(),
  intent: z.enum(["trade", "sell"]).optional(),
  source_url: z.string().trim().max(2000).optional(),
  // Honeypot
  website: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = tradeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    let interestVehicle: Vehicle | null = null;
    if (body.vehicle_of_interest_id) {
      interestVehicle = await getVehicleById(body.vehicle_of_interest_id);
    }

    const tradeLabel = [body.year, body.make, body.model].filter(Boolean).join(" ") || "vehicle";
    const intentLabel = body.intent === "sell" ? "Sell-us-your-car" : "Trade-in";

    const summaryLines = [
      `${intentLabel} request: ${tradeLabel}`,
      body.vin ? `VIN: ${body.vin}` : null,
      body.mileage != null ? `Mileage: ${body.mileage.toLocaleString()}` : null,
      body.condition ? `Condition: ${body.condition}` : null,
      body.title_status ? `Title: ${body.title_status}` : null,
      body.warning_lights != null ? `Warning lights: ${body.warning_lights ? "Yes" : "No"}` : null,
      body.accident_history != null ? `Accident history: ${body.accident_history ? "Yes" : "No"}` : null,
      body.payoff_amount ? `Est. payoff: ${body.payoff_amount}` : null,
      body.lender ? `Lender: ${body.lender}` : null,
      interestVehicle
        ? `Interested in: ${interestVehicle.year} ${interestVehicle.make} ${interestVehicle.model} (stock ${interestVehicle.stock_number})`
        : null,
      body.preferred_date ? `Preferred appointment: ${body.preferred_date} ${body.preferred_time ?? ""}`.trim() : null,
      body.notes ? `Notes: ${body.notes}` : null,
    ].filter(Boolean) as string[];

    const dcLead: DCLead = {
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email || undefined,
      phone: body.phone,
      comments: summaryLines.join("\n"),
      vin: interestVehicle?.vin,
      stock_number: interestVehicle?.stock_number,
      year: interestVehicle?.year,
      make: interestVehicle?.make,
      model: interestVehicle?.model,
      lead_type: "trade",
      source: body.source_url || "website",
    };

    const notify = () =>
      sendNotification({
        subject: `${intentLabel} request: ${body.first_name} ${body.last_name ?? ""} — ${tradeLabel}`.trim(),
        body: [
          `Name: ${body.first_name} ${body.last_name ?? ""}`,
          `Phone: ${body.phone}`,
          `Email: ${body.email || "—"}`,
          ...summaryLines,
        ].join("\n"),
      });

    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await getLeadProvider().pushLead(dcLead);
      await notify();
      return NextResponse.json({ success: true });
    }

    const supabase = getSupabaseAdmin();
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        first_name: body.first_name,
        last_name: body.last_name ?? null,
        email: body.email || null,
        phone: body.phone,
        vehicle_id: interestVehicle?.id ?? null,
        vin: interestVehicle?.vin ?? null,
        stock_number: interestVehicle?.stock_number ?? null,
        message: body.notes ?? null,
        lead_type: "trade",
        trade_vin: body.vin ?? null,
        trade_year: body.year ?? null,
        trade_make: body.make ?? null,
        trade_model: body.model ?? null,
        trade_mileage: body.mileage ?? null,
        trade_payoff: body.payoff_amount ?? null,
        preferred_date: body.preferred_date ?? null,
        preferred_time: body.preferred_time ?? null,
        source_url: body.source_url ?? null,
        dc_pushed: false,
      })
      .select("id")
      .single();
    if (leadErr || !lead) {
      throw leadErr ?? new Error("Lead insert returned no row");
    }
    const leadId = (lead as { id: string }).id;

    await supabase.from("lead_events").insert({ lead_id: leadId, event_type: "created", notes: null });

    const { error: tradeErr } = await supabase.from("trade_requests").insert({
      lead_id: leadId,
      vin: body.vin ?? null,
      year: body.year ?? null,
      make: body.make ?? null,
      model: body.model ?? null,
      mileage: body.mileage ?? null,
      condition: body.condition ?? null,
      payoff_amount: body.payoff_amount ?? null,
      lender: body.lender ?? null,
      warning_lights: body.warning_lights ?? null,
      accident_history: body.accident_history ?? null,
      title_status: body.title_status ?? null,
      photos_urls: body.photos_urls ?? null,
      notes: body.notes ?? null,
    });
    if (tradeErr) throw tradeErr;

    const dcResult = await getLeadProvider().pushLead(dcLead);
    if (dcResult.success) {
      await supabase
        .from("leads")
        .update({ dc_pushed: true, dc_pushed_at: new Date().toISOString() })
        .eq("id", leadId);
      await supabase.from("lead_events").insert({
        lead_id: leadId,
        event_type: "dc_pushed",
        notes: `method=${dcResult.method}`,
      });
    } else {
      await supabase.from("lead_events").insert({
        lead_id: leadId,
        event_type: "dc_push_failed",
        notes: dcResult.error ?? "unknown error",
      });
    }

    await notify();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/trade] failed:", err);
    return NextResponse.json(
      { error: "Unable to submit your trade request. Please call (757) 937-8664." },
      { status: 500 }
    );
  }
}
