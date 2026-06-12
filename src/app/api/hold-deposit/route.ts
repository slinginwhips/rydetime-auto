import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { getLeadProvider } from "@/lib/leadProvider";
import { sendNotification } from "@/lib/notificationProvider";
import { getPaymentProvider } from "@/lib/paymentProvider";
import { getVehicleById } from "@/lib/vehicles";
import { HOLD_DEPOSIT_AMOUNT } from "@/types/lead";
import type { DCLead } from "@/types/dealercenter";

export const dynamic = "force-dynamic";

const holdSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().max(100).optional(),
  email: z.string().trim().email("A valid email is required").max(254),
  phone: z.string().trim().min(7, "Phone is required").max(30),
  vehicle_id: z.string().trim().min(1, "Vehicle is required").max(100),
  acknowledged_policy: z.literal(true, {
    errorMap: () => ({ message: "You must read and acknowledge the hold policy" }),
  }),
  signature_name: z.string().trim().min(2, "Typed signature is required").max(150),
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

    const parsed = holdSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data;

    if (body.website && body.website.trim() !== "") {
      return NextResponse.json({ success: true, mock: true, payment_intent_id: null });
    }

    const vehicle = await getVehicleById(body.vehicle_id);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }
    if (vehicle.status === "sold") {
      return NextResponse.json(
        { error: "This vehicle has been sold and can no longer be held." },
        { status: 409 }
      );
    }

    const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""} (stock ${vehicle.stock_number}, VIN ${vehicle.vin})`;

    // Create the payment intent (mock mode when Stripe keys aren't configured).
    const payment = await getPaymentProvider().createHoldDeposit(HOLD_DEPOSIT_AMOUNT, {
      vehicle: vehicleLabel,
      vehicle_id: vehicle.id,
      customer: `${body.first_name} ${body.last_name ?? ""}`.trim(),
      phone: body.phone,
      email: body.email,
      signature_name: body.signature_name,
    });
    if (!payment.success) {
      return NextResponse.json(
        { error: "Payment could not be initiated. Please call (757) 937-8664 to hold this vehicle." },
        { status: 502 }
      );
    }

    const dcLead: DCLead = {
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      comments: [
        `HOLD DEPOSIT request — $${HOLD_DEPOSIT_AMOUNT} on ${vehicleLabel}.`,
        `Policy acknowledged and signed: ${body.signature_name}.`,
        `Payment intent: ${payment.payment_intent_id}${payment.mock ? " (mock — Stripe not configured)" : ""}.`,
        "Status: pending dealership confirmation.",
      ].join("\n"),
      vin: vehicle.vin,
      stock_number: vehicle.stock_number,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      lead_type: "hold",
      source: body.source_url || "website",
    };

    const notify = () =>
      sendNotification({
        subject: `URGENT — Hold deposit request: ${vehicle.year} ${vehicle.make} ${vehicle.model} (${body.first_name} ${body.last_name ?? ""})`.trim(),
        body: [
          "A customer has requested to HOLD a vehicle with a $500 deposit. Dealership confirmation required.",
          "",
          `Vehicle: ${vehicleLabel}`,
          `Customer: ${body.first_name} ${body.last_name ?? ""}`,
          `Phone: ${body.phone}`,
          `Email: ${body.email}`,
          `Signed: ${body.signature_name}`,
          `Payment intent: ${payment.payment_intent_id}${payment.mock ? " (MOCK — Stripe not configured)" : ""}`,
          "",
          "Vehicle status set to hold_pending. Confirm or release in the admin dashboard.",
        ].join("\n"),
      });

    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await getLeadProvider().pushLead(dcLead);
      await notify();
      return NextResponse.json({
        success: true,
        mock: payment.mock,
        payment_intent_id: payment.payment_intent_id,
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        first_name: body.first_name,
        last_name: body.last_name ?? null,
        email: body.email,
        phone: body.phone,
        vehicle_id: vehicle.id,
        vin: vehicle.vin,
        stock_number: vehicle.stock_number,
        message: `Hold deposit request. Signed: ${body.signature_name}`,
        lead_type: "hold",
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

    const { error: holdErr } = await supabase.from("hold_deposits").insert({
      lead_id: leadId,
      vehicle_id: vehicle.id,
      amount: HOLD_DEPOSIT_AMOUNT,
      stripe_payment_intent_id: payment.payment_intent_id,
      status: "pending",
      acknowledged_policy: true,
    });
    if (holdErr) throw holdErr;

    // Pending only — the dealership confirms the hold manually.
    const { error: statusErr } = await supabase
      .from("vehicles")
      .update({ status: "hold_pending", updated_at: new Date().toISOString() })
      .eq("id", vehicle.id);
    if (statusErr) {
      console.error("[api/hold-deposit] failed to set hold_pending status:", statusErr);
    }

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

    return NextResponse.json({
      success: true,
      mock: payment.mock,
      payment_intent_id: payment.payment_intent_id,
    });
  } catch (err) {
    console.error("[api/hold-deposit] failed:", err);
    return NextResponse.json(
      { error: "Unable to process your hold request. Please call (757) 937-8664." },
      { status: 500 }
    );
  }
}
