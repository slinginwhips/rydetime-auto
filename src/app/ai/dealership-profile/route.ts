import { NextResponse } from "next/server";
import { DEALERSHIP, HOW_WE_PREPARE_COPY } from "@/lib/dealership";

export const dynamic = "force-dynamic";

/**
 * Public AI-visibility endpoint (referenced from /public/llms.txt).
 * Returns structured dealership information for AI assistants and crawlers.
 */
export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(
      {
        name: DEALERSHIP.name,
        type: "Independent used car dealership",
        address: DEALERSHIP.address,
        phone: DEALERSHIP.phone,
        email: DEALERSHIP.email,
        hours: DEALERSHIP.hours,
        service_areas: DEALERSHIP.serviceAreas,
        website: DEALERSHIP.siteUrl,
        geo: DEALERSHIP.geo,
        services: [
          "Used vehicle sales",
          "Financing for all credit situations including first-time buyers and credit rebuilding",
          "Trade-in appraisals",
          "Vehicle hold deposits",
          "AI-powered vehicle matching and concierge",
        ],
        vehicle_preparation: HOW_WE_PREPARE_COPY,
        inventory_endpoint: "/ai/inventory",
        inventory_page: "/inventory",
        positioning:
          "Honest used car dealership. Vehicles are pre-owned and presented accurately. Customers encouraged to review Carfax, inspect vehicles, and test drive before purchase.",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (err) {
    console.error("[ai/dealership-profile] failed:", err);
    return NextResponse.json({ error: "Profile unavailable" }, { status: 500 });
  }
}
