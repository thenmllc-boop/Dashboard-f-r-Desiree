import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiTile } from "@/components/kpi-tile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAccount, getLeadFunnel } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "default" | "secondary" | "gold" | "outline" | "muted" | "destructive" | "success"> = {
  NEW: "outline",
  CONTACTED: "secondary",
  QUALIFIED: "gold",
  CALL_BOOKED: "gold",
  PURCHASED: "success",
  LOST: "destructive",
};

export default async function LeadsPage() {
  const account = await getAccount();
  if (!account) return null;

  const [funnel, leads, sourceGroups, campaigns] = await Promise.all([
    getLeadFunnel(account.id),
    prisma.lead.findMany({
      where: { accountId: account.id },
      include: { sourceMedia: true, sourceCampaign: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.lead.groupBy({ by: ["source"], where: { accountId: account.id }, _count: { _all: true } }),
    prisma.campaign.findMany({ where: { accountId: account.id }, include: { _count: { select: { leads: true } } } }),
  ]);

  return (
    <PageShell title="Lead Attribution" subtitle="Woher kommen deine Leads – Video, CTA, Keyword, UTM, ManyChat">
      {/* Hinweis-Box */}
      <Card className="mb-4 border-gold/40 bg-gold-100/50">
        <CardContent className="py-4 text-sm text-foreground/80">
          <strong className="text-forest">Hinweis zur Attribution:</strong> Instagram liefert offiziell{" "}
          <em>nicht</em>, welcher Kunde durch welches Video kam. Wir bauen die Verbindung selbst – über{" "}
          <Badge variant="secondary" className="mx-1">CTA-Keyword pro Video</Badge>
          <Badge variant="secondary" className="mx-1">UTM-Links</Badge>
          <Badge variant="secondary" className="mx-1">ManyChat-Tags</Badge>
          <Badge variant="secondary" className="mx-1">Landingpage-Tracking</Badge>
        </CardContent>
      </Card>

      {/* Funnel KPIs */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="Leads gesamt" value={funnel.total} />
        <KpiTile label="Kontaktiert" value={funnel.contacted} />
        <KpiTile label="Qualifiziert" value={funnel.qualified} />
        <KpiTile label="Call gebucht" value={funnel.calls} />
        <KpiTile label="Gekauft" value={funnel.purchased} />
        <KpiTile label="Verloren" value={funnel.lost} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lead-Quellen</CardTitle>
            <CardDescription>Wo treten Leads zuerst in Kontakt?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sourceGroups.map((g) => (
              <div key={g.source} className="flex items-center justify-between rounded-md bg-cream p-3">
                <span className="text-sm font-medium">{g.source.replace(/_/g, " ")}</span>
                <Badge variant="secondary">{g._count._all}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aktive Kampagnen</CardTitle>
            <CardDescription>CTA-Keyword + UTM + ManyChat-Tag pro Kampagne</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kampagne</TableHead>
                  <TableHead>CTA Keyword</TableHead>
                  <TableHead>UTM</TableHead>
                  <TableHead>ManyChat Tag</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{c.ctaKeyword ?? "—"}</code></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.utmCampaign ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{c.manychatTag ?? "—"}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{c._count.leads}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Letzte Leads</CardTitle>
          <CardDescription>Vollständige Attribution: Video → CTA → Keyword → ManyChat → Landingpage</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quelle</TableHead>
                <TableHead>Video</TableHead>
                <TableHead>CTA / Keyword</TableHead>
                <TableHead>UTM</TableHead>
                <TableHead>Erstellt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium">{l.fullName ?? l.igUsername ?? "(Anonym)"}</div>
                    <div className="text-xs text-muted-foreground">{l.email ?? l.phone ?? ""}</div>
                  </TableCell>
                  <TableCell><Badge variant={statusVariant[l.status] ?? "muted"}>{l.status}</Badge></TableCell>
                  <TableCell className="text-xs">{l.source.replace(/_/g, " ")}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {l.sourceMedia?.caption ?? "—"}
                  </TableCell>
                  <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{l.ctaKeyword ?? "—"}</code></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.utmCampaign ?? "—"}</TableCell>
                  <TableCell className="text-xs">{formatDate(l.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}
