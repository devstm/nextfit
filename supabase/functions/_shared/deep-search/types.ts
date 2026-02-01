/** Structured output from the intent parser */
export interface SearchIntent {
  goals: string[];
  trainingStyle: string[];
  fitnessLevel: string | null;
  city: string | null;
  country: string | null;
  maxRate: number | null;
  healthConditions: string[];
}

/** Minimal trainer shape needed by the scoring engine */
export interface TrainerForScoring {
  id: string;
  display_name: string;
  specializations: string[];
  experience_years: number;
  city: string | null;
  country: string | null;
  hourly_rate: number | null;
  is_available: boolean;
  [key: string]: unknown;
}

/** A scored trainer result */
export interface ScoredTrainer {
  trainer: TrainerForScoring;
  score: number;
  breakdown: {
    goalScore: number;
    styleScore: number;
    levelScore: number;
    locationScore: number;
  };
}
