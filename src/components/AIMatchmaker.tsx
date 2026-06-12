"use client";

import { useState } from "react";
import Link from "next/link";

interface Answers {
  budget_type: string;
  amount: string;
  down_payment: string;
  vehicle_type: string;
  main_use: string;
  credit_situation: string;
  timeline: string;
}

interface Match {
  vehicle_id: string;
  slug: string;
  reason: string;
  consider: string;
}

interface InventoryItem {
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: number;
  mileage: number;
  slug: string;
  status: string;
}

type StepKey = keyof Answers;

const STEPS: { key: StepKey; question: string; options: string[]; input?: boolean }[] = [
  {
    key: "budget_type",
    question: "What's your budget?",
    options: ["Monthly payment", "Total price", "Not sure yet"],
  },
  {
    key: "amount",
    question: "Roughly how much?",
    options: [],
    input: true,
  },
  {
    key: "down_payment",
    question: "Down payment available?",
    options: ["None right now", "Under $1,000", "$1,000 – $3,000", "$3,000+", "I have a trade"],
  },
  {
    key: "vehicle_type",
    question: "What type of vehicle?",
    options: ["Sedan", "SUV", "Truck", "Van", "Open to anything"],
  },
  {
    key: "main_use",
    question: "What's the main use?",
    options: ["Daily commute", "Family hauler", "First car", "Work truck", "Just want reliable"],
  },
  {
    key: "credit_situation",
    question: "How's your credit?",
    options: ["Excellent", "Good", "Fair", "Rebuilding", "Not sure"],
  },
  {
    key: "timeline",
    question: "When do you want to buy?",
    options: ["Ready today", "This week", "This month", "Just browsing"],
  },
];

const EMPTY_ANSWERS: Answers = {
  budget_type: "",
  amount: "",
  down_payment: "",
  vehicle_type: "",
  main_use: "",
  credit_situation: "",
  timeline: "",
};

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none";

export default function AIMatchmaker() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [amountInput, setAmountInput] = useState("");
  const [phase, setPhase] = useState<"questions" | "contact" | "loading" | "results" | "error">("questions");
  const [contact, setContact] = useState({ first_name: "", phone: "", email: "" });
  const [matches, setMatches] = useState<(Match & { vehicle?: InventoryItem })[]>([]);

  const step = STEPS[stepIndex];

  const answer = (key: StepKey, value: string) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setPhase("contact");
    }
  };

  const back = () => {
    if (phase === "contact") {
      setPhase("questions");
      return;
    }
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const getMatches = async (withContact: boolean) => {
    setPhase("loading");
    try {
      const body: Record<string, unknown> = { ...answers };
      if (withContact && (contact.first_name || contact.phone || contact.email)) {
        body.contact = contact;
      }
      const [matchRes, invRes] = await Promise.all([
        fetch("/api/ai/matchmaker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        fetch("/ai/inventory"),
      ]);
      const matchData = await matchRes.json();
      if (!matchRes.ok || !Array.isArray(matchData.matches)) throw new Error("Matchmaker failed");

      let inventory: InventoryItem[] = [];
      try {
        const invData = await invRes.json();
        inventory = Array.isArray(invData.vehicles) ? invData.vehicles : [];
      } catch {
        inventory = [];
      }

      const joined = (matchData.matches as Match[]).slice(0, 3).map((m) => ({
        ...m,
        vehicle: inventory.find((v) => v.slug === m.slug),
      }));
      setMatches(joined);
      setPhase("results");
    } catch {
      setPhase("error");
    }
  };

  const restart = () => {
    setAnswers(EMPTY_ANSWERS);
    setAmountInput("");
    setStepIndex(0);
    setMatches([]);
    setPhase("questions");
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border-subtle bg-background-card p-6 sm:p-8">
      {/* Questions */}
      {phase === "questions" && (
        <div>
          {/* Progress */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest2 text-text-muted">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={back}
                className="text-xs font-medium text-text-secondary hover:text-text-primary"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-accent" : "bg-border-subtle"}`}
              />
            ))}
          </div>

          <h3 className="mt-6 text-xl font-semibold text-text-primary sm:text-2xl">
            {step.question}
          </h3>

          {step.input ? (
            <form
              className="mt-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (amountInput.trim()) answer("amount", amountInput.trim());
              }}
            >
              <label htmlFor="mm-amount" className="mb-1.5 block text-sm text-text-secondary">
                {answers.budget_type === "Monthly payment"
                  ? "Target monthly payment"
                  : answers.budget_type === "Total price"
                    ? "Target total price"
                    : "Whatever number you have in mind — monthly or total"}
              </label>
              <div className="flex gap-2">
                <input
                  id="mm-amount"
                  type="text"
                  inputMode="numeric"
                  placeholder={answers.budget_type === "Monthly payment" ? "e.g. $350/mo" : "e.g. $15,000"}
                  className={inputClass}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!amountInput.trim()}
                  className="flex-shrink-0 rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {step.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => answer(step.key, opt)}
                  className={`rounded-md border px-4 py-3.5 text-left text-sm font-medium transition-colors ${
                    answers[step.key] === opt
                      ? "border-accent bg-surface text-text-primary"
                      : "border-border-subtle text-text-primary hover:border-accent hover:bg-surface"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optional contact capture */}
      {phase === "contact" && (
        <div>
          <button
            type="button"
            onClick={back}
            className="text-xs font-medium text-text-secondary hover:text-text-primary"
          >
            ← Back
          </button>
          <h3 className="mt-4 text-xl font-semibold text-text-primary sm:text-2xl">
            Want us to follow up on your matches?
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Totally optional. Leave your info and we&apos;ll reach out about the vehicles that fit
            — or skip straight to your results.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="text" placeholder="First name" aria-label="First name" className={inputClass}
              value={contact.first_name}
              onChange={(e) => setContact({ ...contact, first_name: e.target.value })} />
            <input type="tel" placeholder="Phone" aria-label="Phone" className={inputClass}
              value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <input type="email" placeholder="Email" aria-label="Email" className={inputClass}
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => getMatches(true)}
              className="flex-1 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Show My Matches
            </button>
            <button
              type="button"
              onClick={() => getMatches(false)}
              className="rounded-md border border-border-subtle px-5 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
            >
              Skip — just show matches
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {phase === "loading" && (
        <div className="py-10 text-center">
          <svg className="mx-auto animate-spin text-accent" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" opacity="0.25" />
            <path d="M12 2.5 A 9.5 9.5 0 0 1 21.5 12" />
          </svg>
          <p className="mt-4 text-sm text-text-secondary">
            Matching your answers against our current inventory…
          </p>
        </div>
      )}

      {/* Results */}
      {phase === "results" && (
        <div>
          <h3 className="text-xl font-semibold text-text-primary sm:text-2xl">
            {matches.length > 0 ? "Your best matches on the lot" : "No strong matches right now"}
          </h3>
          {matches.length === 0 && (
            <p className="mt-2 text-sm text-text-secondary">
              Inventory turns over fast. Browse everything we have, or give us a call — we may
              have something coming in that fits.
            </p>
          )}
          <div className="mt-5 space-y-4">
            {matches.map((m) => (
              <div key={m.vehicle_id} className="rounded-lg border border-border-subtle bg-surface p-4">
                {m.vehicle ? (
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-base font-semibold text-text-primary">
                      {m.vehicle.year} {m.vehicle.make} {m.vehicle.model}
                      {m.vehicle.trim ? ` ${m.vehicle.trim}` : ""}
                    </h4>
                    <p className="tabular text-sm text-text-secondary">
                      <span className="font-bold text-text-primary">
                        ${m.vehicle.price.toLocaleString()}
                      </span>{" "}
                      · {m.vehicle.mileage.toLocaleString()} mi
                    </p>
                  </div>
                ) : (
                  <h4 className="text-base font-semibold text-text-primary">Recommended vehicle</h4>
                )}
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  <span className="font-semibold text-text-primary">Why it fits: </span>
                  {m.reason}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  <span className="font-semibold text-text-primary">One thing to consider: </span>
                  {m.consider}
                </p>
                <Link
                  href={`/inventory/${m.slug}`}
                  className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/inventory"
              className="rounded-md border border-border-subtle px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-accent"
            >
              Browse All Inventory
            </Link>
            <button
              type="button"
              onClick={restart}
              className="text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="py-6 text-center">
          <p className="text-sm text-text-secondary">
            Something went wrong matching vehicles. You can browse the full inventory instead, or
            try again in a moment.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/inventory"
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Browse Inventory
            </Link>
            <button
              type="button"
              onClick={() => setPhase("contact")}
              className="rounded-md border border-border-subtle px-5 py-2.5 text-sm font-medium text-text-primary hover:border-accent"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
