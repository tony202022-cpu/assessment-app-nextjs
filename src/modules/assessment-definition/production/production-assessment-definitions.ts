import type { AssessmentDefinition } from "../assessment-definition";

type Competency = readonly [id: string, en: string, ar: string, aliases?: readonly string[]];

type LegacyDefinitionInput = {
  id: string;
  slug: string;
  name: string;
  description: string;
  primaryAudience: AssessmentDefinition["audience"]["primary"];
  supportedAudiences: AssessmentDefinition["audience"]["supported"];
  competencies: readonly Competency[];
  questionCount: number;
  timeLimitMinutes: number;
  individualAvailability: boolean;
  corporateAvailability: boolean;
  managerDashboard?: boolean;
  pricing: AssessmentDefinition["pricing"];
  features: Pick<
    AssessmentDefinition["features"],
    "ninetyDayPlan" | "dailySchedule" | "pdfExport" | "emailDelivery"
  >;
};

function legacyProductionDefinition(input: LegacyDefinitionInput): AssessmentDefinition {
  const managerDashboard = input.managerDashboard === true;
  const entitlementPolicies: AssessmentDefinition["accessPolicy"]["entitlementPolicies"] = [];
  if (input.individualAvailability) {
    entitlementPolicies.push({ type: "purchased", enabled: true, usage: "single-use", maximumUses: 1 });
  }
  if (input.corporateAvailability) {
    entitlementPolicies.push({
      type: "corporate",
      enabled: true,
      usage: "reusable",
      organizationRequired: true,
    });
  }

  return {
    metadata: {
      id: input.id,
      version: "1.0.0",
      name: input.name,
      slug: input.slug,
      status: "published",
      type: "diagnostic",
      description: input.description,
      owner: "Career Labs AI",
      theme: { id: input.slug, version: "1.0.0" },
      icons: { primary: "clipboard-check" },
      tags: ["production", "legacy-adapter"],
    },
    capabilities: {
      individualAvailability: input.individualAvailability,
      corporateAvailability: input.corporateAvailability,
      managerDashboard,
      participantReport: true,
      managerReport: managerDashboard,
      executiveReport: false,
      timed: true,
      bilingual: true,
      complimentaryAccess: false,
      developerTesting: true,
    },
    audience: {
      primary: input.primaryAudience,
      supported: [...input.supportedAudiences],
    },
    accessPolicy: {
      channels: input.corporateAvailability
        ? ["authenticated", "entitlement", "company", "developer"]
        : ["authenticated", "developer"],
      authenticationRequired: true,
      individualEnabled: input.individualAvailability,
      corporateEnabled: input.corporateAvailability,
      managerAccessEnabled: managerDashboard,
      entitlementPolicies,
      tokenPolicy: {
        required: input.corporateAvailability,
        exchangeForSession: false,
        purpose: input.corporateAvailability
          ? "Preserve the existing company-token assessment entry flow."
          : "Preserve the existing authenticated participant entry flow.",
      },
    },
    localization: {
      defaultLocale: "en",
      supportedLocales: ["en", "ar"],
      requiredResourceKeys: ["assessment.name", "assessment.description"],
      locales: {
        en: {
          locale: "en",
          direction: "ltr",
          displayName: "English",
          resources: {
            "assessment.name": input.name,
            "assessment.description": input.description,
          },
        },
        ar: {
          locale: "ar",
          direction: "rtl",
          displayName: "العربية",
          resources: {
            "assessment.name": input.name,
            "assessment.description": input.description,
          },
        },
      },
    },
    competencyModel: {
      id: `${input.slug}-competencies`,
      version: "1.0.0",
      competencies: input.competencies.map(([id, en, ar, aliases], order) => ({
        id,
        order,
        label: { en, ar },
        aliases: aliases ? [...aliases] : [],
        reportKey: id,
      })),
    },
    questionSource: {
      providerId: "legacy.supabase.questions",
      version: "1.0.0",
      kind: "database",
      questionCount: input.questionCount,
      timeLimitMinutes: input.timeLimitMinutes,
      randomization: "questions-and-options",
    },
    scoringStrategy: {
      providerId: "legacy.actions.submitQuiz",
      strategyId: "live-option-score-weighted-percentage",
      version: "1.0.0",
      mode: "deterministic",
    },
    report: {
      providerId: `legacy.${input.slug}.report-adapter`,
      version: "1.0.0",
      definitionId: `${input.slug}-report-v1`,
      supportedAudiences: managerDashboard ? ["participant", "manager"] : ["participant"],
    },
    pricing: input.pricing,
    features: {
      ...input.features,
      strengthsAndWeaknesses: true,
      recommendations: true,
      charts: true,
      managerSections: false,
      executiveSections: false,
      docxExport: false,
      aiModules: [],
    },
  };
}

const outdoorSalesCompetencies: readonly Competency[] = [
  ["mental_toughness", "Mental Toughness", "الصلابة الذهنية"],
  ["opening_conversations", "Opening Conversations", "فتح المحادثات"],
  ["identifying_real_needs", "Identifying Real Needs", "تحديد الاحتياجات الحقيقية"],
  ["handling_objections", "Handling Objections", "التعامل مع الاعتراضات", ["destroying_objections"]],
  ["creating_irresistible_offers", "Creating Irresistible Offers", "إنشاء عروض لا تُقاوَم"],
  ["mastering_closing", "Mastering Closing", "إتقان الإغلاق"],
  ["follow_up_discipline", "Follow-Up Discipline", "انضباط المتابعة", ["followup_discipline", "follow_up"]],
];

const outdoorMriCompetencies: readonly Competency[] = [
  ...outdoorSalesCompetencies,
  ["consultative_selling", "Consultative Selling", "المبيعات الاستشارية"],
  ["time_territory_management", "Time & Territory Management", "إدارة الوقت والمنطقة"],
  ["product_expertise", "Product Expertise", "الخبرة في المنتج"],
  ["negotiation_skills", "Negotiation Skills", "مهارات التفاوض"],
  ["attitude_motivation_mindset", "Attitude & Motivation Mindset", "العقلية والتحفيز"],
  ["dealing_with_boss", "Dealing with Boss", "التعامل مع المدير"],
  ["handling_difficult_customers", "Handling Difficult Customers", "التعامل مع العملاء الصعبين"],
  ["handling_difficult_colleagues", "Handling Difficult Colleagues", "التعامل مع الزملاء الصعبين"],
];

const salesManagerCompetencies: readonly Competency[] = [
  ["sales_coaching_rep_development", "Sales Coaching & Rep Development", "تدريب وتطوير مندوبي المبيعات"],
  ["pipeline_management_deal_inspection", "Pipeline Management & Deal Inspection", "إدارة مسار الفرص البيعية وفحص الصفقات", ["pipeline_visibility_deal_inspection"]],
  ["forecast_accuracy_judgment", "Forecast Accuracy & Judgment", "دقة التوقعات والحكم التجاري", ["forecast_judgment"]],
  ["performance_accountability", "Performance Accountability", "المساءلة على الأداء"],
  ["target_setting_kpi_discipline", "Target Setting & KPI Discipline", "تحديد الأهداف وانضباط المؤشرات"],
  ["motivation_team_energy", "Motivation & Team Energy", "تحفيز الفريق وطاقة الأداء"],
  ["sales_meeting_rhythm", "Sales Meeting Rhythm", "إيقاع اجتماعات المبيعات"],
  ["one_on_one_management", "One-on-One Management", "إدارة الاجتماعات الفردية"],
  ["hiring_onboarding_salespeople", "Hiring & Onboarding Salespeople", "توظيف وتأهيل مندوبي المبيعات"],
  ["territory_resource_allocation", "Territory & Resource Allocation", "توزيع المناطق والموارد"],
  ["handling_underperformance", "Handling Underperformance", "معالجة ضعف الأداء"],
  ["managing_difficult_salespeople", "Managing Difficult Salespeople", "إدارة مندوبي المبيعات الصعبين"],
  ["managing_top_performers", "Managing Top Performers", "إدارة أصحاب الأداء العالي"],
  ["manager_communication_executive_reporting", "Manager Communication & Executive Reporting", "تواصل مدير المبيعات والتقارير للإدارة العليا", ["manager_communication_upward_reporting"]],
  ["decision_making_under_pressure", "Decision-Making Under Pressure", "اتخاذ القرار تحت الضغط"],
];

const lawyerCompetencies: readonly Competency[] = [
  ["legal_inquiry_handling", "First Legal Inquiry Response", "الاستجابة الأولى للاستفسار القانوني"],
  ["consultation_opening_control", "Consultation Opening & Conversation Structure", "إدارة بداية الاستشارة وتنظيم الحوار"],
  ["legal_need_diagnosis", "Understanding the Client’s Real Legal Need", "فهم الحاجة القانونية الحقيقية للعميل"],
  ["case_qualification_client_fit", "Matter Qualification & Appropriate Legal Service", "تحديد ملاءمة الحالة والخدمة القانونية المناسبة"],
  ["client_trust_professional_authority", "Client Trust & Professional Reassurance", "بناء ثقة العميل والطمأنة المهنية"],
  ["explaining_legal_strategy_simply", "Explaining the Legal Path Clearly", "شرح المسار القانوني بلغة واضحة ومفهومة"],
  ["legal_value_framing", "Client Clarity, Trust & Legal Guidance", "وضوح العميل وثقته والتوجيه القانوني"],
  ["fee_presentation_retainer_confidence", "Professional Legal Fees", "أتعاب المحاماة"],
  ["fee_comparison_objections", "Managing Fee Comparison & Hesitation", "التعامل مع مقارنة أتعاب المحاماة والتردد"],
  ["trust_risk_outcome_objections", "Managing Client Anxiety, Risk & Expectations", "إدارة القلق والمخاطر وتوقعات النتائج"],
  ["ethical_persuasion_boundaries", "Ethical Guidance Without Pressure", "التوجيه المهني الأخلاقي دون ضغط"],
  ["consultation_closing_engagement", "Next Legal Step & Agreement", "توضيح الخطوة القانونية التالية والاتفاق على الإجراء"],
  ["post_consultation_follow_up", "Professional Follow-Up After Consultation", "المتابعة المهنية بعد الاستشارة"],
  ["emotional_difficult_clients", "Managing Stressed, Difficult or Unrealistic Clients", "إدارة العملاء المتوترين أو الصعبين أو غير الواقعيين"],
  ["client_experience_referral_growth", "Client Experience, Relationship Continuity & Platform Trust", "تجربة العميل واستمرارية العلاقة والثقة في المنصة"],
];

export const outdoorSalesScanAssessmentDefinition = legacyProductionDefinition({
  id: "outdoor_sales_scan",
  slug: "outdoor-scan",
  name: "Outdoor Sales Scan",
  description: "A short professional diagnostic across seven core sales signals.",
  primaryAudience: "professional",
  supportedAudiences: ["individual", "employee", "professional"],
  competencies: outdoorSalesCompetencies,
  questionCount: 30,
  timeLimitMinutes: 20,
  individualAvailability: true,
  corporateAvailability: false,
  pricing: { model: "free" },
  features: { ninetyDayPlan: false, dailySchedule: false, pdfExport: true, emailDelivery: true },
});

export const outdoorSalesMriAssessmentDefinition = legacyProductionDefinition({
  id: "outdoor_sales_mri",
  slug: "outdoor-mri",
  name: "Advanced Outdoor Sales MRI",
  description: "A full diagnostic of professional field-sales performance across fifteen competencies.",
  primaryAudience: "professional",
  supportedAudiences: ["individual", "employee", "manager", "professional"],
  competencies: outdoorMriCompetencies,
  questionCount: 75,
  timeLimitMinutes: 90,
  individualAvailability: false,
  corporateAvailability: true,
  managerDashboard: true,
  pricing: { model: "package", corporate: { minimumPackageSize: 1, quoteRequired: true } },
  features: { ninetyDayPlan: true, dailySchedule: true, pdfExport: true, emailDelivery: true },
});

export const salesManagerMriAssessmentDefinition = legacyProductionDefinition({
  id: "sales_manager_mri",
  slug: "sales-manager-mri",
  name: "Advanced Sales Manager MRI",
  description: "A leadership diagnostic across fifteen sales-management competencies.",
  primaryAudience: "manager",
  supportedAudiences: ["manager", "executive", "professional"],
  competencies: salesManagerCompetencies,
  questionCount: 75,
  timeLimitMinutes: 90,
  individualAvailability: false,
  corporateAvailability: true,
  pricing: { model: "package", corporate: { minimumPackageSize: 1, quoteRequired: true } },
  features: { ninetyDayPlan: true, dailySchedule: true, pdfExport: true, emailDelivery: true },
});

export const lawyerClientConversionMriAssessmentDefinition = legacyProductionDefinition({
  id: "lawyer_client_conversion_mri",
  slug: "lawyer-client-conversion-mri",
  name: "Client Acquisition Standard™",
  description: "A seventy-five-scenario diagnostic of the legal client acquisition and consultation journey.",
  primaryAudience: "professional",
  supportedAudiences: ["individual", "professional"],
  competencies: lawyerCompetencies,
  questionCount: 75,
  timeLimitMinutes: 90,
  individualAvailability: false,
  corporateAvailability: true,
  pricing: { model: "package", corporate: { minimumPackageSize: 1, quoteRequired: true } },
  features: { ninetyDayPlan: true, dailySchedule: true, pdfExport: true, emailDelivery: true },
});

export const legacyProductionAssessmentDefinitions = [
  outdoorSalesScanAssessmentDefinition,
  outdoorSalesMriAssessmentDefinition,
  salesManagerMriAssessmentDefinition,
  lawyerClientConversionMriAssessmentDefinition,
] as const;
