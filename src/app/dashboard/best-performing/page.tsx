import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChartCard } from "@/components/charts/bar-chart";
import { getAccount, getTopMedia } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BestPerformingPage() {
  const account = await getAccount();
  if (!account) return null;

  const [byViews, bySaves, byShares, byComments, byLeads, byEngagement, allMedia] = await Promise.all([
    getTopMedia(account.id, "views", 10),
    getTopMedia(account.id, "saves", 10),
    getTopMedia(account.id, "shares", 10),
    getTopMedia(account.id, "comments", 10),
    getTopMedia(account.id, "leads", 10),
    getTopMedia(account.id, "engagementRate", 10),
    prisma.instagramMedia.findMany({ where: { accountId: account.id } }),
  ]);

  // Pattern analysis
  const hookGroups = groupAvg(allMedia, (m) => m.hookType ?? "—", "engagementRate");
  const ctaGroups = groupCount(allMedia, (m) => m.ctaType ?? "—");
  const lengthBuckets = bucketByLength(allMedia);

  return (
    <PageShell title="Best Performing Videos" subtitle="Rankings + Mustererkennung über deine besten Inhalte">
      <Tabs defaultValue="views">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="views">Views</TabsTrigger>
          <TabsTrigger value="saves">Saves</TabsTrigger>
          <TabsTrigger value="shares">Shares</TabsTrigger>
          <TabsTrigger value="comments">Kommentare</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="engagement">Conversion / ER</TabsTrigger>
        </TabsList>

        <TabsContent value="views"><RankTable items={byViews} field="views" label="Views" /></TabsContent>
        <TabsContent value="saves"><RankTable items={bySaves} field="saves" label="Saves" /></TabsContent>
        <TabsContent value="shares"><RankTable items={byShares} field="shares" label="Shares" /></TabsContent>
        <TabsContent value="comments"><RankTable items={byComments} field="comments" label="Kommentare" /></TabsContent>
        <TabsContent value="leads"><RankTable items={byLeads} field="leadCount" label="Leads" isLead /></TabsContent>
        <TabsContent value="engagement"><RankTable items={byEngagement} field="engagementRate" label="Engagement Rate" isPercent /></TabsContent>
      </Tabs>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Welche Hooks performen am besten?</CardTitle>
            <CardDescription>Durchschnittliche Engagement Rate je Hook-Typ</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartCard data={hookGroups} xKey="key" yKey="value" color="#7FAF9B" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Welche CTAs bringen am meisten?</CardTitle>
            <CardDescription>Häufigkeit & relative Performance</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartCard data={ctaGroups} xKey="key" yKey="value" color="#C6A76D" layout="vertical" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Optimale Videolänge</CardTitle>
            <CardDescription>Engagement gruppiert nach Reel-Länge</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartCard data={lengthBuckets} xKey="key" yKey="value" color="#1F3D34" />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function RankTable({
  items,
  field,
  label,
  isPercent,
  isLead,
}: {
  items: Array<Record<string, unknown> & { id: string; caption: string | null; thumbnailUrl: string | null }>;
  field: string;
  label: string;
  isPercent?: boolean;
  isLead?: boolean;
}) {
  return (
    <Card className="mt-4">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Caption</TableHead>
              <TableHead className="text-right">{label}</TableHead>
              <TableHead className="text-right">ER</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((m, idx) => (
              <TableRow key={m.id}>
                <TableCell className="font-semibold text-muted-foreground">{idx + 1}</TableCell>
                <TableCell>
                  <div className="h-12 w-12 overflow-hidden rounded bg-muted">
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumbnailUrl as string} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="max-w-md truncate text-sm">{m.caption ?? "—"}</TableCell>
                <TableCell className="text-right font-semibold">
                  {isPercent ? formatPercent(Number(m[field])) : isLead ? formatNumber(Number(m[field])) : formatNumber(Number(m[field]))}
                </TableCell>
                <TableCell className="text-right">{formatPercent(Number((m as Record<string, unknown>).engagementRate ?? 0))}</TableCell>
                <TableCell>
                  <Badge variant={m.status === "WINNER" ? "gold" : m.status === "WEAK" ? "destructive" : "muted"}>
                    {m.status as string ?? "AVG"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function groupAvg<T>(items: T[], key: (x: T) => string, field: keyof T) {
  const map = new Map<string, { sum: number; count: number }>();
  for (const it of items) {
    const k = key(it);
    if (!map.has(k)) map.set(k, { sum: 0, count: 0 });
    const v = map.get(k)!;
    v.sum += Number(it[field]) || 0;
    v.count += 1;
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, value: v.count ? +(v.sum / v.count * 100).toFixed(2) : 0 }));
}
function groupCount<T>(items: T[], key: (x: T) => string) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([key, value]) => ({ key, value }));
}
function bucketByLength(items: Array<{ durationSec?: number | null; engagementRate: number }>) {
  const buckets = [
    { key: "0-15s", min: 0, max: 15, sum: 0, n: 0 },
    { key: "15-30s", min: 15, max: 30, sum: 0, n: 0 },
    { key: "30-60s", min: 30, max: 60, sum: 0, n: 0 },
    { key: "60-90s", min: 60, max: 90, sum: 0, n: 0 },
    { key: "90s+", min: 90, max: Infinity, sum: 0, n: 0 },
  ];
  for (const m of items) {
    const d = m.durationSec ?? 0;
    const b = buckets.find((b) => d >= b.min && d < b.max);
    if (!b) continue;
    b.sum += m.engagementRate;
    b.n += 1;
  }
  return buckets.map((b) => ({ key: b.key, value: b.n ? +(b.sum / b.n * 100).toFixed(2) : 0 }));
}
