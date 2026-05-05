/**
 * Instagram Graph API client.
 *
 * Reference docs:
 *  https://developers.facebook.com/docs/instagram-api/
 *  https://developers.facebook.com/docs/instagram-api/reference/ig-user/insights
 *  https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
 *
 * Required env:
 *  - META_GRAPH_API_VERSION (default v21.0)
 *  - IG_ACCESS_TOKEN  (long-lived page token)
 *  - IG_BUSINESS_ACCOUNT_ID
 *
 * Notes on availability:
 *  - Some metrics depend on the Instagram product type and the audience size.
 *  - audience_country / city / gender_age require ≥100 followers.
 *  - "follower lost" / unfollows are NOT exposed by the API → use FollowerSnapshot
 *    diff to estimate.
 *  - "which lead came from which video" is NOT exposed → see lib/attribution.ts.
 */

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION ?? "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class IgApiError extends Error {
  status: number;
  fbCode?: number;
  fbSubcode?: number;
  type?: string;
  isRateLimit: boolean;
  retryAfterSec: number | null;

  constructor(message: string, payload: { status: number; fbCode?: number; fbSubcode?: number; type?: string; retryAfterSec?: number | null }) {
    super(message);
    this.status = payload.status;
    this.fbCode = payload.fbCode;
    this.fbSubcode = payload.fbSubcode;
    this.type = payload.type;
    this.isRateLimit =
      payload.status === 429 ||
      payload.fbCode === 4 || // (#4) Application request limit reached
      payload.fbCode === 17 || // (#17) User request limit reached
      payload.fbCode === 32; // page-level rate limit
    this.retryAfterSec = payload.retryAfterSec ?? null;
  }
}

export type FetchOptions = {
  accessToken?: string;
  searchParams?: Record<string, string | number | undefined>;
  /** Retries on 5xx & rate-limit errors with exponential backoff. */
  retries?: number;
};

export async function igFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const token = opts.accessToken ?? process.env.IG_ACCESS_TOKEN;
  if (!token) throw new Error("IG_ACCESS_TOKEN missing");

  const url = new URL(`${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(opts.searchParams ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const maxAttempts = (opts.retries ?? 3) + 1;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        // 60s timeout via AbortSignal
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        const body = await safeJson(res);
        const fbErr = body?.error;
        const retryAfter = res.headers.get("retry-after");
        const err = new IgApiError(fbErr?.message ?? `IG API error ${res.status}`, {
          status: res.status,
          fbCode: fbErr?.code,
          fbSubcode: fbErr?.error_subcode,
          type: fbErr?.type,
          retryAfterSec: retryAfter ? Number(retryAfter) : null,
        });
        if ((err.isRateLimit || res.status >= 500) && attempt < maxAttempts) {
          const delay = err.retryAfterSec ? err.retryAfterSec * 1000 : Math.min(2 ** attempt * 500, 15_000);
          await sleep(delay);
          continue;
        }
        throw err;
      }
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (e instanceof IgApiError) throw e;
      if (attempt < maxAttempts) {
        await sleep(Math.min(2 ** attempt * 500, 15_000));
        continue;
      }
    }
  }
  throw lastErr;
}

function safeJson(res: Response) {
  return res.json().catch(() => null);
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
