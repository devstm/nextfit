# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexfiit is an AI-driven fitness ecosystem connecting fitness seekers with personal trainers (PTs) and sports clubs through **Deep Search** — an intent-based matching engine that understands goals, lifestyle, and health constraints instead of keywords.

### Deep Search (Core Innovation)

- Accepts free-text queries like "Lose weight after pregnancy" or "Rehab after knee injury"
- **Rule-based intent parser** extracts goals, training style, fitness level, city, budget, and health conditions from natural language
- **Scoring engine** ranks trainers on a 100-point scale: Goal (0-40) + Style (0-20, MVP: always 20) + Level (0-20) + Location (0-20)
- Implemented as pure TypeScript modules in `supabase/functions/_shared/deep-search/`
- Exposed via the `deep-search` Edge Function (`GET ?q=<free-text>`)

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
npm test         # Run Vitest unit tests (63 tests)
npm run test:watch  # Run Vitest in watch mode
```

**Testing:** Vitest is configured via `vitest.config.ts`. Test files live alongside source modules in `supabase/functions/_shared/deep-search/` (co-located pattern). Tests cover the intent parser (36 tests) and scoring engine (27 tests).

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

### TypeScript Configuration

`tsconfig.json` excludes `supabase/functions` because Edge Functions use Deno-style `.ts` extension imports that are incompatible with the Next.js/bundler module resolution. Vitest has its own resolution and handles these files independently.

## Database

### Migrations

Migrations live in `supabase/migrations/` and are applied with `npx supabase db reset`.

- `00001_create_trainer_profiles.sql` — `trainer_profiles` table with PostGIS, RLS, indexes, and `updated_at` trigger.
- `00002_create_user_profiles.sql` — `user_profiles` table with fitness data, body metrics, PostGIS location, RLS, and indexes.

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

### `user_profiles` Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | auto-generated |
| `user_id` | uuid FK → auth.users | unique, cascade delete |
| `display_name` | text | required |
| `avatar_url` | text | |
| `phone` | text | |
| `date_of_birth` | date | |
| `gender` | text | |
| `bio` | text | |
| `height_cm` | numeric(5,1) | > 0 |
| `weight_kg` | numeric(5,1) | > 0 |
| `fitness_level` | text | beginner, intermediate, or advanced |
| `fitness_goals` | text[] | e.g. `{weight_loss, muscle_gain}` |
| `health_conditions` | text[] | e.g. `{knee_injury, asthma}` |
| `preferred_training_style` | text[] | e.g. `{one_on_one, group, online}` |
| `location` | geography(Point, 4326) | PostGIS, for radius-based trainer matching |
| `city` | text | |
| `country` | text | |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto via trigger |

**RLS policies:** authenticated users can SELECT all profiles; INSERT/UPDATE/DELETE restricted to own profile (`auth.uid() = user_id`).

**Indexes:** GiST on `location`, GIN on `fitness_goals`.

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
- **GET** — Get own profile (no params), any profile by `?id=<uuid>`, or list/search with `?list=true`.
- **PUT** — Partial update. Strips protected fields (`user_id`, `is_verified`, `id`, `created_at`).
- **DELETE** — Delete own profile.

**List/search** (`GET ?list=true`): returns paginated trainer profiles with optional filters:
- `search` — partial match on display_name (ilike)
- `specialization` — filter by specialization (array contains)
- `city`, `country` — partial match (ilike)
- `min_rate`, `max_rate` — hourly_rate range
- `min_experience`, `max_experience` — experience_years range
- `available` — filter by is_available (default true, set `false` to show all)
- `page`, `per_page` — pagination (default page=1, per_page=12, max 50)
- Returns `{ data: [...], count, page, per_page }`

Auth: reads `Authorization: Bearer <jwt>` header, creates a Supabase client scoped to that user so RLS applies automatically.

Location input: `{"lat": 40.71, "lng": -74.00}` → converted to WKT `POINT(-74.00 40.71)` for PostGIS.

### Trainer Discovery Page

- **Route:** `/protected/trainers` — Server Component page that renders the `<TrainerDiscovery />` client component.
- **`components/trainer-discovery.tsx`** — Client Component with filter bar (search, specialization, city, country, rate range, experience range), results grid, and pagination. Fetches data from the `trainer-profile` Edge Function via raw `fetch`.
- **`components/trainer-card.tsx`** — Displays a trainer profile card with avatar initial, name, location, bio, specialization badges, experience, and hourly rate.

### `user-profile` Function

Single function with HTTP method routing for CRUD on `user_profiles`:

- **POST** — Create profile. Forces `user_id` to authenticated user. Returns 409 on duplicate.
- **GET** — Get own profile (no params) or any profile by `?id=<uuid>`.
- **PUT** — Partial update. Strips protected fields (`user_id`, `id`, `created_at`).
- **DELETE** — Delete own profile.

Auth & location handling identical to `trainer-profile`.

### `deep-search` Function

Intent-based trainer search. GET-only endpoint that parses free-text queries and returns scored/ranked trainers.

- **GET** `?q=<free-text>&page=1&per_page=12` — Parse intent, fetch available trainers, score, sort, paginate.
- Returns `{ data: [{...trainer, _score, _breakdown}], intent, count, page, per_page }`
- `intent` field shows the parsed `SearchIntent` for frontend transparency (e.g., "We understood: weight loss, in Dubai, beginner").
- Pre-filters at DB level: `is_available = true`, `hourly_rate <= maxRate` (when budget detected).
- Auth required (same Bearer token pattern as other functions).

**Pipeline:** `parseSearchIntent(q)` → DB fetch → `scoreTrainers(intent, trainers)` → paginate → respond.

### Deep Search Modules (`supabase/functions/_shared/deep-search/`)

Pure TypeScript modules with no Deno-specific dependencies (testable with Vitest under Node):

- **`types.ts`** — `SearchIntent`, `TrainerForScoring`, `ScoredTrainer` interfaces.
- **`keyword-maps.ts`** — Deterministic keyword dictionaries mapping natural language to database values. Covers all 45 specializations from seed data, plus training styles, fitness levels, health conditions, and budget patterns.
- **`intent-parser.ts`** — `parseSearchIntent(query: string): SearchIntent`. Extracts goals, training style, fitness level, city, max budget, and health conditions from free-text. Keywords sorted by length descending for greedy matching. City extraction uses capitalized-word regex on the original (pre-lowered) text.
- **`scoring-engine.ts`** — `scoreTrainers(intent, trainers): ScoredTrainer[]`. 100-point scoring: Goal (0-40), Style (0-20, always 20 for MVP since trainer_profiles lacks a training_style column), Level (0-20, maps fitness level to experience_years ranges), Location (0-20, city match = 20, country-only = 10). Filters by maxRate. Sorts by score desc → experience desc → name asc.

### Shared modules

- `supabase/functions/_shared/cors.ts` — CORS headers used by all Edge Functions.

## Scripts

- `scripts/trainer-profile-requests.sh` — Curl script to sign in, create a trainer profile, retrieve it, and update it against local Supabase. Run with `bash scripts/trainer-profile-requests.sh`.
- `scripts/user-profile-requests.sh` — Curl script to sign in, create a user profile, retrieve it, and update it against local Supabase. Run with `bash scripts/user-profile-requests.sh`.

## Seed Data

`supabase/seed.sql` populates 50 fake trainer profiles (applied automatically by `npx supabase db reset`). Covers 45 distinct specializations across 30+ cities in 20+ countries. Notable profiles for testing:

- **#1 Sarah Johnson** — weight_loss, New York, $85/hr (good test for "lose weight in New York")
- **#5 Emma Williams** — rehabilitation, London, $75/hr (good test for "rehab in London")
- **#8 Fatima Hassan** — prenatal/postnatal, Dubai, $150/hr (good test for "pregnancy in Dubai")
- **#33 Luis Hernandez** — budget trainer, Mexico City, $20/hr (lowest rate)
- **#34 Maximilian Stone** — celebrity trainer, Los Angeles, $300/hr (highest rate)
- **#35, #36** — unavailable trainers (test availability filter)
- **#37 Tyler Green** — 0 years experience (test beginner matching)
- **#50 Katarina Muller** — 7 specializations (test multi-specialization scoring)
