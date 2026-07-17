/**
 * Retrieval layer for the AI chat (no vectors — the data is small enough
 * that keyword scoring over curated snippets beats embeddings for cost,
 * latency, and debuggability).
 *
 * Two retrievers, both pure functions:
 *  - retrieveKnowledge:  dealership knowledge (FAQ, financing, prep process,
 *    policies) relevant to what the shopper is asking, sourced from the same
 *    copy the site's pages render.
 *  - matchVehiclesToQuery:  vehicles the conversation is actually about, so
 *    the model gets full detail (Ryan's take, features, prep badges, Carfax
 *    badges) for those instead of just a one-line inventory listing.
 */

import { FAQS } from "@/lib/faq";
import {
  DEALERSHIP,
  HOW_WE_PREPARE_COPY,
  PAYMENT_DISCLAIMER,
} from "@/lib/dealership";
import { estimateMonthlyPayment, PAYMENT_DEFAULTS } from "@/types/vehicle";
import type { Vehicle } from "@/types/vehicle";

export interface KnowledgeEntry {
  id: string;
  topic: string;
  /** Extra match terms beyond the topic/text themselves. */
  keywords: string[];
  text: string;
}

/* ---------------- knowledge base ---------------- */

const EXTRA_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "financing-process",
    topic: "How financing works here",
    keywords: ["finance", "financing", "loan", "apply", "application", "approval", "approved", "lender", "credit", "down", "payment", "preapproval", "pre-approved"],
    text:
      "Financing in four steps: (1) a quick application started on our site — about five minutes, no obligation; (2) we shop our lenders, who handle a wide range of credit situations, for options that fit the budget; (3) we review the real numbers together — payment, term, down payment, no surprise fees; (4) once the terms and the vehicle feel right, paperwork is finished and most deals wrap up the same day. The secure application lives at /credit-application.",
  },
  {
    id: "payment-estimates",
    topic: "Payment estimates",
    keywords: ["payment", "monthly", "month", "estimate", "apr", "term", "interest", "rate", "calculator"],
    text:
      `Site payment estimates use ${PAYMENT_DEFAULTS.termMonths} months at ${PAYMENT_DEFAULTS.apr}% APR with $${PAYMENT_DEFAULTS.downPayment} down unless the shopper changes them. ${PAYMENT_DISCLAIMER}`,
  },
  {
    id: "how-we-prepare",
    topic: "How vehicles are prepared before sale",
    keywords: ["inspect", "inspection", "prepared", "recon", "condition", "safety", "oil", "maintenance", "state", "mechanic", "checked"],
    text: HOW_WE_PREPARE_COPY,
  },
  {
    id: "about-dealership",
    topic: "About RydeTime Auto",
    keywords: ["about", "who", "family", "owned", "independent", "dealer", "dealership", "ryan", "trust", "reviews", "location", "where", "address", "directions", "hours", "open", "closed"],
    text:
      `${DEALERSHIP.name} is a family-owned and operated independent used car dealership at ${DEALERSHIP.address.full}, serving ${DEALERSHIP.serviceAreas.join(", ")}. Phone/text: ${DEALERSHIP.phone}. Hours: ${DEALERSHIP.hoursShort}. Honest cars, no-pressure process: clear prices in plain English, Carfax shared when available, browse as long as you want, bring your own mechanic, sleep on it.`,
  },
  {
    id: "sell-your-car",
    topic: "Selling us your car (no purchase needed)",
    keywords: ["sell", "selling", "buy", "cash", "offer", "appraisal", "payoff", "owe", "title"],
    text:
      "We buy cars with no purchase necessary — fill out the Sell Us Your Car form or bring the vehicle by. We review the details, give an estimated offer, and confirm it with a quick in-person appraisal. We handle title work and can pay off existing loans as part of the deal.",
  },
];

let knowledgeCache: KnowledgeEntry[] | null = null;

export function getKnowledgeBase(): KnowledgeEntry[] {
  if (!knowledgeCache) {
    knowledgeCache = [
      ...FAQS.map((f, i) => ({
        id: `faq-${i}`,
        topic: f.question,
        keywords: [],
        text: f.answer,
      })),
      ...EXTRA_KNOWLEDGE,
    ];
  }
  return knowledgeCache;
}

/* ---------------- scoring ---------------- */

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "do", "does",
  "for", "from", "get", "has", "have", "how", "i", "if", "in", "is", "it",
  "me", "my", "of", "on", "or", "our", "so", "that", "the", "this", "to",
  "was", "we", "what", "when", "where", "which", "will", "with", "you", "your",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$ ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Crude singular/plural + verb-form folding so "payments" hits "payment". */
function stem(token: string): string {
  const stripped = token.replace(/(ing|ed|es|s)$/i, "");
  return stripped.length >= 3 ? stripped : token;
}

function scoreEntry(queryTokens: Set<string>, entry: KnowledgeEntry): number {
  let score = 0;
  const topicTokens = tokenize(entry.topic).map(stem);
  const textTokens = new Set(tokenize(entry.text).map(stem));
  const keywordTokens = new Set(entry.keywords.map((k) => stem(k.toLowerCase())));
  for (const q of queryTokens) {
    if (keywordTokens.has(q)) score += 3;
    if (topicTokens.includes(q)) score += 2;
    if (textTokens.has(q)) score += 1;
  }
  return score;
}

/** Top-k knowledge entries relevant to the shopper's recent messages. */
export function retrieveKnowledge(query: string, k = 4): KnowledgeEntry[] {
  const queryTokens = new Set(tokenize(query).map(stem));
  if (queryTokens.size === 0) return [];
  return getKnowledgeBase()
    .map((entry) => ({ entry, score: scoreEntry(queryTokens, entry) }))
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ entry }) => entry);
}

/* ---------------- vehicle matching ---------------- */

const BODY_STYLE_HINTS: Record<string, string[]> = {
  suv: ["suv", "crossover"],
  truck: ["truck", "pickup"],
  sedan: ["sedan"],
  coupe: ["coupe"],
  van: ["van", "minivan"],
  hatchback: ["hatchback", "hatch"],
  convertible: ["convertible"],
  wagon: ["wagon"],
};

/**
 * Vehicles the conversation is about, scored by explicit mentions:
 * make/model/trim (strong), year, body style, fuel type, stock number.
 * Returns up to k vehicles with a positive score, best first.
 */
export function matchVehiclesToQuery(
  query: string,
  vehicles: Vehicle[],
  k = 3
): Vehicle[] {
  const q = ` ${query.toLowerCase()} `;
  const tokens = new Set(tokenize(query));

  const scored = vehicles.map((v) => {
    let score = 0;
    const make = v.make.toLowerCase();
    const model = v.model.toLowerCase();
    if (q.includes(` ${make} `) || tokens.has(make)) score += 3;
    // Multi-word models ("Grand Cherokee") match on substring.
    if (model && q.includes(model)) score += 5;
    else if (model.split(/\s+/).some((w) => w.length > 2 && tokens.has(w))) score += 3;
    if (v.trim && q.includes(v.trim.toLowerCase())) score += 2;
    if (tokens.has(String(v.year))) score += 2;
    if (v.stock_number && tokens.has(v.stock_number.toLowerCase())) score += 6;
    const body = (v.body_style ?? "").toLowerCase();
    for (const [style, hints] of Object.entries(BODY_STYLE_HINTS)) {
      if (body.includes(style) && hints.some((h) => tokens.has(h))) score += 1;
    }
    if (v.fuel_type && tokens.has(v.fuel_type.toLowerCase())) score += 1;
    return { v, score };
  });

  return scored
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ v }) => v);
}

/* ---------------- formatting ---------------- */

const PREP_BADGE_LABELS: Record<string, string> = {
  state_inspection: "VA state inspection",
  oil_change: "fresh oil change",
  new_tires: "new tires",
  new_brakes: "new brakes",
  detailed: "fully detailed",
  multi_point_review: "multi-point review",
  battery_checked: "battery checked",
  fluids_topped: "fluids topped off",
};

/** Rich, honest detail block for one vehicle (only confirmed data). */
export function formatVehicleKnowledge(v: Vehicle): string {
  const badges: string[] = [];
  if (v.carfax_badge_one_owner) badges.push("Carfax one-owner");
  if (v.carfax_badge_accident_free) badges.push("Carfax accident-free");
  if (v.carfax_badge_service_records) badges.push("Carfax service records");
  if (v.carfax_badge_great_value) badges.push("Carfax great value");

  const prep = (v.vehicle_prep_badges ?? [])
    .map((b) => PREP_BADGE_LABELS[b.badge_type])
    .filter(Boolean);
  const features = (v.vehicle_features ?? [])
    .slice(0, 12)
    .map((f) => f.feature_name);

  const estimate = estimateMonthlyPayment(Number(v.price));

  const lines = [
    `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ""} — $${Number(v.price).toLocaleString()}, ${Number(v.mileage).toLocaleString()} mi`,
    `Stock #: ${v.stock_number} | VIN: ${v.vin} | Status: ${v.status} | Days in inventory: ${v.days_in_inventory}`,
    `Body: ${v.body_style ?? "n/a"} | Exterior: ${v.exterior_color ?? "n/a"} | Interior: ${v.interior_color ?? "n/a"}`,
    `Transmission: ${v.transmission ?? "n/a"} | Drivetrain: ${v.drivetrain ?? "n/a"} | Fuel: ${v.fuel_type ?? "n/a"} | Engine: ${v.engine ?? "n/a"}`,
    badges.length > 0
      ? `Confirmed history badges: ${badges.join(", ")}`
      : `Confirmed history badges: none — do NOT claim one-owner, accident-free, or clean title for this vehicle.`,
    v.carfax_url ? `Carfax report: ${v.carfax_url}` : `Carfax link: ask the dealership.`,
    `Estimated payment (${PAYMENT_DEFAULTS.termMonths} mo @ ${PAYMENT_DEFAULTS.apr}% APR, $0 down): ~$${estimate}/mo — estimate only, never a quote or offer.`,
    `Page: /inventory/${v.slug}`,
  ];
  if (prep.length > 0) lines.push(`Prep completed: ${prep.join(", ")}`);
  if (features.length > 0) lines.push(`Features: ${features.join(", ")}`);
  if (v.best_fit_for) lines.push(`Best fit for: ${v.best_fit_for}`);
  if (v.ryans_take) lines.push(`Ryan's take: ${v.ryans_take}`);
  if (v.what_to_know) lines.push(`What to know: ${v.what_to_know}`);
  return lines.join("\n");
}
