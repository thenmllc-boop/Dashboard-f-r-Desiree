// Cron: Media Insights – every 6 hours.
// crontab:  0 */6 * * *  cd /app && npm run cron:media-insights
import { prisma } from "../../src/lib/db";
import { syncMediaForAccount, syncMediaInsights } from "../../src/lib/instagram/sync";

async function main() {
  const accounts = await prisma.account.findMany();
  for (const a of accounts) {
    console.log(`[media-insights] sync ${a.username}`);
    await syncMediaForAccount(a.id);
    await syncMediaInsights(a.id, 50);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
