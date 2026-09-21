/**
 * POST /api/admin/bdc/[id]/resume — hand a conversation back to the BDC after
 * a human took it over (or after it asked for help). The next customer text
 * gets an automatic reply again, subject to the usual auto-send switch.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminAuth";
import { addEvent, setBdcStatus, getBdcLead } from "@/lib/bdc/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const lead = await getBdcLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.opted_out) {
    return NextResponse.json({ error: "This customer opted out (STOP) — the BDC can't message them." }, { status: 400 });
  }

  await setBdcStatus(id, "replied");
  await addEvent(id, "bdc_resumed", "handed back to the BDC by a rep");
  return NextResponse.json({ ok: true });
}
