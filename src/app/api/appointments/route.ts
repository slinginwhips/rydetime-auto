import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { getLeadProvider } from "@/lib/leadProvider";
import { sendNotification } from "@/lib/notificationProvider";
import { getVehicleById } from "@/lib/vehicles";
import type { DCLead } from "@/types/dealercenter";
import type { Vehicle } from "@/types/vehicle";

export const dynamic = "force-dynamic";

const appointmentSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Phone is required").max(30),
  vehicle_id: z.string().trim().max(100).optional(),
  preferred_date: z.string().trim().min(1, "Preferred date is required").max(50),
  preferred_time: z.string().trim().min(1, "Preferred time is required").max(50),
  notes: z.string().trim().max(2000).optional(),
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

    const parsed = appointmentSchema.safeParse(json);
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

    let vehicle: Vehicle | null = null;
    if (body.vehicle_id) {
      vehicle = await getVehicleById(body.vehicle_id);
    }

    const vehicleLabel = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""} (stock ${vehicle.stock_number})`
      : null;

    const dcLead: DCLead = {
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email || undefined,
      phone: body.phone,
      comments: [
        `Test drive request for ${body.preferred_date} at ${body.preferred_time}.`,
        vehicleLabel ? `Vehicle: ${vehicleLabel}` : null,
        body.notes ? `Notes: ${body.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      vin: vehicle?.vin,
      stock_number: vehicle?.stock_number,
      year: vehicle?.year,
      make: vehicle?.make,
      model: vehicle?.model,
      lead_type: "test_drive",
      source: body.source_url || "website",
    };

    const notify = () =>
      sendNotification({
        subject: `Test drive request: ${body.first_name} ${body.last_name ?? ""} — ${body.preferred_date} ${body.preferred_time}`.trim(),
        body: [
          `Name: ${body.first_name} ${body.last_name ?? ""}`,
          `Phone: ${body.phone}`,
          `Email: ${body.email || "—"}`,
          `Requested: ${body.preferred_date} at ${body.preferred_time}`,
          vehicleLabel ? `Vehicle: ${vehicleLabel}` : null,
          body.notes ? `Notes: ${body.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
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
        vehicle_id: vehicle?.id ?? null,
        vin: vehicle?.vin ?? null,
        stock_number: vehicle?.stock_number ?? null,
        message: body.notes ?? null,
        lead_type: "test_drive",
        preferred_date: body.preferred_date,
        preferred_time: body.preferred_time,
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

    const { error: apptErr } = await supabase.from("appointments").insert({
      lead_id: leadId,
      vehicle_id: vehicle?.id ?? null,
      preferred_date: body.preferred_date,
      preferred_time: body.preferred_time,
      confirmed: false,
      notes: body.notes ?? null,
    });
    if (apptErr) throw apptErr;

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
    console.error("[api/appointments] failed:", err);
    return NextResponse.json(
      { error: "Unable to schedule your test drive. Please call (757) 937-8664." },
      { status: 500 }
    );
  }
}
