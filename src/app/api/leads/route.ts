import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { getLeadProvider } from "@/lib/leadProvider";
import { sendNotification } from "@/lib/notificationProvider";
import { getVehicleById } from "@/lib/vehicles";
import type { DCLead } from "@/types/dealercenter";
import type { Vehicle } from "@/types/vehicle";

export const dynamic = "force-dynamic";

const leadSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  vehicle_id: z.string().trim().max(100).optional(),
  vin: z.string().trim().max(20).optional(),
  stock_number: z.string().trim().max(50).optional(),
  message: z.string().trim().max(5000).optional(),
  lead_type: z.enum([
    "inquiry",
    "test_drive",
    "trade",
    "finance",
    "hold",
    "chat",
    "matchmaker",
    "price_drop",
    "carfax",
  ]),
  budget: z.string().trim().max(100).optional(),
  down_payment: z.string().trim().max(100).optional(),
  monthly_payment_goal: z.string().trim().max(100).optional(),
  preferred_date: z.string().trim().max(50).optional(),
  preferred_time: z.string().trim().max(50).optional(),
  source_url: z.string().trim().max(2000).optional(),
  chat_summary: z.string().trim().max(10000).optional(),
  // Honeypot — real users never fill this.
  website: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = leadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    // Honeypot tripped: pretend success, save nothing, notify no one.
    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ success: true, lead_id: null });
    }

    // Resolve vehicle for DC payload enrichment.
    let vehicle: Vehicle | null = null;
    if (body.vehicle_id) {
      vehicle = await getVehicleById(body.vehicle_id);
    }

    const dcLead: DCLead = {
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email || undefined,
      phone: body.phone,
      comments: [body.message, body.chat_summary].filter(Boolean).join("\n\n") || undefined,
      vin: vehicle?.vin ?? body.vin,
      stock_number: vehicle?.stock_number ?? body.stock_number,
      year: vehicle?.year,
      make: vehicle?.make,
      model: vehicle?.model,
      lead_type: body.lead_type,
      source: body.source_url || "website",
    };

    const notify = () =>
      sendNotification({
        subject: `New ${body.lead_type} lead: ${body.first_name} ${body.last_name ?? ""}`.trim(),
        body: [
          `Name: ${body.first_name} ${body.last_name ?? ""}`,
          `Phone: ${body.phone ?? "—"}`,
          `Email: ${body.email || "—"}`,
          vehicle ? `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model} (stock ${vehicle.stock_number})` : null,
          body.message ? `Message: ${body.message}` : null,
          body.source_url ? `Source: ${body.source_url}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      });

    // Graceful dev mode: no database, but the dealership still hears about it.
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await getLeadProvider().pushLead(dcLead);
      await notify();
      return NextResponse.json({ success: true, lead_id: null });
    }

    const supabase = getSupabaseAdmin();
    const { data: lead, error: insertErr } = await supabase
      .from("leads")
      .insert({
        first_name: body.first_name,
        last_name: body.last_name ?? null,
        email: body.email || null,
        phone: body.phone ?? null,
        vehicle_id: vehicle?.id ?? null,
        vin: dcLead.vin ?? null,
        stock_number: dcLead.stock_number ?? null,
        message: body.message ?? null,
        lead_type: body.lead_type,
        budget: body.budget ?? null,
        down_payment: body.down_payment ?? null,
        monthly_payment_goal: body.monthly_payment_goal ?? null,
        preferred_date: body.preferred_date ?? null,
        preferred_time: body.preferred_time ?? null,
        source_url: body.source_url ?? null,
        chat_summary: body.chat_summary ?? null,
        dc_pushed: false,
      })
      .select("id")
      .single();
    if (insertErr || !lead) {
      throw insertErr ?? new Error("Lead insert returned no row");
    }
    const leadId = (lead as { id: string }).id;

    await supabase.from("lead_events").insert({ lead_id: leadId, event_type: "created", notes: null });

    // Push to DealerCenter.
    const dcResult = await getLeadProvider().pushLead(dcLead);
    if (dcResult.success) {
      await supabase
        .from("leads")
        .update({ dc_pushed: true, dc_pushed_at: new Date().toISOString() })
        .eq("id", leadId);
      await supabase.from("lead_events").insert({
        lead_id: leadId,
        event_type: "dc_pushed",
        notes: `method=${dcResult.method}${dcResult.dc_lead_id ? ` dc_lead_id=${dcResult.dc_lead_id}` : ""}`,
      });
    } else {
      await supabase.from("lead_events").insert({
        lead_id: leadId,
        event_type: "dc_push_failed",
        notes: dcResult.error ?? "unknown error",
      });
    }

    await notify();

    return NextResponse.json({ success: true, lead_id: leadId });
  } catch (err) {
    console.error("[api/leads] failed:", err);
    return NextResponse.json({ error: "Unable to submit your request. Please call (757) 937-8664." }, { status: 500 });
  }
}
