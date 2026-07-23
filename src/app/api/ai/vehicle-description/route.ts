import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/adminAuth";
import { isAIConfigured } from "@/lib/ai";
import { getVehicleById } from "@/lib/vehicles";
import { generateAndSaveVehicleDescription } from "@/lib/aiVehicleDescription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  vehicle_id: z.string().trim().min(1).max(100),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: "AI is not configured. Add ANTHROPIC_API_KEY to enable description generation." },
        { status: 503 }
      );
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "vehicle_id is required" }, { status: 400 });
    }

    const vehicle = await getVehicleById(parsed.data.vehicle_id);
    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const result = await generateAndSaveVehicleDescription(vehicle);
    if (!result.ok || !result.generated) {
      return NextResponse.json(
        { error: result.error ?? "Description generation failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, vehicle_id: vehicle.id, ...result.generated });
  } catch (err) {
    console.error("[api/ai/vehicle-description] failed:", err);
    return NextResponse.json({ error: "Description generation failed" }, { status: 500 });
  }
}
