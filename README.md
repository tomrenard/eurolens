# EuroLens

**Brussels, briefed.** Track what the European Parliament is voting on, understand it in plain English, and see how your own MEPs voted.

EuroLens runs on public data with **no API keys and no per-request cost**. There is no language model in the request path: explanations are generated from the official record by a fixed glossary, so they are instant, reproducible, and cannot invent a fact that is not in the data.

## What it does

- **Plain-English explainers** — decodes `2024/0123(COD)`, "RDG1" and "ENVI" into what the file is, who has to agree, where it stands and what happens next.
- **Roll-call votes** — how all 720 MEPs voted, filterable by country, political group and position, with a per-group breakdown.
- **Your MEPs** — pick your country and see how your own delegation split on a vote.
- **Personalised feed** — pick a role and the files touching your interests are ranked first.
- **Official summaries** — the Legislative Observatory's own summary where one exists.
- **Multilingual documents** — titles and summaries in seven languages (`?lang=fr`), using the Parliament's own translations rather than a translation service.

## Data sources

| Source | Used for | Licence |
| --- | --- | --- |
| [European Parliament Open Data API](https://data.europarl.europa.eu) | Procedures, plenary meetings, decisions | EP reuse policy |
| [HowTheyVote.eu](https://howtheyvote.eu) | MEP-level roll-call votes | [ODbL](https://opendatacommons.org/licenses/odbl/) |

### The ingest job

With Supabase configured, a daily Vercel Cron job (`vercel.json` → `/api/ingest`)
mirrors procedures and plenary sessions into Postgres. Reads then hit one
indexed query instead of fanning out to the EP API, which lifts the catalogue
well past what a per-request path could fetch and keeps a ~3MB endpoint off the
request path entirely.

Without it the app falls back to reading the EP API live — still fully
functional, just a smaller catalogue.

Requires `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` (see `.env.example`).
Trigger a backfill by hand with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-host>/api/ingest
```

Vote summaries and MEP photographs are excluded from the ODbL and originate from the European Parliament. EuroLens does not mirror MEP photographs.

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Accounts** (optional): Supabase — sign-in, saved positions, and the ingest mirror

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. **No environment variables are required** — the app runs fully in guest mode with both data sources live.

To enable sign-in, saved positions and the leaderboard, copy `.env.example` to `.env.local` and fill in a Supabase project, then apply the migrations in `supabase/migrations/` in order.

```bash
npm run dev        # development server
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── leaderboard/          # public ranking (reads a restricted view)
│   │   ├── me/                   # profile, positions, actions, alerts
│   │   └── procedure/[reference]/ # procedure detail + roll-call votes
│   ├── procedure/[reference]/    # procedure page, metadata, share card
│   ├── sitemap.ts, robots.ts     # every known procedure is indexable
│   └── page.tsx                  # dashboard
├── components/
│   ├── plain-english.tsx         # the explainer panel
│   ├── roll-call.tsx             # group + country vote breakdown
│   └── mep-votes-list.tsx        # searchable per-MEP votes
├── lib/
│   ├── explainer.ts              # glossary + templates (no network, no model)
│   ├── europarl.ts               # EP Open Data client
│   ├── howtheyvote.ts            # roll-call client
│   ├── scoring.ts                # server-side XP derivation
│   └── locale.ts                 # supported content languages
└── types/
```

## How explanations are produced

`src/lib/explainer.ts` holds the whole vocabulary: procedure types, committee codes and stage descriptions. `explain()` composes them with the file's own fields.

Two consequences worth knowing:

- Reading stages (`1st Reading` and friends) only describe procedures that shuttle between Parliament and the Council. Discharge, resolution and own-initiative files get a neutral description instead, because applying reading language to them produces confident nonsense.
- Persona selection ranks and filters the feed rather than rewording anything.

## Accessibility

EuroLens targets WCAG 2.1 AA: keyboard-focusable controls with visible focus rings, semantic landmarks and headings, and `prefers-reduced-motion` respected.

## Licence

MIT — see [LICENSE](LICENSE). Data carries its own licences; see the table above.
