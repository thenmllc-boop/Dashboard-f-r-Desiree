/**
 * Instagram Graph Webhook handler.
 *
 * Verification (one-time, set in Meta App > Webhooks):
 *   GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
 *
 * Events we subscribe to (Meta App > Webhooks > Instagram):
 *   - messages          (inbound DMs)
 *   - messaging_postbacks
 *   - message_reactions
 *   - comments          (post/reel comments)
 *   - mentions
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { attributeLead, matchKeywordTrigger } from "@/lib/attribution";

export const runtime = "nodejs";

// ──────────── GET: Webhook verification handshake ────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.IG_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ──────────── POST: Event delivery ────────────
type IgWebhookPayload = {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: { mid: string; text?: string; attachments?: Array<{ type: string; payload?: { url?: string } }> };
      postback?: { mid: string; payload?: string; title?: string };
    }>;
    changes?: Array<{ field: string; value: Record<string, unknown> }>;
  }>;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as IgWebhookPayload;

  // Always 200 quickly; do real work async (Meta retries on non-200).
  setTimeout(() => {
    handlePayload(body).catch((e) => console.error("[ig webhook] handler error", e));
  }, 0);

  return NextResponse.json({ ok: true });
}

async function handlePayload(payload: IgWebhookPayload) {
  for (const entry of payload.entry ?? []) {
    // entry.id is the IG Business Account ID
    const account = await prisma.account.findUnique({ where: { igUserId: entry.id } });
    if (!account) continue;

    // ────── DM events ──────
    for (const m of entry.messaging ?? []) {
      if (!m.message?.text && !m.message?.mid) continue;
      const text = m.message.text ?? "";
      const fromBusiness = m.sender.id === account.igUserId;

      // Upsert conversation by (accountId, participantId)
      const otherId = fromBusiness ? m.recipient.id : m.sender.id;
      const conv = await prisma.conversation.upsert({
        where: { igThreadId: `${account.igUserId}:${otherId}` },
        create: {
          accountId: account.id,
          igThreadId: `${account.igUserId}:${otherId}`,
          participantId: otherId,
          lastMessageAt: new Date(m.timestamp),
          unreadCount: fromBusiness ? 0 : 1,
        },
        update: {
          lastMessageAt: new Date(m.timestamp),
          unreadCount: { increment: fromBusiness ? 0 : 1 },
        },
      });

      // Match keyword trigger (only on inbound DMs)
      let triggered = null as Awaited<ReturnType<typeof matchKeywordTrigger>>;
      if (!fromBusiness && text) {
        triggered = await matchKeywordTrigger(account.id, text);
      }

      await prisma.message.upsert({
        where: { igMessageId: m.message.mid },
        create: {
          accountId: account.id,
          conversationId: conv.id,
          igMessageId: m.message.mid,
          fromBusiness,
          text,
          attachmentType: m.message.attachments?.[0]?.type ?? null,
          attachmentUrl: m.message.attachments?.[0]?.payload?.url ?? null,
          triggeredKeyword: triggered?.keyword ?? null,
          triggeredAutomationId: triggered?.id ?? null,
          sentAt: new Date(m.timestamp),
        },
        update: {},
      });

      // If a keyword was matched, create a Lead with full attribution
      if (!fromBusiness && triggered) {
        await prisma.automationTrigger.update({
          where: { id: triggered.id },
          data: { triggerCount: { increment: 1 } },
        });
        await attributeLead({
          accountId: account.id,
          conversationId: conv.id,
          ctaKeyword: triggered.keyword,
        });
      }
    }

    // ────── Comments / mentions ──────
    for (const change of entry.changes ?? []) {
      // Forward to a domain handler – kept minimal here
      console.log("[ig webhook] change", change.field, change.value);
    }
  }
}
