import { describe, it, expect } from "vitest";
import { parseSearchIntent } from "./intent-parser";
import type { SearchIntent } from "./types";

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

describe("Intent Parser", () => {
  // ─── Round 1: Basic single extraction ──────────────────────────────
  describe("single goal extraction", () => {
    it("extracts weight_loss from 'I want to lose weight'", () => {
      const result = parseSearchIntent("I want to lose weight");
      expect(result.goals).toContain("weight_loss");
    });

    it("extracts yoga from 'yoga classes'", () => {
      const result = parseSearchIntent("yoga classes");
      expect(result.goals).toContain("yoga");
      expect(result.trainingStyle).toContain("group");
    });

    it("extracts beginner level from 'I'm a complete beginner'", () => {
      const result = parseSearchIntent("I'm a complete beginner");
      expect(result.fitnessLevel).toBe("beginner");
    });
  });

  // ─── Round 2: Multiple goals ───────────────────────────────────────
  describe("multiple goal extraction", () => {
    it("extracts strength_training and flexibility from 'Build muscle and improve flexibility'", () => {
      const result = parseSearchIntent(
        "Build muscle and improve flexibility"
      );
      expect(result.goals).toContain("strength_training");
      expect(result.goals).toContain("flexibility");
    });

    it("extracts hiit and weight_loss from 'HIIT and weight loss'", () => {
      const result = parseSearchIntent("HIIT and weight loss");
      expect(result.goals).toContain("hiit");
      expect(result.goals).toContain("weight_loss");
    });

    it("extracts boxing and martial_arts from 'Boxing and martial arts training'", () => {
      const result = parseSearchIntent("Boxing and martial arts training");
      expect(result.goals).toContain("boxing");
      expect(result.goals).toContain("martial_arts");
    });
  });

  // ─── Round 3: Location extraction ──────────────────────────────────
  describe("city extraction", () => {
    it("extracts Dubai from 'trainer in Dubai'", () => {
      const result = parseSearchIntent("trainer in Dubai");
      expect(result.city).toBe("Dubai");
    });

    it("extracts London from 'yoga near London'", () => {
      const result = parseSearchIntent("yoga near London");
      expect(result.city).toBe("London");
      expect(result.goals).toContain("yoga");
    });

    it("extracts New York from 'personal trainer in New York'", () => {
      const result = parseSearchIntent("personal trainer in New York");
      expect(result.city).toBe("New York");
      expect(result.trainingStyle).toContain("one_on_one");
    });

    it("extracts Los Angeles from 'fitness in Los Angeles'", () => {
      const result = parseSearchIntent("fitness in Los Angeles");
      expect(result.city).toBe("Los Angeles");
    });
  });

  // ─── Round 4: Budget extraction ────────────────────────────────────
  describe("budget extraction", () => {
    it("extracts 50 from 'under $50 per hour'", () => {
      const result = parseSearchIntent("under $50 per hour");
      expect(result.maxRate).toBe(50);
    });

    it("extracts 75 from 'affordable trainer'", () => {
      const result = parseSearchIntent("affordable trainer");
      expect(result.maxRate).toBe(75);
    });

    it("extracts 100 from 'less than $100'", () => {
      const result = parseSearchIntent("less than $100");
      expect(result.maxRate).toBe(100);
    });

    it("extracts 50 and yoga from 'cheap yoga trainer'", () => {
      const result = parseSearchIntent("cheap yoga trainer");
      expect(result.maxRate).toBe(50);
      expect(result.goals).toContain("yoga");
    });
  });

  // ─── Round 5: Fitness level ────────────────────────────────────────
  describe("fitness level extraction", () => {
    it("extracts advanced from 'advanced powerlifting coach'", () => {
      const result = parseSearchIntent("advanced powerlifting coach");
      expect(result.fitnessLevel).toBe("advanced");
      expect(result.goals).toContain("powerlifting");
    });

    it("extracts beginner from 'just starting out with strength training'", () => {
      const result = parseSearchIntent(
        "just starting out with strength training"
      );
      expect(result.fitnessLevel).toBe("beginner");
      expect(result.goals).toContain("strength_training");
    });

    it("extracts intermediate from 'intermediate crossfit'", () => {
      const result = parseSearchIntent("intermediate crossfit");
      expect(result.fitnessLevel).toBe("intermediate");
      expect(result.goals).toContain("crossfit");
    });
  });

  // ─── Round 6: Health conditions ────────────────────────────────────
  describe("health condition extraction", () => {
    it("extracts knee_injury from 'I have a knee injury'", () => {
      const result = parseSearchIntent("I have a knee injury");
      expect(result.healthConditions).toContain("knee_injury");
    });

    it("extracts back_pain and rehabilitation from 'back pain rehabilitation'", () => {
      const result = parseSearchIntent("back pain rehabilitation");
      expect(result.healthConditions).toContain("back_pain");
      expect(result.goals).toContain("rehabilitation");
    });

    it("extracts diabetes from 'trainer for someone with diabetes'", () => {
      const result = parseSearchIntent("trainer for someone with diabetes");
      expect(result.healthConditions).toContain("diabetes");
    });
  });

  // ─── Round 7: Complex combined queries ─────────────────────────────
  describe("complex combined queries", () => {
    it("parses 'Lose weight after pregnancy in NYC for beginners under $100'", () => {
      const result = parseSearchIntent(
        "Lose weight after pregnancy in NYC for beginners under $100"
      );
      expect(result.goals).toContain("weight_loss");
      expect(result.goals).toContain("postnatal");
      expect(result.city).toBe("NYC");
      expect(result.fitnessLevel).toBe("beginner");
      expect(result.maxRate).toBe(100);
    });

    it("parses 'Rehab after knee injury in London'", () => {
      const result = parseSearchIntent("Rehab after knee injury in London");
      expect(result.goals).toContain("rehabilitation");
      expect(result.healthConditions).toContain("knee_injury");
      expect(result.city).toBe("London");
    });

    it("parses 'Advanced martial arts and boxing group classes in Dubai under $80'", () => {
      const result = parseSearchIntent(
        "Advanced martial arts and boxing group classes in Dubai under $80"
      );
      expect(result.goals).toContain("martial_arts");
      expect(result.goals).toContain("boxing");
      expect(result.trainingStyle).toContain("group");
      expect(result.fitnessLevel).toBe("advanced");
      expect(result.city).toBe("Dubai");
      expect(result.maxRate).toBe(80);
    });
  });

  // ─── Round 8: Training style ───────────────────────────────────────
  describe("training style extraction", () => {
    it("extracts online and one_on_one from 'online personal training'", () => {
      const result = parseSearchIntent("online personal training");
      expect(result.trainingStyle).toContain("online");
      expect(result.trainingStyle).toContain("one_on_one");
    });

    it("extracts group from 'group fitness classes'", () => {
      const result = parseSearchIntent("group fitness classes");
      expect(result.trainingStyle).toContain("group");
    });

    it("extracts online and yoga from 'virtual yoga sessions'", () => {
      const result = parseSearchIntent("virtual yoga sessions");
      expect(result.trainingStyle).toContain("online");
      expect(result.goals).toContain("yoga");
    });
  });

  // ─── Round 9: Edge cases ───────────────────────────────────────────
  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = parseSearchIntent("");
      expect(result).toEqual(emptyIntent());
    });

    it("handles gibberish", () => {
      const result = parseSearchIntent("asdfghjkl zxcvbnm");
      expect(result).toEqual(emptyIntent());
    });

    it("handles very long input without crashing", () => {
      const result = parseSearchIntent("A".repeat(5000));
      expect(result).toBeDefined();
      expect(result.goals).toEqual([]);
    });

    it("handles ALL CAPS", () => {
      const result = parseSearchIntent("LOSE WEIGHT");
      expect(result.goals).toContain("weight_loss");
    });

    it("handles extra whitespace", () => {
      const result = parseSearchIntent("  lose   weight  ");
      expect(result.goals).toContain("weight_loss");
    });

    it("handles special characters", () => {
      const result = parseSearchIntent("lose weight!!! #goals @fit");
      expect(result.goals).toContain("weight_loss");
    });
  });

  // ─── Round 10: Synonym coverage ────────────────────────────────────
  describe("synonym coverage", () => {
    it("maps 'slim down' to weight_loss", () => {
      const result = parseSearchIntent("slim down");
      expect(result.goals).toContain("weight_loss");
    });

    it("maps 'burn fat' to weight_loss", () => {
      const result = parseSearchIntent("burn fat");
      expect(result.goals).toContain("weight_loss");
    });

    it("maps 'get strong' to strength_training", () => {
      const result = parseSearchIntent("get strong");
      expect(result.goals).toContain("strength_training");
    });

    it("maps 'postpartum' to postnatal", () => {
      const result = parseSearchIntent("postpartum recovery");
      expect(result.goals).toContain("postnatal");
      expect(result.goals).toContain("rehabilitation");
    });
  });
});
