// Cron: Account Insights – daily.
// crontab:  10 2 * * *  cd /app && npm run cron:account-insights
import { prisma } from "../../src/lib/db";
import { syncAccountInsights, syncAccountProfile } from "../../src/lib/instagram/sync";

async function main() {
  const accounts = await prisma.account.findMany();
  for (const a of accounts) {
    console.log(`[account-insights] sync ${a.username}`);
    await syncAccountProfile(a.id);
    await syncAccountInsights(a.id, 7);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());
