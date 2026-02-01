/**
 * Keyword dictionaries mapping natural language to database specialization values.
 * Longer phrases are checked first (sorted by length descending at parse time).
 */

export const GOAL_KEYWORDS: Record<string, string[]> = {
  // Weight management
  "lose weight": ["weight_loss"],
  "weight loss": ["weight_loss"],
  "fat loss": ["weight_loss"],
  "slim down": ["weight_loss"],
  "burn fat": ["weight_loss"],
  "get lean": ["weight_loss"],
  "shed pounds": ["weight_loss"],
  "cut weight": ["weight_loss"],

  // Strength
  "build muscle": ["strength_training"],
  "muscle gain": ["strength_training"],
  "get strong": ["strength_training"],
  strength: ["strength_training"],
  "bulk up": ["strength_training", "bodybuilding"],
  powerlifting: ["powerlifting", "strength_training"],
  strongman: ["strongman", "strength_training"],
  kettlebell: ["kettlebell", "strength_training"],

  // Bodybuilding
  bodybuilding: ["bodybuilding"],
  "body building": ["bodybuilding"],
  physique: ["bodybuilding"],
  "contest prep": ["bodybuilding"],

  // Yoga / flexibility
  yoga: ["yoga"],
  flexibility: ["flexibility"],
  stretch: ["flexibility"],
  stretching: ["flexibility"],
  meditation: ["meditation"],
  mindfulness: ["meditation"],
  breathwork: ["meditation"],

  // Pilates
  pilates: ["pilates"],

  // Rehab / recovery
  rehabilitation: ["rehabilitation"],
  rehab: ["rehabilitation"],
  recovery: ["rehabilitation"],
  injury: ["rehabilitation"],
  "post-injury": ["rehabilitation"],
  posture: ["posture_correction"],

  // Prenatal / postnatal
  pregnancy: ["prenatal"],
  pregnant: ["prenatal"],
  prenatal: ["prenatal"],
  postnatal: ["postnatal"],
  postpartum: ["postnatal"],
  "after pregnancy": ["postnatal"],

  // HIIT / Cardio
  hiit: ["hiit"],
  "high intensity": ["hiit"],
  "interval training": ["hiit"],
  cardio: ["cardio"],
  endurance: ["endurance"],
  running: ["running", "endurance"],
  marathon: ["running", "endurance"],
  triathlon: ["triathlon", "endurance"],

  // CrossFit
  crossfit: ["crossfit"],
  "cross fit": ["crossfit"],

  // Boxing / martial arts
  boxing: ["boxing"],
  kickboxing: ["boxing", "martial_arts"],
  "martial arts": ["martial_arts"],
  mma: ["mma", "martial_arts"],
  "muay thai": ["martial_arts", "boxing"],
  "jiu jitsu": ["martial_arts"],

  // Swimming
  swimming: ["swimming"],
  swim: ["swimming"],

  // Dance
  dance: ["dance_fitness"],
  zumba: ["dance_fitness"],

  // Sports performance
  "sports performance": ["sports_performance"],
  athletic: ["sports_performance"],
  speed: ["speed_agility"],
  agility: ["speed_agility"],

  // Calisthenics / bodyweight
  calisthenics: ["calisthenics"],
  bodyweight: ["calisthenics", "bodyweight"],

  // Senior fitness
  senior: ["senior_fitness"],
  elderly: ["senior_fitness"],
  "over 50": ["senior_fitness"],
  "over 55": ["senior_fitness"],
  "fall prevention": ["senior_fitness"],

  // Functional / misc
  functional: ["functional_training"],
  bootcamp: ["bootcamp"],
  "boot camp": ["bootcamp"],
  nutrition: ["nutrition"],
  diet: ["nutrition"],
  "meal plan": ["nutrition"],
  "home workout": ["home_workouts"],
  "at home": ["home_workouts"],
  "olympic lifting": ["olympic_lifting"],
  parkour: ["parkour"],
  climbing: ["climbing"],
  core: ["core_training"],
  abs: ["core_training"],
  mobility: ["mobility"],
  balance: ["balance"],
};

export const STYLE_KEYWORDS: Record<string, string> = {
  "one on one": "one_on_one",
  "1 on 1": "one_on_one",
  private: "one_on_one",
  personal: "one_on_one",
  group: "group",
  class: "group",
  classes: "group",
  online: "online",
  virtual: "online",
  remote: "online",
  video: "online",
};

export const LEVEL_KEYWORDS: Record<string, string> = {
  "just starting": "beginner",
  "new to": "beginner",
  "never trained": "beginner",
  "first time": "beginner",
  beginner: "beginner",
  "some experience": "intermediate",
  intermediate: "intermediate",
  experienced: "advanced",
  competitive: "advanced",
  advanced: "advanced",
  pro: "advanced",
  elite: "advanced",
};

export const HEALTH_KEYWORDS: Record<string, string> = {
  "knee injury": "knee_injury",
  "bad knee": "knee_injury",
  "knee pain": "knee_injury",
  "back pain": "back_pain",
  "back injury": "back_pain",
  "bad back": "back_pain",
  "shoulder injury": "shoulder_injury",
  "shoulder pain": "shoulder_injury",
  asthma: "asthma",
  diabetes: "diabetes",
  "heart condition": "heart_condition",
  arthritis: "arthritis",
  "high blood pressure": "hypertension",
  hypertension: "hypertension",
  obesity: "obesity",
  overweight: "obesity",
};

export const BUDGET_PATTERNS: {
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => number;
}[] = [
  {
    pattern: /under\s*\$?\s*(\d+)/i,
    extract: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /less than\s*\$?\s*(\d+)/i,
    extract: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /below\s*\$?\s*(\d+)/i,
    extract: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /max\s*\$?\s*(\d+)/i,
    extract: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /budget\s*(?:of\s*)?\$?\s*(\d+)/i,
    extract: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /\$(\d+)\s*(?:per hour|\/hr|\/hour|an hour)/i,
    extract: (m) => parseInt(m[1], 10),
  },
  {
    pattern: /(\d+)\s*(?:dollars|usd)\s*(?:per hour|\/hr|an hour)/i,
    extract: (m) => parseInt(m[1], 10),
  },
  { pattern: /\bcheap\b/i, extract: () => 50 },
  { pattern: /\baffordable\b/i, extract: () => 75 },
];
