import type { SearchIntent } from "./types";
import {
  GOAL_KEYWORDS,
  STYLE_KEYWORDS,
  LEVEL_KEYWORDS,
  HEALTH_KEYWORDS,
  BUDGET_PATTERNS,
} from "./keyword-maps";

/**
 * Parse a free-text search query into structured search intent.
 * Uses deterministic keyword/pattern matching — no LLM required.
 */
export function parseSearchIntent(query: string): SearchIntent {
  const intent: SearchIntent = {
    goals: [],
    trainingStyle: [],
    fitnessLevel: null,
    city: null,
    country: null,
    maxRate: null,
    healthConditions: [],
  };

  if (!query || typeof query !== "string") return intent;

  const trimmed = query.trim();
  if (trimmed.length === 0) return intent;

  // Keep original for city extraction (needs capitalization)
  const original = trimmed;
  // Normalize for keyword matching
  const lower = trimmed.toLowerCase().replace(/\s+/g, " ");

  // 1. Extract budget (before other matching to avoid number interference)
  for (const { pattern, extract } of BUDGET_PATTERNS) {
    const match = lower.match(pattern);
    if (match) {
      intent.maxRate = extract(match);
      break;
    }
  }

  // 2. Extract city from original text (needs capitalization)
  intent.city = extractCity(original);

  // 3. Extract goals — sort keywords by length descending for greedy matching
  const goalKeys = Object.keys(GOAL_KEYWORDS).sort(
    (a, b) => b.length - a.length
  );
  const seenGoals = new Set<string>();
  for (const keyword of goalKeys) {
    if (lower.includes(keyword)) {
      for (const goal of GOAL_KEYWORDS[keyword]) {
        if (!seenGoals.has(goal)) {
          seenGoals.add(goal);
          intent.goals.push(goal);
        }
      }
    }
  }

  // 4. Extract training style — sort by length descending
  const styleKeys = Object.keys(STYLE_KEYWORDS).sort(
    (a, b) => b.length - a.length
  );
  const seenStyles = new Set<string>();
  for (const keyword of styleKeys) {
    if (lower.includes(keyword)) {
      const style = STYLE_KEYWORDS[keyword];
      if (!seenStyles.has(style)) {
        seenStyles.add(style);
        intent.trainingStyle.push(style);
      }
    }
  }

  // 5. Extract fitness level — first match wins (sorted by length descending)
  const levelKeys = Object.keys(LEVEL_KEYWORDS).sort(
    (a, b) => b.length - a.length
  );
  for (const keyword of levelKeys) {
    if (lower.includes(keyword)) {
      intent.fitnessLevel = LEVEL_KEYWORDS[keyword];
      break;
    }
  }

  // 6. Extract health conditions — sort by length descending
  const healthKeys = Object.keys(HEALTH_KEYWORDS).sort(
    (a, b) => b.length - a.length
  );
  const seenHealth = new Set<string>();
  for (const keyword of healthKeys) {
    if (lower.includes(keyword)) {
      const condition = HEALTH_KEYWORDS[keyword];
      if (!seenHealth.has(condition)) {
        seenHealth.add(condition);
        intent.healthConditions.push(condition);
      }
    }
  }

  return intent;
}

/**
 * Extract city name from the original (non-lowered) query.
 * Looks for patterns like "in Dubai", "near London", "in New York", "in Los Angeles".
 */
function extractCity(text: string): string | null {
  // Match "in/near/around <Capitalized Words>" — supports multi-word city names
  const cityRegex =
    /(?:in|near|around)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/g;
  let match: RegExpExecArray | null;
  let bestMatch: string | null = null;

  while ((match = cityRegex.exec(text)) !== null) {
    const candidate = match[1];
    // Skip common false positives that are fitness terms
    const skipWords = new Set([
      "HIIT",
      "CrossFit",
      "Pilates",
      "Yoga",
      "Boxing",
      "MMA",
    ]);
    if (skipWords.has(candidate)) continue;
    // Prefer the longest match (most specific city name)
    if (!bestMatch || candidate.length > bestMatch.length) {
      bestMatch = candidate;
    }
  }

  // Also try uppercase patterns like "in NYC", "in LA"
  if (!bestMatch) {
    const upperRegex = /(?:in|near|around)\s+([A-Z]{2,})/g;
    while ((match = upperRegex.exec(text)) !== null) {
      const candidate = match[1];
      const skipWords = new Set(["HIIT", "MMA", "TRX"]);
      if (skipWords.has(candidate)) continue;
      bestMatch = candidate;
      break;
    }
  }

  return bestMatch;
}
