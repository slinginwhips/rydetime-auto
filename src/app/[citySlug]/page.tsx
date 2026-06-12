import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  generatePageMetadata,
  autoDealerSchema,
  breadcrumbSchema,
} from "@/lib/seo";
import { DEALERSHIP } from "@/lib/dealership";
import { getVehicles, type InventoryFilters } from "@/lib/vehicles";
import VehicleCard from "@/components/VehicleCard";

export const dynamic = "force-dynamic";

interface LocalPageDef {
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  filters: InventoryFilters;
  inventoryQuery: string;
  inventoryLinkLabel: string;
  sections: { heading: string; body: string }[];
}

const LOCAL_PAGES: Record<string, LocalPageDef> = {
  "used-cars-suffolk-va": {
    h1: "Used Cars for Sale in Suffolk, VA",
    metaTitle: "Used Cars for Sale in Suffolk, VA | RydeTime Auto",
    metaDescription:
      "Shop honest used cars, trucks, and SUVs in Suffolk, VA at RydeTime Auto, 1913 Holland Road. Fair market pricing, financing options, no-pressure process.",
    intro:
      "RydeTime Auto is Suffolk's hometown independent dealership — we're located right on Holland Road (Route 58), a few minutes west of downtown Suffolk. Instead of driving across the water to a megastore, you can shop a hand-picked selection of used cars, trucks, and SUVs from a family-operated lot where the people who priced the vehicles are the same people who hand you the keys.",
    filters: { limit: 6 },
    inventoryQuery: "",
    inventoryLinkLabel: "Browse Our Full Suffolk Inventory",
    sections: [
      {
        heading: "A Local Lot, Not a Megastore",
        body: "Big-box used car retailers stock thousands of vehicles and treat every sale like a transaction number. We do the opposite: a smaller, carefully chosen inventory where each vehicle has been reviewed for drivability, safety, and comfort concerns before it goes up for sale. Living and working in Suffolk means our reputation rides on every car we sell — your neighbor's opinion of us matters more than any ad campaign.",
      },
      {
        heading: "Easy to Find on Holland Road",
        body: "You'll find us at 1913 Holland Road, Suffolk, VA 23434 — right on Route 58, the main corridor through Suffolk. We're minutes from downtown Suffolk, Harbour View, and the Holland and Whaleyville communities, with easy access from Route 460 and Route 13 as well. Stop by during business hours, or call (757) 937-8664 and we'll have a vehicle pulled up and ready when you arrive.",
      },
      {
        heading: "Financing for Suffolk Drivers",
        body: "Whether your credit is excellent, rebuilding, or just getting started, we work with lenders who handle a wide range of situations. We'll never claim everyone is approved — that's not honest — but we will give you real numbers and a clear explanation of your options, usually the same day you apply.",
      },
    ],
  },
  "used-cars-virginia-beach-va": {
    h1: "Used Cars for Virginia Beach Drivers",
    metaTitle: "Used Cars Near Virginia Beach, VA | RydeTime Auto — Suffolk",
    metaDescription:
      "Virginia Beach drivers: skip the big-lot markup. RydeTime Auto in Suffolk offers honest used cars about 45 minutes away via I-264 and Route 58. Worth the drive.",
    intro:
      "From most of Virginia Beach, RydeTime Auto is about a 45-minute drive — straight out I-264 West, then Route 58 West into Suffolk. That short trip past the big-city lots is exactly why people make it: a family-operated dealership with fair, market-based pricing and none of the four-square negotiation theater you'll find closer to the Oceanfront.",
    filters: { limit: 6 },
    inventoryQuery: "",
    inventoryLinkLabel: "See What's Worth the Drive",
    sections: [
      {
        heading: "Why Virginia Beach Shoppers Drive to Suffolk",
        body: "Inventory near the Oceanfront and Town Center carries big-market overhead, and it shows up in the price. As a smaller independent lot in Suffolk, we keep overhead low and price vehicles from real market data. Many of our Virginia Beach customers tell us the savings covered their gas for a year — and most of the shopping can happen before you ever leave home, with full photos, Carfax links where available, and our AI assistant to answer questions.",
      },
      {
        heading: "Do Most of It From Your Couch",
        body: "Browse the live inventory online (it syncs automatically with what's physically on the lot), get an estimated payment, value your trade, and even start a secure credit application before you make the drive. When you arrive at 1913 Holland Road, the vehicle is ready, the numbers are ready, and you're not starting from scratch.",
      },
      {
        heading: "Getting Here From Virginia Beach",
        body: "Take I-264 West toward Norfolk, continue onto I-664 or follow US-58 West through Chesapeake, and stay on Route 58 into Suffolk. We're at 1913 Holland Road on the right — call (757) 937-8664 if you want turn-by-turn help or to confirm a vehicle is still available before heading out.",
      },
    ],
  },
  "used-cars-chesapeake-va": {
    h1: "Used Cars for Chesapeake Drivers",
    metaTitle: "Used Cars Near Chesapeake, VA | RydeTime Auto — Suffolk",
    metaDescription:
      "Chesapeake drivers: RydeTime Auto is 20-30 minutes away on Route 58 in Suffolk. Honest used cars, fair pricing, and financing for every credit situation.",
    intro:
      "Chesapeake and Suffolk are next-door neighbors, and for most of Chesapeake — Western Branch, Deep Creek, Great Bridge — RydeTime Auto is a quick 20 to 30 minute trip straight down Route 58 West. That makes us one of the easiest independent lots for Chesapeake drivers to reach without fighting tunnel traffic.",
    filters: { limit: 6 },
    inventoryQuery: "",
    inventoryLinkLabel: "Browse Inventory Near Chesapeake",
    sections: [
      {
        heading: "No Tunnels, No Hassle",
        body: "Anyone in Hampton Roads knows the real cost of car shopping is often the drive. From Chesapeake, reaching us never involves a tunnel or a bridge backup — it's a straight shot on US-58. Western Branch shoppers are often here in 15 minutes. That makes it easy to come see a vehicle twice, bring your mechanic, or sleep on a decision without dreading the return trip.",
      },
      {
        heading: "Honest Used Cars, Clearly Presented",
        body: "Every vehicle on our lot is reviewed for obvious drivability, safety, and comfort concerns before sale, and many go through Virginia state inspection and fresh maintenance depending on their service history. We share Carfax reports where available and write honest condition notes — including the things you should know, not just the selling points.",
      },
      {
        heading: "Financing and Trades for Chesapeake Buyers",
        body: "We work with lenders covering everything from excellent credit to rebuilding credit, and we take trades — or we'll simply buy your car outright, no purchase necessary. Start either process online and we'll have real numbers ready when you make the short drive over.",
      },
    ],
  },
  "used-cars-norfolk-va": {
    h1: "Used Cars for Norfolk Drivers",
    metaTitle: "Used Cars Near Norfolk, VA | RydeTime Auto — Suffolk",
    metaDescription:
      "Norfolk drivers: RydeTime Auto in Suffolk is about 35 minutes away via I-264 and Route 58. Honest used cars, military-friendly financing, no pressure.",
    intro:
      "From downtown Norfolk, Ghent, or the Naval Station, RydeTime Auto is roughly a 35-minute drive — I-264 West through Portsmouth, then Route 58 West into Suffolk. Norfolk drivers make the trip for a simple reason: a smaller, family-operated lot with honest pricing beats a high-pressure city dealership row.",
    filters: { limit: 6 },
    inventoryQuery: "",
    inventoryLinkLabel: "Browse Inventory Near Norfolk",
    sections: [
      {
        heading: "Military and First-Time Buyers Welcome",
        body: "A lot of our Norfolk customers are sailors and military families buying their first vehicle stateside or rebuilding credit after a PCS-heavy few years. We work with lenders experienced with military pay structures and first-time buyers, and we'll explain every line of a deal in plain English. No 'military discount' gimmicks — just straight numbers and a process that respects your time.",
      },
      {
        heading: "Check Everything Before You Drive Over",
        body: "Our website syncs automatically with the physical lot, so the inventory you see online is real. Full photo sets, specs, payment estimates, and Carfax links where available mean you can shortlist vehicles from Norfolk and only make the drive for the ones worth a test drive. Call or text (757) 937-8664 to confirm availability first.",
      },
      {
        heading: "Getting Here From Norfolk",
        body: "Take I-264 West through the Downtown Tunnel and Portsmouth, then continue on US-58 West into Suffolk. We're at 1913 Holland Road, on Route 58 just west of central Suffolk. Outside rush hour it's an easy, mostly highway drive.",
      },
    ],
  },
  "used-cars-portsmouth-va": {
    h1: "Used Cars for Portsmouth Drivers",
    metaTitle: "Used Cars Near Portsmouth, VA | RydeTime Auto — Suffolk",
    metaDescription:
      "Portsmouth drivers: RydeTime Auto is about 25 minutes west on Route 58 in Suffolk. Honest used cars, fair prices, and financing for all credit situations.",
    intro:
      "Portsmouth is one of our closest neighbors — from most of the city, RydeTime Auto is about a 25-minute drive west on US-58 into Suffolk. No tunnels, no bridges, just a straight run down Route 58 to a family-operated lot at 1913 Holland Road.",
    filters: { limit: 6 },
    inventoryQuery: "",
    inventoryLinkLabel: "Browse Inventory Near Portsmouth",
    sections: [
      {
        heading: "A Short, Simple Drive West",
        body: "From Midtown or Churchland, hop on US-58 West and stay on it — you'll be at our lot in under half an hour without touching a tunnel. That proximity matters when you're comparing vehicles: it's easy to visit more than once, bring a second opinion, or have your own mechanic take a look before you buy. We encourage all three.",
      },
      {
        heading: "Real Prices for Working Budgets",
        body: "Much of our inventory sits in the $8,000–$25,000 range — dependable commuters, family SUVs, and work-ready trucks priced from actual market data. We're upfront about fees, we share what we know about each vehicle's condition and history, and our payment estimator gives you a realistic monthly number before you ever talk financing.",
      },
      {
        heading: "Trade It or Sell It Outright",
        body: "Portsmouth drivers regularly sell us vehicles with no purchase required — it's faster and safer than meeting marketplace strangers. Fill out the form online with photos and we'll follow up with an estimated offer, then confirm it with a quick in-person look.",
      },
    ],
  },
  "used-car-financing-suffolk-va": {
    h1: "Used Car Financing in Suffolk, VA",
    metaTitle: "Used Car Financing in Suffolk, VA | RydeTime Auto",
    metaDescription:
      "Straightforward used car financing in Suffolk, VA. RydeTime Auto works with lenders for excellent, fair, and rebuilding credit. Real numbers, no pressure.",
    intro:
      "Financing a used car shouldn't feel like a trap. At RydeTime Auto on Holland Road in Suffolk, the process is simple: a secure application through DealerCenter, lenders who cover a wide range of credit situations, and a plain-English walkthrough of your actual numbers — payment, term, and total cost — before you sign anything.",
    filters: { limit: 6 },
    inventoryQuery: "",
    inventoryLinkLabel: "Shop Vehicles You Can Finance",
    sections: [
      {
        heading: "How Financing Actually Works Here",
        body: "First, you complete a short secure application — online or in person — which takes about five minutes and doesn't obligate you to anything. We submit it to lenders suited to your situation, then sit down with you and review the real options: monthly payment, interest rate, term length, and down payment. If a deal doesn't make financial sense for you, we'll say so. Most approvals come back the same day.",
      },
      {
        heading: "What Lenders Look At",
        body: "Approval isn't just a credit score. Lenders weigh your income, how long you've been at your job, your down payment, and the vehicle itself. A steady paycheck and a reasonable down payment can overcome a lot of credit history. We'll tell you honestly what's realistic for your situation — including when waiting a few months or choosing a less expensive vehicle would get you a meaningfully better deal.",
      },
      {
        heading: "No Games on the Numbers",
        body: "The price you see online is the price we work from — plus Virginia tax, title, registration, and a documentation fee, all shown to you line by line before signing. Payment estimates on our site are informational only; your actual terms come from the lender. We never guarantee approval, and we never bury fees in the paperwork.",
      },
    ],
  },
  "bad-credit-car-loans-suffolk-va": {
    h1: "Bad Credit Car Loans in Suffolk, VA",
    metaTitle: "Bad Credit Car Loans in Suffolk, VA | RydeTime Auto",
    metaDescription:
      "Bad credit or rebuilding? RydeTime Auto in Suffolk works with lenders who consider your whole situation, not just a score. Honest answers, no false promises.",
    intro:
      "If your credit has taken some hits — late payments, a repossession, a bankruptcy, medical collections — you've probably seen the 'EVERYONE APPROVED!' signs. We won't tell you that, because it isn't true anywhere. What is true: we work with lenders who specialize in challenged credit, they look at more than a score, and plenty of Suffolk drivers with rough credit histories leave our lot with a fair loan and a dependable vehicle.",
    filters: { priceMax: 20000, sort: "price_asc", limit: 6 },
    inventoryQuery: "?priceMax=20000",
    inventoryLinkLabel: "Shop Budget-Smart Vehicles",
    sections: [
      {
        heading: "What Actually Helps Your Approval",
        body: "Three things move the needle most with subprime lenders: provable income (pay stubs or bank statements), a down payment — even $500 to $1,000 helps — and a vehicle priced sensibly for your budget. Time at your current job and a recent history of on-time payments on anything (rent, phone, utilities) help too. What we'll never ask you to do is stretch into a payment you can't sustain; a loan that fails helps no one.",
      },
      {
        heading: "Rebuilding, Not Just Borrowing",
        body: "Handled well, an auto loan is one of the better tools for repairing credit: it adds an installment account to your file and builds a payment history month after month. We'll be straight about the trade-offs — rates on challenged-credit loans are higher, which is exactly why we'll often point you toward a less expensive, mechanically sound vehicle now, so you can refinance or trade up after your score recovers.",
      },
      {
        heading: "What We Won't Do",
        body: "We won't promise approval before a lender sees your application. We won't quote you a fake low payment that balloons in the fine print. And we won't pack the deal with add-ons you didn't ask for. You'll see every number before you sign, and you're free to walk away at any point. That's how we'd want to be treated, so that's how we operate.",
      },
    ],
  },
  "first-time-buyer-car-loans-va": {
    h1: "First-Time Buyer Car Loans in Virginia",
    metaTitle: "First-Time Car Buyer Loans in VA | RydeTime Auto — Suffolk",
    metaDescription:
      "Buying your first car in Virginia? RydeTime Auto in Suffolk works with first-time buyer programs and explains every step in plain English. No pressure.",
    intro:
      "Buying your first car — especially with little or no credit history — can feel like everyone's speaking a language you were never taught. At RydeTime Auto in Suffolk, we slow it down: lenders with genuine first-time buyer programs, a clear explanation of every term in the contract, and zero pressure to decide on the spot. Hampton Roads is full of first-time buyers — students, new graduates, and junior service members — and this is one of our favorite kinds of deals to do right.",
    filters: { priceMax: 15000, sort: "price_asc", limit: 6 },
    inventoryQuery: "?priceMax=15000",
    inventoryLinkLabel: "Shop Great First Cars",
    sections: [
      {
        heading: "No Credit Isn't Bad Credit",
        body: "Lenders treat a blank credit file differently from a damaged one. First-time buyer programs typically lean on two things: steady income and a down payment. A part-time job with consistent pay stubs can be enough for a sensible vehicle. A co-signer with established credit can improve your rate, but it's not always required — we'll show you the numbers both ways so you can decide.",
      },
      {
        heading: "Your First Loan Is a Credit-Building Tool",
        body: "Your first auto loan does double duty: it gets you to work or class, and it builds the credit file that will save you money on everything later — apartments, insurance, your next car. We'll show you how the payment reports to the credit bureaus and why choosing a payment you can comfortably make every single month matters more than getting the fanciest car on the lot.",
      },
      {
        heading: "What to Bring",
        body: "When you're ready, bring a valid driver's license, proof of income (recent pay stubs or bank statements), proof of residence, and your down payment. If you're considering a co-signer, they'll need the same documents. The application itself is handled through DealerCenter's secure system — about five minutes — and we'll walk through the results together at the lot on Holland Road or over the phone at (757) 937-8664.",
      },
    ],
  },
  "reliable-used-cars-suffolk-va": {
    h1: "Reliable Used Cars in Suffolk, VA",
    metaTitle: "Reliable Used Cars in Suffolk, VA | RydeTime Auto",
    metaDescription:
      "Looking for a dependable used car in Suffolk, VA? RydeTime Auto reviews every vehicle before sale and tells you honestly what we know. Carfax available on many.",
    intro:
      "Everyone says they sell 'reliable' used cars. Here's what that word actually means at RydeTime Auto: before a vehicle goes up for sale, we review it for drivability, safety, and comfort concerns; we address visible issues like warning lights or A/C problems; vehicles go through Virginia state inspection when applicable; and we tell you what we know — including the things to keep an eye on.",
    filters: { mileageMax: 120000, sort: "mileage_asc", limit: 6 },
    inventoryQuery: "?mileageMax=120000",
    inventoryLinkLabel: "Browse Lower-Mileage Vehicles",
    sections: [
      {
        heading: "How We Prepare Our Vehicles",
        body: "We know people are buying used vehicles, not brand-new ones, so our goal is to be clear, helpful, and realistic. Vehicles are reviewed for obvious drivability, safety, and comfort concerns, and issues we spot — warning lights, window problems, A/C concerns — are addressed before sale. Many vehicles receive an oil change or additional maintenance depending on recent service history. Every used vehicle is different, which is why we encourage you to review the Carfax when available, inspect the vehicle, and take a real test drive.",
      },
      {
        heading: "Judge Reliability With Evidence, Not Vibes",
        body: "A reliable used car is usually the sum of three things: a model with a solid track record, a maintenance history you can verify, and a current condition you can inspect. We provide Carfax reports where available, honest written notes on each vehicle, and an open invitation to bring your own mechanic for a pre-purchase inspection — something we actively encourage, because a dealer who discourages it is telling you something.",
      },
      {
        heading: "Built for Hampton Roads Commutes",
        body: "Much of our inventory is chosen with local life in mind: commuters who run Route 58 or the Monitor-Merrimac daily, families hauling kids across Suffolk and Chesapeake, and work vehicles that earn their keep. Tell us how you'll use the car and we'll point you at the vehicles on the lot that genuinely fit — and away from the ones that don't.",
      },
    ],
  },
  "used-cars-under-15000-suffolk-va": {
    h1: "Used Cars Under $15,000 in Suffolk, VA",
    metaTitle: "Used Cars Under $15,000 in Suffolk, VA | RydeTime Auto",
    metaDescription:
      "Shop used cars under $15,000 in Suffolk, VA at RydeTime Auto. Dependable commuters and family vehicles with honest pricing and financing options.",
    intro:
      "Under $15,000 is where smart, practical car shopping lives — and it's the heart of our lot in Suffolk. These are the dependable commuters, sensible sedans, and budget-friendly SUVs that get Hampton Roads drivers to work, school, and the base every day without a payment that hurts.",
    filters: { priceMax: 15000, sort: "price_asc", limit: 6 },
    inventoryQuery: "?priceMax=15000",
    inventoryLinkLabel: "See All Vehicles Under $15,000",
    sections: [
      {
        heading: "What $15,000 Buys in Today's Market",
        body: "In this range you're typically looking at slightly older model years or higher-mileage examples of well-regarded models — and that's not a bad thing. A properly maintained higher-mileage car from a reliable nameplate often outlasts a newer car with a spotty history. We review each one before sale, share the Carfax where available, and write honest notes about condition so you know exactly what you're considering.",
      },
      {
        heading: "Keep the Payment Sensible",
        body: "Financed over a typical term, vehicles in this range often land in the $200–$320 per month neighborhood depending on credit, term, and down payment — use the payment estimator on any vehicle page for a realistic number. A smaller loan also means less interest paid overall and an easier approval for first-time buyers and rebuilding credit. Estimates are informational only; final terms come from the lender.",
      },
    ],
  },
  "used-cars-under-20000-suffolk-va": {
    h1: "Used Cars Under $20,000 in Suffolk, VA",
    metaTitle: "Used Cars Under $20,000 in Suffolk, VA | RydeTime Auto",
    metaDescription:
      "Browse used cars, SUVs, and trucks under $20,000 in Suffolk, VA at RydeTime Auto. Newer model years and lower miles, still a sensible monthly payment.",
    intro:
      "The under-$20,000 bracket is the sweet spot of the used market in Hampton Roads: newer model years, lower mileage, and more safety and comfort features than the bargain tier, while keeping the monthly payment in sensible territory. Here's what's on our Suffolk lot in that range right now.",
    filters: { priceMax: 20000, sort: "price_asc", limit: 6 },
    inventoryQuery: "?priceMax=20000",
    inventoryLinkLabel: "See All Vehicles Under $20,000",
    sections: [
      {
        heading: "Why This Price Range Works So Well",
        body: "Stretching from $15,000 to $20,000 usually buys you two or three newer model years, tens of thousands fewer miles, and features like backup cameras, modern driver aids, and better fuel economy. For families and daily commuters putting real miles on a vehicle, that extra margin of newness often pays for itself in fewer repairs and a longer ownership runway.",
      },
      {
        heading: "Real Numbers Before You Visit",
        body: "Every listing shows a payment estimate, and the interactive estimator on each vehicle page lets you adjust down payment and term to land on a realistic monthly figure — typically in the $280–$400 range for this bracket, depending on credit and terms. When you're ready, the secure credit application takes about five minutes, and we'll have your actual options ready when you arrive at 1913 Holland Road. Estimates are informational only.",
      },
    ],
  },
  "used-suvs-suffolk-va": {
    h1: "Used SUVs for Sale in Suffolk, VA",
    metaTitle: "Used SUVs for Sale in Suffolk, VA | RydeTime Auto",
    metaDescription:
      "Shop used SUVs and crossovers in Suffolk, VA at RydeTime Auto. Family-ready space, honest condition notes, and financing for every credit situation.",
    intro:
      "SUVs and crossovers are the workhorses of Hampton Roads family life — school runs in Suffolk, beach trips to Sandbridge, gear-hauling weekends, and the occasional nor'easter where a little extra ride height and available all-wheel drive feel very welcome. Here's what's on our lot right now.",
    filters: { bodyStyles: ["SUV", "Crossover"], limit: 6 },
    inventoryQuery: "?body=SUV",
    inventoryLinkLabel: "Browse All SUVs in Inventory",
    sections: [
      {
        heading: "Picking the Right Size SUV",
        body: "Compact crossovers are the budget-friendly commuter pick — easy on gas, easy to park, room for a small family. Midsize SUVs add a usable cargo area and often a third row for growing households. Full-size SUVs earn their keep when you tow or carry six-plus regularly, but cost more to feed. Tell us how you'll actually use it and we'll be honest about which vehicles on the lot fit — and which would be paying for capability you'd never use.",
      },
      {
        heading: "What to Check on a Used SUV",
        body: "With any used SUV we encourage the same homework: review the Carfax where available, look at tire wear (uneven wear can hint at alignment or suspension issues), test every seat configuration and the liftgate, and take it on the highway, not just around the block. If it has 4WD or AWD, we'll tell you what we know about how it's been used. Bring your mechanic if you'd like — we encourage it.",
      },
    ],
  },
  "used-trucks-suffolk-va": {
    h1: "Used Trucks for Sale in Suffolk, VA",
    metaTitle: "Used Trucks for Sale in Suffolk, VA | RydeTime Auto",
    metaDescription:
      "Shop used pickup trucks in Suffolk, VA at RydeTime Auto. Work-ready trucks with honest condition notes, Carfax availability, and straightforward financing.",
    intro:
      "Suffolk is truck country — between the farms out toward Holland and Whaleyville, the trades working across Hampton Roads, and everybody who tows a boat or a trailer, a dependable pickup isn't a luxury here. We keep an eye out for honest, work-ready trucks and price them from real market data, not the inflated numbers trucks often carry on bigger lots.",
    filters: { bodyStyles: ["Truck", "Pickup", "Pickup Truck"], limit: 6 },
    inventoryQuery: "?body=Truck",
    inventoryLinkLabel: "Browse All Trucks in Inventory",
    sections: [
      {
        heading: "Buying a Used Truck Honestly",
        body: "Used trucks live harder lives than sedans, so the inspection matters more. We review each truck for drivability and safety concerns before sale, and we'll share what we know about its history — including the Carfax where available. When you look one over, check the bed and hitch area for heavy-towing wear, the 4WD engagement if equipped, and the brakes and suspension on a real test drive. Bring your mechanic; we'll make the truck available.",
      },
      {
        heading: "Work Truck Math",
        body: "A good used truck holds its value better than almost anything else on the road, which cuts both ways: they're rarely cheap, but they're rarely a bad investment if bought right. We'll help you weigh the trade-offs — V6 versus V8, two-wheel versus four-wheel drive, miles versus model year — based on what the truck actually needs to do for you, whether that's a daily commute, a job site, or weekend towing.",
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(LOCAL_PAGES).map((citySlug) => ({ citySlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}): Promise<Metadata> {
  const { citySlug } = await params;
  const page = LOCAL_PAGES[citySlug];
  if (!page) return {};
  return generatePageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: `/${citySlug}`,
  });
}

export default async function LocalSEOPage({
  params,
}: {
  params: Promise<{ citySlug: string }>;
}) {
  const { citySlug } = await params;
  const page = LOCAL_PAGES[citySlug];
  if (!page) notFound();

  const vehicles = await getVehicles(page.filters);
  const breadcrumb = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: page.h1, path: `/${citySlug}` },
  ]);

  return (
    <main className="bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(autoDealerSchema()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="border-b border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
            {DEALERSHIP.name} — {DEALERSHIP.address.full}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-text-primary md:text-4xl">
            {page.h1}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-secondary">
            {page.intro}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/inventory${page.inventoryQuery}`}
              className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {page.inventoryLinkLabel}
            </Link>
            <a
              href={DEALERSHIP.phoneHref}
              className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
            >
              Call {DEALERSHIP.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Live inventory block */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-text-primary">
            Current Inventory
          </h2>
          <Link
            href={`/inventory${page.inventoryQuery}`}
            className="text-sm font-semibold text-accent hover:underline"
          >
            View all →
          </Link>
        </div>
        {vehicles.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-border-subtle bg-background-card p-10 text-center">
            <p className="text-sm text-text-secondary">
              Nothing matching this page on the lot at the moment — inventory
              turns over constantly. Browse the{" "}
              <Link href="/inventory" className="text-accent hover:underline">
                full inventory
              </Link>{" "}
              or call us at{" "}
              <a href={DEALERSHIP.phoneHref} className="text-accent hover:underline">
                {DEALERSHIP.phone}
              </a>{" "}
              and tell us what you need.
            </p>
          </div>
        )}
      </section>

      {/* Content sections */}
      <section className="border-t border-border-subtle bg-background-secondary">
        <div className="mx-auto max-w-4xl space-y-10 px-4 py-14 sm:px-6">
          {page.sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-xl font-bold text-text-primary md:text-2xl">
                {s.heading}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-text-secondary">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-text-primary">
          Visit Us at {DEALERSHIP.address.full}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          Open {DEALERSHIP.hoursShort}. Call or text{" "}
          <a href={DEALERSHIP.phoneHref} className="text-accent hover:underline">
            {DEALERSHIP.phone}
          </a>{" "}
          to confirm a vehicle is available before you drive over.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/inventory${page.inventoryQuery}`}
            className="inline-flex items-center justify-center rounded-md bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Browse Inventory
          </Link>
          <Link
            href="/credit-application"
            className="inline-flex items-center justify-center rounded-md border border-border-subtle bg-surface px-8 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
          >
            Get Approved
          </Link>
        </div>
      </section>
    </main>
  );
}
