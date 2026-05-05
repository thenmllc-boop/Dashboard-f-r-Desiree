import { Filter, Search } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaCard } from "@/components/media-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { prisma } from "@/lib/db";
import { getAccount } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const account = await getAccount();
  if (!account) return null;

  const [media, categories] = await Promise.all([
    prisma.instagramMedia.findMany({
      where: { accountId: account.id },
      include: { contentPillar: true, _count: { select: { leads: true } } },
      orderBy: { timestamp: "desc" },
      take: 60,
    }),
    prisma.contentCategory.findMany(),
  ]);

  return (
    <PageShell
      title="Content Performance"
      subtitle={`${media.length} Reels & Posts · Filter, Vergleich & Performance Score`}
    >
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Caption, Hook oder Keyword durchsuchen…" className="pl-9" />
          </div>
          <FilterSelect placeholder="Zeitraum" items={["Letzte 7 Tage", "Letzte 30 Tage", "Letzte 90 Tage", "Alle"]} />
          <FilterSelect placeholder="Content-Säule" items={categories.map((c) => c.name)} />
          <FilterSelect placeholder="Format" items={["Reel", "Image", "Carousel", "Story"]} />
          <FilterSelect placeholder="Hook-Typ" items={["Question", "Stat", "Story", "Controversial", "Curiosity"]} />
          <FilterSelect placeholder="CTA" items={["DM Keyword", "Link in Bio", "Kommentar", "Share", "Save"]} />
          <FilterSelect placeholder="Sortierung" items={["Views", "Engagement Rate", "Saves", "Shares", "Leads"]} />
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5" />
            Mehr Filter
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Videobibliothek</CardTitle>
            <CardDescription>Alle Posts und Reels mit voller Performance-Übersicht</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="gold">Gewinner = Performance Score ≥ 80</Badge>
            <Badge variant="muted">Durchschnitt 50–79</Badge>
            <Badge variant="destructive">Schwach &lt; 50</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {media.map((m) => (
              <MediaCard key={m.id} media={m} leadCount={m._count.leads} />
            ))}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function FilterSelect({ placeholder, items }: { placeholder: string; items: string[] }) {
  return (
    <Select>
      <SelectTrigger className="h-9 w-auto min-w-[140px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i} value={i.toLowerCase().replace(/\s+/g, "-")}>
            {i}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
