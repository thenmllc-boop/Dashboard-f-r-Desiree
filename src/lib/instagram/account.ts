import { igFetch } from "./client";

export type IgAccountProfile = {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
};

export async function fetchAccountProfile(igUserId: string, accessToken?: string) {
  return igFetch<IgAccountProfile>(`/${igUserId}`, {
    accessToken,
    searchParams: {
      fields: "id,username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count",
    },
  });
}

/**
 * Account-level daily insights.
 *
 * Note (2024+): Meta moved many account metrics to a single /insights call
 * with `metric_type=total_value`. We request the most commonly available ones
 * here; if a metric is unsupported for the connected account type the API
 * silently omits it (we treat missing as 0 in the cron).
 *
 * Available examples: reach, profile_views, website_clicks, accounts_engaged,
 * total_interactions, follows_and_unfollows (BETA, may require special access).
 */
export async function fetchAccountDailyInsights(igUserId: string, since: Date, until: Date, accessToken?: string) {
  return igFetch<{ data: Array<{ name: string; values: Array<{ value: number; end_time: string }> }> }>(
    `/${igUserId}/insights`,
    {
      accessToken,
      searchParams: {
        metric: "reach,profile_views,website_clicks,follower_count,total_interactions",
        period: "day",
        since: Math.floor(since.getTime() / 1000),
        until: Math.floor(until.getTime() / 1000),
      },
    }
  );
}

export async function fetchAudienceInsights(igUserId: string, accessToken?: string) {
  // audience_country / audience_gender_age etc. need ≥100 followers and may be deprecated for some accounts.
  return igFetch<{ data: Array<{ name: string; values: Array<{ value: Record<string, number> }> }> }>(
    `/${igUserId}/insights`,
    {
      accessToken,
      searchParams: {
        metric: "audience_country,audience_city,audience_gender_age,audience_locale",
        period: "lifetime",
      },
    }
  );
}
