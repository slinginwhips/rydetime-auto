/**
 * Dealership FAQ — single source of truth. Rendered on /faq and retrieved
 * into the AI chat's context (src/lib/chatRetrieval.ts) so the assistant
 * answers from the same copy customers read on the site.
 */

export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQS: FaqEntry[] = [
  {
    question: "Do you finance bad credit?",
    answer:
      "We work with lenders who handle a wide range of credit situations, including challenged and rebuilding credit. We won't promise everyone gets approved — no honest dealer can — but past credit problems don't automatically disqualify you. Approval and terms depend on your full picture: income, down payment, and how recent any issues are. Start your application on our site and we'll show you what's realistic.",
  },
  {
    question: "Can I trade in my vehicle?",
    answer:
      "Yes. Fill out our trade-in form with your vehicle's details and we'll give you an estimated trade value, usually within one business day. The final number comes after a quick in-person inspection. We also handle loan payoffs on traded vehicles, even if you owe more than the trade is worth in some cases.",
  },
  {
    question: "Do you offer warranties?",
    answer:
      "Vehicles are typically sold as-is unless stated otherwise in writing on the specific vehicle. Optional extended service contracts may be available on many vehicles — ask us about coverage options for the vehicle you're considering. We'll always be clear about exactly what is and isn't covered before you sign anything.",
  },
  {
    question: "How do I hold a vehicle?",
    answer:
      "You can place a $500 hold deposit on a vehicle through its listing page or by contacting us. The deposit takes the vehicle off active availability while you finalize financing or arrange to come in. Important: the deposit is non-refundable if you choose not to move forward, but it applies in full toward your purchase if the sale is completed. The dealership confirms each hold manually.",
  },
  {
    question: "Can I get a Carfax report?",
    answer:
      "Yes — Carfax reports are available on many of our vehicles, and where available there's a Carfax link right on the vehicle's page. If you don't see one, ask us and we'll get you the history information we have. We only display badges like one-owner or accident-free when the Carfax or DealerCenter data actually confirms it.",
  },
  {
    question: "Do you take cash?",
    answer:
      "Yes, we accept cash purchases, as well as certified funds and financing through our lenders. For larger cash transactions, federal law requires us to file IRS Form 8300 for payments over $10,000 — standard for every dealership, nothing unusual on your end.",
  },
  {
    question: "How do I schedule a test drive?",
    answer:
      "Use the 'Schedule Test Drive' button on any vehicle page, ask our AI assistant, or just call or text us at (757) 937-8664. Tell us when you'd like to come in and we'll have the vehicle ready. Bring a valid driver's license. Walk-ins are welcome too during business hours.",
  },
  {
    question: "Are your prices negotiable?",
    answer:
      "We price our vehicles based on real market data, so our prices are already close to where similar vehicles actually sell. That means we don't build in thousands of dollars of bluff to negotiate away. If you have a fair offer or found a comparable vehicle priced lower, bring it up — we're reasonable people and we'd rather have a conversation than lose a good customer over a few hundred dollars.",
  },
  {
    question: "What fees should I expect?",
    answer:
      "Beyond the advertised price, expect Virginia sales and use tax, title and registration fees, and a documentation (processing) fee. We'll show you every line item before you sign — no surprise add-ons, no mandatory accessories, no hidden 'market adjustments.' If you want the out-the-door number before you come in, just ask.",
  },
  {
    question: "How often does your inventory change?",
    answer:
      "Constantly — our website syncs automatically with our inventory system, so what you see online is what's actually on the lot. Fresh arrivals are flagged on the site, and good vehicles at fair prices tend to move quickly. If you see something you like, don't wait too long; if you don't see what you need, use our AI matchmaker or ask us — we may have something coming in.",
  },
  {
    question: "Can I bring my own mechanic to inspect a vehicle?",
    answer:
      "Absolutely — we encourage it. An independent pre-purchase inspection is one of the smartest things a used car buyer can do, and a dealer who discourages it is telling you something. Coordinate a time with us and we'll make the vehicle available.",
  },
  {
    question: "Do you buy cars without a purchase?",
    answer:
      "Yes. No purchase necessary — if you have a vehicle to sell, fill out the form on our Sell Us Your Car page or bring it by. We'll review the details, give you an estimated offer, and confirm it with a quick in-person appraisal. We handle the title work and can pay off existing loans as part of the deal.",
  },
];
