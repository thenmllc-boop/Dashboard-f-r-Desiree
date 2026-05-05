# Desiree Analytics – Instagram Dashboard

Ein modernes, professionelles Instagram Analytics Dashboard für Creator- &
Brand-Seiten. Live-Daten, Lead-Attribution, DM-Tracking, Content-Intelligence
und automatische Reports.

> Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · shadcn-style UI · Recharts · PostgreSQL · Prisma · NextAuth · Instagram Graph API · Webhooks**

---

## ✨ Features

- **8 Dashboard-Seiten**
  - Overview · Content Performance · Best Performing · Lead Attribution · DMs & Engagement · Audience · Reports · AI Insights
- **Live-Sync** mit Instagram Graph API (Account-, Media-, Audience-Insights, DMs)
- **Webhook-Endpoints** für DMs, Kommentare, Mentions
- **Lead Attribution-Engine**
  - CTA-Keywords pro Video → DM-Trigger
  - UTM-Links pro Video (`utm_content = ig_media_id`)
  - ManyChat-Tags
  - Story-Replies, Landing-Page-Tracking
- **Cronjobs** für regelmäßige Datenupdates (alle 6 Std. + täglich)
- **Auto-Reports** (täglich/wöchentlich/monatlich)
- **AI Insights** – regelbasierte Mustererkennung über Top-Performer
- **Auth** mit NextAuth Credentials Provider
- Responsive (Desktop & Mobile)
- Premium UI – Sage / Forest / Gold Akzente, Cream-Hintergrund

---

## 🎨 Design System

| Token            | Hex       | Verwendung                  |
| ---------------- | --------- | --------------------------- |
| Background       | `#F5F3EE` | Seitenhintergrund           |
| Cream            | `#FBFAF6` | Cards, Inputs               |
| Sage (Hauptgrün) | `#7FAF9B` | Primary actions, Charts     |
| Forest (Dunkel)  | `#1F3D34` | Headlines, Sidebar active   |
| Gold (Akzent)    | `#C6A76D` | Winner-Badges, Highlights   |

---

## 🗂 Projektstruktur

```
.
├── prisma/
│   ├── schema.prisma          # Komplettes Datenmodell
│   └── seed.ts                # Beispiel-Daten (90 Tage)
├── scripts/cron/              # Standalone Cron-Scripts
│   ├── refresh-media-insights.ts
│   ├── refresh-account-insights.ts
│   ├── follower-snapshot.ts
│   └── generate-reports.ts
├── src/
│   ├── app/
│   │   ├── dashboard/         # 8 Dashboard-Seiten
│   │   ├── login/             # Auth
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       ├── webhooks/instagram/   # IG Webhook (DMs/Comments)
│   │       ├── webhooks/manychat/    # ManyChat Tag Webhook
│   │       ├── attribution/utm/      # Landingpage → Lead
│   │       ├── cron/                 # /refresh-media, /refresh-account, /generate-reports
│   │       └── sync/run/             # Manueller Voll-Sync
│   ├── components/
│   │   ├── ui/                # shadcn-Style Atomics
│   │   ├── charts/            # Recharts-Wrapper
│   │   ├── layout/            # Sidebar, Topbar, PageShell
│   │   ├── kpi-tile.tsx
│   │   └── media-card.tsx
│   ├── lib/
│   │   ├── instagram/
│   │   │   ├── client.ts      # Fetch + Rate-Limit + Retry
│   │   │   ├── account.ts     # Account/Audience Insights
│   │   │   ├── media.ts       # Media + per-Media Insights
│   │   │   ├── messaging.ts   # DMs / Conversations
│   │   │   └── sync.ts        # High-level Sync-Pipelines
│   │   ├── analytics.ts       # Server-side Queries
│   │   ├── attribution.ts     # Lead-Attribution-Engine
│   │   ├── insights.ts        # Rule-based AI Insights
│   │   ├── auth.ts            # NextAuth Setup
│   │   ├── cron-auth.ts       # Bearer-Token-Schutz
│   │   ├── db.ts              # Prisma Client (Singleton)
│   │   └── utils.ts           # Formatter, cn()
│   └── middleware.ts          # Auth-Schutz für /dashboard
├── .env.example
├── tailwind.config.ts
├── vercel.json                # Vercel Cron Konfiguration
└── package.json
```

---

## 🚀 Setup

### 1. Voraussetzungen

- Node.js 18+
- PostgreSQL 14+ (lokal oder gehostet)
- Ein Meta App mit Instagram Graph API Produkt
- Ein **Instagram Business** oder **Creator Account**, der mit einer **Facebook Page** verknüpft ist

### 2. Installation

```bash
git clone <repo>
cd Dashboard-f-r-Desiree
npm install
cp .env.example .env
# .env editieren – siehe nächster Abschnitt
```

### 3. Datenbank initialisieren

```bash
npm run db:generate
npm run db:push       # oder: npm run db:migrate
npm run db:seed       # legt Admin-User + 90 Tage Demo-Daten an
```

### 4. Lokal starten

```bash
npm run dev
# → http://localhost:3000
# Login: ADMIN_EMAIL / ADMIN_PASSWORD aus .env
```

---

## 🔑 Meta / Instagram API – Setup

1. **App anlegen** unter https://developers.facebook.com/apps → **Business**.
2. Produkt **Instagram Graph API** + **Webhooks** hinzufügen.
3. Eine **Facebook Page** mit dem **IG Business/Creator Account** verknüpfen.
4. Ein **Long-Lived Page Access Token** erzeugen
   (https://developers.facebook.com/docs/facebook-login/access-tokens#long-via-system-user
   oder per Graph Explorer + `/oauth/access_token?grant_type=fb_exchange_token…`).
5. Die **IG Business Account ID** abrufen:
   ```
   GET https://graph.facebook.com/v21.0/me/accounts?access_token=...
   GET https://graph.facebook.com/v21.0/{page-id}?fields=instagram_business_account
   ```
6. Werte in `.env` eintragen:
   ```
   IG_ACCESS_TOKEN=...
   IG_BUSINESS_ACCOUNT_ID=...
   ```
7. **Webhook konfigurieren** (Meta App → Webhooks → Instagram):
   - Callback URL: `https://<deine-domain>/api/webhooks/instagram`
   - Verify Token: identisch zu `IG_WEBHOOK_VERIFY_TOKEN`
   - Felder abonnieren: `messages`, `messaging_postbacks`, `message_reactions`, `comments`, `mentions`

---

## 📅 Cronjobs

### Variante A – Vercel Cron (empfohlen bei Vercel-Hosting)

Bereits konfiguriert in `vercel.json`:

| Pfad                              | Schedule        | Aufgabe                         |
| --------------------------------- | --------------- | ------------------------------- |
| `/api/cron/refresh-media`         | `0 */6 * * *`   | Media + per-Media Insights      |
| `/api/cron/refresh-account`       | `10 2 * * *`    | Account-Profile + Daily Insights + Snapshot |
| `/api/cron/generate-reports`      | `0 8 * * *`     | Daily/Weekly/Monthly Reports    |

Schutz via `Authorization: Bearer $CRON_SECRET`. Vercel sendet das automatisch,
wenn `CRON_SECRET` als Env-Var gesetzt ist.

### Variante B – Klassischer System-Cron

```cron
0 */6 * * *  cd /app && npm run cron:media-insights      >> /var/log/dash.log 2>&1
10 2 * * *   cd /app && npm run cron:account-insights    >> /var/log/dash.log 2>&1
0 3 * * *    cd /app && npm run cron:follower-snapshot   >> /var/log/dash.log 2>&1
0 8 * * *    cd /app && npm run cron:reports             >> /var/log/dash.log 2>&1
```

---

## 📊 Datenmodell

| Modell                  | Zweck                                                       |
| ----------------------- | ----------------------------------------------------------- |
| `Account`               | IG Business Account + Access Token                          |
| `InstagramMedia`        | Reels/Posts/Stories + cached Aggregates + Performance Score |
| `MediaInsight`          | Time-series Snapshot pro Media-Sync                         |
| `DailyAccountInsight`   | Tägliche Roll-up der Account-Metriken                       |
| `FollowerSnapshot`      | Daily Follower Count → ermöglicht Unfollow-Schätzung        |
| `Conversation` / `Message` | DM-Threads + einzelne Nachrichten                        |
| `Lead`                  | Voller Lead-Datensatz mit Attribution-Feldern               |
| `AttributionEvent`      | Granulares Audit-Log (Touchpoint → Media/Campaign)          |
| `Campaign`              | CTA-Keyword + UTM + ManyChat-Tag pro Funnel                 |
| `ContentCategory`       | Content-Säulen für Filter und Pattern-Erkennung             |
| `Report`                | Auto-generierte Daily/Weekly/Monthly Reports                |
| `AutomationTrigger`     | Native oder ManyChat DM-Keyword-Funnels                     |
| `User`                  | Admin-Login                                                 |

---

## 🎯 Lead Attribution – Wie funktioniert es?

Instagram liefert offiziell **nicht**, welcher Kunde durch welches Video kam.
Das Dashboard rekonstruiert das mit folgender Priorität:

1. **CTA-Keyword** – jedes Reel hat ein eindeutiges Keyword (`ROADMAP`, `GUIDE`, `CALL`).
   DM-Webhook matched eingehenden Text → `InstagramMedia` + `Campaign`.
2. **ManyChat-Tag** – ManyChat sendet beim Tag-Setzen einen Webhook
   an `/api/webhooks/manychat` → wir verknüpfen via `Campaign.manychatTag`.
3. **UTM-Link** – Landing-Page sendet UTM-Parameter an
   `/api/attribution/utm`. `utm_content` = `ig_media_id` → direkte Video-Zuordnung.
4. **Story-Reply / Mention** – Webhook-Payload enthält die Story-Media-ID.
5. **Profile-Visit** – Fallback ohne andere Signale.

Die ganze Logik liegt in `src/lib/attribution.ts` und ist deterministisch +
testbar.

---

## ⚠️ Welche Daten kommen woher?

| Metrik                              | Quelle                                  | Hinweis |
| ----------------------------------- | --------------------------------------- | ------- |
| Follower gesamt                     | Graph API (`followers_count`)           | ✅ direkt |
| Neue Follower pro Tag               | Graph API (`follower_count` insight)    | ✅ direkt |
| **Unfollows / verlorene Follower**  | **eigene Snapshot-Differenz**           | ⚠️ nicht direkt verfügbar |
| Reichweite, Profilaufrufe, Klicks   | Graph API (Account-Insights)            | ✅ direkt |
| Per-Media Views/Likes/Saves/Shares  | Graph API (Media-Insights)              | ✅ direkt |
| Watch Time (Reels)                  | `ig_reels_video_view_total_time`        | ✅ direkt (Reels) |
| **DM → Lead Konversion**            | **eigene Attribution + AutomationTrigger** | ⚠️ nicht direkt verfügbar |
| **Welches Video brachte welchen Kunden?** | **CTA-Keyword + UTM + ManyChat**   | ⚠️ rekonstruiert |
| Demografie (Land, Alter)            | Graph API (Audience-Insights)           | ⚠️ benötigt ≥100 Follower |

Im Dashboard sind nicht-direkt-verfügbare Metriken **explizit als solche
markiert** (KPI-Tile zeigt „N/A · Nicht direkt über die Instagram API
verfügbar"). Das ist Absicht und schafft Vertrauen.

---

## 🔐 Sicherheit & Rate Limits

- `src/lib/instagram/client.ts` implementiert **automatische Retries mit
  exponential Backoff** bei 429/5xx und respektiert den `Retry-After`-Header.
- Meta-App-Limits: pro App ca. 200 Calls/User/Stunde. Cron-Intervalle sind
  bewusst konservativ gewählt.
- Cron-Endpoints sind durch `CRON_SECRET` Bearer-Auth geschützt.
- Webhook-Endpoint validiert den `hub.verify_token`.
- Empfehlung Production: `accessToken` in DB verschlüsselt speichern
  (z.B. `pg_crypto` oder Application-side AES). Hier im Demo plain.

---

## 🧪 Manuelle Sync-Trigger

```bash
# Voller Sync (alle Pipelines)
curl -X POST http://localhost:3000/api/sync/run \
  -H "Authorization: Bearer $CRON_SECRET"

# Einzelne Cron-Jobs
curl -X POST http://localhost:3000/api/cron/refresh-media -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/refresh-account -H "Authorization: Bearer $CRON_SECRET"
curl -X POST http://localhost:3000/api/cron/generate-reports -H "Authorization: Bearer $CRON_SECRET"
```

---

## 🛠 Erweitern

- **LLM-basierte Insights**: ersetze die Heuristiken in `src/lib/insights.ts`
  durch einen Claude/OpenAI-Call; das I/O-Format bleibt identisch.
- **Mehrere Accounts**: das Schema ist bereits multi-account ready
  (`Account`-Modell als Root). Sidebar + Auth-Scope ergänzen.
- **PDF-Reports**: in `/api/reports/[id]/pdf` einen `react-pdf`-Renderer
  hinzufügen.
- **Slack/Email-Alerts**: in `generateInsights` bei `warnings.length > 0`
  einen Webhook-Call ergänzen.

---

## 📝 Lizenz

Privates Projekt. Kein Public License Statement.
