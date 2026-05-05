"use client";

import { Bell, RefreshCcw, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/80 px-6 backdrop-blur">
      <div>
        <h1 className="font-display text-xl font-semibold text-forest">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Suche…" className="h-9 w-64 pl-9" />
        </div>
        <Button variant="outline" size="sm">
          <RefreshCcw className="h-3.5 w-3.5" />
          Sync
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9 border border-border/60">
          <AvatarFallback>DS</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
