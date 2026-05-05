import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One-time admin setup endpoint.
 *
 * Protected by CRON_SECRET (same bearer token as cron routes).
 * Safe to call multiple times – upserts the user on every call.
 *
 * Usage:
 *   curl -X POST https://<your-domain>/api/setup/admin \
 *     -H "Authorization: Bearer <CRON_SECRET>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"desiree@example.de","password":"sicher123","name":"Desiree"}'
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({})) as {
    email?: string;
    password?: string;
    name?: string;
  };

  const email = (body.email ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = body.password ?? process.env.ADMIN_PASSWORD ?? "";
  const name = body.name ?? "Admin";

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, role: "ADMIN" },
    create: { email, name, passwordHash, role: "ADMIN" },
  });

  return NextResponse.json({
    ok: true,
    action: existing ? "updated" : "created",
    email: user.email,
    id: user.id,
  });
}
