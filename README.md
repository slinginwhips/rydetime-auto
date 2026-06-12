# RydeTime Auto — Dealership Website

Production website for **RydeTime Auto**, an independent used car dealership at 1913 Holland Road, Suffolk, VA 23434 — (757) 937-8664.

Built with Next.js 15 (App Router), TypeScript (strict), Tailwind CSS, Supabase Postgres, and the Anthropic API. Deploys to Vercel.

## Core rule

**DealerCenter is the source of truth for inventory.** Vehicles are managed in DealerCenter only; the website syncs automatically every 2 hours via a Vercel cron job (`/api/inventory/sync`). No duplicate vehicle entry, ever.

## Quick start

```bash
npm install
copy .env.local.example .env.local   # then fill in real values
npm run dev
```

Without Supabase/Anthropic keys the site runs in **demo mode**: 6 mock vehicles render, leads log to the console, and the AI chat returns a phone-number fallback. Add keys and everything goes live.

## Database setup

1. Open the Supabase SQL editor for the project.
2. Run `supabase/schema.sql` (tables, indexes, RLS policies).
3. Optionally run `supabase/seed.sql` for 6 realistic starter vehicles.

RLS: anon key can only read active inventory. All writes go through server-side API routes using the service role key.

## Environment variables

See `.env.local.example` for the complete list — Supabase, DealerCenter (feed + lead API + DCID 16936663), Carfax partner code, Anthropic, Twilio/Stripe placeholders, `ADMIN_SECRET`, and `NEXT_PUBLIC_SITE_URL`.

## Key endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET/POST /api/inventory/sync` | DealerCenter feed sync (Bearer `ADMIN_SECRET`; cron runs GET every 2h) |
| `POST /api/leads` | Lead capture → Supabase → DealerCenter ADF/XML push → notification |
| `POST /api/chat` | AI concierge (Claude, streamed, rate-limited, lead detection) |
| `POST /api/ai/matchmaker` | AI vehicle matching from homepage quiz |
| `POST /api/ai/vehicle-description` | Admin-triggered AI listing copy generation |
| `POST /api/hold-deposit` | $500 vehicle hold flow (Stripe; mock mode without keys) |
| `GET /ai/inventory` | Public JSON inventory for AI crawlers (see `/public/llms.txt`) |

## Admin

`/admin` — protected by `ADMIN_SECRET` (login sets an httpOnly cookie). Dashboard, inventory overrides, leads, chat transcripts, appointments, trades, holds, sync history with manual trigger, and settings.

## Deploy

```bash
npm install
# add .env.local values to Vercel project settings
vercel deploy
```

`vercel.json` already includes the inventory sync cron (`0 */2 * * *`).

## Structure

- `src/app` — pages, API routes, local SEO pages, sitemap/robots
- `src/components` — UI components (vehicle cards, gallery, chat widget, matchmaker, hold flow, forms)
- `src/lib` — provider abstractions (inventory, leads, Carfax, credit app, notifications, payments), Supabase clients, SEO helpers
- `src/types` — shared TypeScript contracts
- `supabase/` — schema + seed SQL
