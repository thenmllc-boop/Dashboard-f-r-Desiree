import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChartCard } from "@/components/charts/line-chart";
import { BarChartCard } from "@/components/charts/bar-chart";
import { KpiTile } from "@/components/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { getAccount, getBestPostingTimes, getFollowerSeries } from "@/lib/analytics";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AudiencePage() {
  const account = await getAccount();
  if (!account) return null;

  const [series, postingTimes, snapshots] = await Promise.all([
    getFollowerSeries(account.id, 90),
    getBestPostingTimes(account.id),
    prisma.followerSnapshot.findMany({
      where: { accountId: account.id },
      orderBy: { capturedAt: "desc" },
      take: 30,
    }),
  ]);

  const last = snapshots[0];
  const weekAgo = snapshots[7];
  const monthAgo = snapshots[29];

  const weekDelta = last && weekAgo ? last.followers - weekAgo.followers : 0;
  const monthDelta = last && monthAgo ? last.followers - monthAgo.followers : 0;

  // Day-of-week aggregation
  const media = await prisma.instagramMedia.findMany({
    where: { accountId: account.id },
    select: { timestamp: true, engagementRate: true },
  });
  const dows = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const dowMap = dows.map((d) => ({ key: d, sum: 0, n: 0 }));
  for (const m of media) {
    const i = (m.timestamp.getDay() + 6) % 7; // make Mon=0
    dowMap[i].sum += m.engagementRate;
    dowMap[i].n += 1;
  }
  const dowChart = dowMap.map((b) => ({ key: b.key, value: b.n ? +(b.sum / b.n * 100).toFixed(2) : 0 }));

  return (
    <PageShell title="Audience Analytics" subtitle="Follower-Wachstum, beste Posting-Zeiten & Demografie">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Follower" value={account.followersCount} />
        <KpiTile label="Wachstum (7 Tage)" value={weekDelta} />
        <KpiTile label="Wachstum (30 Tage)" value={monthDelta} />
        <KpiTile
          label="Verluste (Schätzung)"
          value={0}
          unavailable
          unavailableReason="Direkte Unfollow-Daten werden von der IG API nicht geliefert. Schätzung über Snapshot-Differenz."
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Follower-Verlauf (90 Tage)</CardTitle>
            <CardDescription>Tägliche Snapshots aus Cron-Job</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChartCard data={series} xKey="date" yKeys={["Follower"]} height={280} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivste Wochentage</CardTitle>
            <CardDescription>Avg. Engagement Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartCard data={dowChart} xKey="key" yKey="value" />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Beste Posting-Zeiten</CardTitle>
          <CardDescription>Avg. Engagement deiner Posts nach Stunde</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChartCard data={postingTimes} xKey="hour" yKey="avgEngagement" height={220} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <DemoCard title="Herkunftsländer" reason="Nur verfügbar bei ≥100 Followern (audience_country Insight)" />
        <DemoCard title="Alter / Geschlecht" reason="Nur verfügbar bei ≥100 Followern (audience_gender_age Insight)" />
        <DemoCard title="Top Städte" reason="Nur verfügbar bei ≥100 Followern (audience_city Insight)" />
      </div>
    </PageShell>
  );
}

function DemoCard({ title, reason }: { title: string; reason: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Über Instagram Graph API</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="muted" className="mb-3">Wird automatisch befüllt</Badge>
        <p className="text-xs text-muted-foreground">{reason}</p>
      </CardContent>
    </Card>
  );
}
