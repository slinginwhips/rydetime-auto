import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import {
  buildCreditAppAdfXml,
  pushAdfToDealerCenter,
  type CreditAppAdfContext,
} from "@/lib/leadProvider";
import { sendNotification } from "@/lib/notificationProvider";
import { pushCreditAppToDms } from "@/lib/dmsCreditApp";
import { getVehicleById } from "@/lib/vehicles";
import type { CreditApplicationSubmission } from "@/types/lead";
import type { Vehicle } from "@/types/vehicle";

export const dynamic = "force-dynamic";

// SSN validated for shape only — exactly 9 digits once formatting is
// stripped, so dashes, spaces (including doubled-up ones from mobile
// autocorrect/autofill), or dots between groups don't reject valid input. It
// is NEVER stored (only last 4) and NEVER logged.
const hasNineDigits = (v: string) => v.replace(/\D/g, "").length === 9;

const creditAppSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  middle_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  dob: z.string().trim().max(20).optional(),
  ssn: z.string().trim().refine(hasNineDigits, "Enter a valid 9-digit SSN").optional().or(z.literal("")),
  drivers_license: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Phone is required").max(30),

  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(40).optional(),
  zip: z.string().trim().max(15).optional(),
  housing_status: z.enum(["own", "rent", "other"]).optional(),
  // Generous max: browser autofill occasionally drops a full street address
  // into these (untagged, adjacent-to-address-fields) boxes. numOrNull()
  // below discards anything non-numeric, so a stray autofill value should
  // never hard-reject the whole application — it should just get dropped.
  years_at_address: z.string().trim().max(200).optional(),
  months_at_address: z.string().trim().max(200).optional(),
  monthly_housing_payment: z.string().trim().max(40).optional(),
  prev_address: z.string().trim().max(200).optional(),

  employment_status: z
    .enum(["employed", "self_employed", "retired", "military", "other"])
    .optional(),
  employer_name: z.string().trim().max(150).optional(),
  job_title: z.string().trim().max(100).optional(),
  work_phone: z.string().trim().max(30).optional(),
  years_employed: z.string().trim().max(200).optional(),
  months_employed: z.string().trim().max(200).optional(),
  gross_monthly_income: z.string().trim().max(40).optional(),
  other_income: z.string().trim().max(40).optional(),
  other_income_source: z.string().trim().max(150).optional(),

  has_co_applicant: z.boolean().optional(),
  co_first_name: z.string().trim().max(100).optional(),
  co_last_name: z.string().trim().max(100).optional(),
  co_dob: z.string().trim().max(20).optional(),
  co_ssn: z.string().trim().refine(hasNineDigits, "Enter a valid co-applicant SSN").optional().or(z.literal("")),
  co_email: z.string().trim().email().max(254).optional().or(z.literal("")),
  co_phone: z.string().trim().max(30).optional(),
  co_employer_name: z.string().trim().max(150).optional(),
  co_gross_monthly_income: z.string().trim().max(40).optional(),
  co_relationship: z.string().trim().max(60).optional(),

  vehicle_id: z.string().trim().max(100).optional(),
  vin: z.string().trim().max(20).optional(),
  stock_number: z.string().trim().max(50).optional(),
  requested_down_payment: z.string().trim().max(40).optional(),
  desired_monthly_payment: z.string().trim().max(40).optional(),

  signature_name: z.string().trim().min(2, "Please type your full name to sign").max(150),
  consent_credit_pull: z.literal(true, {
    errorMap: () => ({ message: "You must authorize the credit check to submit." }),
  }),
  source_url: z.string().trim().max(2000).optional(),

  // Honeypot — real users never fill this.
  website: z.string().optional(),
});

const last4 = (ssn: string | undefined): string | null => {
  if (!ssn) return null;
  const digits = ssn.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
};

const numOrNull = (s: string | undefined): number | null => {
  if (!s || !s.trim()) return null;
  const n = Number(s.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const dateOrNull = (s: string | undefined): string | null => {
  if (!s || !s.trim()) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : s.trim();
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = creditAppSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const app = parsed.data as CreditApplicationSubmission;

    // Honeypot tripped: pretend success, save nothing, notify no one.
    if (app.website && app.website.trim() !== "") {
      return NextResponse.json({ success: true, lead_id: null });
    }

    // Resolve vehicle for DealerCenter enrichment.
    let vehicle: Vehicle | null = null;
    if (app.vehicle_id) vehicle = await getVehicleById(app.vehicle_id);

    const ctx: CreditAppAdfContext = {
      year: vehicle?.year,
      make: vehicle?.make,
      model: vehicle?.model,
      vin: vehicle?.vin ?? app.vin,
      stock_number: vehicle?.stock_number ?? app.stock_number,
    };

    // Build the FULL application (with SSN) and push it to DealerCenter. This is
    // the only place the raw SSN travels — in flight, to DealerCenter's CRM.
    const adfXml = buildCreditAppAdfXml(app, ctx);
    const dcResult = await pushAdfToDealerCenter(adfXml, {
      lead_type: "credit_app",
      label: `New SIGNED CREDIT APP: ${app.first_name} ${app.last_name}`,
      noFallbackNotify: true, // never echo a full SSN into a human inbox
    });

    const applicantSsn4 = last4(app.ssn);

    // Human alert to the dealership — REDACTED (last 4 only, never full SSN).
    const notify = () =>
      sendNotification({
        subject: `Signed credit app: ${app.first_name} ${app.last_name}${
          dcResult.success ? "" : " (⚠ DealerCenter push FAILED — call customer)"
        }`,
        body: [
          `A signed online credit application just came in.`,
          ``,
          `Name: ${app.first_name} ${app.last_name}`,
          `Phone: ${app.phone}`,
          app.email ? `Email: ${app.email}` : null,
          applicantSsn4 ? `SSN: ***-**-${applicantSsn4}` : null,
          ctx.year || ctx.make || ctx.model
            ? `Vehicle: ${[ctx.year, ctx.make, ctx.model].filter(Boolean).join(" ")}`
            : null,
          app.requested_down_payment ? `Down payment: ${app.requested_down_payment}` : null,
          app.gross_monthly_income ? `Gross monthly income: ${app.gross_monthly_income}` : null,
          `Signed by: ${app.signature_name}`,
          ``,
          dcResult.success
            ? `➡ Full application (with SSN) was delivered to DealerCenter (${dcResult.method}). Open DealerCenter to run it.`
            : `⚠ The full application did NOT reach DealerCenter (${dcResult.error}). The SSN is not stored anywhere — call the customer to re-collect it or have them resubmit.`,
        ]
          .filter(Boolean)
          .join("\n"),
      });

    // Dev mode / no database: still deliver to DealerCenter + alert.
    if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      await notify();
      return NextResponse.json({ success: true, lead_id: null, dc_pushed: dcResult.success });
    }

    const supabase = getSupabaseAdmin();

    // 1) Lead row (reuses the existing pipeline / admin views).
    const { data: lead, error: insertErr } = await supabase
      .from("leads")
      .insert({
        first_name: app.first_name,
        last_name: app.last_name,
        email: app.email || null,
        phone: app.phone,
        vehicle_id: vehicle?.id ?? null,
        vin: ctx.vin ?? null,
        stock_number: ctx.stock_number ?? null,
        message: "Signed online credit application submitted.",
        lead_type: "credit_app",
        down_payment: app.requested_down_payment ?? null,
        monthly_payment_goal: app.desired_monthly_payment ?? null,
        source_url: app.source_url ?? null,
        dc_pushed: dcResult.success,
        dc_pushed_at: dcResult.success ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (insertErr || !lead) throw insertErr ?? new Error("Lead insert returned no row");
    const leadId = (lead as { id: string }).id;

    await supabase.from("lead_events").insert({ lead_id: leadId, event_type: "created", notes: "credit_app" });
    await supabase.from("lead_events").insert({
      lead_id: leadId,
      event_type: dcResult.success ? "dc_pushed" : "dc_push_failed",
      notes: dcResult.success
        ? `method=${dcResult.method}${dcResult.dc_lead_id ? ` dc_lead_id=${dcResult.dc_lead_id}` : ""}`
        : dcResult.error ?? "unknown error",
    });

    // 2) Redacted credit-application record (NO full SSN — last 4 only).
    const creditAppRow = {
      lead_id: leadId,
      first_name: app.first_name,
      middle_name: app.middle_name ?? null,
      last_name: app.last_name,
      dob: dateOrNull(app.dob),
      ssn_last4: applicantSsn4,
      drivers_license: app.drivers_license ?? null,
      email: app.email || null,
      phone: app.phone,
      address: app.address ?? null,
      city: app.city ?? null,
      state: app.state ?? null,
      zip: app.zip ?? null,
      housing_status: app.housing_status ?? null,
      years_at_address: numOrNull(app.years_at_address),
      months_at_address: numOrNull(app.months_at_address),
      monthly_housing_payment: app.monthly_housing_payment ?? null,
      prev_address: app.prev_address ?? null,
      employment_status: app.employment_status ?? null,
      employer_name: app.employer_name ?? null,
      job_title: app.job_title ?? null,
      work_phone: app.work_phone ?? null,
      years_employed: numOrNull(app.years_employed),
      months_employed: numOrNull(app.months_employed),
      gross_monthly_income: app.gross_monthly_income ?? null,
      other_income: app.other_income ?? null,
      other_income_source: app.other_income_source ?? null,
      co_first_name: app.has_co_applicant ? app.co_first_name ?? null : null,
      co_last_name: app.has_co_applicant ? app.co_last_name ?? null : null,
      co_dob: app.has_co_applicant ? dateOrNull(app.co_dob) : null,
      co_ssn_last4: app.has_co_applicant ? last4(app.co_ssn) : null,
      co_email: app.has_co_applicant ? app.co_email || null : null,
      co_phone: app.has_co_applicant ? app.co_phone ?? null : null,
      co_employer_name: app.has_co_applicant ? app.co_employer_name ?? null : null,
      co_gross_monthly_income: app.has_co_applicant ? app.co_gross_monthly_income ?? null : null,
      co_relationship: app.has_co_applicant ? app.co_relationship ?? null : null,
      vehicle_id: vehicle?.id ?? null,
      vin: ctx.vin ?? null,
      stock_number: ctx.stock_number ?? null,
      requested_down_payment: app.requested_down_payment ?? null,
      desired_monthly_payment: app.desired_monthly_payment ?? null,
      signature_name: app.signature_name,
      consent_credit_pull: app.consent_credit_pull,
      signer_ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null,
      signer_user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
      dc_pushed: dcResult.success,
      dc_pushed_at: dcResult.success ? new Date().toISOString() : null,
    };

    const { data: creditApp, error: caErr } = await supabase
      .from("credit_applications")
      .insert(creditAppRow)
      .select("id, created_at, signed_at")
      .single();
    if (caErr) {
      // The lead + DC push already succeeded; surface the audit-row failure but
      // don't fail the customer's submission.
      console.error("[api/credit-application] credit_applications insert failed:", caErr.message);
    }

    // 3) Hand the FULL application (SSN included) to the DMS, so Dealertrack's
    //    9-digit SSN box stops being typed by hand. The row we send is the one
    //    we just stored plus the social — same shape, same id, so the DMS's own
    //    poller can't file a second copy of it. Nothing extra is stored here.
    //    Best-effort: a failure leaves the poller to file it without the SSN.
    if (creditApp) {
      const identifiers = creditApp as { id: string; created_at: string; signed_at: string | null };
      const dmsResult = await pushCreditAppToDms({
        ...creditAppRow,
        id: identifiers.id,
        created_at: identifiers.created_at,
        signed_at: identifiers.signed_at,
        ssn: app.ssn || null,
        co_ssn: app.has_co_applicant ? app.co_ssn || null : null,
      });
      if (dmsResult.status === "failed") {
        console.error("[api/credit-application] DMS push failed:", dmsResult.error);
      }
    }

    await notify();

    return NextResponse.json({ success: true, lead_id: leadId, dc_pushed: dcResult.success });
  } catch (err) {
    // Deliberately do NOT log the request body — it contains an SSN.
    console.error(
      "[api/credit-application] failed:",
      err instanceof Error ? err.message : "unknown error"
    );
    return NextResponse.json(
      { error: "Unable to submit your application. Please call (757) 937-8664." },
      { status: 500 }
    );
  }
}
