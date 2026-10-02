import { randomUUID } from "node:crypto";
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

// Years/months boxes: 1-2 digits, nothing else.
const digits = z.string().trim().regex(/^\d{0,2}$/, "Enter a number of years/months");

const creditAppSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  middle_name: z.string().trim().max(100).optional(),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  dob: z.string().trim().min(1, "Date of birth is required").max(100),
  ssn: z.string().trim().refine(hasNineDigits, "Enter a valid 9-digit SSN"),
  drivers_license: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Phone is required").max(30),

  address: z.string().trim().min(1, "Address is required").max(200),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(1, "State is required").max(40),
  zip: z.string().trim().min(1, "ZIP is required").max(15),
  housing_status: z.enum(["own", "rent", "other"]).optional(),
  // Browser autofill likes to drop a full street address into these
  // (untagged, adjacent-to-address-fields) boxes. numOrNull() below would
  // silently discard anything non-numeric, which lost the value entirely —
  // so require digits here and let the customer correct it instead.
  years_at_address: digits.min(1, "Time at address is required"),
  months_at_address: digits.optional().or(z.literal("")),
  monthly_housing_payment: z.string().trim().max(40).optional(),
  prev_address: z.string().trim().max(200).optional(),
  prev_city: z.string().trim().max(100).optional(),
  prev_state: z.string().trim().max(40).optional(),
  prev_zip: z.string().trim().max(15).optional(),
  prev_years_at_address: digits.optional().or(z.literal("")),
  prev_months_at_address: digits.optional().or(z.literal("")),

  employment_status: z
    .enum(["employed", "self_employed", "retired", "military", "other"])
    .optional(),
  employer_name: z.string().trim().max(150).optional(),
  job_title: z.string().trim().max(100).optional(),
  work_phone: z.string().trim().max(30).optional(),
  years_employed: digits.optional().or(z.literal("")),
  months_employed: digits.optional().or(z.literal("")),
  prev_employer_name: z.string().trim().max(150).optional(),
  prev_years_employed: digits.optional().or(z.literal("")),
  prev_months_employed: digits.optional().or(z.literal("")),
  no_prev_employer: z.boolean().optional(),
  gross_monthly_income: z.string().trim().min(1, "Monthly income is required").max(40),
  other_income: z.string().trim().max(40).optional(),
  other_income_source: z.string().trim().max(150).optional(),

  has_co_applicant: z.boolean().optional(),
  co_first_name: z.string().trim().max(100).optional(),
  co_last_name: z.string().trim().max(100).optional(),
  co_dob: z.string().trim().max(100).optional(),
  co_ssn: z.string().trim().refine(hasNineDigits, "Enter a valid co-applicant SSN").optional().or(z.literal("")),
  co_email: z.string().trim().email().max(254).optional().or(z.literal("")),
  co_phone: z.string().trim().max(30).optional(),
  co_relationship: z.string().trim().max(60).optional(),
  co_drivers_license: z.string().trim().max(40).optional(),
  co_other_income: z.string().trim().max(40).optional(),
  co_other_income_source: z.string().trim().max(150).optional(),
  co_same_address: z.boolean().optional(),
  co_address: z.string().trim().max(200).optional(),
  co_city: z.string().trim().max(100).optional(),
  co_state: z.string().trim().max(40).optional(),
  co_zip: z.string().trim().max(15).optional(),
  co_housing_status: z.enum(["own", "rent", "other"]).optional(),
  co_monthly_housing_payment: z.string().trim().max(40).optional(),
  co_years_at_address: digits.optional().or(z.literal("")),
  co_months_at_address: digits.optional().or(z.literal("")),
  co_prev_address: z.string().trim().max(200).optional(),
  co_prev_city: z.string().trim().max(100).optional(),
  co_prev_state: z.string().trim().max(40).optional(),
  co_prev_zip: z.string().trim().max(15).optional(),
  co_prev_years_at_address: digits.optional().or(z.literal("")),
  co_prev_months_at_address: digits.optional().or(z.literal("")),
  co_employment_status: z
    .enum(["employed", "self_employed", "retired", "military", "other"])
    .optional(),
  co_employer_name: z.string().trim().max(150).optional(),
  co_job_title: z.string().trim().max(100).optional(),
  co_work_phone: z.string().trim().max(30).optional(),
  co_years_employed: digits.optional().or(z.literal("")),
  co_months_employed: digits.optional().or(z.literal("")),
  co_prev_employer_name: z.string().trim().max(150).optional(),
  co_prev_years_employed: digits.optional().or(z.literal("")),
  co_prev_months_employed: digits.optional().or(z.literal("")),
  co_no_prev_employer: z.boolean().optional(),
  co_gross_monthly_income: z.string().trim().max(40).optional(),

  vehicle_id: z.string().trim().max(100).optional(),
  vin: z.string().trim().max(200).optional(),
  stock_number: z.string().trim().max(50).optional(),
  requested_down_payment: z.string().trim().max(40).optional(),
  desired_monthly_payment: z.string().trim().max(40).optional(),

  signature_name: z.string().trim().min(2, "Please type your full name to sign").max(150),
  consent_credit_pull: z.literal(true, {
    errorMap: () => ({ message: "You must authorize the credit check to submit." }),
  }),
  // Separate, OPTIONAL SMS opt-in — never required to submit the application.
  sms_consent: z.boolean().optional(),
  source_url: z.string().trim().max(2000).optional(),

  // Honeypot — deliberately obscure name so Chrome autofill never targets it.
  _hp: z.string().optional(),
})
  // Conditionally-required blocks: retired applicants have no employer, and
  // co-applicant details only matter when a co-applicant was added.
  .superRefine((v, ctx) => {
    const need = (path: string, value: string | undefined, message: string) => {
      if (!value || !value.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
      }
    };
    // Under 2 years (24 months) at the address or on the job means the lender
    // wants the one before it too — same rule the form enforces.
    const months = (y?: string, m?: string) =>
      (parseInt(y || "0", 10) || 0) * 12 + (parseInt(m || "0", 10) || 0);

    if (v.employment_status !== "retired") {
      need("employer_name", v.employer_name, "Employer is required");
      need("job_title", v.job_title, "Job title is required");
      need("years_employed", v.years_employed, "Time on the job is required");
      if (months(v.years_employed, v.months_employed) < 24 && !v.no_prev_employer) {
        need("prev_employer_name", v.prev_employer_name, "Previous employer is required (or check the box if you have none)");
        need("prev_years_employed", v.prev_years_employed, "Time at previous employer is required");
      }
    }
    // Previous address: street, city, state and ZIP each required — a lender
    // can't use "the old place on Main".
    const prevAddress = (p: "" | "co_", who: string) => {
      const r = v as Record<string, unknown>;
      const s = (name: string) => r[`${p}${name}`] as string | undefined;
      const msg = (text: string) => (who ? `${who} ${text}` : text[0].toUpperCase() + text.slice(1));
      need(`${p}prev_address`, s("prev_address"), msg("previous street address is required"));
      need(`${p}prev_city`, s("prev_city"), msg("previous city is required"));
      need(`${p}prev_state`, s("prev_state"), msg("previous state is required"));
      need(`${p}prev_zip`, s("prev_zip"), msg("previous ZIP is required"));
      need(`${p}prev_years_at_address`, s("prev_years_at_address"), msg("time at previous address is required"));
    };
    if (months(v.years_at_address, v.months_at_address) < 24) prevAddress("", "");
    const phoneOk = (s?: string) => (s ?? "").replace(/\D/g, "").length >= 10;
    const rent = (path: string, value: string | undefined, status: string | undefined) => {
      if (status === "other") return;
      need(path, value, "Monthly rent/mortgage is required — enter 0 if none");
      if (value && value.trim() && !/\d/.test(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: "Enter a dollar amount (0 if none)" });
      }
    };
    rent("monthly_housing_payment", v.monthly_housing_payment, v.housing_status);
    if (v.employment_status !== "retired" && !phoneOk(v.work_phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["work_phone"], message: "Work phone is required (10 digits)" });
    }
    need("requested_down_payment", v.requested_down_payment, "Down payment is required — enter 0 if none");
    if (v.requested_down_payment && !/\d/.test(v.requested_down_payment)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requested_down_payment"],
        message: "Enter a dollar amount (0 if none)",
      });
    }

    if (v.has_co_applicant) {
      need("co_first_name", v.co_first_name, "Co-applicant first name is required");
      need("co_last_name", v.co_last_name, "Co-applicant last name is required");
      need("co_dob", v.co_dob, "Co-applicant date of birth is required");
      need("co_ssn", v.co_ssn, "Co-applicant SSN is required");
      need("co_phone", v.co_phone, "Co-applicant phone is required");
      need("co_address", v.co_address, "Co-applicant address is required");
      need("co_city", v.co_city, "Co-applicant city is required");
      need("co_state", v.co_state, "Co-applicant state is required");
      need("co_zip", v.co_zip, "Co-applicant ZIP is required");
      need("co_years_at_address", v.co_years_at_address, "Co-applicant time at address is required");
      rent("co_monthly_housing_payment", v.co_monthly_housing_payment, v.co_housing_status);
      if (v.co_employment_status !== "retired" && !phoneOk(v.co_work_phone)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["co_work_phone"], message: "Co-applicant work phone is required (10 digits)" });
      }
      if (months(v.co_years_at_address, v.co_months_at_address) < 24) prevAddress("co_", "Co-applicant");
      need(
        "co_gross_monthly_income",
        v.co_gross_monthly_income,
        "Co-applicant income is required"
      );
      if (v.co_employment_status !== "retired") {
        need("co_employer_name", v.co_employer_name, "Co-applicant employer is required");
        need("co_job_title", v.co_job_title, "Co-applicant job title is required");
        need("co_years_employed", v.co_years_employed, "Co-applicant time on the job is required");
        if (months(v.co_years_employed, v.co_months_employed) < 24 && !v.co_no_prev_employer) {
          need("co_prev_employer_name", v.co_prev_employer_name, "Co-applicant previous employer is required (or check the box if none)");
          need("co_prev_years_employed", v.co_prev_years_employed, "Co-applicant time at previous employer is required");
        }
      }
    }
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

/**
 * Insert the website's copy of the application. If the database is missing a
 * column the code knows about (a migration in supabase/credit_applications.sql
 * not run yet), drop that column and retry rather than losing the whole row —
 * the DMS push still carries every field. Returns the columns dropped.
 */
async function insertCreditAppRow(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  row: Record<string, unknown>
): Promise<{ ok: true; dropped: string[] } | { ok: false; error: string }> {
  const payload = { ...row };
  const dropped: string[] = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    const { error } = await supabase.from("credit_applications").insert(payload);
    if (!error) return { ok: true, dropped };
    // PostgREST: "Could not find the 'prev_city' column of 'credit_applications'…"
    // Postgres:  'column "prev_city" of relation … does not exist'
    const missing =
      /'([a-z0-9_]+)' column/i.exec(error.message)?.[1] ??
      /column "([a-z0-9_]+)"/i.exec(error.message)?.[1];
    if (!missing || !(missing in payload) || missing === "id" || missing === "lead_id") {
      return { ok: false, error: error.message };
    }
    delete payload[missing];
    dropped.push(missing);
  }
  return { ok: false, error: "too many missing columns" };
}

// Room for the DB writes, the DMS push and DealerCenter (each has its own
// timeout) — the platform default could cut a submission off midway.
export const maxDuration = 60;

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

    // Honeypot. It used to drop the application while telling the customer it
    // was received — and a browser autofilling the hidden box looks exactly
    // like a bot. Anything that got past the full validation above (9-digit
    // SSN, DOB, signature, consent) is kept and just flagged.
    const honeypotTripped = Boolean(app._hp && app._hp.trim() !== "");

    // Resolve vehicle for DealerCenter enrichment.
    let vehicle: Vehicle | null = null;
    if (app.vehicle_id) vehicle = await getVehicleById(app.vehicle_id).catch(() => null);

    const ctx: CreditAppAdfContext = {
      year: vehicle?.year,
      make: vehicle?.make,
      model: vehicle?.model,
      vin: vehicle?.vin ?? app.vin,
      stock_number: vehicle?.stock_number ?? app.stock_number,
    };

    const applicantSsn4 = last4(app.ssn);
    const co = app.has_co_applicant === true;
    const submittedAt = new Date().toISOString();
    // Chosen here, not by the database, so the DMS push carries the same id
    // the DMS poller will see — even if the website insert below fails.
    const appId = randomUUID();

    // Redacted credit-application record (NO full SSN — last 4 only).
    const creditAppRow = {
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
      prev_address: app.prev_address || null,
      employment_status: app.employment_status ?? null,
      employer_name: app.employer_name ?? null,
      job_title: app.job_title ?? null,
      work_phone: app.work_phone ?? null,
      years_employed: numOrNull(app.years_employed),
      months_employed: numOrNull(app.months_employed),
      gross_monthly_income: app.gross_monthly_income ?? null,
      other_income: app.other_income ?? null,
      other_income_source: app.other_income_source ?? null,
      co_first_name: co ? app.co_first_name ?? null : null,
      co_last_name: co ? app.co_last_name ?? null : null,
      co_dob: co ? dateOrNull(app.co_dob) : null,
      co_ssn_last4: co ? last4(app.co_ssn) : null,
      co_email: co ? app.co_email || null : null,
      co_phone: co ? app.co_phone ?? null : null,
      co_employer_name: co ? app.co_employer_name ?? null : null,
      co_gross_monthly_income: co ? app.co_gross_monthly_income ?? null : null,
      co_relationship: co ? app.co_relationship ?? null : null,
      vehicle_id: vehicle?.id ?? null,
      vin: ctx.vin ?? null,
      stock_number: ctx.stock_number ?? null,
      requested_down_payment: app.requested_down_payment ?? null,
      desired_monthly_payment: app.desired_monthly_payment ?? null,
      signature_name: app.signature_name,
      consent_credit_pull: app.consent_credit_pull,
      sms_consent: app.sms_consent === true,
      signer_ip:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null,
      signer_user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
    };

    // Previous address/employer + the co-applicant's own address & job.
    const detailRow = {
      prev_city: app.prev_city || null,
      prev_state: app.prev_state || null,
      prev_zip: app.prev_zip || null,
      prev_years_at_address: numOrNull(app.prev_years_at_address),
      prev_months_at_address: numOrNull(app.prev_months_at_address),
      prev_employer_name: app.prev_employer_name || null,
      prev_years_employed: numOrNull(app.prev_years_employed),
      prev_months_employed: numOrNull(app.prev_months_employed),
      no_prev_employer: app.no_prev_employer === true,
      co_address: co ? app.co_address || null : null,
      co_city: co ? app.co_city || null : null,
      co_state: co ? app.co_state || null : null,
      co_zip: co ? app.co_zip || null : null,
      co_housing_status: co ? app.co_housing_status ?? null : null,
      co_monthly_housing_payment: co ? app.co_monthly_housing_payment || null : null,
      co_years_at_address: co ? numOrNull(app.co_years_at_address) : null,
      co_months_at_address: co ? numOrNull(app.co_months_at_address) : null,
      co_prev_address: co ? app.co_prev_address || null : null,
      co_prev_city: co ? app.co_prev_city || null : null,
      co_prev_state: co ? app.co_prev_state || null : null,
      co_prev_zip: co ? app.co_prev_zip || null : null,
      co_prev_years_at_address: co ? numOrNull(app.co_prev_years_at_address) : null,
      co_prev_months_at_address: co ? numOrNull(app.co_prev_months_at_address) : null,
      co_employment_status: co ? app.co_employment_status ?? null : null,
      co_job_title: co ? app.co_job_title || null : null,
      co_work_phone: co ? app.co_work_phone || null : null,
      co_years_employed: co ? numOrNull(app.co_years_employed) : null,
      co_months_employed: co ? numOrNull(app.co_months_employed) : null,
      co_prev_employer_name: co ? app.co_prev_employer_name || null : null,
      co_prev_years_employed: co ? numOrNull(app.co_prev_years_employed) : null,
      co_prev_months_employed: co ? numOrNull(app.co_prev_months_employed) : null,
      co_no_prev_employer: co && app.co_no_prev_employer === true,
      co_drivers_license: co ? app.co_drivers_license || null : null,
      co_other_income: co ? app.co_other_income || null : null,
      co_other_income_source: co ? app.co_other_income_source || null : null,
    };

    const fullRow = { ...creditAppRow, ...detailRow };

    // 1) Save it here first. This used to come AFTER the DealerCenter push, so
    //    a slow or failing DealerCenter could cost the whole submission.
    const supabase =
      isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY ? getSupabaseAdmin() : null;
    let leadId: string | null = null;
    let storedHere = false;
    const problems: string[] = [];

    if (supabase) {
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
          message: honeypotTripped
            ? "Signed online credit application submitted. (Hidden spam-trap field was filled — likely browser autofill; verify the customer.)"
            : "Signed online credit application submitted.",
          lead_type: "credit_app",
          down_payment: app.requested_down_payment ?? null,
          monthly_payment_goal: app.desired_monthly_payment ?? null,
          source_url: app.source_url ?? null,
        })
        .select("id")
        .single();
      if (insertErr || !lead) {
        problems.push(`website lead insert failed: ${insertErr?.message ?? "no row"}`);
      } else {
        leadId = (lead as { id: string }).id;
        await supabase.from("lead_events").insert({ lead_id: leadId, event_type: "created", notes: "credit_app" });

        const stored = await insertCreditAppRow(supabase, { id: appId, lead_id: leadId, ...fullRow });
        if (stored.ok) {
          storedHere = true;
          if (stored.dropped.length) {
            problems.push(
              `website DB is missing column(s) ${stored.dropped.join(", ")} — run supabase/credit_applications.sql (the DMS still got them)`
            );
          }
        } else {
          problems.push(`credit_applications insert failed: ${stored.error}`);
        }
      }
    }

    // 2) The FULL application (SSN included) to the DMS, and the ADF copy to
    //    DealerCenter, side by side. The DMS gets it even when the website
    //    insert above failed — same id, so its poller can never file it twice.
    const adfXml = buildCreditAppAdfXml(app, ctx);
    const [dmsResult, dcResult] = await Promise.all([
      pushCreditAppToDms({
        ...fullRow,
        id: appId,
        lead_id: leadId,
        created_at: submittedAt,
        signed_at: submittedAt,
        ssn: app.ssn || null,
        co_ssn: co ? app.co_ssn || null : null,
      }),
      pushAdfToDealerCenter(adfXml, {
        lead_type: "credit_app",
        label: `New SIGNED CREDIT APP: ${app.first_name} ${app.last_name}`,
        noFallbackNotify: true, // never echo a full SSN into a human inbox
      }),
    ]);
    if (dmsResult.status === "failed") {
      problems.push(
        storedHere
          ? `DMS push failed (${dmsResult.error}) — the DMS poller will still file it, without the full SSN`
          : `DMS push failed (${dmsResult.error})`
      );
    }

    if (supabase && leadId) {
      const pushedAt = dcResult.success ? new Date().toISOString() : null;
      await supabase.from("leads").update({ dc_pushed: dcResult.success, dc_pushed_at: pushedAt }).eq("id", leadId);
      if (storedHere) {
        await supabase
          .from("credit_applications")
          .update({ dc_pushed: dcResult.success, dc_pushed_at: pushedAt })
          .eq("id", appId);
      }
      await supabase.from("lead_events").insert({
        lead_id: leadId,
        event_type: dcResult.success ? "dc_pushed" : "dc_push_failed",
        notes: dcResult.success
          ? `method=${dcResult.method}${dcResult.dc_lead_id ? ` dc_lead_id=${dcResult.dc_lead_id}` : ""}`
          : dcResult.error ?? "unknown error",
      });
    }

    const inDms = dmsResult.status === "ok";
    // Somewhere a human will find it. If none of these happened the customer
    // is told to call — never shown a false "received".
    const delivered = storedHere || inDms || dcResult.success;
    for (const p of problems) console.error("[api/credit-application]", p);

    // Human alert to the dealership — REDACTED (last 4 only, never full SSN).
    await sendNotification({
      subject: `Signed credit app: ${app.first_name} ${app.last_name}${
        inDms ? "" : " (⚠ NOT in the DMS yet — check it)"
      }${honeypotTripped ? " (spam-trap field filled — verify)" : ""}`,
      body: [
        `A signed online credit application just came in.`,
        ``,
        `Name: ${app.first_name} ${app.last_name}`,
        `Phone: ${app.phone}`,
        app.email ? `Email: ${app.email}` : null,
        applicantSsn4 ? `SSN: ***-**-${applicantSsn4}` : null,
        co ? `Co-applicant: ${`${app.co_first_name ?? ""} ${app.co_last_name ?? ""}`.trim()}` : null,
        ctx.year || ctx.make || ctx.model
          ? `Vehicle: ${[ctx.year, ctx.make, ctx.model].filter(Boolean).join(" ")}`
          : null,
        app.requested_down_payment ? `Down payment: ${app.requested_down_payment}` : null,
        app.gross_monthly_income ? `Gross monthly income: ${app.gross_monthly_income}` : null,
        `Signed by: ${app.signature_name}`,
        ``,
        inDms
          ? `➡ Full application (with SSN) is in the DMS under Credit apps.`
          : `⚠ The full application did NOT reach the DMS directly.${
              storedHere ? " The DMS poller should file it within a few minutes (without the full SSN)." : ""
            }`,
        dcResult.success
          ? `➡ Also delivered to DealerCenter (${dcResult.method}).`
          : `DealerCenter: not delivered (${dcResult.error}).`,
        ...(problems.length ? [``, `Problems:`, ...problems.map((p) => `- ${p}`)] : []),
      ]
        .filter((l) => l !== null)
        .join("\n"),
    }).catch(() => undefined);

    if (!delivered) {
      return NextResponse.json(
        { error: "We couldn't save your application." },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, lead_id: leadId, dc_pushed: inDms || dcResult.success });
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
