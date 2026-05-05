import { Eye, Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

type Media = {
  id: string;
  caption: string | null;
  thumbnailUrl: string | null;
  mediaUrl?: string | null;
  mediaProductType?: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  status?: string;
  hookType?: string | null;
  ctaType?: string | null;
};

export function MediaCard({ media, leadCount, compact }: { media: Media; leadCount?: number; compact?: boolean }) {
  const thumb = media.thumbnailUrl ?? media.mediaUrl;
  const statusBadge =
    media.status === "WINNER"
      ? { label: "Gewinner", v: "gold" as const }
      : media.status === "WEAK"
      ? { label: "Schwach", v: "destructive" as const }
      : { label: "Durchschnitt", v: "muted" as const };

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[9/12] w-full overflow-hidden bg-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Kein Thumbnail</div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <Badge variant={statusBadge.v}>{statusBadge.label}</Badge>
          {media.mediaProductType && <Badge variant="outline" className="bg-card/80 backdrop-blur">{media.mediaProductType}</Badge>}
        </div>
      </div>
      <CardContent className={cn("space-y-3", compact ? "p-3" : "p-4")}>
        {!compact && (
          <p className="line-clamp-2 text-sm text-foreground/80">{media.caption ?? "(Keine Caption)"}</p>
        )}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat icon={<Eye className="h-3.5 w-3.5" />} value={formatNumber(media.views, { compact: true })} />
          <Stat icon={<Heart className="h-3.5 w-3.5" />} value={formatNumber(media.likes, { compact: true })} />
          <Stat icon={<MessageCircle className="h-3.5 w-3.5" />} value={formatNumber(media.comments, { compact: true })} />
          <Stat icon={<Share2 className="h-3.5 w-3.5" />} value={formatNumber(media.shares, { compact: true })} />
          <Stat icon={<Bookmark className="h-3.5 w-3.5" />} value={formatNumber(media.saves, { compact: true })} />
          <div className="flex items-center justify-end font-semibold text-sage-700">
            {formatPercent(media.engagementRate)}
          </div>
        </div>
        {(leadCount !== undefined || media.hookType || media.ctaType) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {leadCount !== undefined && <Badge variant="secondary">{leadCount} Leads</Badge>}
            {media.hookType && <Badge variant="outline">Hook: {media.hookType}</Badge>}
            {media.ctaType && <Badge variant="outline">CTA: {media.ctaType}</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      {icon}
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
