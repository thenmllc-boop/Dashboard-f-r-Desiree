import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureCronAuth } from "@/lib/cron-auth";
import { syncMediaForAccount, syncMediaInsights } from "@/lib/instagram/sync";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauth = ensureCronAuth(req);
  if (unauth) return unauth;

  const accounts = await prisma.account.findMany();
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const a of accounts) {
    try {
      await syncMediaForAccount(a.id);
      await syncMediaInsights(a.id, 50);
      results.push({ id: a.id, ok: true });
    } catch (e) {
      results.push({ id: a.id, ok: false, error: (e as Error).message });
    }
  }
  return NextResponse.json({ ok: true, results });
}

export const GET = POST;
