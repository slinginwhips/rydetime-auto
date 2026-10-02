"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type FieldPath, type RegisterOptions, type UseFormReturn } from "react-hook-form";
import Link from "next/link";
import type { CreditApplicationSubmission } from "@/types/lead";
import { CREDIT_APP_AUTHORIZATION_TEXT, SMS_CONSENT_DISCLOSURE } from "@/types/lead";

export interface VehicleOption {
  id: string;
  year: number | null;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  stock_number: string | null;
}

interface CreditApplicationFormProps {
  vehicleId?: string;
  vehicleLabel?: string;
  vehicles?: VehicleOption[];
}

type FormValues = Omit<CreditApplicationSubmission, "vehicle_id" | "source_url">;

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none";
const labelClass = "mb-1.5 block text-sm font-medium text-text-secondary";
const errClass = "mt-1 text-xs text-accent";

// Years/months boxes sit next to address fields, so browser autofill likes to
// drop a whole street address into them. The API silently discards anything
// non-numeric, which is how apps arrived with blank time-at-address — so reject
// it here instead of letting it vanish after submit.
const digitRule = (message: string) => ({
  // {0,2} so a blank optional box isn't flagged; `required` handles emptiness.
  pattern: { value: /^\d{0,2}$/, message },
});

/** Whatever autofill or a paste put in a years/months box, as 0–2 digits. A
 *  street address ("123 Main St") clears the box rather than leaving "12". */
const cleanTimeValue = (raw: string) =>
  /[a-z]/i.test(raw) ? "" : raw.replace(/\D/g, "").slice(0, 2);

// Rent/mortgage, down payment: free text, but there has to be a number in it.
const DOLLARS = { value: /\d/, message: "Enter a dollar amount (0 if none)" };
// Autofill can add a ZIP+4 or trailing space; both are fine.
const ZIP = { value: /^\s*\d{5}(?:[-\s]?\d{4})?\s*$/, message: "Enter a 5-digit ZIP" };

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
];

const STEP_TITLES = ["About you", "Where you live", "Work & income", "Co-applicant", "Your deal", "Review & sign"];

/** Sticky "Step 2 of 6" bar under the site header. Tracks whichever section
 *  is in view; tapping a segment jumps to that section. */
function ApplicationProgress() {
  const [current, setCurrent] = useState(1);
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>("[data-app-step]")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.appStep));
        }
      },
      // A section is "current" once it crosses the upper third of the screen.
      { rootMargin: "-30% 0px -60% 0px" }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Application progress"
      className="sticky top-[66px] z-20 -mx-4 border-b border-border-subtle bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-md sm:border"
    >
      <p className="text-xs font-semibold text-text-secondary" aria-live="polite">
        Step {current} of {STEP_TITLES.length}
        <span className="text-text-muted"> · {STEP_TITLES[current - 1]}</span>
      </p>
      <ol className="mt-2 grid grid-cols-6 gap-1.5">
        {STEP_TITLES.map((t, i) => (
          <li key={t}>
            <a
              href={`#app-step-${i + 1}`}
              aria-label={`Step ${i + 1}: ${t}`}
              aria-current={i + 1 === current ? "step" : undefined}
              className="block py-1.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-colors ${
                  i + 1 <= current ? "bg-accent" : "bg-border-subtle"
                }`}
              />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SectionCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`app-step-${step}`}
      data-app-step={step}
      className="scroll-mt-32 rounded-lg border border-border-subtle bg-background-card p-6 sm:p-8"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-bold text-text-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

type Form = UseFormReturn<FormValues>;
type Key = FieldPath<FormValues>;

// The applicant and the co-applicant are asked the exact same address and job
// questions, so both render through these components: `p` is "" for the
// applicant and "co_" for the co-applicant.
const key = (p: string, name: string) => `${p}${name}` as Key;

const fieldError = (form: Form, k: Key) =>
  (form.formState.errors[k] as { message?: string } | undefined)?.message;

const totalMonths = (years: unknown, months: unknown) =>
  (parseInt(String(years ?? "") || "0", 10) || 0) * 12 + (parseInt(String(months ?? "") || "0", 10) || 0);

/**
 * Years + months pair, used for every "how long" question.
 *
 * iPhone Safari decides what to autofill from a box's name, id and label, and
 * the old ones all said "address" (years_at_address, "Time at this address"),
 * so tapping a saved address put the street into these boxes. They now go
 * through a Controller so the DOM name/id can be neutral (`slot`) while the
 * form value keeps its real key, and anything autofill still drops in is
 * cleaned on the way in.
 */
function TimeInputs({
  form, p, yearsName, monthsName, label, slot,
}: {
  form: Form; p: string; yearsName: string; monthsName: string; label: string; slot: string;
}) {
  const yk = key(p, yearsName);
  const mk = key(p, monthsName);
  const err = fieldError(form, yk) ?? fieldError(form, mk);
  const box = (k: Key, unit: "Years" | "Months", rules: RegisterOptions<FormValues, Key>) => (
    <Controller control={form.control} name={k} rules={rules}
      render={({ field }) => (
        <input id={`ca-${p}${slot}-${unit.toLowerCase()}`} name={`${p}${slot}_${unit.toLowerCase()}`}
          data-field={k} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
          autoComplete="off" placeholder={unit} aria-label={`${label} — ${unit.toLowerCase()}`}
          className={inputClass} ref={field.ref} onBlur={field.onBlur}
          value={typeof field.value === "string" ? field.value : ""}
          onChange={(e) => field.onChange(cleanTimeValue(e.target.value))} />
      )} />
  );
  return (
    <div>
      <span className={labelClass}>{label} *</span>
      <div className="grid grid-cols-2 gap-4">
        {box(yk, "Years", { required: "Enter the years (0 is fine)", ...digitRule("Years must be a number") })}
        {box(mk, "Months", digitRule("Months must be a number"))}
      </div>
      {err && <p className={errClass}>{err}</p>}
    </div>
  );
}

/** State dropdown — a select takes autofill's "Virginia" or "VA" alike, where
 *  a 2-character text box would keep "Vi". */
function StateSelect({ form, k, id, autoComplete, message }: {
  form: Form; k: Key; id: string; autoComplete: string; message: string;
}) {
  return (
    <select id={id} autoComplete={autoComplete} className={inputClass} defaultValue=""
      {...form.register(k, { required: message })}>
      <option value="" disabled>—</option>
      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

function ResidenceFields({ form, p, hideAddress = false }: { form: Form; p: string; hideAddress?: boolean }) {
  const { register, watch } = form;
  const years = watch(key(p, "years_at_address"));
  const months = watch(key(p, "months_at_address"));
  // Rent/mortgage is required unless they picked "Other" (e.g. living with family).
  const paysHousing = watch(key(p, "housing_status")) !== "other";
  // Lenders want two years of address history. Wait until they've typed the
  // years so the box doesn't flash open on an empty form.
  const needPrev = String(years ?? "") !== "" && totalMonths(years, months) < 24;
  const e = (name: string) => fieldError(form, key(p, name));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
      {!hideAddress && (
        <>
          <div className="sm:col-span-6">
            <label htmlFor={`ca-${p}addr`} className={labelClass}>Street address *</label>
            <input id={`ca-${p}addr`} autoComplete="street-address" className={inputClass}
              {...register(key(p, "address"), { required: "Address is required" })} />
            {e("address") && <p className={errClass}>{e("address")}</p>}
          </div>
          <div className="sm:col-span-3">
            <label htmlFor={`ca-${p}city`} className={labelClass}>City *</label>
            <input id={`ca-${p}city`} autoComplete="address-level2" className={inputClass}
              {...register(key(p, "city"), { required: "City is required" })} />
            {e("city") && <p className={errClass}>{e("city")}</p>}
          </div>
          <div className="sm:col-span-1">
            <label htmlFor={`ca-${p}state`} className={labelClass}>State *</label>
            <StateSelect form={form} k={key(p, "state")} id={`ca-${p}state`}
              autoComplete="address-level1" message="State" />
            {e("state") && <p className={errClass}>{e("state")}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`ca-${p}zip`} className={labelClass}>ZIP *</label>
            <input id={`ca-${p}zip`} inputMode="numeric" autoComplete="postal-code" maxLength={10}
              className={inputClass} {...register(key(p, "zip"), {
                required: "ZIP is required",
                pattern: ZIP,
              })} />
            {e("zip") && <p className={errClass}>{e("zip")}</p>}
          </div>
        </>
      )}
      <div className="sm:col-span-2">
        <label htmlFor={`ca-${p}housing`} className={labelClass}>Own or rent? *</label>
        <select id={`ca-${p}housing`} className={inputClass} {...register(key(p, "housing_status"))}>
          <option value="own">Own</option>
          <option value="rent">Rent</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`ca-${p}house-pmt`} className={labelClass}>Monthly rent/mortgage{paysHousing ? " *" : ""}</label>
        <input id={`ca-${p}house-pmt`} inputMode="numeric" placeholder={paysHousing ? "$ (0 if none)" : "$"} className={inputClass}
          {...register(key(p, "monthly_housing_payment"), {
            // Explicit on both branches: react-hook-form merges rules across
            // renders, so omitting them wouldn't clear a stale "required".
            required: paysHousing ? "Enter your monthly rent/mortgage — type 0 if none" : false,
            pattern: paysHousing ? DOLLARS : undefined,
          })} />
        {e("monthly_housing_payment") && <p className={errClass}>{e("monthly_housing_payment")}</p>}
      </div>
      <div className="sm:col-span-2">
        <TimeInputs form={form} p={p} slot="lived" yearsName="years_at_address" monthsName="months_at_address"
          label="How long have you lived here?" />
      </div>
      {needPrev && (
        <>
          <p className="text-xs text-text-muted sm:col-span-6">
            Less than 2 years here — lenders need your previous address too.
          </p>
          {/* Own autofill section, so picking a saved address here fills these
              four boxes instead of the current address above. */}
          <div className="sm:col-span-6">
            <label htmlFor={`ca-${p}prev-street`} className={labelClass}>Previous street address *</label>
            <input id={`ca-${p}prev-street`} autoComplete={`section-${p}prev street-address`} className={inputClass}
              {...register(key(p, "prev_address"), { required: "Previous street address is required" })} />
            {e("prev_address") && <p className={errClass}>{e("prev_address")}</p>}
          </div>
          <div className="sm:col-span-3">
            <label htmlFor={`ca-${p}prev-city`} className={labelClass}>Previous city *</label>
            <input id={`ca-${p}prev-city`} autoComplete={`section-${p}prev address-level2`} className={inputClass}
              {...register(key(p, "prev_city"), { required: "Previous city is required" })} />
            {e("prev_city") && <p className={errClass}>{e("prev_city")}</p>}
          </div>
          <div className="sm:col-span-1">
            <label htmlFor={`ca-${p}prev-state`} className={labelClass}>State *</label>
            <StateSelect form={form} k={key(p, "prev_state")} id={`ca-${p}prev-state`}
              autoComplete={`section-${p}prev address-level1`} message="State" />
            {e("prev_state") && <p className={errClass}>{e("prev_state")}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`ca-${p}prev-zip`} className={labelClass}>Previous ZIP *</label>
            <input id={`ca-${p}prev-zip`} inputMode="numeric" autoComplete={`section-${p}prev postal-code`}
              maxLength={10} className={inputClass}
              {...register(key(p, "prev_zip"), {
                required: "Previous ZIP is required",
                pattern: ZIP,
              })} />
            {e("prev_zip") && <p className={errClass}>{e("prev_zip")}</p>}
          </div>
          <div className="sm:col-span-3">
            <TimeInputs form={form} p={p} slot="prev-lived" yearsName="prev_years_at_address"
              monthsName="prev_months_at_address" label="How long did you live there?" />
          </div>
        </>
      )}
    </div>
  );
}

function EmploymentFields({
  form, p,
}: { form: Form; p: string }) {
  const { register, watch } = form;
  const status = watch(key(p, "employment_status"));
  const years = watch(key(p, "years_employed"));
  const months = watch(key(p, "months_employed"));
  const noPrev = watch(key(p, "no_prev_employer"));
  const working = status !== "retired";
  const needPrev = working && String(years ?? "") !== "" && totalMonths(years, months) < 24;
  const e = (name: string) => fieldError(form, key(p, name));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <label htmlFor={`ca-${p}emp-status`} className={labelClass}>Employment status *</label>
        <select id={`ca-${p}emp-status`} className={inputClass} {...register(key(p, "employment_status"))}>
          <option value="employed">Employed</option>
          <option value="self_employed">Self-employed</option>
          <option value="retired">Retired</option>
          <option value="military">Military</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={`ca-${p}income`} className={labelClass}>Gross monthly income *</label>
        <input id={`ca-${p}income`} inputMode="numeric" placeholder="$ before taxes" className={inputClass}
          {...register(key(p, "gross_monthly_income"), { required: "Monthly income is required" })} />
        {e("gross_monthly_income") && <p className={errClass}>{e("gross_monthly_income")}</p>}
      </div>
      {working && (
        <>
          <div className="sm:col-span-3">
            <label htmlFor={`ca-${p}employer`} className={labelClass}>Employer *</label>
            <input id={`ca-${p}employer`} autoComplete="organization" className={inputClass}
              {...register(key(p, "employer_name"), { required: "Employer is required" })} />
            {e("employer_name") && <p className={errClass}>{e("employer_name")}</p>}
          </div>
          <div className="sm:col-span-3">
            <label htmlFor={`ca-${p}title`} className={labelClass}>Job title *</label>
            <input id={`ca-${p}title`} autoComplete="organization-title" className={inputClass}
              {...register(key(p, "job_title"), { required: "Job title is required" })} />
            {e("job_title") && <p className={errClass}>{e("job_title")}</p>}
          </div>
          <div className="sm:col-span-3">
            <label htmlFor={`ca-${p}work-phone`} className={labelClass}>Work phone *</label>
            <input id={`ca-${p}work-phone`} type="tel" autoComplete="off" className={inputClass}
              {...register(key(p, "work_phone"), {
                required: "Work phone is required",
                validate: (v) => String(v ?? "").replace(/\D/g, "").length >= 10 || "Enter a full 10-digit work phone",
              })} />
            {e("work_phone") && <p className={errClass}>{e("work_phone")}</p>}
          </div>
          <div className="sm:col-span-3">
            <TimeInputs form={form} p={p} slot="job" yearsName="years_employed" monthsName="months_employed"
              label="Time on this job" />
          </div>
          {needPrev && (
            <>
              <p className="text-xs text-text-muted sm:col-span-6">
                Less than 2 years on this job — lenders need the previous one too.
              </p>
              <label className="flex cursor-pointer items-center gap-3 sm:col-span-6">
                <input type="checkbox" className="h-4 w-4 accent-accent"
                  {...register(key(p, "no_prev_employer"))} />
                <span className="text-sm text-text-primary">
                  No previous employer (this is my first job)
                </span>
              </label>
              {!noPrev && (
                <>
                  <div className="sm:col-span-3">
                    <label htmlFor={`ca-${p}prev-employer`} className={labelClass}>Previous employer *</label>
                    <input id={`ca-${p}prev-employer`} className={inputClass}
                      {...register(key(p, "prev_employer_name"), { required: "Previous employer is required" })} />
                    {e("prev_employer_name") && <p className={errClass}>{e("prev_employer_name")}</p>}
                  </div>
                  <div className="sm:col-span-3">
                    <TimeInputs form={form} p={p} slot="prev-job" yearsName="prev_years_employed" monthsName="prev_months_employed"
                      label="Time at previous employer" />
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
      <div className="sm:col-span-3">
        <label htmlFor={`ca-${p}other-income`} className={labelClass}>Other monthly income</label>
        <input id={`ca-${p}other-income`} inputMode="numeric" placeholder="$ (optional)" className={inputClass}
          {...register(key(p, "other_income"))} />
      </div>
      <div className="sm:col-span-3">
        <label htmlFor={`ca-${p}other-src`} className={labelClass}>Source of other income</label>
        <input id={`ca-${p}other-src`} className={inputClass} {...register(key(p, "other_income_source"))} />
      </div>
    </div>
  );
}

export default function CreditApplicationForm({
  vehicleId,
  vehicleLabel,
  vehicles,
}: CreditApplicationFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [dcPushed, setDcPushed] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  // The submit button is at the bottom of a long form, so the confirmation used
  // to render with the customer still scrolled down there and the "received"
  // message off-screen above them.
  useEffect(() => {
    if (status === "success") successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status]);
  const [pickedVehicleId, setPickedVehicleId] = useState<string | undefined>(undefined);
  const [showOtherVin, setShowOtherVin] = useState(false);
  const form = useForm<FormValues>({
    // Hidden sections (retired applicants, no co-applicant) must not keep
    // validating or submitting stale values after they unmount.
    shouldUnregister: true,
    defaultValues: {
      housing_status: "rent",
      employment_status: "employed",
      co_housing_status: "rent",
      co_employment_status: "employed",
    },
  });
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const hasCo = watch("has_co_applicant");
  const coSameAddress = watch("co_same_address");

  const onSubmit = async (values: FormValues) => {
    // No client-side honeypot short-circuit: a browser's autofill or password
    // manager filling the hidden box used to show the customer "received"
    // while nothing was sent. The server decides, and still keeps the app.
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const body: CreditApplicationSubmission = {
        ...values,
        // "Same address as mine": the co-applicant's address inputs are hidden,
        // so fill them from the applicant's here.
        ...(values.has_co_applicant && values.co_same_address
          ? { co_address: values.address, co_city: values.city, co_state: values.state, co_zip: values.zip }
          : {}),
        vehicle_id: pickedVehicleId ?? vehicleId,
        vin: values.vin || undefined,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
      };
      const res = await fetch("/api/credit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // A gateway timeout comes back as an HTML page, not JSON.
      const data = await res.json().catch(() => null);
      if (!data) throw new Error("submit failed");
      if (!res.ok || !data.success) {
        const firstFieldError = data?.details
          ? (Object.values(data.details)[0] as string[] | undefined)?.[0]
          : undefined;
        throw new Error(firstFieldError || data?.error || "submit failed");
      }
      setDcPushed(data.dc_pushed !== false);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : null);
      setStatus("error");
    }
  };

  // A blocked submit used to look like a dead button when the offending field
  // was off-screen. Jump to it and focus it so the customer can see why.
  const onInvalid = (fieldErrors: typeof errors) => {
    const first = Object.keys(fieldErrors)[0];
    if (!first) return;
    // Years/months boxes carry their form key in data-field, not name.
    const el = document.querySelector<HTMLElement>(`[name="${first}"], [data-field="${first}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  if (status === "success") {
    return (
      <div ref={successRef} className="scroll-mt-28 rounded-lg border border-border-subtle bg-background-card p-8 text-center">
        <svg
          className="mx-auto text-accent"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 11 15 16 9" />
        </svg>
        <h3 className="mt-4 text-xl font-bold text-text-primary">
          Application received — you&apos;re all set! 🎉
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
          Your signed application is in. We&apos;ll review it and reach out —
          usually the same or next business day — with your real options. No need
          to stay up; we&apos;ve got it from here.
        </p>
        {!dcPushed && (
          <p className="mx-auto mt-4 max-w-md rounded-md bg-surface p-3 text-xs text-text-muted">
            If you don&apos;t hear from us within one business day, give us a call
            at (757) 937-8664 so we can finish things up.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
      {vehicleLabel && (
        <p className="rounded-md border border-border-subtle bg-surface px-4 py-3 text-sm text-text-secondary">
          Applying for: <span className="font-semibold text-text-primary">{vehicleLabel}</span>
        </p>
      )}

      {/* Secure banner */}
      <div className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-3">
        <svg
          className="mt-0.5 shrink-0 text-accent"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p className="text-xs leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">Secure &amp; encrypted.</span>{" "}
          Your application is sent over an encrypted connection straight to our
          financing office. Your full Social Security number is transmitted to our
          lending partners and is <span className="font-semibold">never stored on this website</span>.
        </p>
      </div>

      <ApplicationProgress />

      {/* 1 — Applicant */}
      <SectionCard step={1} title="About you" subtitle="The primary applicant.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ca-first" className={labelClass}>First name *</label>
            <input id="ca-first" autoComplete="given-name" className={inputClass}
              {...register("first_name", { required: "First name is required" })} />
            {errors.first_name && <p className={errClass}>{errors.first_name.message}</p>}
          </div>
          <div>
            <label htmlFor="ca-last" className={labelClass}>Last name *</label>
            <input id="ca-last" autoComplete="family-name" className={inputClass}
              {...register("last_name", { required: "Last name is required" })} />
            {errors.last_name && <p className={errClass}>{errors.last_name.message}</p>}
          </div>
          <div>
            <label htmlFor="ca-phone" className={labelClass}>Mobile phone *</label>
            <input id="ca-phone" type="tel" autoComplete="tel" className={inputClass}
              {...register("phone", { required: "Phone is required" })} />
            {errors.phone && <p className={errClass}>{errors.phone.message}</p>}
          </div>
          <div className="sm:col-span-2 rounded-md border border-border-subtle bg-surface p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent"
                {...register("sms_consent")} />
              <span className="text-xs leading-relaxed text-text-secondary">
                {SMS_CONSENT_DISCLOSURE}
              </span>
            </label>
            <p className="mt-2 pl-7 text-xs text-text-muted">
              <Link href="/privacy" target="_blank" className="text-accent hover:underline">
                Privacy Policy
              </Link>
              {" · "}
              <Link href="/terms" target="_blank" className="text-accent hover:underline">
                Terms &amp; Conditions
              </Link>
            </p>
          </div>
          <div>
            <label htmlFor="ca-email" className={labelClass}>Email</label>
            <input id="ca-email" type="email" autoComplete="email" className={inputClass}
              {...register("email", { pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" } })} />
            {errors.email && <p className={errClass}>{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="ca-dob" className={labelClass}>Date of birth *</label>
            <input id="ca-dob" type="date" className={inputClass}
              {...register("dob", { required: "Date of birth is required" })} />
            {errors.dob && <p className={errClass}>{errors.dob.message}</p>}
          </div>
          <div>
            <label htmlFor="ca-ssn" className={labelClass}>
              Social Security number *
              <span className="ml-1 font-normal text-text-muted">🔒 not stored here</span>
            </label>
            <input id="ca-ssn" type="text" inputMode="numeric" autoComplete="off" maxLength={11}
              placeholder="000-00-0000" className={inputClass}
              {...register("ssn", {
                required: "SSN is required to check your credit",
                pattern: { value: /^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/, message: "Enter a valid 9-digit SSN" },
              })} />
            {errors.ssn && <p className={errClass}>{errors.ssn.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ca-dl" className={labelClass}>Driver&apos;s license #</label>
            <input id="ca-dl" autoComplete="off" className={inputClass} {...register("drivers_license")} />
          </div>
        </div>
      </SectionCard>

      {/* 2 — Residence */}
      <SectionCard step={2} title="Where you live" subtitle="Your current home address.">
        <ResidenceFields form={form} p="" />
      </SectionCard>

      {/* 3 — Employment & income */}
      <SectionCard step={3} title="Work &amp; income" subtitle="How you earn — steady income is what lenders look for most.">
        <EmploymentFields form={form} p="" />
        <p className="mt-3 text-xs text-text-muted">
          You do not have to disclose alimony, child support, or separate maintenance income
          unless you want it considered.
        </p>
      </SectionCard>

      {/* 4 — Co-applicant (optional) */}
      <SectionCard step={4} title="Co-applicant" subtitle="Adding one can help you qualify. Totally optional.">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" className="h-4 w-4 accent-accent"
            {...register("has_co_applicant")} />
          <span className="text-sm font-medium text-text-primary">Add a co-applicant</span>
        </label>

        {hasCo && (
          <div className="mt-6 space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="ca-co-first" className={labelClass}>Co-applicant first name *</label>
                <input id="ca-co-first" className={inputClass}
                  {...register("co_first_name", { required: "Co-applicant first name is required" })} />
                {errors.co_first_name && <p className={errClass}>{errors.co_first_name.message}</p>}
              </div>
              <div>
                <label htmlFor="ca-co-last" className={labelClass}>Co-applicant last name *</label>
                <input id="ca-co-last" className={inputClass}
                  {...register("co_last_name", { required: "Co-applicant last name is required" })} />
                {errors.co_last_name && <p className={errClass}>{errors.co_last_name.message}</p>}
              </div>
              <div>
                <label htmlFor="ca-co-rel" className={labelClass}>Relationship to you</label>
                <input id="ca-co-rel" placeholder="Spouse, parent…" className={inputClass}
                  {...register("co_relationship")} />
              </div>
              <div>
                <label htmlFor="ca-co-phone" className={labelClass}>Co-applicant mobile phone *</label>
                <input id="ca-co-phone" type="tel" className={inputClass}
                  {...register("co_phone", { required: "Co-applicant phone is required" })} />
                {errors.co_phone && <p className={errClass}>{errors.co_phone.message}</p>}
              </div>
              <div>
                <label htmlFor="ca-co-email" className={labelClass}>Co-applicant email</label>
                <input id="ca-co-email" type="email" className={inputClass} {...register("co_email")} />
              </div>
              <div>
                <label htmlFor="ca-co-dob" className={labelClass}>Co-applicant date of birth *</label>
                <input id="ca-co-dob" type="date" className={inputClass}
                  {...register("co_dob", { required: "Co-applicant date of birth is required" })} />
                {errors.co_dob && <p className={errClass}>{errors.co_dob.message}</p>}
              </div>
              <div>
                <label htmlFor="ca-co-ssn" className={labelClass}>
                  Co-applicant SSN * <span className="font-normal text-text-muted">🔒 not stored here</span>
                </label>
                <input id="ca-co-ssn" inputMode="numeric" autoComplete="off" maxLength={11}
                  placeholder="000-00-0000" className={inputClass}
                  {...register("co_ssn", {
                    required: "Co-applicant SSN is required to check their credit",
                    pattern: { value: /^\d{3}[-\s]?\d{2}[-\s]?\d{4}$/, message: "Enter a valid 9-digit SSN" },
                  })} />
                {errors.co_ssn && <p className={errClass}>{errors.co_ssn.message}</p>}
              </div>
              <div>
                <label htmlFor="ca-co-dl" className={labelClass}>Co-applicant driver&apos;s license #</label>
                <input id="ca-co-dl" autoComplete="off" className={inputClass} {...register("co_drivers_license")} />
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold text-text-primary">Co-applicant&apos;s home address</h3>
              <label className="mb-4 flex cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-accent" {...register("co_same_address")} />
                <span className="text-sm text-text-primary">Same address as mine</span>
              </label>
              <ResidenceFields form={form} p="co_" hideAddress={!!coSameAddress} />
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold text-text-primary">Co-applicant&apos;s work &amp; income</h3>
              <EmploymentFields form={form} p="co_" />
            </div>
          </div>
        )}
      </SectionCard>

      {/* 5 — Deal */}
      <SectionCard step={5} title="Your deal" subtitle="Helps us match you to the right vehicle and lender.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!vehicleLabel && (
            <div className="sm:col-span-2">
              <label htmlFor="ca-vehicle-pick" className={labelClass}>Vehicle you&apos;re interested in</label>
              {vehicles && vehicles.length > 0 ? (
                <>
                  <select
                    id="ca-vehicle-pick"
                    className={inputClass}
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || val === "__other__") {
                        setPickedVehicleId(undefined);
                        setShowOtherVin(val === "__other__");
                        setValue("vin", "");
                      } else {
                        const picked = vehicles.find((v) => v.id === val);
                        setPickedVehicleId(val);
                        setShowOtherVin(false);
                        setValue("vin", picked?.vin ?? "");
                      }
                    }}
                  >
                    <option value="">— Select a vehicle (optional) —</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {[v.year, v.make, v.model, v.trim].filter(Boolean).join(" ")}
                        {v.stock_number ? ` · #${v.stock_number}` : ""}
                      </option>
                    ))}
                    <option value="__other__">Not sure / don&apos;t see my vehicle</option>
                  </select>
                  {showOtherVin && (
                    <input
                      id="ca-vin"
                      placeholder="Year / Make / Model or VIN (optional)"
                      autoComplete="off"
                      className={`${inputClass} mt-2`}
                      {...register("vin")}
                    />
                  )}
                </>
              ) : (
                <input id="ca-vin" placeholder="Year / Make / Model or VIN (optional)" autoComplete="off" className={inputClass}
                  {...register("vin")} />
              )}
            </div>
          )}
          <div>
            <label htmlFor="ca-down" className={labelClass}>Cash down you can put *</label>
            <input id="ca-down" inputMode="numeric" placeholder="$ (type 0 if none)" className={inputClass}
              {...register("requested_down_payment", {
                required: "Enter your down payment — type 0 if you have none",
                pattern: DOLLARS,
              })} />
            {errors.requested_down_payment && <p className={errClass}>{errors.requested_down_payment.message}</p>}
          </div>
          <div>
            <label htmlFor="ca-monthly" className={labelClass}>Target monthly payment</label>
            <input id="ca-monthly" inputMode="numeric" placeholder="$ / month" className={inputClass}
              {...register("desired_monthly_payment")} />
          </div>
        </div>
      </SectionCard>

      {/* 6 — Sign */}
      <SectionCard step={6} title="Review &amp; sign" subtitle="Your electronic signature authorizes us to check your credit.">
        <div className="max-h-40 overflow-y-auto rounded-md border border-border-subtle bg-surface p-4 text-xs leading-relaxed text-text-secondary">
          {CREDIT_APP_AUTHORIZATION_TEXT}
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-accent"
            {...register("consent_credit_pull", { required: "You must authorize the credit check to submit." })} />
          <span className="text-sm text-text-primary">
            I have read and agree to the authorization above, and I consent to a credit inquiry. *
          </span>
        </label>
        {errors.consent_credit_pull && <p className={errClass}>{errors.consent_credit_pull.message}</p>}

        <div className="mt-5 max-w-md">
          <label htmlFor="ca-sign" className={labelClass}>Type your full legal name to sign *</label>
          <input id="ca-sign" autoComplete="name"
            className={`${inputClass} text-lg italic`} placeholder="Your full name"
            {...register("signature_name", { required: "Please type your full name to sign", minLength: { value: 2, message: "Please type your full name" } })} />
          {errors.signature_name && <p className={errClass}>{errors.signature_name.message}</p>}
        </div>
      </SectionCard>

      {/* Honeypot. display:none (not just off-screen) — browsers never autofill
          a field that isn't rendered, but form-stuffing bots still find it. */}
      <div hidden aria-hidden="true">
        <input type="text" tabIndex={-1} autoComplete="off" {...register("_hp")} />
      </div>

      {status === "error" && (
        <p className="rounded-md border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent">
          {errorMessage && errorMessage !== "submit failed"
            ? errorMessage
            : "Something went wrong submitting your application."}{" "}
          Please fix and try again, or call us at (757) 937-8664.
        </p>
      )}

      {Object.keys(errors).length > 0 && (
        <p className="rounded-md border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-accent">
          A few required fields still need to be filled in — they&apos;re marked in red above.
        </p>
      )}

      <button type="submit" disabled={status === "submitting"}
        className="w-full rounded-md bg-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60">
        {status === "submitting" ? "Submitting securely…" : "Submit My Signed Application →"}
      </button>
      <p className="text-center text-xs text-text-muted">
        Submitting does not guarantee approval. Financing is subject to lender credit approval.
      </p>
    </form>
  );
}
