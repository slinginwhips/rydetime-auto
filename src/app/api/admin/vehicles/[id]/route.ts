import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const PREP_BADGES = [
  "state_inspection",
  "oil_change",
  "new_tires",
  "new_brakes",
  "detailed",
  "multi_point_review",
  "battery_checked",
  "fluids_topped",
] as const;

const updateSchema = z.object({
  description_ai: z.string().max(20000).nullable().optional(),
  ryans_take: z.string().max(5000).nullable().optional(),
  best_fit_for: z.string().max(5000).nullable().optional(),
  what_to_know: z.string().max(5000).nullable().optional(),
  featured: z.boolean().optional(),
  ryans_pick: z.boolean().optional(),
  status: z.enum(["active", "sold", "hold_pending", "fresh_arrival"]).optional(),
  carfax_url: z.string().max(2000).nullable().optional(),
  carfax_badge_one_owner: z.boolean().optional(),
  carfax_badge_accident_free: z.boolean().optional(),
  carfax_badge_service_records: z.boolean().optional(),
  carfax_badge_great_value: z.boolean().optional(),
  carfax_badge_good_value: z.boolean().optional(),
  video_url: z.string().max(2000).nullable().optional(),
  prep_badges: z.array(z.enum(PREP_BADGES)).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;

  let parsed;
  try {
    parsed = updateSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: String(err) },
      { status: 400 }
    );
  }

  const { prep_badges, ...vehicleFields } = parsed;

  try {
    const supabase = getSupabaseAdmin();

    // Update vehicle fields (only those provided).
    const updates = Object.fromEntries(
      Object.entries(vehicleFields).filter(([, v]) => v !== undefined)
    );

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("vehicles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Record each changed field as an admin override so future
      // DealerCenter syncs preserve it.
      const overrideRows = Object.entries(updates).map(([field_name, value]) => ({
        vehicle_id: id,
        field_name,
        override_value: value === null ? null : String(value),
      }));
      // UPSERT, not insert: admin_overrides has unique (vehicle_id, field_name),
      // so a plain insert threw a duplicate-key error on every save after the
      // first. It was only logged, so the override silently kept the OLD value
      // and the next DealerCenter sync re-applied it — e.g. a car marked sold
      // by hand came straight back onto the site the next morning.
      if (overrideRows.length > 0) {
        const { error: ovErr } = await supabase
          .from("admin_overrides")
          .upsert(overrideRows, { onConflict: "vehicle_id,field_name" });
        if (ovErr) console.error("[admin/vehicles] override log failed:", ovErr);
      }
    }

    // Replace the prep badge set if provided.
    if (prep_badges) {
      const { error: delErr } = await supabase
        .from("vehicle_prep_badges")
        .delete()
        .eq("vehicle_id", id);
      if (delErr) throw delErr;
      if (prep_badges.length > 0) {
        const { error: insErr } = await supabase
          .from("vehicle_prep_badges")
          .insert(prep_badges.map((badge_type) => ({ vehicle_id: id, badge_type })));
        if (insErr) throw insErr;
      }
      const { error: ovErr } = await supabase.from("admin_overrides").upsert(
        {
          vehicle_id: id,
          field_name: "prep_badges",
          override_value: prep_badges.join(","),
        },
        { onConflict: "vehicle_id,field_name" }
      );
      if (ovErr) console.error("[admin/vehicles] badge override log failed:", ovErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/vehicles] PATCH failed:", err);
    return NextResponse.json(
      { error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}
