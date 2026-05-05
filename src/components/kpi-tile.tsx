import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

type Props = {
  label: string;
  value: number | string;
  delta?: number; // 0.12 = +12%
  hint?: string;
  format?: "number" | "percent" | "raw";
  icon?: React.ReactNode;
  unavailable?: boolean;
  unavailableReason?: string;
};

export function KpiTile({ label, value, delta, hint, format = "number", icon, unavailable, unavailableReason }: Props) {
  const display =
    typeof value === "string"
      ? value
      : format === "percent"
      ? formatPercent(value)
      : format === "raw"
      ? String(value)
      : formatNumber(value, { compact: true });

  const trend = delta === undefined ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  return (
    <Card className="relative">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          {icon && <span className="text-sage">{icon}</span>}
        </div>

        {unavailable ? (
          <div>
            <div className="text-xl font-semibold text-muted-foreground">N/A</div>
            <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
              {unavailableReason ?? "Nicht direkt über die Instagram API verfügbar"}
            </div>
          </div>
        ) : (
          <>
            <div className="font-display text-3xl font-semibold text-forest">{display}</div>
            <div className="flex items-center gap-2 text-xs">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                    trend === "up" && "bg-sage-100 text-sage-700",
                    trend === "down" && "bg-red-100 text-red-700",
                    trend === "flat" && "bg-muted text-muted-foreground"
                  )}
                >
                  {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                  {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
                  {trend === "flat" && <Minus className="h-3 w-3" />}
                  {formatPercent(Math.abs(delta!))}
                </span>
              )}
              {hint && <span className="text-muted-foreground">{hint}</span>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
