/**
 * /api/admin/bdc/push-dealercenter — catch up leads that never reached
 * DealerCenter (dc_pushed=false).
 *
 * GET  → list what's missing (no side effects).
 * POST → push them. Credit apps are skipped: their full SSN was never stored,
 *        so they can't be rebuilt here and need a human.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hasDb } from "@/lib/bdc/store";
import { pushLeadToDealerCenter } from "@/lib/bdc/pushToDealerCenter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function missingLeads() {
  const { data } = await getSupabaseAdmin()
    .from("leads")
    .select("id, first_name, last_name, phone, email, source, lead_type, created_at")
    .eq("dc_pushed", false)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    source: string | null;
    lead_type: string | null;
    created_at: string;
  }[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "No database" }, { status: 503 });
  const leads = await missingLeads();
  return NextResponse.json({ count: leads.length, leads });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "No database" }, { status: 503 });

  const pushed: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];
  for (const lead of await missingLeads()) {
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.phone || lead.id;
    if (lead.lead_type === "credit_app") {
      skipped.push(name);
      continue;
    }
    if (await pushLeadToDealerCenter(lead.id)) pushed.push(name);
    else failed.push(name);
  }
  return NextResponse.json({ pushed, failed, skipped_credit_apps: skipped });
}
