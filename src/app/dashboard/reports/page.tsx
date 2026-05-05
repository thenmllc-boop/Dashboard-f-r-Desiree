import { CalendarDays, Download } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAccount } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const account = await getAccount();
  if (!account) return null;

  const [daily, weekly, monthly] = await Promise.all([
    prisma.report.findMany({ where: { accountId: account.id, type: "DAILY" }, orderBy: { periodStart: "desc" }, take: 14 }),
    prisma.report.findMany({ where: { accountId: account.id, type: "WEEKLY" }, orderBy: { periodStart: "desc" }, take: 8 }),
    prisma.report.findMany({ where: { accountId: account.id, type: "MONTHLY" }, orderBy: { periodStart: "desc" }, take: 12 }),
  ]);

  return (
    <PageShell title="Daily / Monthly Reports" subtitle="Automatisch generiert um 08:00 Uhr">
      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Täglich</TabsTrigger>
          <TabsTrigger value="weekly">Wöchentlich</TabsTrigger>
          <TabsTrigger value="monthly">Monatlich</TabsTrigger>
        </TabsList>
        <TabsContent value="daily"><ReportList reports={daily} /></TabsContent>
        <TabsContent value="weekly"><ReportList reports={weekly} /></TabsContent>
        <TabsContent value="monthly"><ReportList reports={monthly} /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

function ReportList({ reports }: { reports: Array<{ id: string; periodStart: Date; periodEnd: Date; summary: string | null; payload: unknown }> }) {
  if (!reports.length) {
    return (
      <Card className="mt-4">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Noch keine Reports. Cron läuft täglich um 08:00 Uhr.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {reports.map((r) => {
        const p = r.payload as { topMedia?: string; bestHook?: string; bestCta?: string; warning?: string; recommendation?: string };
        return (
          <Card key={r.id}>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sage" />
                  {formatDate(r.periodStart)} → {formatDate(r.periodEnd)}
                </CardTitle>
                <CardDescription>Auto-generierter Report</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {r.summary && <p className="text-foreground/90">{r.summary}</p>}
              <div className="flex flex-wrap gap-2">
                {p?.topMedia && <Badge variant="gold">Top: {p.topMedia}</Badge>}
                {p?.bestHook && <Badge variant="secondary">Best Hook: {p.bestHook}</Badge>}
                {p?.bestCta && <Badge variant="secondary">Best CTA: {p.bestCta}</Badge>}
              </div>
              {p?.warning && (
                <div className="rounded-md border border-destructive/30 bg-red-50 p-3 text-xs text-destructive">
                  ⚠ {p.warning}
                </div>
              )}
              {p?.recommendation && (
                <div className="rounded-md border border-sage/30 bg-sage-50 p-3 text-xs text-sage-700">
                  💡 {p.recommendation}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
