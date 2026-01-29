# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexfiit is an AI-driven fitness ecosystem connecting fitness seekers with personal trainers (PTs) and sports clubs through **Deep Search** — an intent-based matching engine that understands goals, lifestyle, and health constraints instead of keywords.

### Deep Search (Core Innovation)

- Accepts free-text queries like "Lose weight after pregnancy" or "Rehab after knee injury"
- Extracts intent, goals, and preferences to match trainer specializations and club facilities
- Scoring system: Goal + Style + Level + Location

### Business Model

- **Subscriptions:** Multi-tier memberships (Basic, Premium, Ultimate)
- **Commission:** Revenue from bookings made through the platform
- **Dynamic Pricing:** AI-driven price fluctuation based on demand and trainer availability
- **Lead Generation:** Premium placement for trainers/clubs in search results

### Planned Features

- **Smart Matchmaking:** Scoring-based trainer/club ranking
- **Integrated Booking:** Interactive calendars with conflict resolution and reminders
- **Multi-Channel Chat:** Real-time messaging, file sharing (workout plans), voice messages via Supabase Realtime
- **Geospatial Discovery:** Map-based search within 15km radius with demand heatmaps
- **Mobile:** React Native app (shared logic with web)

### Security & Compliance

- GDPR/CCPA compliance for health data and payments
- Row Level Security (RLS) on all user-facing tables
- Stripe/Apple Pay integration for encrypted transactions

## Commands

```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint (flat config, next/core-web-vitals + next/typescript)
```

No test framework is configured yet.

**Supabase local dev** runs on: API :54321, DB :54322, Studio :54323, Inbucket (email) :54324.

## Architecture

**Stack:** Next.js 15 (App Router, React 19, Server Components) + Supabase (Auth, PostgreSQL, Edge Functions) + Tailwind CSS + shadcn/ui (New York style)

### Routing & Auth

- `app/` uses file-based App Router. Pages are Server Components by default.
- **Public routes:** `/`, `/auth/*` (login, sign-up, forgot-password, etc.)
- **Protected routes:** `/protected/*` — guarded by middleware in `proxy.ts` (exported as `proxy`, not the usual `middleware` name). It calls `updateSession()` from `lib/supabase/proxy.ts`.
- Auth flow: Supabase Auth with email/password. OTP confirmation handled at `/auth/confirm` (route handler). Sessions managed via cookies using `@supabase/ssr`.

### Supabase Client Pattern

Two client factories — always use the correct one:
- **`lib/supabase/server.ts`** — `createClient()` for Server Components/Route Handlers (uses `cookies()` from `next/headers`)
- **`lib/supabase/client.ts`** — `createClient()` for Client Components (uses `createBrowserClient`)

The middleware client in `lib/supabase/proxy.ts` is separate and must not be reused elsewhere. A new Supabase client must be created per-request (no global singletons).

### Components

- `components/ui/` — shadcn/ui primitives (Radix UI + Tailwind). Add new ones via `npx shadcn@latest add <component>`.
- Client Components (forms, interactive UI) use `"use client"` directive and React hooks for local state.
- Theme: dark mode via `next-themes` with CSS variable-based HSL colors in `app/globals.css`.

### Environment Variables

Required in `.env` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).

## Database

### Migrations

Migrations live in `supabase/migrations/` and are applied with `npx supabase db reset`.

- `00001_create_trainer_profiles.sql` — `trainer_profiles` table with PostGIS, RLS, indexes, and `updated_at` trigger.

### `trainer_profiles` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | auto-generated |
| `user_id` | uuid FK → auth.users | unique, cascade delete |
| `display_name` | text | required |
| `bio` | text | |
| `avatar_url` | text | |
| `phone` | text | |
| `specializations` | text[] | e.g. `{weight_loss, strength_training}` |
| `certifications` | jsonb | array of `{name, issuer, year}` |
| `experience_years` | integer | >= 0 |
| `location` | geography(Point, 4326) | PostGIS, for radius search |
| `city` | text | |
| `country` | text | |
| `hourly_rate` | numeric(10,2) | >= 0 |
| `currency` | text | 3-char ISO code, default `USD` |
| `is_available` | boolean | default true |
| `is_verified` | boolean | default false, protected from self-update via RLS |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto via trigger |

**RLS policies:** authenticated users can SELECT all profiles; INSERT/UPDATE/DELETE restricted to own profile (`auth.uid() = user_id`). `is_verified` cannot be changed by the profile owner.

**Indexes:** GiST on `location`, GIN on `specializations`, partial on `is_available = true`.

## Supabase Edge Functions

Edge Functions live in `supabase/functions/<name>/index.ts` (Deno/TypeScript). Shared utilities are in `supabase/functions/_shared/`.

### Running locally

```bash
npx supabase start                              # Start local Supabase
npx supabase db reset                            # Apply migrations
npx supabase functions serve --no-verify-jwt     # Serve all Edge Functions
```

**Important:** Always use `--no-verify-jwt` when serving locally — the functions handle JWT verification internally via `supabase.auth.getUser()`. Without this flag, the gateway rejects tokens before they reach function code.

### `trainer-profile` Function

Single function with HTTP method routing for CRUD on `trainer_profiles`:

- **POST** — Create profile. Forces `user_id` to authenticated user. Returns 409 on duplicate.
- **GET** — Get own profile (no params) or any profile by `?id=<uuid>`.
- **PUT** — Partial update. Strips protected fields (`user_id`, `is_verified`, `id`, `created_at`).
- **DELETE** — Delete own profile.

Auth: reads `Authorization: Bearer <jwt>` header, creates a Supabase client scoped to that user so RLS applies automatically.

Location input: `{"lat": 40.71, "lng": -74.00}` → converted to WKT `POINT(-74.00 40.71)` for PostGIS.

### Shared modules

- `supabase/functions/_shared/cors.ts` — CORS headers used by all Edge Functions.

## Scripts

- `scripts/trainer-profile-requests.sh` — Curl script to sign in, create a trainer profile, retrieve it, and update it against local Supabase. Run with `bash scripts/trainer-profile-requests.sh`.
