import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ------------------------------
// ASSESSMENT LOGIC
// ------------------------------

export type CompetencyId =
  | "mental_toughness"
  | "opening_conversations"
  | "identifying_needs"
  | "handling_objections"
  | "creating_irresistible_offers"
  | "mastering_closing"
  | "follow_up_discipline";

export type Tier = "strength" | "opportunity" | "threat" | "weakness";

export interface CompetencyScore {
  competencyId: CompetencyId;
  label: string;
  raw: number;
  max: number;
  percentage: number;
  tier: Tier;
  recommendations: string[];
}

export interface TotalScore {
  raw: number;
  max: number;
  percentage: number;
  tier: Tier;
}

export interface AssessmentResults {
  competencies: CompetencyScore[];
  total: TotalScore;
  swot: {
    strengths: CompetencyScore[];
    opportunities: CompetencyScore[];
    threats: CompetencyScore[];
    weaknesses: CompetencyScore[];
  };
}

// ------------------------------
// MAX SCORES PER COMPETENCY
// ------------------------------
export const COMPETENCY_MAX: Record<CompetencyId, number> = {
  mental_toughness: 25,
  opening_conversations: 20,
  identifying_needs: 20,
  handling_objections: 25,
  creating_irresistible_offers: 20,
  mastering_closing: 25,
  follow_up_discipline: 15,
};

// ------------------------------
// TIER LOGIC
// ------------------------------
function getTierFromPercentage(percentage: number): Tier {
  if (percentage >= 75) return "strength";
  if (percentage >= 51) return "opportunity";
  if (percentage >= 31) return "threat";
  return "weakness";
}

// ------------------------------
// ANSWER PAYLOAD
// ------------------------------
export interface AnswerPayload {
  questionId: string;
  competencyId: CompetencyId;
  selectedScore: 0 | 1 | 3 | 5;
}

// ------------------------------
// PLACEHOLDER RECOMMENDATIONS
// (We will replace these with your 84 real ones)
// ------------------------------
const RECOMMENDATIONS: Record<
  CompetencyId,
  Record<Tier, string[]>
> = {
  mental_toughness: {
    strength: ["MT Strength 1", "MT Strength 2", "MT Strength 3"],
    opportunity: ["MT Opp 1", "MT Opp 2", "MT Opp 3"],
    threat: ["MT Threat 1", "MT Threat 2", "MT Threat 3"],
    weakness: ["MT Weak 1", "MT Weak 2", "MT Weak 3"],
  },
  opening_conversations: {
    strength: ["OC Strength 1", "OC Strength 2", "OC Strength 3"],
    opportunity: ["OC Opp 1", "OC Opp 2", "OC Opp 3"],
    threat: ["OC Threat 1", "OC Threat 2", "OC Threat 3"],
    weakness: ["OC Weak 1", "OC Weak 2", "OC Weak 3"],
  },
  identifying_needs: {
    strength: ["IN Strength 1", "IN Strength 2", "IN Strength 3"],
    opportunity: ["IN Opp 1", "IN Opp 2", "IN Opp 3"],
    threat: ["IN Threat 1", "IN Threat 2", "IN Threat 3"],
    weakness: ["IN Weak 1", "IN Weak 2", "IN Weak 3"],
  },
  handling_objections: {
    strength: ["HO Strength 1", "HO Strength 2", "HO Strength 3"],
    opportunity: ["HO Opp 1", "HO Opp 2", "HO Opp 3"],
    threat: ["HO Threat 1", "HO Threat 2", "HO Threat 3"],
    weakness: ["HO Weak 1", "HO Weak 2", "HO Weak 3"],
  },
  creating_irresistible_offers: {
    strength: ["CIO Strength 1", "CIO Strength 2", "CIO Strength 3"],
    opportunity: ["CIO Opp 1", "CIO Opp 2", "CIO Opp 3"],
    threat: ["CIO Threat 1", "CIO Threat 2", "CIO Threat 3"],
    weakness: ["CIO Weak 1", "CIO Weak 2", "CIO Weak 3"],
  },
  mastering_closing: {
    strength: ["MC Strength 1", "MC Strength 2", "MC Strength 3"],
    opportunity: ["MC Opp 1", "MC Opp 2", "MC Opp 3"],
    threat: ["MC Threat 1", "MC Threat 2", "MC Threat 3"],
    weakness: ["MC Weak 1", "MC Weak 2", "MC Weak 3"],
  },
  follow_up_discipline: {
    strength: ["FUD Strength 1", "FUD Strength 2", "FUD Strength 3"],
    opportunity: ["FUD Opp 1", "FUD Opp 2", "FUD Opp 3"],
    threat: ["FUD Threat 1", "FUD Threat 2", "FUD Threat 3"],
    weakness: ["FUD Weak 1", "FUD Weak 2", "FUD Weak 3"],
  },
};

// ------------------------------
// FINAL SCORING ENGINE
// ------------------------------
export function computeAssessmentResults(
  answers: AnswerPayload[]
): AssessmentResults {
  const competencyRaw: Record<CompetencyId, number> = {
    mental_toughness: 0,
    opening_conversations: 0,
    identifying_needs: 0,
    handling_objections: 0,
    creating_irresistible_offers: 0,
    mastering_closing: 0,
    follow_up_discipline: 0,
  };

  // Sum raw scores
  for (const ans of answers) {
    competencyRaw[ans.competencyId] += ans.selectedScore;
  }

  // Build competency results
  const competencies: CompetencyScore[] = Object.entries(competencyRaw).map(
    ([id, raw]) => {
      const competencyId = id as CompetencyId;
      const max = COMPETENCY_MAX[competencyId];
      const percentage = Math.round((raw / max) * 100);
      const tier = getTierFromPercentage(percentage);

      return {
        competencyId,
        label: toCompetencyLabel(competencyId),
        raw,
        max,
        percentage,
        tier,
        recommendations: RECOMMENDATIONS[competencyId][tier],
      };
    }
  );

  // Total score
  const totalRaw = competencies.reduce((sum, c) => sum + c.raw, 0);
  const totalMax = competencies.reduce((sum, c) => sum + c.max, 0);
  const totalPercentage = Math.round((totalRaw / totalMax) * 100);
  const totalTier = getTierFromPercentage(totalPercentage);

  return {
    competencies,
    total: {
      raw: totalRaw,
      max: totalMax,
      percentage: totalPercentage,
      tier: totalTier,
    },
    swot: {
      strengths: competencies.filter(c => c.tier === "strength"),
      opportunities: competencies.filter(c => c.tier === "opportunity"),
      threats: competencies.filter(c => c.tier === "threat"),
      weaknesses: competencies.filter(c => c.tier === "weakness"),
    },
  };
}

// ------------------------------
// LABEL MAPPER
// ------------------------------
function toCompetencyLabel(id: CompetencyId): string {
  switch (id) {
    case "mental_toughness":
      return "Mental Toughness";
    case "opening_conversations":
      return "Opening Conversations";
    case "identifying_needs":
      return "Identifying Needs";
    case "handling_objections":
      return "Handling Objections";
    case "creating_irresistible_offers":
      return "Creating Irresistible Offers";
    case "mastering_closing":
      return "Mastering Closing";
    case "follow_up_discipline":
      return "Follow-Up Discipline";
  }
}