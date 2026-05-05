import { Inbox, Clock, Tag, MessageSquare } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { KpiTile } from "@/components/kpi-tile";
import { AreaChartCard } from "@/components/charts/area-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAccount, getDmsSeries } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DmsPage() {
  const account = await getAccount();
  if (!account) return null;

  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);

  const [today_, week_, month_, total_, unread, recent, automations, dmSeries] = await Promise.all([
    prisma.message.count({ where: { accountId: account.id, fromBusiness: false, sentAt: { gte: today } } }),
    prisma.message.count({ where: { accountId: account.id, fromBusiness: false, sentAt: { gte: weekStart } } }),
    prisma.message.count({ where: { accountId: account.id, fromBusiness: false, sentAt: { gte: monthStart } } }),
    prisma.message.count({ where: { accountId: account.id, fromBusiness: false } }),
    prisma.conversation.aggregate({ where: { accountId: account.id }, _sum: { unreadCount: true } }),
    prisma.message.findMany({
      where: { accountId: account.id, fromBusiness: false },
      include: { conversation: true, automation: true },
      orderBy: { sentAt: "desc" },
      take: 25,
    }),
    prisma.automationTrigger.findMany({
      where: { accountId: account.id },
      orderBy: { triggerCount: "desc" },
    }),
    getDmsSeries(account.id, 30),
  ]);

  // Avg response time = avg time from inbound message → next outbound from business in same conv
  const responseSamples = await prisma.message.findMany({
    where: { accountId: account.id, sentAt: { gte: subDays(new Date(), 30) } },
    orderBy: [{ conversationId: "asc" }, { sentAt: "asc" }],
    select: { conversationId: true, fromBusiness: true, sentAt: true },
  });
  const avgResponseMin = computeAvgResponseMin(responseSamples);

  // Keyword frequency
  const inboundKeywords = await prisma.message.findMany({
    where: { accountId: account.id, fromBusiness: false, triggeredKeyword: { not: null }, sentAt: { gte: subDays(new Date(), 30) } },
    select: { triggeredKeyword: true },
  });
  const keywordCounts = inboundKeywords.reduce((acc, m) => {
    const k = m.triggeredKeyword!;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PageShell title="DMs & Engagement" subtitle="Inbox, Keywords, Automationen und Antwortzeiten">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiTile label="DMs heute" value={today_} icon={<Inbox className="h-4 w-4" />} />
        <KpiTile label="DMs (Woche)" value={week_} icon={<MessageSquare className="h-4 w-4" />} />
        <KpiTile label="DMs (Monat)" value={month_} icon={<MessageSquare className="h-4 w-4" />} />
        <KpiTile label="DMs gesamt" value={total_} />
        <KpiTile label="Ungelesen" value={unread._sum.unreadCount ?? 0} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>DMs der letzten 30 Tage</CardTitle>
            <CardDescription>Eingehende Nachrichten pro Tag</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChartCard data={dmSeries} xKey="date" yKeys={["DMs"]} colors={["#7FAF9B"]} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Antwortzeit</CardTitle>
            <CardDescription>Durchschnitt der letzten 30 Tage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-sage" />
              <div>
                <div className="font-display text-3xl font-semibold text-forest">
                  {avgResponseMin === null ? "—" : `${avgResponseMin} min`}
                </div>
                <div className="text-xs text-muted-foreground">First-Response Zeit</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Häufigste Keywords / Fragen</CardTitle>
            <CardDescription>Was triggert deine Funnels?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(keywordCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([k, n]) => (
                <div key={k} className="flex items-center justify-between rounded-md bg-cream p-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-sage" />
                    <code className="text-sm">{k}</code>
                  </div>
                  <Badge variant="secondary">{n}</Badge>
                </div>
              ))}
            {Object.keys(keywordCounts).length === 0 && (
              <p className="text-sm text-muted-foreground">Keine Keyword-Trigger erfasst.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Automationen</CardTitle>
            <CardDescription>Welche DM-Funnels laufen am meisten?</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Quelle</TableHead>
                  <TableHead className="text-right">Trigger</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{a.keyword}</code></TableCell>
                    <TableCell><Badge variant="outline">{a.source}</Badge></TableCell>
                    <TableCell className="text-right">{a.triggerCount}</TableCell>
                    <TableCell className="text-right text-sage-700 font-semibold">{a.leadCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Aktuelle DMs</CardTitle>
          <CardDescription>Live aus der Instagram Messaging API + Webhooks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recent.map((m) => (
              <div key={m.id} className="flex items-start gap-3 rounded-md bg-cream p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700">
                  {(m.conversation.participantUsername ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">@{m.conversation.participantUsername ?? "user"}</span>
                    {m.triggeredKeyword && <Badge variant="gold">Trigger: {m.triggeredKeyword}</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{m.text ?? "(Anhang)"}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(m.sentAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function computeAvgResponseMin(samples: Array<{ conversationId: string; fromBusiness: boolean; sentAt: Date }>) {
  const byConv = new Map<string, typeof samples>();
  for (const s of samples) {
    const arr = byConv.get(s.conversationId) ?? [];
    arr.push(s);
    byConv.set(s.conversationId, arr);
  }
  const diffs: number[] = [];
  for (const arr of byConv.values()) {
    for (let i = 0; i < arr.length - 1; i++) {
      if (!arr[i].fromBusiness && arr[i + 1].fromBusiness) {
        diffs.push((arr[i + 1].sentAt.getTime() - arr[i].sentAt.getTime()) / 60000);
      }
    }
  }
  if (!diffs.length) return null;
  return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
}
