import type { SearchIntent, TrainerForScoring, ScoredTrainer } from "./types.ts";

/**
 * Score and rank trainers against a parsed search intent.
 * Returns trainers sorted by score descending.
 */
export function scoreTrainers(
  intent: SearchIntent,
  trainers: TrainerForScoring[]
): ScoredTrainer[] {
  // Filter by maxRate if set
  let filtered = trainers;
  if (intent.maxRate !== null) {
    filtered = trainers.filter(
      (t) => t.hourly_rate === null || t.hourly_rate <= intent.maxRate!
    );
  }

  // Score each trainer
  const scored: ScoredTrainer[] = filtered.map((trainer) => {
    const goalScore = computeGoalScore(intent, trainer);
    const styleScore = 20; // MVP: trainer_profiles has no training_style column
    const levelScore = computeLevelScore(intent, trainer);
    const locationScore = computeLocationScore(intent, trainer);

    const score = goalScore + styleScore + levelScore + locationScore;

    return {
      trainer,
      score,
      breakdown: { goalScore, styleScore, levelScore, locationScore },
    };
  });

  // Sort: score desc, then experience desc, then name asc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.trainer.experience_years !== a.trainer.experience_years) {
      return b.trainer.experience_years - a.trainer.experience_years;
    }
    return a.trainer.display_name.localeCompare(b.trainer.display_name);
  });

  return scored;
}

/**
 * Goal score: 0-40 points.
 * No goals in intent → 40 (no penalty).
 * Otherwise: (matched / total) * 40.
 */
function computeGoalScore(
  intent: SearchIntent,
  trainer: TrainerForScoring
): number {
  if (intent.goals.length === 0) return 40;

  const specs = new Set(trainer.specializations);
  let matched = 0;
  for (const goal of intent.goals) {
    if (specs.has(goal)) matched++;
  }

  return Math.round((matched / intent.goals.length) * 40);
}

/**
 * Level score: 0-20 points.
 * No level in intent → 20 (no penalty).
 * Maps fitness level to ideal experience ranges.
 */
function computeLevelScore(
  intent: SearchIntent,
  trainer: TrainerForScoring
): number {
  if (!intent.fitnessLevel) return 20;

  const exp = trainer.experience_years;

  switch (intent.fitnessLevel) {
    case "beginner":
      if (exp <= 5) return 20;
      if (exp <= 10) return 15;
      return 10;
    case "intermediate":
      if (exp >= 3 && exp <= 10) return 20;
      if (exp > 10) return 15;
      return 10;
    case "advanced":
      if (exp >= 8) return 20;
      if (exp >= 4) return 15;
      return 10;
    default:
      return 20;
  }
}

/**
 * Location score: 0-20 points.
 * No location in intent → 20 (no penalty).
 * City match → 20, country-only match → 10, no match → 0.
 */
function computeLocationScore(
  intent: SearchIntent,
  trainer: TrainerForScoring
): number {
  if (!intent.city && !intent.country) return 20;

  // City match (case-insensitive)
  if (intent.city && trainer.city) {
    if (intent.city.toLowerCase() === trainer.city.toLowerCase()) {
      return 20;
    }
  }

  // Country match (case-insensitive)
  if (intent.country && trainer.country) {
    if (intent.country.toLowerCase() === trainer.country.toLowerCase()) {
      return 10;
    }
  }

  return 0;
}
