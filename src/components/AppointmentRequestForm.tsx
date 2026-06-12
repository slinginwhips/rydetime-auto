"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { AppointmentSubmission } from "@/types/lead";
import { DEALERSHIP } from "@/lib/dealership";

interface AppointmentRequestFormProps {
  vehicleId?: string;
  vehicleLabel?: string;
  onClose?: () => void;
}

interface AppointmentValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_date: string;
  preferred_time: string;
  notes: string;
}

const TIME_SLOTS = [
  "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM",
  "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
];

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none";

export default function AppointmentRequestForm({
  vehicleId,
  vehicleLabel,
  onClose,
}: AppointmentRequestFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentValues>();

  const today = new Date().toISOString().split("T")[0];

  const onSubmit = async (values: AppointmentValues) => {
    setStatus("submitting");
    try {
      const body: AppointmentSubmission = {
        first_name: values.first_name,
        last_name: values.last_name || undefined,
        email: values.email || undefined,
        phone: values.phone,
        vehicle_id: vehicleId,
        preferred_date: values.preferred_date,
        preferred_time: values.preferred_time,
        notes: values.notes || undefined,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
      };
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Appointment request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="p-2 text-center">
        <svg className="mx-auto text-accent" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 11 15 16 9" />
        </svg>
        <h3 className="mt-3 text-lg font-semibold text-text-primary">Request received</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          We&apos;ll confirm your test drive by phone or text shortly. This is a request, not a
          confirmed appointment, until you hear from us. Questions? Call{" "}
          <a href={DEALERSHIP.phoneHref} className="font-medium text-text-primary">
            {DEALERSHIP.phone}
          </a>
          .
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-md border border-border-subtle px-5 py-2.5 text-sm font-medium text-text-primary hover:border-accent"
          >
            Done
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <h3 className="text-lg font-semibold text-text-primary">Schedule a Test Drive</h3>
      {vehicleLabel && (
        <p className="mt-1 text-sm text-text-secondary">{vehicleLabel}</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ap-first" className="mb-1.5 block text-sm font-medium text-text-secondary">
            First name *
          </label>
          <input
            id="ap-first"
            type="text"
            autoComplete="given-name"
            className={inputClass}
            {...register("first_name", { required: "First name is required" })}
          />
          {errors.first_name && <p className="mt-1 text-xs text-accent">{errors.first_name.message}</p>}
        </div>
        <div>
          <label htmlFor="ap-last" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Last name
          </label>
          <input id="ap-last" type="text" autoComplete="family-name" className={inputClass} {...register("last_name")} />
        </div>
        <div>
          <label htmlFor="ap-phone" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Phone *
          </label>
          <input
            id="ap-phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            {...register("phone", { required: "Phone number is required" })}
          />
          {errors.phone && <p className="mt-1 text-xs text-accent">{errors.phone.message}</p>}
        </div>
        <div>
          <label htmlFor="ap-email" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Email
          </label>
          <input
            id="ap-email"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register("email", {
              pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
            })}
          />
          {errors.email && <p className="mt-1 text-xs text-accent">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="ap-date" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Preferred date *
          </label>
          <input
            id="ap-date"
            type="date"
            min={today}
            className={`${inputClass} [color-scheme:dark]`}
            {...register("preferred_date", { required: "Pick a date" })}
          />
          {errors.preferred_date && <p className="mt-1 text-xs text-accent">{errors.preferred_date.message}</p>}
        </div>
        <div>
          <label htmlFor="ap-time" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Preferred time *
          </label>
          <select
            id="ap-time"
            className={inputClass}
            defaultValue=""
            {...register("preferred_time", { required: "Pick a time" })}
          >
            <option value="" disabled>
              Select a time
            </option>
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {errors.preferred_time && <p className="mt-1 text-xs text-accent">{errors.preferred_time.message}</p>}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="ap-notes" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Notes
        </label>
        <textarea
          id="ap-notes"
          rows={3}
          className={inputClass}
          placeholder="Anything we should know before you come in?"
          {...register("notes")}
        />
      </div>

      {status === "error" && (
        <p className="mt-3 text-sm text-accent">
          Something went wrong. Please try again or call us at {DEALERSHIP.phone}.
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex-1 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "Sending…" : "Request Test Drive"}
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-subtle px-5 py-3 text-sm font-medium text-text-secondary hover:border-accent hover:text-text-primary"
          >
            Cancel
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-text-muted">
        Hours: {DEALERSHIP.hoursShort}. We&apos;ll confirm availability before your visit.
      </p>
    </form>
  );
}
