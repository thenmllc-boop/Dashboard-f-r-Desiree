/**
 * Landing-page → lead attribution endpoint.
 *
 * Embed on your landing page:
 *
 *   const params = new URLSearchParams(location.search);
 *   await fetch("/api/attribution/utm", {
 *     method: "POST",
 *     headers: { "content-type": "application/json" },
 *     body: JSON.stringify({
 *       email, name,
 *       utm: {
 *         source: params.get("utm_source"),
 *         medium: params.get("utm_medium"),
 *         campaign: params.get("utm_campaign"),
 *         content: params.get("utm_content"),  // = ig media id
 *         term: params.get("utm_term"),
 *       },
 *       landingPage: location.pathname,
 *     }),
 *   });
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { attributeLead } from "@/lib/attribution";

const schema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  igUsername: z.string().optional(),
  utm: z
    .object({
      source: z.string().nullable().optional(),
      medium: z.string().nullable().optional(),
      campaign: z.string().nullable().optional(),
      content: z.string().nullable().optional(),
      term: z.string().nullable().optional(),
    })
    .optional(),
  landingPage: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const account = await prisma.account.findFirst();
  if (!account) return NextResponse.json({ error: "no_account" }, { status: 404 });

  const lead = await attributeLead({
    accountId: account.id,
    email: parsed.data.email,
    fullName: parsed.data.name,
    phone: parsed.data.phone,
    igUsername: parsed.data.igUsername,
    utm: {
      source: parsed.data.utm?.source ?? undefined,
      medium: parsed.data.utm?.medium ?? undefined,
      campaign: parsed.data.utm?.campaign ?? undefined,
      content: parsed.data.utm?.content ?? undefined,
      term: parsed.data.utm?.term ?? undefined,
    },
    landingPage: parsed.data.landingPage,
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
