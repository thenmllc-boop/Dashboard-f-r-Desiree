/**
 * Lead attribution helpers.
 *
 * Instagram does NOT tell you which video a customer came from. We
 * reconstruct that link with several signals, in priority order:
 *
 *   1. CTA-keyword match  → unique trigger words assigned per Reel/campaign
 *      (e.g. "ROADMAP" for Reel A, "GUIDE" for Reel B). When a user DMs
 *      one of those words, we attribute them to that media + campaign.
 *
 *   2. ManyChat tag       → an external automation tags the user; we receive
 *      the tag via webhook and link it to a campaign.
 *
 *   3. UTM link            → custom landing page knows the IG source via
 *      ?utm_source=ig&utm_content=<media_id>. The form / GA4 measurement
 *      protocol pings /api/attribution/utm with these params.
 *
 *   4. Story reply / mention → the IG webhook payload contains the story
 *      media id, which we attribute directly.
 *
 *   5. Profile visit → fallback when no signal is present, lowest weight.
 */

import { prisma } from "./db";
import type { LeadSource } from "@prisma/client";

export type AttributionInput = {
  accountId: string;
  conversationId?: string;
  igUsername?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  // Signals
  ctaKeyword?: string;
  manychatTag?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
  storyMediaId?: string;
  landingPage?: string;
};

export async function attributeLead(input: AttributionInput) {
  const {
    accountId,
    ctaKeyword,
    manychatTag,
    utm,
    storyMediaId,
    landingPage,
    conversationId,
    igUsername,
    fullName,
    email,
    phone,
  } = input;

  // 1. CTA keyword → media + campaign
  let sourceMediaId: string | null = null;
  let sourceCampaignId: string | null = null;
  let source: LeadSource = "UNKNOWN";

  if (ctaKeyword) {
    const media = await prisma.instagramMedia.findFirst({
      where: { accountId, ctaKeyword: { equals: ctaKeyword, mode: "insensitive" } },
    });
    if (media) sourceMediaId = media.id;

    const campaign = await prisma.campaign.findFirst({
      where: { accountId, ctaKeyword: { equals: ctaKeyword, mode: "insensitive" } },
    });
    if (campaign) sourceCampaignId = campaign.id;

    source = "DM_KEYWORD";
  }

  // 2. ManyChat tag
  if (!sourceCampaignId && manychatTag) {
    const campaign = await prisma.campaign.findFirst({
      where: { accountId, manychatTag },
    });
    if (campaign) {
      sourceCampaignId = campaign.id;
      source = "MANYCHAT";
    }
  }

  // 3. UTM
  if (!sourceMediaId && utm?.content) {
    // utm_content carries the IG media's igMediaId in our convention
    const media = await prisma.instagramMedia.findUnique({ where: { igMediaId: utm.content } });
    if (media) sourceMediaId = media.id;
    if (source === "UNKNOWN") source = "UTM_LINK";
  }
  if (!sourceCampaignId && utm?.campaign) {
    const campaign = await prisma.campaign.findFirst({ where: { accountId, utmCampaign: utm.campaign } });
    if (campaign) sourceCampaignId = campaign.id;
  }

  // 4. Story reply
  if (!sourceMediaId && storyMediaId) {
    const media = await prisma.instagramMedia.findUnique({ where: { igMediaId: storyMediaId } });
    if (media) sourceMediaId = media.id;
    source = "STORY_REPLY";
  }

  const lead = await prisma.lead.create({
    data: {
      accountId,
      conversationId: conversationId ?? null,
      igUsername: igUsername ?? null,
      fullName: fullName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      ctaKeyword: ctaKeyword ?? null,
      utmSource: utm?.source ?? null,
      utmMedium: utm?.medium ?? null,
      utmCampaign: utm?.campaign ?? null,
      utmContent: utm?.content ?? null,
      utmTerm: utm?.term ?? null,
      landingPage: landingPage ?? null,
      sourceMediaId,
      sourceCampaignId,
      source,
    },
  });

  await prisma.attributionEvent.create({
    data: {
      type: ctaKeyword
        ? "DM_TRIGGER"
        : storyMediaId
        ? "STORY_REPLY"
        : utm?.content
        ? "LANDING_PAGE_VISIT"
        : manychatTag
        ? "MANYCHAT_TAG"
        : "PROFILE_VIEW",
      leadId: lead.id,
      mediaId: sourceMediaId,
      campaignId: sourceCampaignId,
      ctaKeyword: ctaKeyword ?? null,
      utmSource: utm?.source ?? null,
      utmMedium: utm?.medium ?? null,
      utmCampaign: utm?.campaign ?? null,
      utmContent: utm?.content ?? null,
      rawPayload: input as object,
    },
  });

  if (sourceCampaignId) {
    await prisma.campaign.update({
      where: { id: sourceCampaignId },
      data: { /* counter handled in aggregate cron */ },
    });
  }

  return lead;
}

/**
 * Match an inbound DM text against registered keyword triggers.
 * Returns the matched AutomationTrigger if any.
 */
export async function matchKeywordTrigger(accountId: string, text: string) {
  const cleaned = text.toLowerCase().trim();
  if (!cleaned) return null;
  const triggers = await prisma.automationTrigger.findMany({ where: { accountId, active: true } });
  for (const t of triggers) {
    if (cleaned.includes(t.keyword.toLowerCase())) return t;
  }
  return null;
}
