"use client";

import { useState, useEffect, useRef } from "react";
import {
  HOLD_POLICY_TEXT,
  HOLD_DEPOSIT_AMOUNT,
  HOLD_PERIOD_DAYS,
  type HoldDepositSubmission,
} from "@/types/lead";
import { DEALERSHIP } from "@/lib/dealership";

interface HoldVehicleFlowProps {
  vehicle: { id: string; label: string; price: number };
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none";

export default function HoldVehicleFlow({ vehicle, open, onClose }: HoldVehicleFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [policyScrolled, setPolicyScrolled] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const policyRef = useRef<HTMLDivElement>(null);

  // Reset when reopened
  useEffect(() => {
    if (open) {
      setStep(1);
      setPolicyScrolled(false);
      setAcknowledged(false);
      setSignature("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // If the policy fits without scrolling, mark it read
  useEffect(() => {
    if (step === 2 && policyRef.current) {
      const el = policyRef.current;
      if (el.scrollHeight <= el.clientHeight + 4) setPolicyScrolled(true);
    }
  }, [step, open]);

  if (!open) return null;

  const contactValid =
    firstName.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    phone.trim().length >= 7;

  const onPolicyScroll = () => {
    const el = policyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setPolicyScrolled(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const body: HoldDepositSubmission = {
        first_name: firstName,
        last_name: lastName || undefined,
        email,
        phone,
        vehicle_id: vehicle.id,
        acknowledged_policy: true,
        signature_name: signature,
        source_url: typeof window !== "undefined" ? window.location.href : undefined,
      };
      const res = await fetch("/api/hold-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error("Hold request failed");
      setStep(5);
    } catch {
      setError(`Something went wrong placing the hold. Please try again or call ${DEALERSHIP.phone}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Hold ${vehicle.label}`}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-border-subtle bg-background-card p-5 sm:max-w-lg sm:rounded-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Hold This Vehicle</h2>
            <p className="mt-0.5 text-sm text-text-secondary">{vehicle.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-border-subtle text-text-secondary hover:border-accent hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${s <= step ? "bg-accent" : "bg-border-subtle"}`}
            />
          ))}
        </div>

        {/* Step 1 — contact */}
        {step === 1 && (
          <div className="mt-5">
            <p className="text-sm text-text-secondary">
              A ${HOLD_DEPOSIT_AMOUNT} deposit holds this vehicle for {HOLD_PERIOD_DAYS} days while
              you finish financing or arrange your visit. We&apos;ll confirm the hold with you
              before it starts. Start with your contact info.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="text" placeholder="First name *" aria-label="First name" autoComplete="given-name" className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <input type="text" placeholder="Last name" aria-label="Last name" autoComplete="family-name" className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <input type="email" placeholder="Email *" aria-label="Email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              <input type="tel" placeholder="Phone *" aria-label="Phone" autoComplete="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <button
              type="button"
              disabled={!contactValid}
              onClick={() => setStep(2)}
              className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2 — policy */}
        {step === 2 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold uppercase tracking-widest2 text-text-muted">
              Hold Deposit Policy — Please Read
            </h3>
            <div
              ref={policyRef}
              onScroll={onPolicyScroll}
              className="mt-3 max-h-56 space-y-3 overflow-y-auto whitespace-pre-line rounded-md border border-border-subtle bg-surface p-4 text-sm leading-relaxed text-text-secondary"
              tabIndex={0}
            >
              {HOLD_POLICY_TEXT}
            </div>
            {!policyScrolled && (
              <p className="mt-2 text-xs text-text-muted">Scroll to the end of the policy to continue.</p>
            )}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-md border border-border-subtle px-5 py-3 text-sm font-medium text-text-secondary hover:border-accent hover:text-text-primary">
                Back
              </button>
              <button
                type="button"
                disabled={!policyScrolled}
                onClick={() => setStep(3)}
                className="flex-1 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                I&apos;ve Read the Policy
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — acknowledgment + signature */}
        {step === 3 && (
          <div className="mt-5">
            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border-subtle bg-surface p-4">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#CC0000]"
              />
              <span className="text-sm leading-relaxed text-text-secondary">
                I have read and agree to the hold deposit policy. I understand that this is a
                request, that no hold exists until RydeTime Auto confirms it with me, that the $
                {HOLD_DEPOSIT_AMOUNT} deposit holds the vehicle for {HOLD_PERIOD_DAYS} days and
                each additional {HOLD_PERIOD_DAYS} days costs another ${HOLD_DEPOSIT_AMOUNT}{" "}
                unless we agree otherwise in writing, and that the deposit is non-refundable if I
                choose not to move forward with the purchase.
              </span>
            </label>
            <div className="mt-4">
              <label htmlFor="hold-sig" className="mb-1.5 block text-sm font-medium text-text-secondary">
                Type your full name as your signature *
              </label>
              <input
                id="hold-sig"
                type="text"
                placeholder="Full legal name"
                className={`${inputClass} italic`}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="rounded-md border border-border-subtle px-5 py-3 text-sm font-medium text-text-secondary hover:border-accent hover:text-text-primary">
                Back
              </button>
              <button
                type="button"
                disabled={!acknowledged || signature.trim().length < 3}
                onClick={() => setStep(4)}
                className="flex-1 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — mock payment */}
        {step === 4 && (
          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-widest2 text-text-muted">
                Deposit Payment
              </h3>
              <span className="tabular text-lg font-bold text-text-primary">
                ${HOLD_DEPOSIT_AMOUNT}
              </span>
            </div>
            <div className="mt-3 rounded-md border border-border-subtle bg-surface p-4">
              <p className="mb-3 rounded bg-background px-3 py-2 text-xs font-medium text-text-secondary">
                Demo mode — no charge will be made. Card processing goes live when payments are
                enabled.
              </p>
              <div className="space-y-3 opacity-60">
                <input type="text" disabled placeholder="Card number" aria-label="Card number (disabled in demo mode)" className={inputClass} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" disabled placeholder="MM / YY" aria-label="Expiration (disabled in demo mode)" className={inputClass} />
                  <input type="text" disabled placeholder="CVC" aria-label="CVC (disabled in demo mode)" className={inputClass} />
                </div>
                <input type="text" disabled placeholder="ZIP code" aria-label="ZIP code (disabled in demo mode)" className={inputClass} />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-accent">{error}</p>}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setStep(3)} className="rounded-md border border-border-subtle px-5 py-3 text-sm font-medium text-text-secondary hover:border-accent hover:text-text-primary">
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={submit}
                className="flex-1 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Sending Request…" : `Request Hold — $${HOLD_DEPOSIT_AMOUNT}`}
              </button>
            </div>
          </div>
        )}

        {/* Step 5 — confirmation */}
        {step === 5 && (
          <div className="mt-6 text-center">
            <svg className="mx-auto text-accent" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="8 12 11 15 16 9" />
            </svg>
            <h3 className="mt-3 text-xl font-semibold text-text-primary">Hold request submitted</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
              Your request on the {vehicle.label} is pending dealership confirmation — the{" "}
              {HOLD_PERIOD_DAYS}-day hold starts once we confirm it with you, and the vehicle
              stays available until then. We&apos;ll reach out shortly. Questions? Call{" "}
              <a href={DEALERSHIP.phoneHref} className="font-medium text-text-primary">
                {DEALERSHIP.phone}
              </a>
              .
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
