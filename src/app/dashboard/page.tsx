import {
  Eye,
  Heart,
  Inbox,
  Link2,
  MessageSquare,
  MousePointerClick,
  Target,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { KpiTile } from "@/components/kpi-tile";
import { MediaCard } from "@/components/media-card";
import { AreaChartCard } from "@/components/charts/area-chart";
import { LineChartCard } from "@/components/charts/line-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAccount, getDailySeries, getFollowerSeries, getOverviewKpis, getTopMedia } from "@/lib/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const account = await getAccount();
  if (!account) return <EmptyState />;

  const [kpis, daily, followers, topByViews, topByEngagement] = await Promise.all([
    getOverviewKpis(account.id),
    getDailySeries(account.id, 30),
    getFollowerSeries(account.id, 30),
    getTopMedia(account.id, "views", 5),
    getTopMedia(account.id, "engagementRate", 5),
  ]);

  return (
    <PageShell
      title={`Hallo @${account.username}`}
      subtitle="Live Übersicht deiner Instagram Performance · Letzte 30 Tage"
    >
      {/* KPI ROW 1 — Audience */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Follower gesamt" value={kpis.followers} icon={<Users className="h-4 w-4" />} hint="Live aus Graph API" />
        <KpiTile label="Neue Follower heute" value={kpis.newFollowersToday} delta={kpis.newFollowersTodayDelta} icon={<UserPlus className="h-4 w-4" />} />
        <KpiTile label="Neue Follower (Monat)" value={kpis.newFollowersMonth} icon={<TrendingUp className="h-4 w-4" />} />
        {kpis.estimatedUnfollowsMonth === null ? (
          <KpiTile
            label="Unfollows (Monat)"
            value={0}
            icon={<UserMinus className="h-4 w-4" />}
            unavailable
            unavailableReason="Schätzung erfordert ≥30 Tage Snapshot-Historie"
          />
        ) : (
          <KpiTile
            label="Unfollows (geschätzt)"
            value={kpis.estimatedUnfollowsMonth}
            icon={<UserMinus className="h-4 w-4" />}
            hint="Schätzung: gewonnene Follower – Netto-Wachstum"
          />
        )}
      </div>

      {/* KPI ROW 2 — Reach + Conversions */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Reichweite (Monat)" value={kpis.reachMonth} icon={<Eye className="h-4 w-4" />} />
        <KpiTile label="Profilaufrufe" value={kpis.profileViewsMonth} icon={<Users className="h-4 w-4" />} />
        <KpiTile label="Website-Klicks" value={kpis.websiteClicksMonth} icon={<Link2 className="h-4 w-4" />} />
        <KpiTile label="Impressionen" value={kpis.impressionsMonth} icon={<MousePointerClick className="h-4 w-4" />} hint="API liefert je nach Account-Typ" />
      </div>

      {/* KPI ROW 3 — DMs + Leads */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="DMs gesamt" value={kpis.totalDms} icon={<Inbox className="h-4 w-4" />} />
        <KpiTile label="Neue DMs heute" value={kpis.todayDms} icon={<MessageSquare className="h-4 w-4" />} />
        <KpiTile label="Leads gesamt" value={kpis.totalLeads} icon={<Target className="h-4 w-4" />} />
        <KpiTile
          label="Conversion DM → Lead"
          value={kpis.dmToLeadRate}
          format="percent"
          icon={<Heart className="h-4 w-4" />}
          hint={`${kpis.monthLeads} Leads aus ${kpis.monthDms} DMs (Monat)`}
        />
      </div>

      {/* CHARTS */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Reichweite & Engagement (30 Tage)</CardTitle>
            <CardDescription>Reach, Profilaufrufe, DMs und Klicks im Verlauf</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChartCard
              data={daily}
              xKey="date"
              yKeys={["Reichweite", "Profilaufrufe", "DMs"]}
              colors={["#7FAF9B", "#C6A76D", "#1F3D34"]}
              height={280}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follower-Wachstum</CardTitle>
            <CardDescription>Tägliches Snapshot der Follower</CardDescription>
          </CardHeader>
          <CardContent>
            <LineChartCard data={followers} xKey="date" yKeys={["Follower"]} colors={["#1F3D34"]} height={280} />
          </CardContent>
        </Card>
      </div>

      {/* CONVERSION FUNNEL */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Funnel: Viewer → DM → Lead</CardTitle>
          <CardDescription>
            Hinweis: Direkte Viewer→DM-Attribution wird nicht von der Instagram API geliefert. Wir berechnen sie über
            Reichweite und eingegangene DMs der gleichen Periode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <FunnelStep label="Reichweite" value={kpis.reachMonth} percent={1} />
            <FunnelStep label="DMs" value={kpis.monthDms} percent={kpis.reachToDmRate} subtitle={`${(kpis.reachToDmRate * 100).toFixed(2)}% Conversion`} />
            <FunnelStep label="Leads" value={kpis.monthLeads} percent={kpis.dmToLeadRate} subtitle={`${(kpis.dmToLeadRate * 100).toFixed(1)}% DM→Lead`} highlight />
          </div>
        </CardContent>
      </Card>

      {/* TOP CONTENT */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Top Content (Letzte 30 Tage)</CardTitle>
          <CardDescription>Sortiert nach Views und Engagement Rate</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="views">
            <TabsList>
              <TabsTrigger value="views">Top 5 nach Views</TabsTrigger>
              <TabsTrigger value="engagement">Top 5 nach Engagement</TabsTrigger>
            </TabsList>
            <TabsContent value="views">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {topByViews.map((m) => <MediaCard key={m.id} media={m} compact />)}
              </div>
            </TabsContent>
            <TabsContent value="engagement">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {topByEngagement.map((m) => <MediaCard key={m.id} media={m} compact />)}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function FunnelStep({
  label,
  value,
  percent,
  subtitle,
  highlight,
}: {
  label: string;
  value: number;
  percent: number;
  subtitle?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-md border p-5 ${highlight ? "border-gold bg-gold-100" : "border-border/60 bg-cream"}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <Badge variant={highlight ? "gold" : "secondary"}>{(percent * 100).toFixed(2)}%</Badge>
      </div>
      <div className="mt-2 font-display text-3xl font-semibold text-forest">{value.toLocaleString("de-DE")}</div>
      {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

function EmptyState() {
  return (
    <PageShell title="Willkommen" subtitle="Verbinde deinen Instagram Business Account um zu starten">
      <Card>
        <CardContent className="py-12 text-center">
          <h2 className="font-display text-xl text-forest">Noch kein Account verbunden</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Hinterlege deinen IG_BUSINESS_ACCOUNT_ID + IG_ACCESS_TOKEN in <code>.env</code> und führe{" "}
            <code>npm run db:seed</code> aus.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
