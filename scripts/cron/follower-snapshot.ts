/**
 * Cron: Follower Snapshot – daily.
 * Captures follower count to enable churn estimation
 * (since the IG API doesn't expose unfollows).
 * crontab:  0 3 * * *  cd /app && npm run cron:follower-snapshot
 */
import { prisma } from "../../src/lib/db";
import { fetchAccountProfile } from "../../src/lib/instagram/account";

async function main() {
  const accounts = await prisma.account.findMany();
  for (const a of accounts) {
    try {
      const profile = await fetchAccountProfile(a.igUserId, a.accessToken);
      await prisma.followerSnapshot.create({
        data: {
          accountId: a.id,
          followers: profile.followers_count ?? 0,
          follows: profile.follows_count ?? 0,
          mediaCount: profile.media_count ?? 0,
        },
      });
      await prisma.account.update({
        where: { id: a.id },
        data: { followersCount: profile.followers_count ?? 0, followsCount: profile.follows_count ?? 0 },
      });
      console.log(`[follower-snapshot] ${a.username}: ${profile.followers_count}`);
    } catch (e) {
      console.warn(`[follower-snapshot] ${a.username} failed:`, (e as Error).message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
