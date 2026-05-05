// Cron: Reports – daily at 08:00.
// crontab:  0 8 * * *  cd /app && npm run cron:reports
// Calls the same code path as /api/cron/generate-reports.
import { prisma } from "../../src/lib/db";
import { generateInsights } from "../../src/lib/insights";
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, subDays, subMonths } from "date-fns";

async function main() {
  const today = startOfDay(new Date());
  const accounts = await prisma.account.findMany();

  for (const a of accounts) {
    const insights = await generateInsights(a.id);

    const yesterday = subDays(today, 1);
    await upsert(a.id, "DAILY", yesterday, endOfDay(yesterday), insights);

    const lastWeekStart = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
    await upsert(a.id, "WEEKLY", lastWeekStart, endOfWeek(lastWeekStart, { weekStartsOn: 1 }), insights);

    const lastMonthStart = startOfMonth(subMonths(today, 1));
    await upsert(a.id, "MONTHLY", lastMonthStart, endOfMonth(lastMonthStart), insights);

    console.log(`[reports] ${a.username} done`);
  }
}

async function upsert(
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

  const summary = [`${leads} neue Leads`, insights.warnings[0], insights.patterns[0]].filter(Boolean).join(" · ");

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
