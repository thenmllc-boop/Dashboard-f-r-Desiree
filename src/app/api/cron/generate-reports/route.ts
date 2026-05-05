import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureCronAuth } from "@/lib/cron-auth";
import { generateInsights } from "@/lib/insights";
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subDays, subMonths } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const unauth = ensureCronAuth(req);
  if (unauth) return unauth;

  const today = startOfDay(new Date());
  const accounts = await prisma.account.findMany();

  for (const a of accounts) {
    const insights = await generateInsights(a.id);

    // Daily report (yesterday)
    const yesterday = subDays(today, 1);
    await upsertReport(a.id, "DAILY", yesterday, endOfDay(yesterday), insights);

    // Weekly report (previous ISO week)
    const lastWeekStart = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
    await upsertReport(a.id, "WEEKLY", lastWeekStart, endOfWeek(lastWeekStart, { weekStartsOn: 1 }), insights);

    // Monthly report (previous calendar month)
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    await upsertReport(a.id, "MONTHLY", lastMonthStart, endOfMonth(lastMonthStart), insights);
  }

  return NextResponse.json({ ok: true });
}

async function upsertReport(
  accountId: string,
  type: "DAILY" | "WEEKLY" | "MONTHLY",
  start: Date,
  end: Date,
  insights: Awaited<ReturnType<typeof generateInsights>>
) {
  const [topMedia, leads] = await Promise.all([
    prisma.instagramMedia.findFirst({
      where: { accountId, timestamp: { gte: start, lte: end } },
      orderBy: { performanceScore: "desc" },
    }),
    prisma.lead.count({ where: { accountId, createdAt: { gte: start, lte: end } } }),
  ]);

  const summary = [
    `${leads} neue Leads`,
    insights.warnings[0],
    insights.patterns[0],
  ]
    .filter(Boolean)
    .join(" · ");

  await prisma.report.upsert({
    where: { accountId_type_periodStart: { accountId, type, periodStart: start } },
    create: {
      accountId,
      type,
      periodStart: start,
      periodEnd: end,
      summary,
      payload: {
        topMedia: topMedia?.caption?.slice(0, 60) ?? null,
        bestHook: insights.patterns[0] ?? null,
        bestCta: insights.patterns[1] ?? null,
        warning: insights.warnings[0] ?? null,
        recommendation: insights.doMore[0] ?? null,
        leads,
      },
    },
    update: {
      periodEnd: end,
      summary,
      payload: {
        topMedia: topMedia?.caption?.slice(0, 60) ?? null,
        bestHook: insights.patterns[0] ?? null,
        bestCta: insights.patterns[1] ?? null,
        warning: insights.warnings[0] ?? null,
        recommendation: insights.doMore[0] ?? null,
        leads,
      },
    },
  });
}

export const GET = POST;
