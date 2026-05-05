import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Pause, Play } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAccount } from "@/lib/analytics";
import { generateInsights } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const account = await getAccount();
  if (!account) return null;

  const insights = await generateInsights(account.id);

  return (
    <PageShell
      title="AI Insights"
      subtitle="Mustererkennung über deine Top-Performer und konkrete Empfehlungen"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <InsightCard
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
          title="Gewinner-Content"
          subtitle="Diese Inhalte performen überdurchschnittlich gut"
          items={insights.winners}
        />
        <InsightCard
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="warning"
          title="Warnungen"
          subtitle="Engagement oder Reach fällt"
          items={insights.warnings}
        />
        <InsightCard
          icon={<Lightbulb className="h-5 w-5" />}
          tone="gold"
          title="Wiederkehrende Muster"
          subtitle="Was Deine Top-Posts gemeinsam haben"
          items={insights.patterns}
        />
        <InsightCard
          icon={<Sparkles className="h-5 w-5" />}
          tone="secondary"
          title="Hook-Ideen"
          subtitle="Generiert aus Deinen besten Hooks"
          items={insights.hookIdeas}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Play className="h-4 w-4 text-sage-700" /> Was solltest du öfter posten?</CardTitle>
            <CardDescription>Basis: Top 25% deiner Inhalte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.doMore.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md bg-sage-50 p-3 text-sm">
                <Badge variant="success" className="mt-0.5">+</Badge>
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Pause className="h-4 w-4 text-destructive" /> Was solltest du stoppen?</CardTitle>
            <CardDescription>Basis: Bottom 25% deiner Inhalte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.doLess.map((s, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm">
                <Badge variant="destructive" className="mt-0.5">–</Badge>
                <span>{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function InsightCard({
  icon,
  tone,
  title,
  subtitle,
  items,
}: {
  icon: React.ReactNode;
  tone: "success" | "warning" | "gold" | "secondary";
  title: string;
  subtitle: string;
  items: string[];
}) {
  const toneClass = {
    success: "bg-sage-100 text-sage-700",
    warning: "bg-red-100 text-red-700",
    gold: "bg-gold-100 text-gold-500",
    secondary: "bg-forest text-cream",
  }[tone];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch nicht genug Daten für eine fundierte Analyse.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="rounded-md bg-cream p-3 text-sm">
                {it}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
