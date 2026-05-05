/**
 * ManyChat custom external request webhook.
 *
 * Configure ManyChat → Settings → API → External Request to POST here when
 * a flow tags a subscriber. Body shape (configured in ManyChat):
 *   {
 *     "subscriber": { "ig_username": "...", "name": "...", "email": "...", "phone": "..." },
 *     "tag": "lead-roadmap-q4",
 *     "campaign_keyword": "ROADMAP"
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attributeLead } from "@/lib/attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    subscriber?: { ig_username?: string; name?: string; email?: string; phone?: string };
    tag?: string;
    campaign_keyword?: string;
    account_ig_user_id?: string;
  };

  // Pick the only account if account id is missing
  const account =
    body.account_ig_user_id
      ? await prisma.account.findUnique({ where: { igUserId: body.account_ig_user_id } })
      : await prisma.account.findFirst();
  if (!account) return NextResponse.json({ error: "no_account" }, { status: 404 });

  const lead = await attributeLead({
    accountId: account.id,
    igUsername: body.subscriber?.ig_username,
    fullName: body.subscriber?.name,
    email: body.subscriber?.email,
    phone: body.subscriber?.phone,
    manychatTag: body.tag,
    ctaKeyword: body.campaign_keyword,
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
