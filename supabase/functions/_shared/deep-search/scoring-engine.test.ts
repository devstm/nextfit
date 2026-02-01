import { describe, it, expect } from "vitest";
import { scoreTrainers } from "./scoring-engine";
import type { SearchIntent, TrainerForScoring } from "./types";

function emptyIntent(): SearchIntent {
  return {
    goals: [],
    trainingStyle: [],
    fitnessLevel: null,
    city: null,
    country: null,
    maxRate: null,
    healthConditions: [],
  };
}

function makeTrainer(overrides: Partial<TrainerForScoring> = {}): TrainerForScoring {
  return {
    id: "test-id",
    display_name: "Test Trainer",
    specializations: [],
    experience_years: 5,
    city: null,
    country: null,
    hourly_rate: 50,
    is_available: true,
    ...overrides,
  };
}

describe("Scoring Engine", () => {
  // ─── Round 1: Goal scoring ─────────────────────────────────────────
  describe("goal scoring", () => {
    it("gives 40 points for full goal match (1/1)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        goals: ["weight_loss"],
      };
      const trainer = makeTrainer({ specializations: ["weight_loss", "hiit"] });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.goalScore).toBe(40);
    });

    it("gives 20 points for partial goal match (1/2)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        goals: ["weight_loss", "nutrition"],
      };
      const trainer = makeTrainer({ specializations: ["weight_loss"] });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.goalScore).toBe(20);
    });

    it("gives 0 points for no goal match", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        goals: ["weight_loss"],
      };
      const trainer = makeTrainer({ specializations: ["yoga"] });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.goalScore).toBe(0);
    });

    it("gives 40 points for complete goal match (3/3)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        goals: ["weight_loss", "yoga", "nutrition"],
      };
      const trainer = makeTrainer({
        specializations: ["weight_loss", "yoga", "nutrition"],
      });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.goalScore).toBe(40);
    });

    it("gives 40 points when intent has no goals (no penalty)", () => {
      const intent = emptyIntent();
      const trainer = makeTrainer({ specializations: ["yoga"] });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.goalScore).toBe(40);
    });
  });

  // ─── Round 2: Level scoring ────────────────────────────────────────
  describe("level scoring", () => {
    it("gives 20 for beginner intent + low experience (2 years)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        fitnessLevel: "beginner",
      };
      const trainer = makeTrainer({ experience_years: 2 });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.levelScore).toBe(20);
    });

    it("gives 10 for beginner intent + very high experience (15 years)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        fitnessLevel: "beginner",
      };
      const trainer = makeTrainer({ experience_years: 15 });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.levelScore).toBe(10);
    });

    it("gives 20 for advanced intent + high experience (12 years)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        fitnessLevel: "advanced",
      };
      const trainer = makeTrainer({ experience_years: 12 });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.levelScore).toBe(20);
    });

    it("gives 10 for advanced intent + low experience (1 year)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        fitnessLevel: "advanced",
      };
      const trainer = makeTrainer({ experience_years: 1 });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.levelScore).toBe(10);
    });

    it("gives 20 when intent has no fitness level", () => {
      const intent = emptyIntent();
      const trainer = makeTrainer({ experience_years: 8 });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.levelScore).toBe(20);
    });
  });

  // ─── Round 3: Location scoring ─────────────────────────────────────
  describe("location scoring", () => {
    it("gives 20 for exact city match", () => {
      const intent: SearchIntent = { ...emptyIntent(), city: "Dubai" };
      const trainer = makeTrainer({ city: "Dubai", country: "AE" });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.locationScore).toBe(20);
    });

    it("gives 20 for case-insensitive city match", () => {
      const intent: SearchIntent = { ...emptyIntent(), city: "dubai" };
      const trainer = makeTrainer({ city: "Dubai", country: "AE" });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.locationScore).toBe(20);
    });

    it("gives 0 for no city or country match", () => {
      const intent: SearchIntent = { ...emptyIntent(), city: "Dubai" };
      const trainer = makeTrainer({ city: "London", country: "GB" });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.locationScore).toBe(0);
    });

    it("gives 10 for country-only match", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        country: "US",
      };
      const trainer = makeTrainer({ city: "Chicago", country: "US" });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.locationScore).toBe(10);
    });

    it("gives 20 when intent has no location", () => {
      const intent = emptyIntent();
      const trainer = makeTrainer({ city: "London", country: "GB" });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.locationScore).toBe(20);
    });
  });

  // ─── Round 4: Style scoring (MVP: always 20) ──────────────────────
  describe("style scoring", () => {
    it("always gives 20 points (MVP — no training_style on trainer)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        trainingStyle: ["online"],
      };
      const trainer = makeTrainer();
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.styleScore).toBe(20);
    });
  });

  // ─── Round 5: Full scoring and sorting ─────────────────────────────
  describe("sorting and total score", () => {
    it("sorts by score descending (perfect match first)", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        goals: ["weight_loss"],
        city: "Dubai",
      };
      const perfect = makeTrainer({
        id: "perfect",
        display_name: "Perfect",
        specializations: ["weight_loss"],
        city: "Dubai",
        country: "AE",
      });
      const partial = makeTrainer({
        id: "partial",
        display_name: "Partial",
        specializations: ["yoga"],
        city: "London",
        country: "GB",
      });
      const results = scoreTrainers(intent, [partial, perfect]);
      expect(results[0].trainer.id).toBe("perfect");
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it("tie-breaks by experience_years descending", () => {
      const intent = emptyIntent(); // All trainers score 100
      const senior = makeTrainer({
        id: "senior",
        display_name: "Senior",
        experience_years: 15,
      });
      const junior = makeTrainer({
        id: "junior",
        display_name: "Junior",
        experience_years: 3,
      });
      const results = scoreTrainers(intent, [junior, senior]);
      expect(results[0].trainer.id).toBe("senior");
      expect(results[1].trainer.id).toBe("junior");
    });

    it("tie-breaks by display_name alphabetically when experience is equal", () => {
      const intent = emptyIntent();
      const alice = makeTrainer({
        id: "alice",
        display_name: "Alice",
        experience_years: 5,
      });
      const bob = makeTrainer({
        id: "bob",
        display_name: "Bob",
        experience_years: 5,
      });
      const results = scoreTrainers(intent, [bob, alice]);
      expect(results[0].trainer.id).toBe("alice");
      expect(results[1].trainer.id).toBe("bob");
    });

    it("returns empty array for empty trainers input", () => {
      const results = scoreTrainers(emptyIntent(), []);
      expect(results).toEqual([]);
    });

    it("gives all trainers score 100 when intent is empty", () => {
      const intent = emptyIntent();
      const trainer = makeTrainer();
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.score).toBe(100);
    });
  });

  // ─── Round 6: Filtering ────────────────────────────────────────────
  describe("filtering", () => {
    it("filters out trainers above maxRate", () => {
      const intent: SearchIntent = { ...emptyIntent(), maxRate: 60 };
      const cheap = makeTrainer({
        id: "cheap",
        hourly_rate: 50,
      });
      const expensive = makeTrainer({
        id: "expensive",
        hourly_rate: 100,
      });
      const results = scoreTrainers(intent, [cheap, expensive]);
      expect(results).toHaveLength(1);
      expect(results[0].trainer.id).toBe("cheap");
    });

    it("includes trainers with null hourly_rate when maxRate is set", () => {
      const intent: SearchIntent = { ...emptyIntent(), maxRate: 60 };
      const noRate = makeTrainer({
        id: "no-rate",
        hourly_rate: null,
      });
      const results = scoreTrainers(intent, [noRate]);
      expect(results).toHaveLength(1);
      expect(results[0].trainer.id).toBe("no-rate");
    });

    it("includes trainers at exactly maxRate", () => {
      const intent: SearchIntent = { ...emptyIntent(), maxRate: 50 };
      const exact = makeTrainer({
        id: "exact",
        hourly_rate: 50,
      });
      const results = scoreTrainers(intent, [exact]);
      expect(results).toHaveLength(1);
    });
  });

  // ─── Round 7: Edge cases ───────────────────────────────────────────
  describe("edge cases", () => {
    it("handles trainer with null city when intent has city", () => {
      const intent: SearchIntent = { ...emptyIntent(), city: "Dubai" };
      const trainer = makeTrainer({ city: null, country: null });
      const [result] = scoreTrainers(intent, [trainer]);
      expect(result.breakdown.locationScore).toBe(0);
    });

    it("returns single trainer in array", () => {
      const results = scoreTrainers(emptyIntent(), [makeTrainer()]);
      expect(results).toHaveLength(1);
    });

    it("computes correct total score from breakdown", () => {
      const intent: SearchIntent = {
        ...emptyIntent(),
        goals: ["weight_loss"],
        city: "Dubai",
        fitnessLevel: "beginner",
      };
      const trainer = makeTrainer({
        specializations: ["weight_loss"],
        city: "Dubai",
        country: "AE",
        experience_years: 3,
      });
      const [result] = scoreTrainers(intent, [trainer]);
      const expectedTotal =
        result.breakdown.goalScore +
        result.breakdown.styleScore +
        result.breakdown.levelScore +
        result.breakdown.locationScore;
      expect(result.score).toBe(expectedTotal);
    });
  });
});
