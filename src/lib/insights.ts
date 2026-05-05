import { prisma } from "./db";
import { subDays } from "date-fns";

/**
 * Rule-based insight generator. Reads from the DB and returns
 * structured recommendations. Designed to run server-side and be
 * cheap to call. Replace / augment with an LLM call if you want.
 */
export async function generateInsights(accountId: string) {
  const since = subDays(new Date(), 90);
  const media = await prisma.instagramMedia.findMany({
    where: { accountId, timestamp: { gte: since } },
    include: { _count: { select: { leads: true } } },
  });

  if (media.length < 3) {
    return {
      winners: [],
      warnings: [],
      patterns: [],
      hookIdeas: [],
      doMore: [],
      doLess: [],
    };
  }

  const sorted = [...media].sort((a, b) => b.engagementRate - a.engagementRate);
  const top = sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.25)));
  const bottom = sorted.slice(-Math.max(3, Math.floor(sorted.length * 0.25)));

  const winners = top.map(
    (m) =>
      `🏆 „${(m.caption ?? "").slice(0, 60) || "Reel"}…“ – ${(m.engagementRate * 100).toFixed(2)}% ER, ${m._count.leads} Leads`
  );

  // Trend warning: compare last 14 days vs previous 14
  const last14 = subDays(new Date(), 14);
  const prev14Start = subDays(new Date(), 28);
  const recent = media.filter((m) => m.timestamp >= last14);
  const previous = media.filter((m) => m.timestamp >= prev14Start && m.timestamp < last14);
  const recentAvg = avg(recent.map((m) => m.engagementRate));
  const prevAvg = avg(previous.map((m) => m.engagementRate));
  const warnings: string[] = [];
  if (prevAvg > 0 && recentAvg < prevAvg * 0.85) {
    warnings.push(
      `📉 Engagement Rate fällt: letzte 14 Tage ${(recentAvg * 100).toFixed(2)}% vs. zuvor ${(prevAvg * 100).toFixed(2)}% (−${(((prevAvg - recentAvg) / prevAvg) * 100).toFixed(1)}%).`
    );
  }
  if (recent.length < previous.length * 0.6) {
    warnings.push(`⚠ Posting-Frequenz ist gefallen: nur ${recent.length} Posts in den letzten 14 Tagen.`);
  }

  // Pattern detection
  const topHooks = topGroup(top, (m) => m.hookType);
  const topCtas = topGroup(top, (m) => m.ctaType);
  const topPillars = topGroup(top, (m) => m.contentPillarId);
  const patterns = [
    topHooks ? `🎯 ${topHooks.label} dominiert deine Top-Inhalte (${topHooks.share}% deiner Gewinner).` : null,
    topCtas ? `📣 CTA „${topCtas.label}“ kommt in ${topCtas.share}% der Top-Performer vor.` : null,
    topPillars ? `📚 Content-Säule mit ID ${topPillars.label} liefert die stärksten Ergebnisse.` : null,
    avgDuration(top) ? `⏱ Top-Reels sind im Schnitt ${avgDuration(top)?.toFixed(0)}s lang.` : null,
  ].filter(Boolean) as string[];

  // Hook ideas (simple template based on top hooks)
  const hookIdeas = (topHooks ? hookSeeds[topHooks.label] ?? hookSeeds.default : hookSeeds.default).slice(0, 5);

  // Do more / less recommendations
  const doMore: string[] = [];
  const doLess: string[] = [];
  if (topHooks) doMore.push(`Mehr "${topHooks.label}"-Hooks – sie performen ${topHooks.share}% über deinem Median.`);
  if (topCtas) doMore.push(`CTA "${topCtas.label}" weiter ausbauen – höchste DM-Konvertierung.`);
  doMore.push("Reels in den Top-Posting-Zeiten (siehe Audience) veröffentlichen.");

  const weakHook = topGroup(bottom, (m) => m.hookType);
  const weakCta = topGroup(bottom, (m) => m.ctaType);
  if (weakHook) doLess.push(`Hooks vom Typ "${weakHook.label}" produzieren konstant niedrige Engagement Rates.`);
  if (weakCta) doLess.push(`CTA "${weakCta.label}" wird nicht angenommen – ersetzen oder umformulieren.`);
  if (avgDuration(bottom) && avgDuration(bottom)! > 90) doLess.push("Sehr lange Reels (>90s) ziehen weniger durch.");

  return { winners, warnings, patterns, hookIdeas, doMore, doLess };
}

const hookSeeds: Record<string, string[]> = {
  question: [
    "„Wusstest du, dass …?“ – starte mit einer überraschenden Frage.",
    "„Was würdest du tun, wenn …?“",
    "„Welcher Typ bist du: A oder B?“",
  ],
  stat: [
    "„97% machen diesen Fehler – du auch?“",
    "„Nur 1 von 10 weiß das …“",
  ],
  story: [
    "„Vor 6 Monaten war ich pleite, dann …“",
    "„Eine Klientin schrieb mir gestern …“",
  ],
  controversial: [
    "„Hör auf, X zu tun.“ – polarisierende Aussage",
    "„Das ist der Grund, warum dein Funnel nicht skaliert.“",
  ],
  default: [
    "„Speichere dieses Reel, bevor es verschwindet.“",
    "„Das hier ändert alles – schau bis zum Ende.“",
    "„3 Dinge, die niemand über X sagt.“",
    "„Du machst diesen Fehler garantiert auch.“",
    "„POV: …“ als Open Loop nutzen.",
  ],
};

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function avgDuration(arr: Array<{ durationSec: number | null | undefined }>) {
  const filtered = arr.map((m) => m.durationSec).filter((d): d is number => typeof d === "number");
  if (!filtered.length) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}
function topGroup<T>(items: T[], key: (x: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  if (!counts.size) return null;
  const [label, n] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return { label, share: Math.round((n / items.length) * 100) };
}
