"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { LeadType, LeadSubmission } from "@/types/lead";

interface LeadFormProps {
  leadType: LeadType;
  vehicleId?: string;
  vehicleLabel?: string;
  ctaLabel?: string;
  onSuccess?: () => void;
}

interface LeadFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message: string;
  website: string; // honeypot
}

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none";

export default function LeadForm({
  leadType,
  vehicleId,
  vehicleLabel,
  ctaLabel = "Send Message",
  onSuccess,
}: LeadFormProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormValues>();

  const onSubmit = async (values: LeadFormValues) => {
    // Honeypot — silently succeed for bots
    if (values.website) {
      setStatus("success");
      return;
    }
    setStatus("submitting");
    try {
      const body: LeadSubmission = {
        first_name: values.first_name,
        last_name: values.last_name || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        message: values.message || undefined,
        vehicle_id: vehicleId,
        lead_type: leadType,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
      };
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Lead submission failed");
      setStatus("success");
      onSuccess?.();
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-lg border border-border-subtle bg-background-card p-6 text-center">
        <svg className="mx-auto text-accent" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="8 12 11 15 16 9" />
        </svg>
        <h3 className="mt-3 text-lg font-semibold text-text-primary">Got it — thanks!</h3>
        <p className="mt-2 text-sm text-text-secondary">
          We received your message and will get back to you shortly, usually within business
          hours. Need an answer faster? Call us at (757) 937-8664.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {vehicleLabel && (
        <p className="mb-4 rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-text-secondary">
          Regarding: <span className="font-medium text-text-primary">{vehicleLabel}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lf-first" className="mb-1.5 block text-sm font-medium text-text-secondary">
            First name *
          </label>
          <input
            id="lf-first"
            type="text"
            autoComplete="given-name"
            className={inputClass}
            {...register("first_name", { required: "First name is required" })}
          />
          {errors.first_name && (
            <p className="mt-1 text-xs text-accent">{errors.first_name.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="lf-last" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Last name
          </label>
          <input id="lf-last" type="text" autoComplete="family-name" className={inputClass} {...register("last_name")} />
        </div>
        <div>
          <label htmlFor="lf-email" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Email
          </label>
          <input
            id="lf-email"
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
          <label htmlFor="lf-phone" className="mb-1.5 block text-sm font-medium text-text-secondary">
            Phone *
          </label>
          <input
            id="lf-phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            {...register("phone", { required: "Phone number is required" })}
          />
          {errors.phone && <p className="mt-1 text-xs text-accent">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="lf-message" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Message
        </label>
        <textarea
          id="lf-message"
          rows={4}
          className={inputClass}
          placeholder="How can we help?"
          {...register("message")}
        />
      </div>

      {/* Honeypot — hidden from real users */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        {...register("website")}
      />

      {status === "error" && (
        <p className="mt-3 text-sm text-accent">
          Something went wrong sending your message. Please try again or call us at (757) 937-8664.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : ctaLabel}
      </button>
    </form>
  );
}
