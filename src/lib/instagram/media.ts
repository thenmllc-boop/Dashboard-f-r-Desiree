import { igFetch } from "./client";

export type IgMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: "FEED" | "REELS" | "STORY" | "AD";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

export type IgMediaPage<T> = {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
};

export async function fetchMediaPage(igUserId: string, after?: string, accessToken?: string) {
  return igFetch<IgMediaPage<IgMedia>>(`/${igUserId}/media`, {
    accessToken,
    searchParams: {
      fields:
        "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
      limit: 50,
      after,
    },
  });
}

export async function* iterateAllMedia(igUserId: string, accessToken?: string) {
  let cursor: string | undefined = undefined;
  do {
    const page: IgMediaPage<IgMedia> = await fetchMediaPage(igUserId, cursor, accessToken);
    for (const m of page.data) yield m;
    cursor = page.paging?.cursors?.after;
    if (!page.paging?.next) cursor = undefined;
  } while (cursor);
}

/**
 * Per-media insights.
 *
 * Metric availability per media type (IG Graph v21):
 *   FEED IMAGE/VIDEO  : reach, saved, likes, comments, shares, total_interactions, profile_visits, follows
 *   CAROUSEL          : reach, saved, likes, comments, shares, total_interactions
 *   REELS             : reach, saved, likes, comments, shares, total_interactions, plays/views, ig_reels_avg_watch_time, ig_reels_video_view_total_time
 *   STORY             : reach, replies, taps_forward, taps_back, exits, total_interactions
 *
 * We request a superset and gracefully ignore "Unsupported metric" errors.
 */
export async function fetchMediaInsights(mediaId: string, mediaProductType: string | undefined, accessToken?: string) {
  const metrics =
    mediaProductType === "REELS"
      ? "reach,saved,likes,comments,shares,total_interactions,plays,ig_reels_avg_watch_time,ig_reels_video_view_total_time"
      : mediaProductType === "STORY"
      ? "reach,replies,taps_forward,taps_back,exits,total_interactions"
      : "reach,saved,likes,comments,shares,total_interactions,profile_visits,follows";

  return igFetch<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
    `/${mediaId}/insights`,
    {
      accessToken,
      searchParams: { metric: metrics },
    }
  );
}

/** Helper: flatten the IG insights response into { name → value } */
export function insightsToMap(payload: { data: Array<{ name: string; values: Array<{ value: number }> }> }) {
  const map: Record<string, number> = {};
  for (const m of payload.data) {
    map[m.name] = m.values?.[0]?.value ?? 0;
  }
  return map;
}
