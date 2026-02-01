# Deep Search MVP - TDD Implementation Plan

## Overview

Build the core **Deep Search** feature: a rule-based intent parser + scoring engine that accepts free-text queries (e.g., "Lose weight after pregnancy in Dubai") and returns ranked trainers. Every module is built test-first with Vitest.

## File Structure

```
supabase/functions/
  _shared/
    deep-search/
      types.ts                   # Shared interfaces
      keyword-maps.ts            # Keyword → specialization dictionaries
      intent-parser.ts           # Free-text → SearchIntent
      intent-parser.test.ts      # ~36 test cases
      scoring-engine.ts          # SearchIntent + trainers → ranked results
      scoring-engine.test.ts     # ~25 test cases
  deep-search/
    index.ts                     # Edge Function endpoint

vitest.config.ts                 # New - Vitest configuration
```

---

## Step 1: Test Setup

- Install `vitest` as a dev dependency
- Create `vitest.config.ts` (Node environment, `@/` alias)
- Add `"test": "vitest run"` and `"test:watch": "vitest"` to package.json

## Step 2: Types Module

- `SearchIntent` — goals[], trainingStyle[], fitnessLevel, city, country, maxRate, healthConditions[]
- `TrainerForScoring` — id, display_name, specializations[], experience_years, city, country, hourly_rate, is_available
- `ScoredTrainer` — trainer, score (0-100), breakdown (goalScore, styleScore, levelScore, locationScore)

## Step 3: Keyword Maps

- `GOAL_KEYWORDS` — maps phrases to specialization values
- `STYLE_KEYWORDS` — maps to training styles
- `LEVEL_KEYWORDS` — maps to fitness levels
- `HEALTH_KEYWORDS` — maps to health conditions
- `BUDGET_PATTERNS` — regex patterns for max rate extraction
- `CITY_PATTERN` — regex for city extraction

## Step 4: Intent Parser (TDD)

Function: `parseSearchIntent(query: string): SearchIntent`

~36 test cases covering: single goal extraction, multiple goals, city extraction, budget extraction, level extraction, health conditions, complex combined queries, training style, edge cases, synonyms.

## Step 5: Scoring Engine (TDD)

Function: `scoreTrainers(intent: SearchIntent, trainers: TrainerForScoring[]): ScoredTrainer[]`

| Component | Points | Logic |
|-----------|--------|-------|
| Goal | 0-40 | `(matched goals / total intent goals) * 40` |
| Style | 0-20 | Always 20 for MVP (no training_style column on trainer_profiles) |
| Level | 0-20 | Maps fitnessLevel to experience_years ranges |
| Location | 0-20 | City match → 20, country-only → 10, no match → 0 |

~25 test cases covering all scoring components, sorting, filtering, edge cases.

## Step 6: Deep Search Edge Function

GET endpoint at `/functions/v1/deep-search?q=<text>&page=1&per_page=12`

Pipeline: parse intent → fetch trainers → score → sort → paginate → respond.

## Verification

1. `npm test` — all ~61 unit tests pass
2. Manual curl tests against local Supabase with seed data
3. "lose weight in New York" → Sarah Johnson scores highest
4. "rehab in London" → Emma Williams scores highest
5. "pregnancy fitness in Dubai" → Fatima Hassan scores high
