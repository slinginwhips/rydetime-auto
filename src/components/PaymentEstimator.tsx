"use client";

import { useState } from "react";
import { estimateMonthlyPayment, PAYMENT_DEFAULTS } from "@/types/vehicle";
import { PAYMENT_DISCLAIMER } from "@/lib/dealership";

interface PaymentEstimatorProps {
  price: number;
  compact?: boolean;
}

const TERMS = [36, 48, 60, 72, 84] as const;

export default function PaymentEstimator({ price, compact = false }: PaymentEstimatorProps) {
  const [downPayment, setDownPayment] = useState(0);
  const [term, setTerm] = useState<number>(PAYMENT_DEFAULTS.termMonths);
  const [apr, setApr] = useState<number>(PAYMENT_DEFAULTS.apr);

  const monthly = estimateMonthlyPayment(price, downPayment, term, apr);
  const maxDown = Math.max(Math.floor(price * 0.5 / 500) * 500, 500);

  return (
    <div className={`rounded-lg border border-border-subtle bg-background-card ${compact ? "p-4" : "p-5"}`}>
      <h3 className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
        Payment Estimator
      </h3>

      {/* Result */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="tabular text-3xl font-bold text-text-primary">
          ${monthly.toLocaleString()}
        </span>
        <span className="text-sm text-text-secondary">/mo est.</span>
      </div>

      <div className={`mt-4 space-y-4 ${compact ? "text-sm" : ""}`}>
        {/* Vehicle price (fixed) */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Vehicle price</span>
          <span className="tabular font-semibold text-text-primary">${price.toLocaleString()}</span>
        </div>

        {/* Down payment */}
        <div>
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="pe-down" className="text-text-secondary">
              Down payment
            </label>
            <span className="tabular font-semibold text-text-primary">
              ${downPayment.toLocaleString()}
            </span>
          </div>
          <input
            id="pe-down"
            type="range"
            min={0}
            max={maxDown}
            step={250}
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>

        {/* Term */}
        <div>
          <label className="text-sm text-text-secondary">Term (months)</label>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {TERMS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTerm(t)}
                aria-pressed={term === t}
                className={`tabular rounded-md py-1.5 text-sm font-medium transition-colors ${
                  term === t
                    ? "bg-accent text-white"
                    : "border border-border-subtle text-text-secondary hover:border-accent hover:text-text-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* APR */}
        <div>
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="pe-apr" className="text-text-secondary">
              Estimated APR
            </label>
            <span className="tabular font-semibold text-text-primary">{apr.toFixed(1)}%</span>
          </div>
          <input
            id="pe-apr"
            type="range"
            min={2.9}
            max={24.9}
            step={0.5}
            value={apr}
            onChange={(e) => setApr(Number(e.target.value))}
            className="mt-2 w-full"
          />
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-text-muted">{PAYMENT_DISCLAIMER}</p>
    </div>
  );
}
