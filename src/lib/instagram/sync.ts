/**
 * High-level sync routines that map IG Graph API responses → Prisma rows.
 * Used by both the cron jobs (scripts/cron/*) and the manual /api/sync routes.
 */
import { prisma } from "../db";
import { fetchAccountDailyInsights, fetchAccountProfile } from "./account";
import { fetchMediaInsights, fetchMediaPage, insightsToMap } from "./media";
import { fetchConversations, fetchConversationMessages } from "./messaging";
import { startOfDay, subDays } from "date-fns";

export async function syncAccountProfile(accountId: string) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const profile = await fetchAccountProfile(account.igUserId, account.accessToken);
  await prisma.account.update({
    where: { id: accountId },
    data: {
      username: profile.username,
      name: profile.name ?? null,
      biography: profile.biography ?? null,
      website: profile.website ?? null,
      profilePictureUrl: profile.profile_picture_url ?? null,
      followersCount: profile.followers_count ?? 0,
      followsCount: profile.follows_count ?? 0,
      mediaCount: profile.media_count ?? 0,
      lastSyncAt: new Date(),
    },
  });
  await prisma.followerSnapshot.create({
    data: {
      accountId,
      followers: profile.followers_count ?? 0,
      follows: profile.follows_count ?? 0,
      mediaCount: profile.media_count ?? 0,
    },
  });
}

export async function syncAccountInsights(accountId: string, days = 7) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const until = new Date();
  const since = subDays(until, days);

  const insights = await fetchAccountDailyInsights(account.igUserId, since, until, account.accessToken).catch(
    () => ({ data: [] })
  );

  const byDate = new Map<string, Record<string, number>>();
  for (const metric of insights.data) {
    for (const entry of metric.values) {
      const key = entry.end_time.slice(0, 10);
      const bucket = byDate.get(key) ?? {};
      bucket[metric.name] = entry.value;
      byDate.set(key, bucket);
    }
  }

  for (const [dateStr, values] of byDate.entries()) {
    const date = startOfDay(new Date(dateStr));
    await prisma.dailyAccountInsight.upsert({
      where: { accountId_date: { accountId, date } },
      create: {
        accountId,
        date,
        reach: values.reach ?? 0,
        impressions: values.impressions ?? 0,
        profileViews: values.profile_views ?? 0,
        websiteClicks: values.website_clicks ?? 0,
        followerCount: values.follower_count ?? 0,
        followsGained: values.follows_gained ?? values.followers_gained ?? 0,
        raw: values as object,
      },
      update: {
        reach: values.reach ?? 0,
        impressions: values.impressions ?? 0,
        profileViews: values.profile_views ?? 0,
        websiteClicks: values.website_clicks ?? 0,
        followerCount: values.follower_count ?? 0,
        followsGained: values.follows_gained ?? values.followers_gained ?? 0,
        raw: values as object,
      },
    });
  }
}

export async function syncMediaForAccount(accountId: string, maxPages = 4) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  let cursor: string | undefined;
  let pages = 0;

  do {
    const page = await fetchMediaPage(account.igUserId, cursor, account.accessToken);
    for (const m of page.data) {
      await prisma.instagramMedia.upsert({
        where: { igMediaId: m.id },
        create: {
          igMediaId: m.id,
          accountId,
          caption: m.caption ?? null,
          mediaType: mapMediaType(m.media_type, m.media_product_type),
          mediaProductType: m.media_product_type ?? null,
          mediaUrl: m.media_url ?? null,
          thumbnailUrl: m.thumbnail_url ?? null,
          permalink: m.permalink ?? null,
          timestamp: new Date(m.timestamp),
          likes: m.like_count ?? 0,
          comments: m.comments_count ?? 0,
        },
        update: {
          caption: m.caption ?? null,
          permalink: m.permalink ?? null,
          likes: m.like_count ?? 0,
          comments: m.comments_count ?? 0,
        },
      });
    }
    cursor = page.paging?.cursors?.after && page.paging?.next ? page.paging.cursors.after : undefined;
    pages++;
  } while (cursor && pages < maxPages);
}

export async function syncMediaInsights(accountId: string, limit = 50) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const media = await prisma.instagramMedia.findMany({
    where: { accountId },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  for (const m of media) {
    try {
      const raw = await fetchMediaInsights(m.igMediaId, m.mediaProductType ?? undefined, account.accessToken);
      const map = insightsToMap(raw);
      const reach = map.reach ?? 0;
      const likes = map.likes ?? m.likes;
      const comments = map.comments ?? m.comments;
      const shares = map.shares ?? 0;
      const saves = map.saved ?? 0;
      const views = map.plays ?? map.views ?? 0;
      const watch = map.ig_reels_video_view_total_time ?? null;
      const interactions = map.total_interactions ?? likes + comments + shares + saves;
      const engagementRate = reach > 0 ? interactions / reach : 0;
      const performanceScore = computePerformanceScore({ engagementRate, views, saves, shares });

      await prisma.mediaInsight.create({
        data: {
          mediaId: m.id,
          views,
          reach,
          likes,
          comments,
          shares,
          saves,
          watchTimeSec: watch ? watch / 1000 : null,
          totalInteractions: interactions,
          followsFromMedia: map.follows ?? 0,
          profileVisits: map.profile_visits ?? 0,
          raw: map as object,
        },
      });

      await prisma.instagramMedia.update({
        where: { id: m.id },
        data: {
          views,
          reach,
          likes,
          comments,
          shares,
          saves,
          watchTimeSec: watch ? watch / 1000 : null,
          engagementRate,
          performanceScore,
          status: performanceScore >= 80 ? "WINNER" : performanceScore < 50 ? "WEAK" : "AVERAGE",
        },
      });
    } catch (e) {
      console.warn(`[syncMediaInsights] media ${m.igMediaId} failed`, (e as Error).message);
    }
  }
}

export async function syncConversations(accountId: string) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const { data: conversations } = await fetchConversations(account.igUserId, account.accessToken);

  for (const c of conversations) {
    const other = c.participants.data.find((p) => p.id !== account.igUserId);
    const conv = await prisma.conversation.upsert({
      where: { igThreadId: c.id },
      create: {
        accountId,
        igThreadId: c.id,
        participantId: other?.id ?? "unknown",
        participantUsername: other?.username ?? null,
        participantName: other?.name ?? null,
        lastMessageAt: new Date(c.updated_time),
      },
      update: {
        participantUsername: other?.username ?? null,
        participantName: other?.name ?? null,
        lastMessageAt: new Date(c.updated_time),
      },
    });

    try {
      const detail = await fetchConversationMessages(c.id, account.accessToken);
      const messages = (detail as unknown as { messages?: { data: Array<{ id: string; from: { id: string; username?: string }; message?: string; created_time: string }> } }).messages?.data ?? [];
      for (const m of messages) {
        await prisma.message.upsert({
          where: { igMessageId: m.id },
          create: {
            accountId,
            conversationId: conv.id,
            igMessageId: m.id,
            fromBusiness: m.from.id === account.igUserId,
            text: m.message ?? null,
            sentAt: new Date(m.created_time),
          },
          update: {},
        });
      }
    } catch (e) {
      console.warn(`[syncConversations] thread ${c.id} failed`, (e as Error).message);
    }
  }
}

// ─────────────────────────── helpers ───────────────────────────
function mapMediaType(type: string, productType?: string) {
  if (productType === "REELS") return "REEL" as const;
  if (productType === "STORY") return "STORY" as const;
  if (type === "CAROUSEL_ALBUM") return "CAROUSEL_ALBUM" as const;
  if (type === "VIDEO") return "VIDEO" as const;
  return "IMAGE" as const;
}

function computePerformanceScore(args: { engagementRate: number; views: number; saves: number; shares: number }) {
  // Simple weighted score 0–100. Tune to your norms.
  const er = Math.min(args.engagementRate / 0.1, 1) * 50; // 10% ER = full ER points
  const saveBonus = Math.min(args.saves / 200, 1) * 25;
  const shareBonus = Math.min(args.shares / 100, 1) * 15;
  const viewBonus = Math.min(args.views / 50_000, 1) * 10;
  return Math.round(er + saveBonus + shareBonus + viewBonus);
}
