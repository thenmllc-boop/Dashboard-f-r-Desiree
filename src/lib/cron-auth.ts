import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight bearer-token check for /api/cron/* and /api/sync/* endpoints.
 * Set CRON_SECRET in your env, then call the route with header
 *   Authorization: Bearer <CRON_SECRET>
 */
export function ensureCronAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return null; // disabled in dev
  const got = req.headers.get("authorization") ?? "";
  if (got !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
