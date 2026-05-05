import { prisma } from "./db";
import { subDays, startOfDay, endOfDay, format, startOfMonth, startOfWeek } from "date-fns";

/**
 * Server-side analytics queries.
 * These are used by Server Components and API routes.
 *
 * NOTE on data availability:
 *  - "views/reach/likes/comments/saves/shares/profile_views/website_clicks":
 *    available via Instagram Graph API (per-media + account-level insights).
 *  - "follower lost / unfollows": NOT directly returned by the API. We compute
 *    an estimate from FollowerSnapshot + DailyAccountInsight.followsGained.
 *  - "DM-sourced leads" / "video → customer": NOT provided by Meta.
 *    We attribute via CTA keyword + ManyChat tag + UTM links + landing page tracking.
 */

export async function getAccount() {
  return prisma.account.findFirst({ orderBy: { createdAt: "asc" } });
}

export async function getOverviewKpis(accountId: string) {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  const monthStart = startOfMonth(today);

  const [account, todayInsight, yesterdayInsight, monthInsights, totalLeads, monthLeads, totalDms, todayDms, monthDms, lastSnapshot, monthAgoSnapshot] =
    await Promise.all([
      prisma.account.findUnique({ where: { id: accountId } }),
      prisma.dailyAccountInsight.findFirst({ where: { accountId, date: today } }),
      prisma.dailyAccountInsight.findFirst({ where: { accountId, date: yesterday } }),
      prisma.dailyAccountInsight.findMany({
        where: { accountId, date: { gte: monthStart } },
        orderBy: { date: "asc" },
      }),
      prisma.lead.count({ where: { accountId } }),
      prisma.lead.count({ where: { accountId, createdAt: { gte: monthStart } } }),
      prisma.message.count({ where: { accountId, fromBusiness: false } }),
      prisma.message.count({
        where: { accountId, fromBusiness: false, sentAt: { gte: today, lte: endOfDay(today) } },
      }),
      prisma.message.count({ where: { accountId, fromBusiness: false, sentAt: { gte: monthStart } } }),
      prisma.followerSnapshot.findFirst({ where: { accountId }, orderBy: { capturedAt: "desc" } }),
      prisma.followerSnapshot.findFirst({
        where: { accountId, capturedAt: { lte: subDays(today, 30) } },
        orderBy: { capturedAt: "desc" },
      }),
    ]);

  const reachMonth = sumField(monthInsights, "reach");
  const impressionsMonth = sumField(monthInsights, "impressions");
  const profileViewsMonth = sumField(monthInsights, "profileViews");
  const websiteClicksMonth = sumField(monthInsights, "websiteClicks");
  const followsGainedMonth = sumField(monthInsights, "followsGained");

  // Estimated unfollows: gained – delta in follower count over snapshot period.
  const estimatedUnfollowsMonth =
    lastSnapshot && monthAgoSnapshot
      ? Math.max(0, followsGainedMonth - (lastSnapshot.followers - monthAgoSnapshot.followers))
      : null;

  const newFollowersToday = todayInsight?.followsGained ?? 0;
  const newFollowersYesterday = yesterdayInsight?.followsGained ?? 0;

  // Conversion rates
  const reachToDmRate = reachMonth > 0 ? totalDms / reachMonth : 0;
  const dmToLeadRate = monthDms > 0 ? monthLeads / monthDms : 0;

  return {
    account,
    followers: account?.followersCount ?? lastSnapshot?.followers ?? 0,
    newFollowersToday,
    newFollowersTodayDelta: deltaPct(newFollowersToday, newFollowersYesterday),
    newFollowersMonth: followsGainedMonth,
    estimatedUnfollowsMonth,
    reachMonth,
    impressionsMonth,
    profileViewsMonth,
    websiteClicksMonth,
    totalDms,
    todayDms,
    monthDms,
    totalLeads,
    monthLeads,
    reachToDmRate,
    dmToLeadRate,
    monthInsights,
  };
}

export async function getTopMedia(accountId: string, by: "views" | "engagementRate" | "saves" | "shares" | "comments" | "leads" = "views", limit = 5) {
  if (by === "leads") {
    const grouped = await prisma.lead.groupBy({
      by: ["sourceMediaId"],
      where: { accountId, sourceMediaId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { sourceMediaId: "desc" } },
      take: limit,
    });
    const ids = grouped.map((g) => g.sourceMediaId).filter(Boolean) as string[];
    const media = await prisma.instagramMedia.findMany({ where: { id: { in: ids } } });
    return ids
      .map((id) => media.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => ({ ...m!, leadCount: grouped.find((g) => g.sourceMediaId === m!.id)?._count._all ?? 0 }));
  }

  return prisma.instagramMedia.findMany({
    where: { accountId },
    orderBy: { [by]: "desc" },
    take: limit,
  });
}

export async function getDailySeries(accountId: string, days = 30) {
  const since = subDays(new Date(), days);
  const insights = await prisma.dailyAccountInsight.findMany({
    where: { accountId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
  return insights.map((i) => ({
    date: format(i.date, "dd.MM"),
    Reichweite: i.reach,
    Profilaufrufe: i.profileViews,
    "Website-Klicks": i.websiteClicks,
    "Neue Follower": i.followsGained,
    DMs: i.newDms,
  }));
}

export async function getFollowerSeries(accountId: string, days = 30) {
  const since = subDays(new Date(), days);
  const snapshots = await prisma.followerSnapshot.findMany({
    where: { accountId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
  });
  return snapshots.map((s) => ({
    date: format(s.capturedAt, "dd.MM"),
    Follower: s.followers,
  }));
}

export async function getDmsSeries(accountId: string, days = 30) {
  const since = subDays(startOfDay(new Date()), days);
  const messages = await prisma.message.findMany({
    where: { accountId, fromBusiness: false, sentAt: { gte: since } },
    select: { sentAt: true },
  });
  const buckets = new Map<string, number>();
  for (let i = 0; i <= days; i++) {
    const key = format(subDays(new Date(), days - i), "dd.MM");
    buckets.set(key, 0);
  }
  for (const m of messages) {
    const key = format(m.sentAt, "dd.MM");
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([date, DMs]) => ({ date, DMs }));
}

export async function getLeadFunnel(accountId: string) {
  const [total, contacted, qualified, calls, purchased, lost] = await Promise.all([
    prisma.lead.count({ where: { accountId } }),
    prisma.lead.count({ where: { accountId, status: "CONTACTED" } }),
    prisma.lead.count({ where: { accountId, status: "QUALIFIED" } }),
    prisma.lead.count({ where: { accountId, status: "CALL_BOOKED" } }),
    prisma.lead.count({ where: { accountId, status: "PURCHASED" } }),
    prisma.lead.count({ where: { accountId, status: "LOST" } }),
  ]);
  return { total, contacted, qualified, calls, purchased, lost };
}

export async function getBestPostingTimes(accountId: string) {
  // Heuristic: use captured timestamps + engagement to find best windows.
  const media = await prisma.instagramMedia.findMany({
    where: { accountId },
    select: { timestamp: true, engagementRate: true, views: true },
  });
  const buckets: Record<number, { count: number; engagement: number }> = {};
  for (let h = 0; h < 24; h++) buckets[h] = { count: 0, engagement: 0 };
  for (const m of media) {
    const h = m.timestamp.getHours();
    buckets[h].count += 1;
    buckets[h].engagement += m.engagementRate;
  }
  return Object.entries(buckets).map(([hour, v]) => ({
    hour: `${hour}:00`,
    avgEngagement: v.count ? v.engagement / v.count : 0,
  }));
}

// ──────────────────────────── helpers ────────────────────────────
function sumField<T extends Record<string, unknown>>(items: T[], field: keyof T): number {
  return items.reduce((acc, x) => acc + (Number(x[field]) || 0), 0);
}

function deltaPct(curr: number, prev: number) {
  if (!prev) return curr > 0 ? 1 : 0;
  return (curr - prev) / prev;
}

export { startOfDay, startOfMonth, startOfWeek, subDays };
