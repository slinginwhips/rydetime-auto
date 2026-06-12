import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function dbReady(): boolean {
  return isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!dbReady()) {
    return NextResponse.json({ settings: [], configured: false });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .order("key", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ settings: data ?? [], configured: true });
  } catch (err) {
    console.error("[admin/settings] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

const putSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(200),
        value: z.string().max(10000),
      })
    )
    .min(1),
});

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!dbReady()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  let parsed;
  try {
    parsed = putSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: String(err) },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await supabase.from("site_settings").upsert(
      parsed.settings.map((s) => ({
        key: s.key,
        value: s.value,
        updated_at: now,
      })),
      { onConflict: "key" }
    );
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/settings] PUT failed:", err);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
