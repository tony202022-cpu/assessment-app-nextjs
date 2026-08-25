export type AssessmentAudienceKind = "individual" | "employee" | "manager" | "executive" | "business-owner" | "professional" | "student" | "custom";

export type AssessmentAudience = {
  primary: AssessmentAudienceKind;
  supported: AssessmentAudienceKind[];
  minimumAge?: number;
  roleTags?: string[];
  industries?: string[];
  /** Human-approved suitability notes; never used as hidden authorization. */
  suitabilityNotes?: string;
};
