import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureCronAuth } from "@/lib/cron-auth";
import { syncAccountInsights, syncAccountProfile, syncConversations, syncMediaForAccount, syncMediaInsights } from "@/lib/instagram/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Manual trigger – runs the entire sync pipeline once. */
export async function POST(req: NextRequest) {
  const unauth = ensureCronAuth(req);
  if (unauth) return unauth;

  const accounts = await prisma.account.findMany();
  for (const a of accounts) {
    await syncAccountProfile(a.id);
    await syncAccountInsights(a.id, 30);
    await syncMediaForAccount(a.id, 4);
    await syncMediaInsights(a.id, 100);
    await syncConversations(a.id);
  }
  return NextResponse.json({ ok: true });
}
