/**
 * Seed script.
 *
 * Generates a realistic-looking dataset so the dashboard renders
 * fully populated even before the Instagram API is connected.
 *
 * Run with:
 *   npm run db:seed
 */
import { PrismaClient, MediaStatus, MediaType, LeadStatus, LeadSource, AutomationSource } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, subHours } from "date-fns";

const prisma = new PrismaClient();

const HOOKS = ["question", "stat", "story", "controversial", "curiosity"] as const;
const CTAS = ["DM_KEYWORD", "LINK_IN_BIO", "COMMENT", "SHARE", "SAVE"] as const;
const FORMATS: { type: MediaType; productType: string }[] = [
  { type: "REEL", productType: "REELS" },
  { type: "REEL", productType: "REELS" },
  { type: "REEL", productType: "REELS" },
  { type: "IMAGE", productType: "FEED" },
  { type: "CAROUSEL_ALBUM", productType: "FEED" },
];

const CAPTIONS = [
  "3 Fehler, die deine DMs killen 💀 (speichere das jetzt)",
  "Wie ich mit einem Reel 47 Calls in 7 Tagen gebucht habe",
  "Hör auf, jeden Tag zu posten – mach DAS stattdessen",
  "Der Hook, der mein Profil von 800 auf 12k gebracht hat",
  "Warum 97% aller Coaches an genau DIESEM Punkt scheitern",
  "Mein DM-Skript, das aus Followern Kunden macht",
  "Dieses CTA-Wort triggert Käufe (nicht ‚Link in Bio‘)",
  "POV: dein Funnel funktioniert endlich automatisch",
  "Ich hab das System getestet, das niemand zeigt 🎯",
  "Speicher das, bevor Instagram es löscht",
];

const PILLARS = [
  { name: "Mindset", slug: "mindset", color: "#7FAF9B" },
  { name: "Funnel & Sales", slug: "funnel", color: "#C6A76D" },
  { name: "Content Strategy", slug: "content", color: "#1F3D34" },
  { name: "Personal Brand", slug: "brand", color: "#5F9682" },
];

async function main() {
  console.log("🌱 Seeding…");

  // ─── Admin user ───
  const password = process.env.ADMIN_PASSWORD ?? "change-me";
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL ?? "admin@example.com" },
    update: { passwordHash: hash },
    create: {
      email: process.env.ADMIN_EMAIL ?? "admin@example.com",
      name: "Desiree",
      passwordHash: hash,
      role: "ADMIN",
    },
  });

  // ─── Account ───
  const account = await prisma.account.upsert({
    where: { igUserId: process.env.IG_BUSINESS_ACCOUNT_ID || "demo_ig_user" },
    update: {},
    create: {
      igUserId: process.env.IG_BUSINESS_ACCOUNT_ID || "demo_ig_user",
      username: "desiree.coaching",
      name: "Desiree",
      profilePictureUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
      biography: "Online Business & High-Ticket Sales · DM ‚START‘ für die Roadmap",
      website: "https://desiree.example.com",
      accessToken: process.env.IG_ACCESS_TOKEN || "demo_token",
      followersCount: 18742,
      followsCount: 412,
      mediaCount: 287,
      lastSyncAt: new Date(),
    },
  });

  // ─── Pillars ───
  const pillars = await Promise.all(
    PILLARS.map((p) =>
      prisma.contentCategory.upsert({
        where: { slug: p.slug },
        update: { color: p.color },
        create: p,
      })
    )
  );

  // ─── Campaigns ───
  const campaignDefs = [
    { name: "Roadmap Funnel", ctaKeyword: "ROADMAP", utmCampaign: "roadmap-q4", manychatTag: "lead-roadmap" },
    { name: "Free Guide Funnel", ctaKeyword: "GUIDE", utmCampaign: "guide-evergreen", manychatTag: "lead-guide" },
    { name: "Discovery Call", ctaKeyword: "CALL", utmCampaign: "call-q4", manychatTag: "lead-call" },
  ];
  const campaigns = [];
  for (const c of campaignDefs) {
    const camp = await prisma.campaign.upsert({
      where: { ctaKeyword: c.ctaKeyword },
      update: {},
      create: { ...c, accountId: account.id, startedAt: subDays(new Date(), 60) },
    });
    campaigns.push(camp);
  }

  // ─── Automation triggers ───
  const automations = [];
  for (const c of campaigns) {
    const a = await prisma.automationTrigger.upsert({
      where: { accountId_keyword: { accountId: account.id, keyword: c.ctaKeyword! } },
      update: {},
      create: {
        accountId: account.id,
        name: `${c.name} – Auto-Reply`,
        keyword: c.ctaKeyword!,
        source: c.manychatTag ? AutomationSource.MANYCHAT : AutomationSource.NATIVE,
        manychatFlowId: c.manychatTag ? `flow_${c.ctaKeyword?.toLowerCase()}` : null,
        responseTemplate: `Hey! Hier ist dein Link 👉 https://desiree.example.com/${c.ctaKeyword?.toLowerCase()}`,
        triggerCount: rand(45, 320),
        leadCount: rand(8, 90),
      },
    });
    automations.push(a);
  }

  // ─── Daily Account Insights (90 days) ───
  console.log("  · daily insights");
  for (let i = 90; i >= 0; i--) {
    const date = subDays(startOfDay(new Date()), i);
    const reach = rand(2500, 18000);
    const profileViews = Math.floor(reach * (0.04 + Math.random() * 0.05));
    const websiteClicks = Math.floor(profileViews * (0.05 + Math.random() * 0.07));
    const followsGained = rand(15, 110);
    const newDms = rand(3, 35);
    await prisma.dailyAccountInsight.upsert({
      where: { accountId_date: { accountId: account.id, date } },
      update: {},
      create: {
        accountId: account.id,
        date,
        reach,
        impressions: Math.floor(reach * 1.4),
        profileViews,
        websiteClicks,
        followsGained,
        followsLost: rand(2, 18),
        newDms,
        totalDms: newDms + rand(0, 5),
      },
    });
  }

  // ─── Follower snapshots ───
  console.log("  · follower snapshots");
  let followers = 14_500;
  for (let i = 90; i >= 0; i--) {
    followers += rand(20, 140) - rand(2, 20);
    await prisma.followerSnapshot.create({
      data: {
        accountId: account.id,
        capturedAt: subDays(new Date(), i),
        followers,
        follows: 412,
        mediaCount: 287 - i,
      },
    });
  }

  // ─── Media ───
  console.log("  · media + insights");
  for (let i = 0; i < 60; i++) {
    const f = pick(FORMATS);
    const pillar = pick(pillars);
    const hook = pick(HOOKS);
    const cta = pick(CTAS);
    const ctaCampaign = cta === "DM_KEYWORD" ? pick(campaigns) : null;
    const ts = subDays(new Date(), i * (Math.random() < 0.7 ? 1 : 2) + Math.random());
    const reach = rand(1500, 60_000);
    const views = f.type === "REEL" ? rand(3000, 180_000) : rand(1500, 30_000);
    const likes = Math.floor(views * (0.03 + Math.random() * 0.07));
    const comments = Math.floor(likes * (0.04 + Math.random() * 0.06));
    const shares = Math.floor(likes * (0.05 + Math.random() * 0.1));
    const saves = Math.floor(likes * (0.1 + Math.random() * 0.3));
    const interactions = likes + comments + shares + saves;
    const er = reach ? interactions / reach : 0;
    const score = Math.min(100, Math.round((er * 100) * 0.5 + Math.min(saves / 4, 25) + Math.min(shares / 5, 15) + Math.min(views / 5000, 10)));
    const status: MediaStatus = score >= 80 ? "WINNER" : score < 50 ? "WEAK" : "AVERAGE";

    await prisma.instagramMedia.create({
      data: {
        igMediaId: `demo_media_${i}`,
        accountId: account.id,
        caption: pick(CAPTIONS),
        mediaType: f.type,
        mediaProductType: f.productType,
        thumbnailUrl: `https://images.unsplash.com/photo-${pickThumb(i)}?w=600&h=800&fit=crop`,
        permalink: `https://instagram.com/p/demo_${i}`,
        timestamp: ts,
        durationSec: f.type === "REEL" ? rand(8, 95) : null,
        contentPillarId: pillar.id,
        hookType: hook,
        ctaType: cta,
        ctaKeyword: ctaCampaign?.ctaKeyword ?? null,
        views,
        reach,
        likes,
        comments,
        shares,
        saves,
        watchTimeSec: f.type === "REEL" ? rand(8, 60) : null,
        engagementRate: er,
        performanceScore: score,
        status,
        campaigns: ctaCampaign ? { connect: [{ id: ctaCampaign.id }] } : undefined,
      },
    });
  }

  // ─── DMs / conversations ───
  console.log("  · conversations + messages");
  for (let i = 0; i < 30; i++) {
    const conv = await prisma.conversation.create({
      data: {
        accountId: account.id,
        igThreadId: `demo_thread_${i}`,
        participantId: `user_${i}`,
        participantUsername: `user_${i}`,
        participantName: `Lead ${i}`,
        lastMessageAt: subHours(new Date(), rand(0, 200)),
        unreadCount: i < 5 ? rand(1, 3) : 0,
      },
    });

    // Inbound DM
    const triggered = Math.random() < 0.35 ? pick(automations) : null;
    const inbound = await prisma.message.create({
      data: {
        accountId: account.id,
        conversationId: conv.id,
        igMessageId: `m_in_${i}`,
        fromBusiness: false,
        text: triggered ? triggered.keyword : pick(["Hey! Wie funktioniert dein Coaching?", "Magst du mir mehr Infos schicken?", "Habe dein Reel gesehen 🔥", "Wie läuft das mit dem Funnel?"]),
        triggeredKeyword: triggered?.keyword ?? null,
        triggeredAutomationId: triggered?.id ?? null,
        sentAt: subHours(new Date(), rand(0, 200)),
      },
    });
    // Outbound reply (a few minutes later)
    await prisma.message.create({
      data: {
        accountId: account.id,
        conversationId: conv.id,
        igMessageId: `m_out_${i}`,
        fromBusiness: true,
        text: "Hey! Klar, ich schicke dir gleich den Link 🚀",
        sentAt: new Date(inbound.sentAt.getTime() + rand(2, 45) * 60_000),
      },
    });
  }

  // ─── Leads ───
  console.log("  · leads");
  const allMedia = await prisma.instagramMedia.findMany({ where: { accountId: account.id } });
  const allConvs = await prisma.conversation.findMany({ where: { accountId: account.id } });
  const statuses: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "CALL_BOOKED", "PURCHASED", "LOST"];
  const sources: LeadSource[] = ["DM_KEYWORD", "MANYCHAT", "UTM_LINK", "STORY_REPLY", "LINK_IN_BIO", "COMMENT_KEYWORD"];

  for (let i = 0; i < 80; i++) {
    const camp = pick(campaigns);
    const media = pick(allMedia);
    const status = pick(statuses);
    await prisma.lead.create({
      data: {
        accountId: account.id,
        fullName: `Lead ${i + 1}`,
        email: `lead${i + 1}@example.com`,
        igUsername: `igu_${i + 1}`,
        status,
        source: pick(sources),
        sourceMediaId: Math.random() < 0.6 ? media.id : null,
        sourceCampaignId: camp.id,
        ctaKeyword: camp.ctaKeyword,
        utmSource: "ig",
        utmMedium: Math.random() < 0.5 ? "reel" : "bio",
        utmCampaign: camp.utmCampaign,
        utmContent: media.igMediaId,
        landingPage: `/${camp.ctaKeyword?.toLowerCase()}`,
        conversationId: Math.random() < 0.4 ? pick(allConvs).id : null,
        bookedCallAt: status === "CALL_BOOKED" || status === "PURCHASED" ? subDays(new Date(), rand(1, 30)) : null,
        purchasedAt: status === "PURCHASED" ? subDays(new Date(), rand(1, 30)) : null,
        createdAt: subDays(new Date(), rand(0, 60)),
      },
    });
  }

  // ─── Sample reports (last 7 days daily) ───
  console.log("  · reports");
  for (let i = 1; i <= 7; i++) {
    const start = startOfDay(subDays(new Date(), i));
    const end = new Date(start);
    end.setHours(23, 59, 59);
    await prisma.report.upsert({
      where: { accountId_type_periodStart: { accountId: account.id, type: "DAILY", periodStart: start } },
      update: {},
      create: {
        accountId: account.id,
        type: "DAILY",
        periodStart: start,
        periodEnd: end,
        summary: `${rand(3, 12)} neue Leads · Top-Reel ${rand(8000, 45000)} Views · CTA „ROADMAP“ stark`,
        payload: {
          topMedia: pick(CAPTIONS).slice(0, 50),
          bestHook: "question",
          bestCta: "DM_KEYWORD: ROADMAP",
          warning: i === 3 ? "Engagement unter 30-Tage-Schnitt" : null,
          recommendation: "Mehr Story-Hooks (POV) testen.",
        },
      },
    });
  }

  console.log("✅ Seed complete. Login: ", process.env.ADMIN_EMAIL ?? "admin@example.com");
}

// ──────────────── helpers ────────────────
function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
const UNSPLASH_THUMBS = [
  "1611162616305-c69b3fa7fbe0",
  "1556761175-5973dc0f32e7",
  "1517457373958-b7bdd4587205",
  "1522202176988-66273c2fd55f",
  "1573496359142-b8d87734a5a2",
  "1551836022-d5d88e9218df",
  "1494790108377-be9c29b29330",
  "1531123897727-8f129e1688ce",
  "1573497019418-b400bb3ab074",
  "1488161628813-04466f872be2",
];
function pickThumb(i: number) {
  return UNSPLASH_THUMBS[i % UNSPLASH_THUMBS.length];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
