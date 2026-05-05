"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Brain,
  CalendarDays,
  Film,
  Home,
  Inbox,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/dashboard/content", label: "Content Performance", icon: Film },
  { href: "/dashboard/best-performing", label: "Best Performing", icon: Trophy },
  { href: "/dashboard/leads", label: "Lead Attribution", icon: Target },
  { href: "/dashboard/dms", label: "DMs & Engagement", icon: Inbox },
  { href: "/dashboard/audience", label: "Audience", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: CalendarDays },
  { href: "/dashboard/insights", label: "AI Insights", icon: Brain },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border/60 bg-cream">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-forest text-cream">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-base font-semibold text-forest">Desiree</span>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Analytics Suite</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-forest text-cream shadow-soft"
                  : "text-foreground/80 hover:bg-muted hover:text-forest"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-gold" : "text-sage")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/60 p-4">
        <div className="rounded-md bg-sage-50 p-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sage-700" />
            <span className="text-xs font-semibold text-sage-700">Live Sync</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Letzte API-Aktualisierung vor wenigen Minuten. Cron läuft alle 6 Std.
          </p>
        </div>
      </div>
    </aside>
  );
}
