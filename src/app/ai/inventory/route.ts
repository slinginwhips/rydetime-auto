import { NextResponse } from "next/server";
import { getAllActiveVehicles } from "@/lib/vehicles";

export const dynamic = "force-dynamic";

/**
 * Public AI-visibility endpoint (referenced from /public/llms.txt).
 * Returns a lightweight JSON snapshot of all active inventory.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const vehicles = await getAllActiveVehicles();
    return NextResponse.json(
      {
        dealership: "RydeTime Auto",
        location: "1913 Holland Road, Suffolk, VA 23434",
        phone: "(757) 937-8664",
        generated_at: new Date().toISOString(),
        vehicle_count: vehicles.length,
        vehicles: vehicles.map((v) => ({
          year: v.year,
          make: v.make,
          model: v.model,
          trim: v.trim,
          price: Number(v.price),
          mileage: Number(v.mileage),
          slug: v.slug,
          status: v.status,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    );
  } catch (err) {
    console.error("[ai/inventory] failed:", err);
    return NextResponse.json({ error: "Inventory feed unavailable" }, { status: 500 });
  }
}
