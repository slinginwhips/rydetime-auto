"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { TradeSubmission, TradeCondition, TitleStatus } from "@/types/lead";
import { DEALERSHIP } from "@/lib/dealership";

interface TradeInFormProps {
  intent: "trade" | "sell";
  vehicleOfInterestId?: string;
}

interface TradeValues {
  vin: string;
  year: string;
  make: string;
  model: string;
  mileage: string;
  payoff_amount: string;
  lender: string;
  condition: TradeCondition | "";
  warning_lights: "yes" | "no" | "";
  accident_history: "yes" | "no" | "";
  title_status: TitleStatus | "";
  preferred_date: string;
  preferred_time: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none";

const TIME_SLOTS = [
  "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM",
  "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
];

export default function TradeInForm({ intent, vehicleOfInterestId }: TradeInFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [vinStatus, setVinStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [photos, setPhotos] = useState<{ url: string; name: string }[]>([]);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<TradeValues>();

  const today = new Date().toISOString().split("T")[0];

  const decodeVin = async () => {
    const vin = getValues("vin").trim();
    if (vin.length < 11) {
      setVinStatus("error");
      return;
    }
    setVinStatus("loading");
    try {
      const res = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`
      );
      const data = await res.json();
      const r = data?.Results?.[0];
      if (r?.ModelYear) setValue("year", r.ModelYear);
      if (r?.Make) setValue("make", titleCase(r.Make));
      if (r?.Model) setValue("model", r.Model);
      setVinStatus(r?.ModelYear || r?.Make ? "done" : "error");
    } catch {
      setVinStatus("error");
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= 6) break;
      next.push({ url: URL.createObjectURL(file), name: file.name });
    }
    setPhotos(next);
  };

  const removePhoto = (url: string) => {
    URL.revokeObjectURL(url);
    setPhotos(photos.filter((p) => p.url !== url));
  };

  const onSubmit = async (values: TradeValues) => {
    setStatus("submitting");
    try {
      const body: TradeSubmission = {
        first_name: values.first_name,
        last_name: values.last_name || undefined,
        email: values.email || undefined,
        phone: values.phone,
        vin: values.vin || undefined,
        year: values.year ? Number(values.year) : undefined,
        make: values.make || undefined,
        model: values.model || undefined,
        mileage: values.mileage ? Number(values.mileage) : undefined,
        condition: values.condition || undefined,
        payoff_amount: values.payoff_amount || undefined,
        lender: values.lender || undefined,
        warning_lights: values.warning_lights ? values.warning_lights === "yes" : undefined,
        accident_history: values.accident_history ? values.accident_history === "yes" : undefined,
        title_status: values.title_status || undefined,
        // Photo uploads are stored locally for now — direct upload support comes later.
        photos_urls: [],
        notes: values.notes || undefined,
        vehicle_of_interest_id: vehicleOfInterestId,
        preferred_date: values.preferred_date || undefined,
        preferred_time: values.preferred_time || undefined,
        intent,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
      };
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Trade submission failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-lg border border-border-subtle bg-background-card p-8 text-center">
        <svg className="mx-auto text-accent" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 11 15 16 9" />
        </svg>
        <h3 className="mt-3 text-xl font-semibold text-text-primary">
          {intent === "sell" ? "We got your vehicle details" : "Trade-in request received"}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
          We&apos;ll review your vehicle information and follow up with an estimated trade value
          range. A final number always requires an in-person inspection — no surprises, just an
          honest look at your vehicle. Call us anytime at{" "}
          <a href={DEALERSHIP.phoneHref} className="font-medium text-text-primary">
            {DEALERSHIP.phone}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
      {/* Vehicle info */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
          Your Vehicle
        </legend>

        <div className="mt-4">
          <label htmlFor="tf-vin" className="mb-1.5 block text-sm font-medium text-text-secondary">
            VIN (optional, speeds things up)
          </label>
          <div className="flex gap-2">
            <input
              id="tf-vin"
              type="text"
              maxLength={17}
              placeholder="17-character VIN"
              className={`${inputClass} uppercase`}
              {...register("vin")}
            />
            <button
              type="button"
              onClick={decodeVin}
              disabled={vinStatus === "loading"}
              className="flex-shrink-0 rounded-md border border-border-subtle px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-accent disabled:opacity-60"
            >
              {vinStatus === "loading" ? "Decoding…" : "Decode VIN"}
            </button>
          </div>
          {vinStatus === "done" && (
            <p className="mt-1 text-xs text-text-secondary">Vehicle details filled in below — double-check them.</p>
          )}
          {vinStatus === "error" && (
            <p className="mt-1 text-xs text-accent">Couldn&apos;t decode that VIN. You can fill in the details manually.</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="tf-year" className="mb-1.5 block text-sm font-medium text-text-secondary">Year *</label>
            <input id="tf-year" type="number" min={1980} max={2027} className={inputClass}
              {...register("year", { required: "Required" })} />
            {errors.year && <p className="mt-1 text-xs text-accent">{errors.year.message}</p>}
          </div>
          <div>
            <label htmlFor="tf-make" className="mb-1.5 block text-sm font-medium text-text-secondary">Make *</label>
            <input id="tf-make" type="text" className={inputClass} {...register("make", { required: "Required" })} />
            {errors.make && <p className="mt-1 text-xs text-accent">{errors.make.message}</p>}
          </div>
          <div>
            <label htmlFor="tf-model" className="mb-1.5 block text-sm font-medium text-text-secondary">Model *</label>
            <input id="tf-model" type="text" className={inputClass} {...register("model", { required: "Required" })} />
            {errors.model && <p className="mt-1 text-xs text-accent">{errors.model.message}</p>}
          </div>
          <div>
            <label htmlFor="tf-mileage" className="mb-1.5 block text-sm font-medium text-text-secondary">Mileage *</label>
            <input id="tf-mileage" type="number" min={0} className={inputClass} {...register("mileage", { required: "Required" })} />
            {errors.mileage && <p className="mt-1 text-xs text-accent">{errors.mileage.message}</p>}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tf-payoff" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Estimated payoff amount (if financed)
            </label>
            <input id="tf-payoff" type="text" placeholder="e.g. $8,500" className={inputClass} {...register("payoff_amount")} />
          </div>
          <div>
            <label htmlFor="tf-lender" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Lender (optional)
            </label>
            <input id="tf-lender" type="text" className={inputClass} {...register("lender")} />
          </div>
        </div>
      </fieldset>

      {/* Condition */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
          Condition — Be Honest, It Helps Us Help You
        </legend>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tf-condition" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Overall condition *
            </label>
            <select id="tf-condition" className={inputClass} defaultValue=""
              {...register("condition", { required: "Required" })}>
              <option value="" disabled>Select condition</option>
              <option value="Excellent">Excellent — looks and runs great</option>
              <option value="Good">Good — normal wear, no major issues</option>
              <option value="Fair">Fair — some issues or cosmetic wear</option>
              <option value="Poor">Poor — needs work</option>
            </select>
            {errors.condition && <p className="mt-1 text-xs text-accent">{errors.condition.message}</p>}
          </div>
          <div>
            <label htmlFor="tf-title" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Title status *
            </label>
            <select id="tf-title" className={inputClass} defaultValue=""
              {...register("title_status", { required: "Required" })}>
              <option value="" disabled>Select title status</option>
              <option value="Clean">Clean</option>
              <option value="Salvage">Salvage</option>
              <option value="Rebuilt">Rebuilt</option>
              <option value="Unknown">Not sure</option>
            </select>
            {errors.title_status && <p className="mt-1 text-xs text-accent">{errors.title_status.message}</p>}
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Any warning lights on? *
            </span>
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((v) => (
                <label key={v} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border-subtle px-4 py-2.5 text-sm text-text-primary has-[:checked]:border-accent has-[:checked]:bg-surface">
                  <input type="radio" value={v} className="accent-[#CC0000]"
                    {...register("warning_lights", { required: "Required" })} />
                  {v === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
            {errors.warning_lights && <p className="mt-1 text-xs text-accent">{errors.warning_lights.message}</p>}
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Any known accident history? *
            </span>
            <div className="flex gap-3">
              {(["yes", "no"] as const).map((v) => (
                <label key={v} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-border-subtle px-4 py-2.5 text-sm text-text-primary has-[:checked]:border-accent has-[:checked]:bg-surface">
                  <input type="radio" value={v} className="accent-[#CC0000]"
                    {...register("accident_history", { required: "Required" })} />
                  {v === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
            {errors.accident_history && <p className="mt-1 text-xs text-accent">{errors.accident_history.message}</p>}
          </div>
        </div>
      </fieldset>

      {/* Photos */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
          Photos (Optional, Up to 6)
        </legend>
        <p className="mt-2 text-sm text-text-secondary">
          Exterior, interior, dash, and any damage. Photos help us give you a more accurate
          estimate before you come in.
        </p>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border-subtle px-4 py-6 text-sm text-text-secondary transition-colors hover:border-accent hover:text-text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {photos.length >= 6 ? "Maximum 6 photos added" : "Add photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={photos.length >= 6}
            className="hidden"
            onChange={(e) => addPhotos(e.target.files)}
          />
        </label>
        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.map((p) => (
              <div key={p.url} className="relative aspect-square overflow-hidden rounded border border-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(p.url)}
                  aria-label={`Remove ${p.name}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-text-primary hover:bg-accent"
                >
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="4" x2="16" y2="16" />
                    <line x1="16" y1="4" x2="4" y2="16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-text-muted">
          Photos are previewed here now — you can also bring your vehicle in or text photos to us directly.
        </p>
      </fieldset>

      {/* Appointment + contact */}
      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
          Contact & Appointment
        </legend>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tf-first" className="mb-1.5 block text-sm font-medium text-text-secondary">First name *</label>
            <input id="tf-first" type="text" autoComplete="given-name" className={inputClass}
              {...register("first_name", { required: "Required" })} />
            {errors.first_name && <p className="mt-1 text-xs text-accent">{errors.first_name.message}</p>}
          </div>
          <div>
            <label htmlFor="tf-last" className="mb-1.5 block text-sm font-medium text-text-secondary">Last name</label>
            <input id="tf-last" type="text" autoComplete="family-name" className={inputClass} {...register("last_name")} />
          </div>
          <div>
            <label htmlFor="tf-phone" className="mb-1.5 block text-sm font-medium text-text-secondary">Phone *</label>
            <input id="tf-phone" type="tel" autoComplete="tel" className={inputClass}
              {...register("phone", { required: "Required" })} />
            {errors.phone && <p className="mt-1 text-xs text-accent">{errors.phone.message}</p>}
          </div>
          <div>
            <label htmlFor="tf-email" className="mb-1.5 block text-sm font-medium text-text-secondary">Email</label>
            <input id="tf-email" type="email" autoComplete="email" className={inputClass}
              {...register("email", { pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email" } })} />
            {errors.email && <p className="mt-1 text-xs text-accent">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="tf-date" className="mb-1.5 block text-sm font-medium text-text-secondary">Preferred date</label>
            <input id="tf-date" type="date" min={today} className={`${inputClass} [color-scheme:dark]`} {...register("preferred_date")} />
          </div>
          <div>
            <label htmlFor="tf-time" className="mb-1.5 block text-sm font-medium text-text-secondary">Preferred time</label>
            <select id="tf-time" className={inputClass} defaultValue="" {...register("preferred_time")}>
              <option value="">Any time</option>
              {TIME_SLOTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="tf-notes" className="mb-1.5 block text-sm font-medium text-text-secondary">Anything else we should know?</label>
          <textarea id="tf-notes" rows={3} className={inputClass} {...register("notes")} />
        </div>
      </fieldset>

      {status === "error" && (
        <p className="text-sm text-accent">
          Something went wrong. Please try again or call us at {DEALERSHIP.phone}.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-md bg-accent px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {status === "submitting"
          ? "Submitting…"
          : intent === "sell"
            ? "Get My Estimated Offer"
            : "Get My Estimated Trade Value"}
      </button>
      <p className="text-xs leading-relaxed text-text-muted">
        We provide an estimated trade value based on the information you share. A final value
        always requires an in-person inspection of your vehicle — we never promise an exact
        number sight unseen.
      </p>
    </form>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
