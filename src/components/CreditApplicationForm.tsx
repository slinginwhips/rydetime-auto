"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
    <section className="rounded-lg border border-border-subtle bg-background-card p-6 sm:p-8">
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

export default function CreditApplicationForm({
  vehicleId,
  vehicleLabel,
  vehicles,
}: CreditApplicationFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [dcPushed, setDcPushed] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pickedVehicleId, setPickedVehicleId] = useState<string | undefined>(undefined);
  const [showOtherVin, setShowOtherVin] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    // Hidden sections (retired applicants, no co-applicant) must not keep
    // validating or submitting stale values after they unmount.
    shouldUnregister: true,
    defaultValues: { housing_status: "rent", employment_status: "employed" },
  });

  const hasCo = watch("has_co_applicant");
  const empStatus = watch("employment_status");

  const onSubmit = async (values: FormValues) => {
    if (values.website) {
      setStatus("success"); // honeypot
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const body: CreditApplicationSubmission = {
        ...values,
        vehicle_id: pickedVehicleId ?? vehicleId,
        vin: values.vin || undefined,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
      };
      const res = await fetch("/api/credit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
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
    const el = document.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  };

  if (status === "success") {
    return (
      <div className="rounded-lg border border-border-subtle bg-background-card p-8 text-center">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-6">
            <label htmlFor="ca-addr" className={labelClass}>Street address *</label>
            <input id="ca-addr" autoComplete="street-address" className={inputClass}
              {...register("address", { required: "Address is required" })} />
            {errors.address && <p className={errClass}>{errors.address.message}</p>}
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="ca-city" className={labelClass}>City *</label>
            <input id="ca-city" autoComplete="address-level2" className={inputClass}
              {...register("city", { required: "City is required" })} />
            {errors.city && <p className={errClass}>{errors.city.message}</p>}
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="ca-state" className={labelClass}>State *</label>
            <input id="ca-state" autoComplete="address-level1" maxLength={2} placeholder="VA"
              className={inputClass} {...register("state", { required: "State" })} />
            {errors.state && <p className={errClass}>{errors.state.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ca-zip" className={labelClass}>ZIP *</label>
            <input id="ca-zip" inputMode="numeric" autoComplete="postal-code" maxLength={10}
              className={inputClass} {...register("zip", { required: "ZIP is required" })} />
            {errors.zip && <p className={errClass}>{errors.zip.message}</p>}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ca-housing" className={labelClass}>Own or rent? *</label>
            <select id="ca-housing" className={inputClass} {...register("housing_status")}>
              <option value="own">Own</option>
              <option value="rent">Rent</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ca-house-pmt" className={labelClass}>Monthly rent/mortgage</label>
            <input id="ca-house-pmt" inputMode="numeric" placeholder="$" className={inputClass}
              {...register("monthly_housing_payment")} />
          </div>
          <div className="sm:col-span-2">
            <span className={labelClass}>Time at this address *</span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input id="ca-yrs-addr" inputMode="numeric" maxLength={2} autoComplete="off"
                  placeholder="Years" aria-label="Years at this address" className={inputClass}
                  {...register("years_at_address", {
                    required: "How long you've lived here is required",
                    ...digitRule("Years must be a number"),
                  })} />
              </div>
              <div>
                <input id="ca-mos-addr" inputMode="numeric" maxLength={2} autoComplete="off"
                  placeholder="Months" aria-label="Additional months at this address" className={inputClass}
                  {...register("months_at_address", digitRule("Months must be a number"))} />
              </div>
            </div>
            {(errors.years_at_address || errors.months_at_address) && (
              <p className={errClass}>
                {errors.years_at_address?.message ?? errors.months_at_address?.message}
              </p>
            )}
          </div>
          <div className="sm:col-span-6">
            <label htmlFor="ca-prev-addr" className={labelClass}>
              Previous address <span className="font-normal text-text-muted">(if less than 2 years above)</span>
            </label>
            <input id="ca-prev-addr" className={inputClass} {...register("prev_address")} />
          </div>
        </div>
      </SectionCard>

      {/* 3 — Employment & income */}
      <SectionCard step={3} title="Work &amp; income" subtitle="How you earn — steady income is what lenders look for most.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="ca-emp-status" className={labelClass}>Employment status *</label>
            <select id="ca-emp-status" className={inputClass} {...register("employment_status")}>
              <option value="employed">Employed</option>
              <option value="self_employed">Self-employed</option>
              <option value="retired">Retired</option>
              <option value="military">Military</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="ca-income" className={labelClass}>Gross monthly income *</label>
            <input id="ca-income" inputMode="numeric" placeholder="$ before taxes" className={inputClass}
              {...register("gross_monthly_income", { required: "Monthly income is required" })} />
            {errors.gross_monthly_income && <p className={errClass}>{errors.gross_monthly_income.message}</p>}
          </div>
          {empStatus !== "retired" && (
            <>
              <div className="sm:col-span-3">
                <label htmlFor="ca-employer" className={labelClass}>Employer *</label>
                <input id="ca-employer" autoComplete="organization" className={inputClass}
                  {...register("employer_name", { required: "Employer is required" })} />
                {errors.employer_name && <p className={errClass}>{errors.employer_name.message}</p>}
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="ca-title" className={labelClass}>Job title *</label>
                <input id="ca-title" autoComplete="organization-title" className={inputClass}
                  {...register("job_title", { required: "Job title is required" })} />
                {errors.job_title && <p className={errClass}>{errors.job_title.message}</p>}
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="ca-work-phone" className={labelClass}>Work phone</label>
                <input id="ca-work-phone" type="tel" className={inputClass} {...register("work_phone")} />
              </div>
              <div className="sm:col-span-3">
                <span className={labelClass}>Time on this job *</span>
                <div className="grid grid-cols-2 gap-4">
                  <input id="ca-yrs-emp" inputMode="numeric" maxLength={2} autoComplete="off"
                    placeholder="Years" aria-label="Years on this job" className={inputClass}
                    {...register("years_employed", {
                      required: "How long you've been on the job is required",
                      ...digitRule("Years must be a number"),
                    })} />
                  <input id="ca-mos-emp" inputMode="numeric" maxLength={2} autoComplete="off"
                    placeholder="Months" aria-label="Additional months on this job" className={inputClass}
                    {...register("months_employed", digitRule("Months must be a number"))} />
                </div>
                {(errors.years_employed || errors.months_employed) && (
                  <p className={errClass}>
                    {errors.years_employed?.message ?? errors.months_employed?.message}
                  </p>
                )}
              </div>
            </>
          )}
          <div className="sm:col-span-3">
            <label htmlFor="ca-other-income" className={labelClass}>Other monthly income</label>
            <input id="ca-other-income" inputMode="numeric" placeholder="$ (optional)" className={inputClass}
              {...register("other_income")} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="ca-other-src" className={labelClass}>Source of other income</label>
            <input id="ca-other-src" className={inputClass} {...register("other_income_source")} />
          </div>
        </div>
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
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <label htmlFor="ca-co-phone" className={labelClass}>Co-applicant phone *</label>
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
              <label htmlFor="ca-co-income" className={labelClass}>Co-applicant monthly income *</label>
              <input id="ca-co-income" inputMode="numeric" placeholder="$" className={inputClass}
                {...register("co_gross_monthly_income", { required: "Co-applicant income is required" })} />
              {errors.co_gross_monthly_income && (
                <p className={errClass}>{errors.co_gross_monthly_income.message}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ca-co-employer" className={labelClass}>Co-applicant employer</label>
              <input id="ca-co-employer" className={inputClass} {...register("co_employer_name")} />
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
            <label htmlFor="ca-down" className={labelClass}>Cash down you can put</label>
            <input id="ca-down" inputMode="numeric" placeholder="$" className={inputClass}
              {...register("requested_down_payment")} />
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

      {/* Honeypot */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0" {...register("website")} />

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
