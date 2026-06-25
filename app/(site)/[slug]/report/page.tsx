// FILE: app/(site)/[slug]/report/page.tsx
import "server-only";
import ArabicSalesManagerMriTitle from "@/components/ArabicSalesManagerMriTitle";
import EmailReportButton from "@/components/EmailReportButton";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  getRecommendations,
  Tier,
  Language,
  normalizeCompetencyId,
  tierFromPercentage,
} from "@/lib/pdf-recommendations";
import {
  buildSalesManager90DayPlan,
  type SalesManagerPlanDay,
} from "@/lib/sales-manager-90day";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ======================================================
// SLUG-COMPATIBLE OUTDOOR SALES REPORT
// Safe replacement for: app/(site)/[slug]/report/page.tsx
// Uses: params.slug + searchParams.attemptId
// Does NOT touch quiz, scoring, login, Supabase schema, timer, or randomization.
// ======================================================

const MRI_CHECKOUT_URL_EN =
  "https://YOUR-ENGLISH-SALES-PAGE";

const MRI_CHECKOUT_URL_AR =
  "https://YOUR-ARABIC-SALES-PAGE";

const OUTDOOR_SCAN_MRI_URL_EN =
  "https://www.levelupbusinessconsulting.com/courses/outdoor-sales-page-english-mri";

const OUTDOOR_SCAN_MRI_URL_AR =
  "https://www.levelupbusinessconsulting.com/courses/outdoor-sales-page-arabic-mri";

type PageProps = {
  params: { slug: string };
  searchParams?: { attemptId?: string; lang?: string; v?: string };
};

type CompetencyRow = {
  competencyId: string;
  label: string;
  percentage: number;
  tier: Tier;
  score?: number;
  maxScore?: number;
};

const COMPETENCY_LABELS: Record<string, { en: string; ar: string }> = {
  // Lawyer Client Experience assessments
  legal_inquiry_handling: { en: "First Legal Inquiry Response", ar: "الاستجابة الأولى للاستفسار القانوني" },
  consultation_opening_control: { en: "Consultation Opening & Conversation Structure", ar: "إدارة بداية الاستشارة وتنظيم الحوار" },
  legal_need_diagnosis: { en: "Understanding the Client’s Real Legal Need", ar: "فهم الحاجة القانونية الحقيقية للعميل" },
  case_qualification_client_fit: { en: "Matter Qualification & Appropriate Legal Service", ar: "تحديد ملاءمة الحالة والخدمة القانونية المناسبة" },
  client_trust_professional_authority: { en: "Client Trust & Professional Reassurance", ar: "بناء ثقة العميل والطمأنة المهنية" },
  explaining_legal_strategy_simply: { en: "Explaining the Legal Path Clearly", ar: "شرح المسار القانوني بلغة واضحة ومفهومة" },
  legal_value_framing: { en: "Client Clarity, Trust & Legal Guidance", ar: "وضوح العميل وثقته والتوجيه القانوني" },
  fee_presentation_retainer_confidence: { en: "Professional Legal Fees", ar: "أتعاب المحاماة" },
  fee_comparison_objections: { en: "Managing Fee Comparison & Hesitation", ar: "التعامل مع مقارنة أتعاب المحاماة والتردد" },
  trust_risk_outcome_objections: { en: "Managing Client Anxiety, Risk & Expectations", ar: "إدارة القلق والمخاطر وتوقعات النتائج" },
  ethical_persuasion_boundaries: { en: "Ethical Guidance Without Pressure", ar: "التوجيه المهني الأخلاقي دون ضغط" },
  consultation_closing_engagement: { en: "Next Legal Step & Agreement", ar: "توضيح الخطوة القانونية التالية والاتفاق على الإجراء" },
  post_consultation_follow_up: { en: "Professional Follow-Up After Consultation", ar: "المتابعة المهنية بعد الاستشارة" },
  emotional_difficult_clients: { en: "Managing Stressed, Difficult or Unrealistic Clients", ar: "إدارة العملاء المتوترين أو الصعبين أو غير الواقعيين" },
  client_experience_referral_growth: { en: "Client Experience, Relationship Continuity & Platform Trust", ar: "تجربة العميل واستمرارية العلاقة والثقة في المنصة" },

  // SME Business Health assessments
  strategic_direction_business_clarity: { en: "Strategic Direction & Business Clarity", ar: "الاتجاه الاستراتيجي ووضوح الشركة" },
  revenue_engine_sales_predictability: { en: "Revenue Engine & Sales Predictability", ar: "محرك الإيرادات واستقرار المبيعات" },
  marketing_positioning_lead_quality: { en: "Marketing Positioning & Lead Quality", ar: "التموضع التسويقي وجودة العملاء المحتملين" },
  customer_experience_retention: { en: "Customer Experience & Retention", ar: "تجربة العملاء والاحتفاظ بهم" },
  cash_flow_margins_financial_control: { en: "Cash Flow, Margins & Financial Control", ar: "التدفق النقدي والهوامش والرقابة المالية" },
  operations_systems_process_discipline: { en: "Operations, Systems & Process Discipline", ar: "العمليات والأنظمة وانضباط الإجراءات" },
  people_roles_accountability: { en: "People, Roles & Accountability", ar: "الأفراد والأدوار والمساءلة" },
  leadership_decision_making_rhythm: { en: "Leadership & Decision-Making Rhythm", ar: "القيادة وإيقاع اتخاذ القرار" },
  products_services_value_proposition: { en: "Products, Services & Value Proposition", ar: "المنتجات والخدمات وعرض القيمة" },
  technology_data_management_visibility: { en: "Technology, Data & Management Visibility", ar: "التقنية والبيانات ووضوح الإدارة" },
  risk_compliance_business_continuity: { en: "Risk, Compliance & Business Continuity", ar: "المخاطر والامتثال واستمرارية الأعمال" },
  growth_readiness_scalability: { en: "Growth Readiness & Scalability", ar: "جاهزية النمو وقابلية التوسع" },

  // Sales Manager assessments
  sales_coaching_rep_development: { en: "Sales Coaching & Rep Development", ar: "تدريب وتطوير مندوبي المبيعات" },
  pipeline_visibility_deal_inspection: { en: "Pipeline Visibility & Deal Inspection", ar: "وضوح مسار الفرص البيعية وفحص الصفقات" },
  pipeline_management_deal_inspection: { en: "Pipeline Management & Deal Inspection", ar: "إدارة مسار الفرص البيعية وفحص الصفقات" },
  forecast_judgment: { en: "Forecast Judgment", ar: "الحكم على التوقعات البيعية" },
  forecast_accuracy_judgment: { en: "Forecast Accuracy & Judgment", ar: "دقة التوقعات والحكم التجاري" },
  performance_accountability: { en: "Performance Accountability", ar: "المساءلة على الأداء" },
  target_setting_kpi_discipline: { en: "Target Setting & KPI Discipline", ar: "تحديد الأهداف وانضباط المؤشرات" },
  motivation_team_energy: { en: "Motivation & Team Energy", ar: "تحفيز الفريق وطاقة الأداء" },
  sales_meeting_rhythm: { en: "Sales Meeting Rhythm", ar: "إيقاع اجتماعات المبيعات" },
  one_on_one_management: { en: "One-on-One Management", ar: "إدارة الاجتماعات الفردية" },
  hiring_onboarding_salespeople: { en: "Hiring & Onboarding Salespeople", ar: "توظيف وتأهيل مندوبي المبيعات" },
  territory_resource_allocation: { en: "Territory & Resource Allocation", ar: "توزيع المناطق والموارد" },
  handling_underperformance: { en: "Handling Underperformance", ar: "معالجة ضعف الأداء" },
  managing_difficult_salespeople: { en: "Managing Difficult Salespeople", ar: "إدارة مندوبي المبيعات الصعبين" },
  managing_top_performers: { en: "Managing Top Performers", ar: "إدارة أصحاب الأداء العالي" },
  manager_communication_executive_reporting: { en: "Manager Communication & Executive Reporting", ar: "تواصل مدير المبيعات والتقارير للإدارة العليا" },
  manager_communication_upward_reporting: { en: "Manager Communication & Executive Reporting", ar: "تواصل مدير المبيعات والتقارير للإدارة العليا" },
  decision_making_under_pressure: { en: "Decision-Making Under Pressure", ar: "اتخاذ القرار تحت الضغط" },
  prospecting_finding_new_clients: { en: "Prospecting & Finding New Clients", ar: "البحث عن عملاء جدد" },
  mental_toughness: { en: "Mental Toughness", ar: "الصلابة الذهنية" },
  opening_conversations: { en: "Opening Conversations", ar: "فتح المحادثات" },
  identifying_real_needs: { en: "Identifying Real Needs", ar: "تحديد الاحتياجات الحقيقية" },
  handling_objections: { en: "Handling Objections", ar: "التعامل مع الاعتراضات" },
  destroying_objections: { en: "Destroying Objections", ar: "تدمير الاعتراضات من الجذور" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },

  consultative_selling: { en: "Consultative Selling", ar: "المبيعات الاستشارية" },
  time_territory_management: { en: "Time & Territory Management", ar: "إدارة الوقت والمنطقة" },
  product_expertise: { en: "Product Expertise", ar: "الخبرة في المنتج" },
  negotiation_skills: { en: "Negotiation Skills", ar: "مهارات التفاوض" },
  attitude_motivation_mindset: { en: "Attitude & Motivation Mindset", ar: "العقلية والتحفيز" },
  dealing_with_boss: { en: "Dealing with Boss", ar: "التعامل مع المدير" },
  handling_difficult_customers: { en: "Handling Difficult Customers", ar: "التعامل مع العملاء الصعبين" },
  handling_difficult_colleagues: { en: "Handling Difficult Colleagues", ar: "التعامل مع الزملاء الصعبين" },
};

const TIER_LABELS: Record<Tier, { en: string; ar: string }> = {
  Strength: { en: "Strength", ar: "نقطة قوة" },
  Opportunity: { en: "Opportunity", ar: "فرصة تطوير" },
  Threat: { en: "Threat", ar: "منطقة خطر" },
  Weakness: { en: "Weakness", ar: "نقطة ضعف" },
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeCompetencySafe(raw: any) {
  return normalizeCompetencyId(String(raw || ""));
}

function pct(n: any) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

function pickLang(attemptLang?: string | null, urlLang?: string | null): Language {
  const l = (urlLang || attemptLang || "en").toLowerCase();
  return l === "ar" ? "ar" : "en";
}

function isMriReport(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s.includes("mri") || a.includes("mri");
}

function isOutdoorSalesMriReport(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s === "outdoor-mri" || a === "outdoor_sales_mri";
}

function isOutdoorSalesScanReport(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s === "outdoor-scan" || s === "scan" || a === "outdoor_sales_scan";
}


function isSalesManagerAssessment(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s.includes("sales-manager") || a.includes("sales_manager");
}

function isLawyerAssessment(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s.includes("lawyer-client-conversion") || a.includes("lawyer_client_conversion") || s.includes("lawyer") || a.includes("lawyer");
}

function isBusinessHealthAssessment(slug: string, attemptAssessmentId?: string | null) {
  const s = String(slug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s.includes("sme-business-health") || a.includes("sme_business_health") || s.includes("business-health") || a.includes("business_health");
}


function shortAttemptId(id: string) {
  const x = String(id || "");
  return x ? x.slice(0, 8) : "";
}

function getTierLabel(tier: Tier, lang: Language) {
  const meta = TIER_LABELS[tier] || { en: String(tier), ar: String(tier) };
  return lang === "ar" ? meta.ar : meta.en;
}

function tierBadgeClass(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-emerald-600 text-white";
    case "Opportunity":
      return "bg-blue-600 text-white";
    case "Threat":
      return "bg-amber-500 text-white";
    case "Weakness":
    default:
      return "bg-rose-600 text-white";
  }
}

function tierSoftClass(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "border-emerald-200 bg-emerald-50";
    case "Opportunity":
      return "border-blue-200 bg-blue-50";
    case "Threat":
      return "border-amber-200 bg-amber-50";
    case "Weakness":
    default:
      return "border-rose-200 bg-rose-50";
  }
}

function tierTextClass(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "text-emerald-700";
    case "Opportunity":
      return "text-blue-700";
    case "Threat":
      return "text-amber-700";
    case "Weakness":
    default:
      return "text-rose-700";
  }
}

function healthLabel(overall: number, lang: Language) {
  if (lang === "ar") {
    if (overall >= 75) return "منطقة أداء قوية";
    if (overall >= 50) return "منطقة فرصة واضحة";
    if (overall >= 30) return "منطقة تحذير";
    return "منطقة تتطلب تدخلاً عاجلاً";
  }

  if (overall >= 75) return "Strong Performance Zone";
  if (overall >= 50) return "Clear Opportunity Zone";
  if (overall >= 30) return "Warning Zone";
  return "Immediate Attention Zone";
}

function lawyerHealthLabel(overall: number, lang: Language) {
  if (lang === "ar") {
    if (overall >= 75) return "مستوى صحة تجربة العميل القانونية قوي";
    if (overall >= 50) return "منطقة فرصة واضحة في تجربة العميل";
    if (overall >= 30) return "منطقة تحتاج إلى تدخل مهني";
    return "منطقة تتطلب تدخلاً عاجلاً في الاستشارات";
  }

  if (overall >= 75) return "Strong Legal Client Experience Health Zone";
  if (overall >= 50) return "Clear Legal Client Experience Opportunity Zone";
  if (overall >= 30) return "Legal Client Experience Needs Professional Attention";
  return "High Consultation Leakage Zone";
}


function businessHealthLabel(overall: number, lang: Language) {
  if (lang === "ar") {
    if (overall >= 75) return "منطقة صحة أعمال قوية";
    if (overall >= 50) return "منطقة فرصة واضحة لتقوية الشركة";
    if (overall >= 30) return "منطقة إنذار في صحة الشركة";
    return "منطقة تتطلب تدخلاً عاجلاً في الأعمال";
  }

  if (overall >= 75) return "Strong Business Health Zone";
  if (overall >= 50) return "Clear Business Improvement Zone";
  if (overall >= 30) return "Business Health Warning Zone";
  return "High Business Leakage Zone";
}

function commercialMeaning(tier: Tier, label: string, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") {
      return `تشير نتيجة ${label} إلى أن هذا الجانب يدعم أداءك الحالي ويمكن استخدامه كنقطة ارتكاز لرفع بقية النتائج.`;
    }
    if (tier === "Opportunity") {
      return `تشير نتيجة ${label} إلى وجود أساس جيد، لكن الأداء ما زال غير ثابت بما يكفي لحماية كل فرصة محتملة.`;
    }
    if (tier === "Threat") {
      return `تشير نتيجة ${label} إلى منطقة قد تُسبب هدراً ونزيفاً في الفرص إذا لم يتم التعامل معها بسرعة وبشكل منظم.`;
    }
    return `تشير نتيجة ${label} إلى فجوة واضحة قد تؤثر على المحادثات والصفقات والمتابعة إذا بقيت دون علاج.`;
  }

  if (tier === "Strength") {
    return `${label} is currently supporting your performance. It can become an anchor strength that helps lift the rest of your sales behavior.`;
  }
  if (tier === "Opportunity") {
    return `${label} has a useful foundation, but it is not yet consistent enough to protect every commercial opportunity.`;
  }
  if (tier === "Threat") {
    return `${label} is creating a warning signal. If left untreated, it may quietly leak opportunities, momentum, or follow-up discipline.`;
  }
  return `${label} is showing a clear gap. This area may be affecting conversations, deal movement, or buyer confidence more than you realize.`;
}

function overallCommercialMeaning(overall: number, tier: Tier, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") {
      return "الصورة العامة قوية، لكن القوة لا تعني التوقف. المطلوب الآن هو تحويل السلوك القوي إلى نظام يومي ثابت.";
    }
    if (tier === "Opportunity") {
      return "الصورة العامة جيدة لكنها غير مكتملة. لديك أساس يمكن البناء عليه، لكن بعض الهدر والنزيف قد يمنع الأداء من الوصول إلى مستوى أعلى.";
    }
    if (tier === "Threat") {
      return "الصورة العامة تُظهر إشارات إنذار. هناك هدر ونزيف محتمل في بعض السلوكيات البيعية يحتاج إلى علاج قبل أن يتحول إلى نمط ثابت.";
    }
    return "الصورة العامة تُظهر فجوة واضحة. هذا لا يعني الفشل، لكنه يعني أن الأداء يحتاج إلى خطة علاج عملية ومنظمة بدل الاعتماد على المحاولة والتخمين.";
  }

  if (tier === "Strength") {
    return "Your overall sales health is strong, but strength is not the finish line. The next step is turning strong behaviors into a repeatable system.";
  }
  if (tier === "Opportunity") {
    return "Your overall sales health has a useful base, but it is not yet fully protected. Some hidden leakage may still be limiting your results.";
  }
  if (tier === "Threat") {
    return "Your overall sales health is showing warning signals. Some sales behaviors may be leaking momentum and need correction before they become permanent habits.";
  }
  return "Your overall sales health is showing a clear performance gap. This is not failure, but it does mean you need a practical treatment plan instead of more guessing.";
}


function managerOverallMeaning(overall: number, tier: Tier, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return "الصورة العامة تشير إلى قيادة مبيعات قوية. المطلوب الآن هو تحويل نقاط القوة إلى نظام إدارة يومي يحمي أداء الفريق ويضاعف أثره.";
    if (tier === "Opportunity") return "الصورة العامة جيدة لكنها غير مكتملة. هناك أساس إداري يمكن البناء عليه، لكن بعض الهدر والنزيف في التدريب أو مسار الفرص البيعية أو المساءلة قد تحد من نتائج الفريق.";
    if (tier === "Threat") return "الصورة العامة تظهر إنذارًا إداريًا. بعض أنماط القيادة قد تخلق هدراً ونزيفا في أداء الفريق أو التوقعات أو الانضباط، وتحتاج إلى تصحيح عملي سريع.";
    return "الصورة العامة تظهر فجوة قيادية واضحة. هذا لا يعني الفشل، لكنه يعني أن الفريق يحتاج إلى قيادة أكثر نظامًا في التدريب، المتابعة، المساءلة، وإدارة الأداء.";
  }

  if (tier === "Strength") return "Your overall sales-management health is strong. The next step is turning your strongest leadership behaviors into a repeatable management system that protects team performance.";
  if (tier === "Opportunity") return "Your overall sales-management health has a useful base, but some management leaks may still be limiting coaching impact, pipeline clarity, or team accountability.";
  if (tier === "Threat") return "Your overall sales-management health is showing warning signals. Some leadership behaviors may be leaking team momentum, forecast quality, or execution discipline and need correction.";
  return "Your overall sales-management health is showing a clear leadership gap. This is not failure, but it does mean the team needs a more structured management rhythm, not more pressure or guessing.";
}

function managerCommercialMeaning(tier: Tier, label: string, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return `تشير نتيجة ${label} إلى جانب إداري قوي يمكن استخدامه كرافعة لتحسين أداء الفريق وبناء الثقة والانضباط.`;
    if (tier === "Opportunity") return `تشير نتيجة ${label} إلى أساس جيد، لكنه يحتاج إلى إيقاع إداري أكثر ثباتًا حتى لا يعتمد الفريق على الاجتهاد الفردي فقط.`;
    if (tier === "Threat") return `تشير نتيجة ${label} إلى منطقة إنذار قد تؤثر على أداء الفريق أو وضوح مسار الفرص البيعية أو المساءلة إذا لم تُعالج بسرعة.`;
    return `تشير نتيجة ${label} إلى فجوة إدارية واضحة قد تُضعف التدريب، المتابعة، الانضباط، أو قدرة الفريق على تحقيق الهدف.`;
  }

  if (tier === "Strength") return `${label} is currently a management strength. It can be used as leverage to improve team discipline, confidence, and execution.`;
  if (tier === "Opportunity") return `${label} has a useful management foundation, but it needs a more consistent rhythm before it can reliably lift the team.`;
  if (tier === "Threat") return `${label} is creating a leadership warning signal. If left untreated, it may affect team performance, pipeline clarity, or accountability.`;
  return `${label} is showing a clear management gap. This area may be weakening coaching, follow-up, team discipline, or target execution more than you realize.`;
}


const SALES_MANAGER_COMPETENCY_IDS = new Set([
  "sales_coaching_rep_development",
  "pipeline_visibility_deal_inspection",
  "pipeline_management_deal_inspection",
  "forecast_judgment",
  "forecast_accuracy_judgment",
  "performance_accountability",
  "target_setting_kpi_discipline",
  "motivation_team_energy",
  "sales_meeting_rhythm",
  "one_on_one_management",
  "hiring_onboarding_salespeople",
  "territory_resource_allocation",
  "handling_underperformance",
  "managing_difficult_salespeople",
  "managing_top_performers",
  "manager_communication_executive_reporting",
  "manager_communication_upward_reporting",
  "decision_making_under_pressure",
]);

const LAWYER_COMPETENCY_IDS = new Set([
  "legal_inquiry_handling",
  "consultation_opening_control",
  "legal_need_diagnosis",
  "case_qualification_client_fit",
  "client_trust_professional_authority",
  "explaining_legal_strategy_simply",
  "legal_value_framing",
  "fee_presentation_retainer_confidence",
  "fee_comparison_objections",
  "trust_risk_outcome_objections",
  "ethical_persuasion_boundaries",
  "consultation_closing_engagement",
  "post_consultation_follow_up",
  "emotional_difficult_clients",
  "client_experience_referral_growth",
]);

const BUSINESS_HEALTH_AREA_IDS = new Set([
  "strategic_direction_business_clarity",
  "revenue_engine_sales_predictability",
  "marketing_positioning_lead_quality",
  "customer_experience_retention",
  "cash_flow_margins_financial_control",
  "operations_systems_process_discipline",
  "people_roles_accountability",
  "leadership_decision_making_rhythm",
  "products_services_value_proposition",
  "technology_data_management_visibility",
  "risk_compliance_business_continuity",
  "growth_readiness_scalability",
]);

function businessHealthOverallMeaning(overall: number, tier: Tier, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return "الصورة العامة تشير إلى شركة لديها أساس صحي يمكن البناء عليه. المطلوب الآن هو تحويل القوة إلى نظام تشغيل واضح يحمي التدفق النقدي، العملاء، الفريق، والقدرة على النمو.";
    if (tier === "Opportunity") return "الصورة العامة جيدة لكنها غير مكتملة. هناك أساس عملي يمكن تقويته، لكن بعض الهدر والنزيف في الإيرادات أو العمليات أو الأفراد أو الرؤية الإدارية قد تمنع الشركة من الوصول إلى مستوى أعلى.";
    if (tier === "Threat") return "الصورة العامة تظهر إنذارًا في صحة الشركة. بعض المناطق قد تستنزف السيولة، العملاء، الوقت، أو طاقة المالك إذا لم تُعالج بخارطة طريق واضحة.";
    return "الصورة العامة تظهر هدراً ونزيفاً حاداً في صحة الشركة. هذا لا يعني أن الشركة انتهت، لكنه يعني أن النمو أو الاستمرار بالأسلوب الحالي قد يزيد الضغط بدل أن يعالج السبب الجذري.";
  }
  if (tier === "Strength") return "Your business health has a strong base. The next step is to turn that strength into a repeatable operating system that protects cash, customers, people, execution, and growth.";
  if (tier === "Opportunity") return "Your business health has a workable base, but some leaks may still be limiting revenue stability, operational discipline, people accountability, or management visibility.";
  if (tier === "Threat") return "Your business health is showing warning signals. Some areas may be quietly draining cash, customer trust, owner time, team energy, or growth readiness and need structured treatment.";
  return "Your business health is showing a serious leakage pattern. This does not mean the business has failed; it means the company needs diagnosis, prioritization, and a practical revamp roadmap before pressure increases.";
}

function businessHealthCommercialMeaning(tier: Tier, label: string, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return `تشير نتيجة ${label} إلى منطقة صحية داخل الشركة يمكن استخدامها كرافعة لتقوية بقية النظام التجاري والتشغيلي.`;
    if (tier === "Opportunity") return `تشير نتيجة ${label} إلى أساس قابل للتطوير، لكنه يحتاج إلى وضوح وانضباط أعلى حتى لا يتحول إلى هدر ونزيف في السيولة أو العملاء أو التنفيذ.`;
    if (tier === "Threat") return `تشير نتيجة ${label} إلى منطقة إنذار قد تُضعف صحة الشركة إذا لم تُعالج بخطة واضحة ومسؤولية تنفيذية.`;
    return `تشير نتيجة ${label} إلى هدر ونزيف واضح قد يجعل الشركة تعمل بجهد كبير دون أن تشعر بقوة حقيقية في الربح أو العملاء أو الفريق أو النمو.`;
  }
  if (tier === "Strength") return `${label} is currently a healthy business area. Use it as leverage to strengthen weaker parts of the company’s commercial and operating system.`;
  if (tier === "Opportunity") return `${label} has a workable base, but it needs clearer discipline before it becomes fully dependable under market pressure.`;
  if (tier === "Threat") return `${label} is creating a business health warning signal. If left untreated, it may weaken cash flow, customer retention, team execution, or growth readiness.`;
  return `${label} is showing a clear business leak. This area may be making the company work hard without becoming stronger, more profitable, more stable, or more scalable.`;
}

function lawyerOverallMeaning(overall: number, tier: Tier, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return "الصورة العامة تشير إلى تجربة عميل قانونية قوية تساعد العميل على الفهم والثقة واتخاذ الخطوة القانونية المناسبة. المطلوب الآن هو تثبيت هذه القوة في نظام مهني لا يعتمد على قوة القضية وحدها.";
    if (tier === "Opportunity") return "الصورة العامة جيدة لكنها غير مكتملة. لديك أساس مهني يمكن البناء عليه، لكن بعض نقاط الاحتكاك في الثقة أو شرح القيمة أو عرض أتعاب المحاماة أو المتابعة قد تجعل العميل يتردد أو تتوقف رحلته.";
    if (tier === "Threat") return "الصورة العامة تظهر إنذارًا مهنيًا. بعض سلوكيات الاستشارة قد تُضعف ثقة العميل أو تقلل وضوح القيمة أو تجعل أتعاب المحاماة تبدو منفصلة عن حجم المخاطر والعمل القانوني المطلوب.";
    return "الصورة العامة تظهر فجوة واضحة في تجربة العميل القانونية. هذا لا يعني ضعفك كمحامٍ، بل يعني أن خبرتك القانونية قد لا تظهر للعميل بطريقة تجعله يثق ويفهم الخطوة القانونية المناسبة.";
  }
  if (tier === "Strength") return "Your legal client experience health is strong. The next step is to turn your strongest consultation behaviors into a repeatable professional guidance system.";
  if (tier === "Opportunity") return "Your legal client experience health has a useful base, but some friction points may still be limiting client trust, legal-value clarity, professional-fee confidence, or next-step clarity.";
  if (tier === "Threat") return "Your legal client experience health is showing warning signals. Some consultation behaviors may be weakening trust, urgency, fee confidence, or the client’s next legal step.";
  return "Your legal client experience health is showing a clear gap. This is not a judgment on your legal ability; it means your expertise may not be becoming visible enough for the client to trust and understand the right legal path.";
}

function lawyerCommercialMeaning(tier: Tier, label: string, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return `تشير نتيجة ${label} إلى جانب مهني قوي يساعد العميل على فهمك والثقة بك واتخاذ الخطوة القانونية التالية بوضوح.`;
    if (tier === "Opportunity") return `تشير نتيجة ${label} إلى أساس جيد، لكنه يحتاج إلى وضوح أكبر حتى لا يفقد العميل الثقة أو يتردد عند مناقشة أتعاب المحاماة أو خطوات القضية.`;
    if (tier === "Threat") return `تشير نتيجة ${label} إلى منطقة إنذار قد تُضعف تجربة العميل القانونية إذا لم يتم تطويرها بطريقة مهنية وأخلاقية.`;
    return `تشير نتيجة ${label} إلى فجوة واضحة قد تجعل خبرتك القانونية أقل ظهورًا للعميل، أو تجعل العميل يقارن أتعاب المحاماة دون فهم القيمة والمخاطر والمسار القانوني.`;
  }
  if (tier === "Strength") return `${label} is currently a professional strength. It helps potential clients understand you, trust your judgment, and move toward the right next legal step with greater confidence.`;
  if (tier === "Opportunity") return `${label} has a useful foundation, but it needs more clarity before it can reliably protect trust, professional-fee confidence, and next-step commitment.`;
  if (tier === "Threat") return `${label} is creating a warning signal. If left untreated, it may weaken the legal client experience, client confidence, or the next legal step.`;
  return `${label} is showing a clear professional gap. This area may be making your legal expertise less visible to the client or causing the client to compare legal fees without understanding value, risk, and strategy.`;
}

function detailedMeaningFor(row: CompetencyRow, lang: Language) {
  if (BUSINESS_HEALTH_AREA_IDS.has(row.competencyId)) {
    return businessHealthCommercialMeaning(row.tier, row.label, lang);
  }
  if (LAWYER_COMPETENCY_IDS.has(row.competencyId)) {
    return lawyerCommercialMeaning(row.tier, row.label, lang);
  }
  if (SALES_MANAGER_COMPETENCY_IDS.has(row.competencyId)) {
    return managerCommercialMeaning(row.tier, row.label, lang);
  }
  return commercialMeaning(row.tier, row.label, lang);
}

function shortDiagnosis(tier: Tier, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return "مؤشر صحي قوي يمكن البناء عليه.";
    if (tier === "Opportunity") return "مؤشر قابل للتحسين بسرعة مع تدريب مركز.";
    if (tier === "Threat") return "إشارة إنذار تحتاج إلى تدخل عملي سريع.";
    return "فجوة أداء واضحة تحتاج إلى إعادة بناء منهجية.";
  }

  if (tier === "Strength") return "A healthy signal that can be protected and used as leverage.";
  if (tier === "Opportunity") return "A workable signal that can improve quickly with focused practice.";
  if (tier === "Threat") return "A warning signal that needs immediate practical correction.";
  return "A clear performance gap that needs structured rebuilding.";
}

function cleanRecommendation(input: string) {
  let text = String(input || "").trim();
  text = text.replace(/\*\*/g, "");
  text = text.replace(/^[•●▪◦✔✓✅✦★☆▶►→⚡📊📋🧠🔍🎯💡📞🛡️📝📌🧩🧭🧪📈🔬🚨⏸️🎙️🤝🔧\s]+/, "");
  text = text.replace(/^\d{1,2}[.)\-:]\s*/, "");
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailLike(s: string) {
  return EMAIL_RE.test(String(s || "").trim());
}

function pickFirstNonEmpty(...vals: any[]) {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function dig(obj: any, path: string) {
  try {
    return path.split(".").reduce((acc: any, k: string) => (acc ? acc[k] : undefined), obj);
  } catch {
    return undefined;
  }
}

function extractIdentity(attempt: any) {
  const blocks = [
    attempt,
    attempt?.participant,
    attempt?.candidate,
    attempt?.user,
    attempt?.profile,
    attempt?.registration,
    attempt?.contact,
    attempt?.meta,
    attempt?.metadata,
    attempt?.data,
    attempt?.payload,
    attempt?.details,
    attempt?.info,
    attempt?.user_info,
    attempt?.userInfo,
  ].filter(Boolean);

  const nameCandidates: string[] = [];
  const emailCandidates: string[] = [];
  const companyCandidates: string[] = [];

  for (const b of blocks) {
    nameCandidates.push(
      pickFirstNonEmpty(
        b?.full_name,
        b?.fullname,
        b?.fullName,
        b?.name,
        b?.participant_name,
        b?.candidate_name,
        b?.display_name,
        b?.displayName,
        b?.first_name && b?.last_name ? `${b.first_name} ${b.last_name}` : "",
        b?.firstName && b?.lastName ? `${b.firstName} ${b.lastName}` : ""
      )
    );

    emailCandidates.push(
      pickFirstNonEmpty(
        b?.user_email,
        b?.email,
        b?.participant_email,
        b?.candidate_email,
        b?.work_email,
        b?.workEmail
      )
    );

    companyCandidates.push(
      pickFirstNonEmpty(
        b?.company,
        b?.company_name,
        b?.companyName,
        b?.organization,
        b?.organization_name,
        b?.org,
        b?.employer
      )
    );
  }

  const rawName = pickFirstNonEmpty(
    ...nameCandidates,
    dig(attempt, "participant.full_name"),
    dig(attempt, "registration.full_name"),
    dig(attempt, "contact.name")
  );

  const rawEmail = pickFirstNonEmpty(
    ...emailCandidates,
    dig(attempt, "participant.email"),
    dig(attempt, "registration.email"),
    dig(attempt, "contact.email")
  );

  const rawCompany = pickFirstNonEmpty(
    ...companyCandidates,
    dig(attempt, "participant.company"),
    dig(attempt, "registration.company"),
    dig(attempt, "organization.name")
  );

  const email = isEmailLike(rawEmail) ? rawEmail.trim() : "—";

  let fullName = rawName.trim() || "—";
  if ((fullName === "—" || !fullName) && email !== "—") {
    const m = email.match(/^([^@]+)/);
    if (m) {
      fullName = m[1].replace(/[._-]/g, " ").replace(/\d+/g, "").trim() || "—";
    }
  }

  return {
    fullName,
    email,
    company: rawCompany.trim() || "—",
  };
}

async function getAssessmentConfigServer(supabase: any, slug: string) {
  const routeSlug = String(slug || "").toLowerCase();

  const bySlug = await supabase
    .from("assessments")
    .select("*")
    .eq("slug", routeSlug)
    .maybeSingle();

  if (bySlug?.data) return bySlug.data;

  const ROUTE_TO_ID: Record<string, string> = {
    scan: "outdoor_sales_scan",
    mri: "outdoor_sales_mri",
    "outdoor-scan": "outdoor_sales_scan",
    "outdoor-mri": "outdoor_sales_mri",
  };

  const assessmentId = ROUTE_TO_ID[routeSlug] || routeSlug;

  const byId = await supabase
    .from("assessments")
    .select("*")
    .eq("id", assessmentId)
    .maybeSingle();

  return byId?.data ?? null;
}

function sortRows(rows: CompetencyRow[]) {
  return [...rows].sort((a, b) => b.percentage - a.percentage);
}

function getWeakest(rows: CompetencyRow[]) {
  return [...rows].sort((a, b) => a.percentage - b.percentage)[0] || null;
}

function getStrongest(rows: CompetencyRow[]) {
  return [...rows].sort((a, b) => b.percentage - a.percentage)[0] || null;
}

function getPriorityRows(rows: CompetencyRow[]) {
  return [...rows].sort((a, b) => a.percentage - b.percentage).slice(0, 3);
}

function sectionTitle(text: ReactNode, sub?: ReactNode) {
  return (
    <div className="avoid-break mb-5">
      <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight rtl-text">
        {text}
      </h2>
      {sub && <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed rtl-text">{sub}</p>}
    </div>
  );
}

function ArabicLawyerBrand({ report = false }: { report?: boolean }) {
  return (
    <span dir="rtl">
      {report ? "تقرير معيار كسب الموكلين™ من" : "معيار كسب الموكلين™ من"}{" "}
      <span
        dir="ltr"
        style={{ direction: "ltr", unicodeBidi: "isolate", display: "inline-block", whiteSpace: "nowrap" }}
      >
        Career Labs AI
      </span>
    </span>
  );
}

type SalesFitnessDay = {
  day: number;
  phase: string;
  week: number;
  focus: string;
  microAction: string;
  fieldExercise: string;
  checkpoint: string;
};

type SalesFitnessDrill = {
  microAction: string;
  fieldExercise: string;
  checkpoint: string;
};

type LawyerTreatmentDay = {
  day: number;
  phase: string;
  week: number;
  focus: string;
  microAction: string;
  consultationDrill: string;
  checkpoint: string;
};

type LawyerTreatmentDrill = {
  microAction: string;
  consultationDrill: string;
  checkpoint: string;
};

type OutdoorMriCompetencyKey =
  | "general_sales_execution"
  | "mental_toughness"
  | "product_expertise"
  | "identifying_real_needs"
  | "handling_difficult_customers"
  | "time_territory_management"
  | "prospecting_finding_new_clients"
  | "creating_irresistible_offers"
  | "mastering_closing"
  | "handling_difficult_colleagues"
  | "consultative_selling"
  | "destroying_objections"
  | "attitude_motivation_mindset"
  | "negotiation_skills"
  | "follow_up_discipline"
  | "opening_conversations"
  | "dealing_with_boss";

const OUTDOOR_SALES_FITNESS_DRILLS: Record<OutdoorMriCompetencyKey, { en: SalesFitnessDrill[]; ar: SalesFitnessDrill[] }> = {
  general_sales_execution: {
    en: [
      { microAction: "Choose one sales conversation today and define the desired next step before it starts.", fieldExercise: "Open the conversation with that next step in mind.", checkpoint: "Did the conversation move toward a clear action?" },
      { microAction: "After one interaction, write what worked, what failed, and one correction for tomorrow.", fieldExercise: "Use the correction in your next similar conversation.", checkpoint: "Did the review create a practical improvement?" },
      { microAction: "Ask one clearer business question before presenting any solution.", fieldExercise: "Pause the pitch until the buyer answers the question.", checkpoint: "Did the answer change how you presented?" },
      { microAction: "Convert one vague opportunity into a dated next action.", fieldExercise: "Ask for the date, owner, or decision needed.", checkpoint: "Did the opportunity become less vague?" },
      { microAction: "Write one buyer concern and prepare one calm response.", fieldExercise: "Use the response without sounding defensive.", checkpoint: "Did the response protect trust?" },
      { microAction: "Review one open opportunity and identify the missing decision step.", fieldExercise: "Ask for the missing step directly.", checkpoint: "Did you learn what must happen next?" },
      { microAction: "End one conversation with a clear agreed action.", fieldExercise: "Confirm the action, owner, and timing before leaving.", checkpoint: "Is the next step agreed, not assumed?" },
    ],
    ar: [
      { microAction: "اختر محادثة بيعية واحدة اليوم وحدد الخطوة التالية المطلوبة قبل أن تبدأ.", fieldExercise: "ابدأ المحادثة وأنت تعرف الخطوة التي تريد الوصول إليها.", checkpoint: "هل تحركت المحادثة نحو فعل واضح؟" },
      { microAction: "بعد تفاعل واحد، اكتب ما نجح وما لم ينجح وتصحيحًا واحدًا للغد.", fieldExercise: "استخدم التصحيح في أقرب محادثة مشابهة.", checkpoint: "هل أنتجت المراجعة تحسينًا عمليًا؟" },
      { microAction: "اطرح سؤالًا تجاريًا أوضح قبل تقديم أي حل.", fieldExercise: "أجل العرض حتى يجيب العميل على السؤال.", checkpoint: "هل غيرت الإجابة طريقة عرضك؟" },
      { microAction: "حوّل فرصة غامضة إلى خطوة تالية بتاريخ واضح.", fieldExercise: "اطلب التاريخ أو المسؤول أو القرار المطلوب.", checkpoint: "هل أصبحت الفرصة أقل غموضًا؟" },
      { microAction: "اكتب قلقًا واحدًا لدى العميل وحضّر ردًا هادئًا عليه.", fieldExercise: "استخدم الرد دون أن تبدو دفاعيًا.", checkpoint: "هل حمى الرد الثقة؟" },
      { microAction: "راجع فرصة مفتوحة وحدد خطوة القرار الناقصة.", fieldExercise: "اطلب الخطوة الناقصة مباشرة.", checkpoint: "هل عرفت ما يجب أن يحدث بعد ذلك؟" },
      { microAction: "أنهِ محادثة واحدة باتفاق واضح على الخطوة التالية.", fieldExercise: "أكد الفعل والمسؤول والتوقيت قبل المغادرة.", checkpoint: "هل الخطوة التالية متفق عليها لا مفترضة؟" },
    ],
  },
  prospecting_finding_new_clients: {
    en: [
      { microAction: "Build a list of 10 fresh prospects from one source.", fieldExercise: "Choose one source today: LinkedIn, referrals, directories, events, or nearby accounts.", checkpoint: "Do you have 10 usable names with a reason to contact them?" },
      { microAction: "Ask one existing customer for a referral.", fieldExercise: "Ask for one person or company with a similar problem, not a general introduction.", checkpoint: "Did you create one warm path?" },
      { microAction: "Identify 5 lookalike companies similar to your best customer.", fieldExercise: "Write why each company may have the same problem or buying trigger.", checkpoint: "Can you explain why each prospect fits?" },
      { microAction: "Send one problem-based outreach message.", fieldExercise: "Start with the likely business problem, not your product or company story.", checkpoint: "Did the message earn a reply or a next attempt?" },
      { microAction: "Reconnect with one dormant lead using a useful insight.", fieldExercise: "Send a relevant idea, trend, risk, or observation instead of “just checking in.”", checkpoint: "Did the old lead receive new value?" },
      { microAction: "Add one new decision maker to your pipeline.", fieldExercise: "Find the person who owns the problem, budget, or final approval.", checkpoint: "Is your pipeline connected to a real decision maker?" },
      { microAction: "Track new qualified conversations created today.", fieldExercise: "Count only prospects with a real problem, fit, and possible next step.", checkpoint: "How many qualified conversations did you create?" },
    ],
    ar: [
      { microAction: "ابنِ قائمة من 10 عملاء محتملين جدد من مصدر واحد.", fieldExercise: "اختر مصدرًا واحدًا اليوم: لينكدإن، الإحالات، الأدلة، الفعاليات، أو الحسابات القريبة.", checkpoint: "هل لديك 10 أسماء قابلة للاستخدام مع سبب واضح للتواصل؟" },
      { microAction: "اطلب إحالة واحدة من عميل حالي.", fieldExercise: "اطلب شخصًا أو شركة لديها مشكلة مشابهة، لا تعريفًا عامًا.", checkpoint: "هل صنعت طريقًا دافئًا واحدًا؟" },
      { microAction: "حدد 5 شركات تشبه أفضل عميل لديك.", fieldExercise: "اكتب لماذا قد تملك كل شركة نفس المشكلة أو محفز الشراء.", checkpoint: "هل تستطيع شرح سبب ملاءمة كل عميل محتمل؟" },
      { microAction: "أرسل رسالة تواصل مبنية على مشكلة حقيقية.", fieldExercise: "ابدأ بالمشكلة التجارية المحتملة، لا بمنتجك أو قصة شركتك.", checkpoint: "هل حصلت الرسالة على رد أو محاولة تالية؟" },
      { microAction: "أعد التواصل مع عميل محتمل قديم بفكرة مفيدة.", fieldExercise: "أرسل فكرة أو توجهًا أو خطرًا أو ملاحظة مفيدة بدل عبارة فقط أتابع.", checkpoint: "هل تلقى العميل القديم قيمة جديدة؟" },
      { microAction: "أضف صانع قرار جديدًا إلى خط الأنابيب.", fieldExercise: "ابحث عن الشخص الذي يملك المشكلة أو الميزانية أو الموافقة النهائية.", checkpoint: "هل أصبح خط الأنابيب مرتبطًا بصانع قرار حقيقي؟" },
      { microAction: "قِس عدد المحادثات المؤهلة الجديدة اليوم.", fieldExercise: "احسب فقط العملاء الذين لديهم مشكلة حقيقية وملاءمة وخطوة تالية محتملة.", checkpoint: "كم محادثة مؤهلة جديدة صنعت اليوم؟" },
    ],
  },
  mental_toughness: {
    en: [
      { microAction: "Write the one sales situation you avoided yesterday.", fieldExercise: "Do that situation first today before easier activity.", checkpoint: "Did you act before your confidence felt ready?" },
      { microAction: "Name one rejection you are likely to hear today.", fieldExercise: "Prepare a calm one-line response and use it without defending yourself.", checkpoint: "Did you stay steady after the rejection?" },
      { microAction: "Choose one difficult buyer or account you have postponed.", fieldExercise: "Send the first useful message or make the first call.", checkpoint: "Did the task become smaller after action?" },
      { microAction: "Write your reset phrase for a bad call.", fieldExercise: "After one weak interaction, reset and start the next one within 10 minutes.", checkpoint: "Did one bad moment stop controlling the day?" },
      { microAction: "Pick one uncomfortable selling behavior to practice today.", fieldExercise: "Practice it in one real conversation instead of only planning it.", checkpoint: "Did discomfort reduce after doing it?" },
      { microAction: "Set a minimum action target for the day.", fieldExercise: "Complete the target even if the day feels messy or low-energy.", checkpoint: "Did discipline beat mood?" },
      { microAction: "Review one lost opportunity without blaming the buyer.", fieldExercise: "Extract one behavior you can improve in the next conversation.", checkpoint: "Did the loss turn into a usable lesson?" },
    ],
    ar: [
      { microAction: "اكتب موقفًا بيعيًا واحدًا تجنبته أمس.", fieldExercise: "ابدأ به اليوم قبل الأنشطة الأسهل.", checkpoint: "هل تحركت قبل أن تشعر بالجاهزية الكاملة؟" },
      { microAction: "حدد اعتراضًا أو رفضًا تتوقع سماعه اليوم.", fieldExercise: "حضّر ردًا هادئًا من جملة واحدة واستخدمه دون دفاع زائد.", checkpoint: "هل بقيت ثابتًا بعد الرفض؟" },
      { microAction: "اختر عميلًا أو حسابًا صعبًا أجلته.", fieldExercise: "أرسل أول رسالة مفيدة أو قم بأول اتصال.", checkpoint: "هل أصبح الأمر أصغر بعد الحركة؟" },
      { microAction: "اكتب جملة إعادة ضبط بعد مكالمة سيئة.", fieldExercise: "بعد تفاعل ضعيف، أعد ضبط نفسك وابدأ التفاعل التالي خلال 10 دقائق.", checkpoint: "هل توقفت لحظة سيئة عن التحكم في يومك؟" },
      { microAction: "اختر سلوكًا بيعيًا غير مريح للتدرب عليه اليوم.", fieldExercise: "طبقه في محادثة حقيقية بدل الاكتفاء بالتخطيط.", checkpoint: "هل قل الانزعاج بعد التطبيق؟" },
      { microAction: "حدد حدًا أدنى من النشاط البيعي لليوم.", fieldExercise: "أنجزه حتى لو كان اليوم مزدحمًا أو طاقتك منخفضة.", checkpoint: "هل غلب الانضباط المزاج؟" },
      { microAction: "راجع فرصة خسرتها دون لوم العميل.", fieldExercise: "استخرج سلوكًا واحدًا لتحسينه في المحادثة التالية.", checkpoint: "هل تحولت الخسارة إلى درس قابل للاستخدام؟" },
    ],
  },
  opening_conversations: {
    en: [
      { microAction: "Write a 10-second opening that mentions the buyer's business issue.", fieldExercise: "Use it in your next call instead of starting with your company intro.", checkpoint: "Did the buyer engage faster?" },
      { microAction: "Prepare one opening question about the buyer's current priority.", fieldExercise: "Ask it before explaining any product.", checkpoint: "Did you learn the agenda before presenting?" },
      { microAction: "Remove one filler phrase from your opening.", fieldExercise: "Start one conversation with a direct reason for the call.", checkpoint: "Was the first minute cleaner?" },
      { microAction: "Write one opening for a cold buyer and one for a warm buyer.", fieldExercise: "Use the correct version in two real interactions.", checkpoint: "Did the opening match the relationship?" },
      { microAction: "Create a permission-based opener.", fieldExercise: "Ask permission to share one relevant reason, then pause.", checkpoint: "Did the buyer give you attention voluntarily?" },
      { microAction: "Prepare one industry-specific opening trigger.", fieldExercise: "Connect your opening to a real market, season, or business pressure.", checkpoint: "Did the conversation feel less generic?" },
      { microAction: "Record your opening once and cut unnecessary words.", fieldExercise: "Use the shorter version in the field.", checkpoint: "Did you reach the point faster?" },
    ],
    ar: [
      { microAction: "اكتب افتتاحية من 10 ثوانٍ تذكر مشكلة تجارية لدى العميل.", fieldExercise: "استخدمها في مكالمتك التالية بدل البدء بتعريف شركتك.", checkpoint: "هل تفاعل العميل أسرع؟" },
      { microAction: "حضّر سؤال افتتاحي عن أولوية العميل الحالية.", fieldExercise: "اسأله قبل شرح أي منتج.", checkpoint: "هل عرفت أجندة العميل قبل العرض؟" },
      { microAction: "احذف عبارة حشو واحدة من افتتاحيتك.", fieldExercise: "ابدأ محادثة واحدة بسبب واضح للتواصل.", checkpoint: "هل أصبحت الدقيقة الأولى أنظف؟" },
      { microAction: "اكتب افتتاحية لعميل بارد وأخرى لعميل دافئ.", fieldExercise: "استخدم النسخة المناسبة في تفاعلين حقيقيين.", checkpoint: "هل ناسبت الافتتاحية العلاقة؟" },
      { microAction: "حضّر افتتاحية تطلب الإذن.", fieldExercise: "اطلب الإذن لمشاركة سبب مهم ثم توقف.", checkpoint: "هل منحك العميل انتباهه باختياره؟" },
      { microAction: "حضّر مدخلًا مرتبطًا بقطاع العميل.", fieldExercise: "اربط الافتتاحية بضغط سوقي أو موسمي أو تجاري حقيقي.", checkpoint: "هل بدت المحادثة أقل عمومية؟" },
      { microAction: "سجل افتتاحيتك مرة واحذف الكلمات الزائدة.", fieldExercise: "استخدم النسخة الأقصر في الميدان.", checkpoint: "هل وصلت للنقطة أسرع؟" },
    ],
  },
  identifying_real_needs: {
    en: [
      { microAction: "Prepare the question: “Why now?”", fieldExercise: "Ask it in one real conversation before offering a solution.", checkpoint: "Did you uncover urgency?" },
      { microAction: "Write: “What happens if this stays the same for 90 days?”", fieldExercise: "Ask it when a buyer describes a problem.", checkpoint: "Did the consequence become clearer?" },
      { microAction: "Prepare one question that quantifies pain.", fieldExercise: "Ask for time, money, volume, delay, or risk impact.", checkpoint: "Did you capture a number?" },
      { microAction: "Write one stakeholder question.", fieldExercise: "Ask who else is affected by the problem or decision.", checkpoint: "Did you discover a hidden influencer?" },
      { microAction: "Choose one call where you will delay the solution.", fieldExercise: "Do not present until the buyer explains the consequence.", checkpoint: "Did your diagnosis improve?" },
      { microAction: "After one call, write the buyer's real need in one sentence.", fieldExercise: "Use that sentence in your follow-up.", checkpoint: "Would the buyer agree with the sentence?" },
      { microAction: "Prepare a confirmation sentence.", fieldExercise: "Before presenting, repeat the need back to the buyer.", checkpoint: "Did the buyer confirm or correct you?" },
    ],
    ar: [
      { microAction: "حضّر سؤال: لماذا الآن؟", fieldExercise: "اسأله في محادثة حقيقية قبل تقديم الحل.", checkpoint: "هل كشفت درجة الاستعجال؟" },
      { microAction: "اكتب: ماذا يحدث إذا بقيت المشكلة كما هي 90 يومًا؟", fieldExercise: "اسألها عندما يصف العميل مشكلة.", checkpoint: "هل أصبحت العاقبة أوضح؟" },
      { microAction: "حضّر سؤالًا يقيس الألم بالأرقام.", fieldExercise: "اسأل عن أثر الوقت أو المال أو الحجم أو التأخير أو المخاطر.", checkpoint: "هل حصلت على رقم؟" },
      { microAction: "اكتب سؤالًا عن أصحاب التأثير.", fieldExercise: "اسأل من يتأثر أيضًا بالمشكلة أو القرار.", checkpoint: "هل اكتشفت مؤثرًا خفيًا؟" },
      { microAction: "اختر مكالمة ستؤجل فيها عرض الحل.", fieldExercise: "لا تعرض الحل حتى يشرح العميل العاقبة.", checkpoint: "هل تحسن التشخيص؟" },
      { microAction: "بعد مكالمة واحدة، اكتب حاجة العميل الحقيقية في جملة واحدة.", fieldExercise: "استخدم الجملة في رسالة المتابعة.", checkpoint: "هل سيوافق العميل على هذه الجملة؟" },
      { microAction: "حضّر جملة تأكيد للاحتياج.", fieldExercise: "قبل العرض، أعد الاحتياج على العميل.", checkpoint: "هل أكد العميل كلامك أو صححه؟" },
    ],
  },
  destroying_objections: {
    en: [
      { microAction: "Write the top price objection you hear.", fieldExercise: "Answer it by returning to cost of inaction before discounting.", checkpoint: "Did you protect value?" },
      { microAction: "List one likely trust objection.", fieldExercise: "Use proof before the buyer asks for it.", checkpoint: "Did proof reduce resistance?" },
      { microAction: "Prepare a calm response to “I need to think.”", fieldExercise: "Ask what part needs more clarity.", checkpoint: "Did you uncover the real concern?" },
      { microAction: "Write one objection-prevention story.", fieldExercise: "Share the story before presenting price or next step.", checkpoint: "Did the buyer raise fewer doubts?" },
      { microAction: "Choose one objection and write the question behind it.", fieldExercise: "Answer the hidden question, not just the words.", checkpoint: "Did your response feel more precise?" },
      { microAction: "Prepare one comparison against doing nothing.", fieldExercise: "Use it when the buyer hesitates.", checkpoint: "Did the buyer see the risk of delay?" },
      { microAction: "Review one lost deal and identify the unhandled objection.", fieldExercise: "Write the response you should use next time.", checkpoint: "Is the new response shorter and stronger?" },
    ],
    ar: [
      { microAction: "اكتب أكثر اعتراض سعري تسمعه.", fieldExercise: "أجب عليه بالعودة إلى تكلفة عدم التحرك قبل الخصم.", checkpoint: "هل حميت القيمة؟" },
      { microAction: "حدد اعتراض ثقة محتملًا.", fieldExercise: "استخدم دليلًا قبل أن يطلبه العميل.", checkpoint: "هل قللت الإثباتات المقاومة؟" },
      { microAction: "حضّر ردًا هادئًا على: أحتاج أن أفكر.", fieldExercise: "اسأل أي جزء يحتاج وضوحًا أكثر.", checkpoint: "هل كشفت القلق الحقيقي؟" },
      { microAction: "اكتب قصة قصيرة تمنع اعتراضًا.", fieldExercise: "شاركها قبل عرض السعر أو الخطوة التالية.", checkpoint: "هل ظهرت شكوك أقل؟" },
      { microAction: "اختر اعتراضًا واكتب السؤال المخفي خلفه.", fieldExercise: "أجب على السؤال الحقيقي لا الكلمات فقط.", checkpoint: "هل صار الرد أدق؟" },
      { microAction: "حضّر مقارنة ضد عدم فعل شيء.", fieldExercise: "استخدمها عندما يتردد العميل.", checkpoint: "هل رأى العميل خطر التأجيل؟" },
      { microAction: "راجع صفقة ضاعت وحدد الاعتراض غير المعالج.", fieldExercise: "اكتب الرد الذي ستستخدمه في المرة القادمة.", checkpoint: "هل الرد الجديد أقصر وأقوى؟" },
    ],
  },
  creating_irresistible_offers: {
    en: [
      { microAction: "Rewrite one offer using pain, outcome, proof, and next step.", fieldExercise: "Use the rewritten offer with one active buyer.", checkpoint: "Did the offer feel easier to understand?" },
      { microAction: "Remove one weak feature from your offer.", fieldExercise: "Replace it with the business result the buyer cares about.", checkpoint: "Did value sound more commercial?" },
      { microAction: "Add one risk reducer to the offer.", fieldExercise: "Mention the risk reducer before asking for commitment.", checkpoint: "Did approval feel safer for the buyer?" },
      { microAction: "Write one reason to act now.", fieldExercise: "Use it without pressure or fake urgency.", checkpoint: "Did timing become clearer?" },
      { microAction: "Create a contrast: cost of staying the same versus benefit of action.", fieldExercise: "Share the contrast in one proposal or conversation.", checkpoint: "Did the buyer see both sides?" },
      { microAction: "Prepare a 30-second offer pitch.", fieldExercise: "Deliver it once without adding extra explanation.", checkpoint: "Could the buyer repeat the offer?" },
      { microAction: "Ask one buyer what would make the offer easier to approve.", fieldExercise: "Listen for approval friction and write it down.", checkpoint: "Did you find a practical improvement?" },
    ],
    ar: [
      { microAction: "أعد كتابة عرض واحد بصيغة: ألم، نتيجة، دليل، خطوة تالية.", fieldExercise: "استخدم العرض الجديد مع عميل نشط.", checkpoint: "هل أصبح العرض أسهل فهمًا؟" },
      { microAction: "احذف ميزة ضعيفة من العرض.", fieldExercise: "استبدلها بنتيجة تجارية تهم العميل.", checkpoint: "هل أصبحت القيمة أكثر تجارية؟" },
      { microAction: "أضف عنصرًا يقلل المخاطر في العرض.", fieldExercise: "اذكره قبل طلب الالتزام.", checkpoint: "هل أصبح القرار أكثر أمانًا للعميل؟" },
      { microAction: "اكتب سببًا واحدًا للتحرك الآن.", fieldExercise: "استخدمه دون ضغط أو استعجال مصطنع.", checkpoint: "هل أصبح التوقيت أوضح؟" },
      { microAction: "اصنع مقارنة بين تكلفة البقاء كما هو وفائدة التحرك.", fieldExercise: "شارك المقارنة في عرض أو محادثة.", checkpoint: "هل رأى العميل الجانبين؟" },
      { microAction: "حضّر عرضًا مختصرًا في 30 ثانية.", fieldExercise: "قدمه مرة واحدة دون شرح زائد.", checkpoint: "هل يستطيع العميل إعادة العرض؟" },
      { microAction: "اسأل عميلًا ما الذي يجعل العرض أسهل للموافقة.", fieldExercise: "استمع لعوائق الموافقة واكتبها.", checkpoint: "هل وجدت تحسينًا عمليًا؟" },
    ],
  },
  mastering_closing: {
    en: [
      { microAction: "Write the next commitment you want before the conversation starts.", fieldExercise: "Ask for that commitment clearly at the right moment.", checkpoint: "Did you ask instead of hinting?" },
      { microAction: "Prepare two closing options.", fieldExercise: "Offer the buyer a choice between two practical next steps.", checkpoint: "Did choice reduce friction?" },
      { microAction: "Write one closing question that checks readiness.", fieldExercise: "Ask it after summarizing value.", checkpoint: "Did you learn if the buyer is ready?" },
      { microAction: "Identify one deal where the next step is vague.", fieldExercise: "Ask for a date, decision, or missing information.", checkpoint: "Did the deal become more concrete?" },
      { microAction: "Prepare your response if the buyer delays.", fieldExercise: "Ask what must happen before they can move forward.", checkpoint: "Did you uncover the condition?" },
      { microAction: "Practice a 20-second value recap.", fieldExercise: "Use it before asking for the close.", checkpoint: "Did the close feel earned?" },
      { microAction: "Review one closed-lost deal.", fieldExercise: "Mark the moment where you should have asked for commitment.", checkpoint: "Will you recognize that moment next time?" },
    ],
    ar: [
      { microAction: "اكتب الالتزام التالي الذي تريده قبل بداية المحادثة.", fieldExercise: "اطلب هذا الالتزام بوضوح في اللحظة المناسبة.", checkpoint: "هل طلبت بدل التلميح؟" },
      { microAction: "حضّر خيارين للإغلاق.", fieldExercise: "اعرض على العميل اختيارًا بين خطوتين عمليتين.", checkpoint: "هل قلل الاختيار الاحتكاك؟" },
      { microAction: "اكتب سؤال إغلاق يقيس الجاهزية.", fieldExercise: "اسأله بعد تلخيص القيمة.", checkpoint: "هل عرفت إن كان العميل جاهزًا؟" },
      { microAction: "حدد صفقة خطوتها التالية غامضة.", fieldExercise: "اطلب تاريخًا أو قرارًا أو معلومة ناقصة.", checkpoint: "هل أصبحت الصفقة أوضح؟" },
      { microAction: "حضّر ردك إذا أجل العميل القرار.", fieldExercise: "اسأل ما الذي يجب أن يحدث قبل التحرك.", checkpoint: "هل كشفت الشرط الحقيقي؟" },
      { microAction: "تدرب على تلخيص قيمة في 20 ثانية.", fieldExercise: "استخدمه قبل طلب الإغلاق.", checkpoint: "هل بدا الإغلاق مستحقًا؟" },
      { microAction: "راجع صفقة خسرتها.", fieldExercise: "حدد اللحظة التي كان يجب أن تطلب فيها الالتزام.", checkpoint: "هل ستتعرف على اللحظة في المرة القادمة؟" },
    ],
  },
  follow_up_discipline: {
    en: [
      { microAction: "Before ending one conversation, book the next action.", fieldExercise: "Do not leave the call without date, owner, and purpose.", checkpoint: "Is the next step real?" },
      { microAction: "Send one follow-up within 10 minutes of a meeting.", fieldExercise: "Keep it short and linked to what the buyer said.", checkpoint: "Did speed improve momentum?" },
      { microAction: "Write a follow-up using context, value, and next step.", fieldExercise: "Send it to one active opportunity.", checkpoint: "Does the buyer know exactly what to do next?" },
      { microAction: "Remove vague phrases like “checking in.”", fieldExercise: "Replace them with a reason that matters to the buyer.", checkpoint: "Did the message become more useful?" },
      { microAction: "Find one useful insight for a buyer.", fieldExercise: "Follow up with the insight, not a reminder.", checkpoint: "Did the follow-up add value?" },
      { microAction: "Ask for a dated next step.", fieldExercise: "Use a specific date or time window instead of “soon.”", checkpoint: "Did the timeline become visible?" },
      { microAction: "Review all open opportunities.", fieldExercise: "Mark the next action for each one before the day ends.", checkpoint: "Are there fewer loose ends?" },
    ],
    ar: [
      { microAction: "قبل إنهاء محادثة واحدة، احجز الخطوة التالية.", fieldExercise: "لا تنهِ المكالمة دون تاريخ ومسؤول وهدف.", checkpoint: "هل الخطوة التالية حقيقية؟" },
      { microAction: "أرسل متابعة واحدة خلال 10 دقائق من الاجتماع.", fieldExercise: "اجعلها قصيرة ومرتبطة بما قاله العميل.", checkpoint: "هل حسنت السرعة الزخم؟" },
      { microAction: "اكتب متابعة بصيغة: سياق، قيمة، خطوة تالية.", fieldExercise: "أرسلها لفرصة نشطة واحدة.", checkpoint: "هل يعرف العميل ماذا يفعل بعد ذلك؟" },
      { microAction: "احذف عبارات غامضة مثل: فقط أتابع.", fieldExercise: "استبدلها بسبب يهم العميل.", checkpoint: "هل أصبحت الرسالة أكثر فائدة؟" },
      { microAction: "ابحث عن فكرة مفيدة لعميل واحد.", fieldExercise: "تابع بالفكرة لا بالتذكير فقط.", checkpoint: "هل أضافت المتابعة قيمة؟" },
      { microAction: "اطلب خطوة تالية بتاريخ.", fieldExercise: "استخدم تاريخًا أو نافذة زمنية بدل كلمة قريبًا.", checkpoint: "هل ظهر الجدول الزمني؟" },
      { microAction: "راجع كل الفرص المفتوحة.", fieldExercise: "حدد الخطوة التالية لكل فرصة قبل نهاية اليوم.", checkpoint: "هل قلت النهايات المفتوحة؟" },
    ],
  },
  consultative_selling: {
    en: [
      { microAction: "Write three diagnosis questions before one meeting.", fieldExercise: "Ask all three before explaining your solution.", checkpoint: "Did the meeting become more consultative?" },
      { microAction: "Prepare one summary of the buyer's situation.", fieldExercise: "Repeat the summary before recommending anything.", checkpoint: "Did the buyer feel understood?" },
      { microAction: "Map one buyer problem to one business outcome.", fieldExercise: "Use the map to guide the conversation.", checkpoint: "Did the solution fit the problem?" },
      { microAction: "Write one question about decision criteria.", fieldExercise: "Ask what will make the buyer choose one option over another.", checkpoint: "Did you learn the buying standard?" },
      { microAction: "Prepare one advisory statement, not a pitch.", fieldExercise: "Share it as guidance based on what the buyer told you.", checkpoint: "Did you sound like an advisor?" },
      { microAction: "Identify one assumption you are making about the buyer.", fieldExercise: "Test that assumption with a question.", checkpoint: "Was your assumption right?" },
      { microAction: "End one conversation with a recommended next step.", fieldExercise: "Explain why that step fits the diagnosis.", checkpoint: "Did the next step feel logical?" },
    ],
    ar: [
      { microAction: "اكتب ثلاثة أسئلة تشخيصية قبل اجتماع واحد.", fieldExercise: "اسألها كلها قبل شرح الحل.", checkpoint: "هل أصبح الاجتماع أكثر استشارية؟" },
      { microAction: "حضّر ملخصًا واحدًا لوضع العميل.", fieldExercise: "أعد الملخص قبل أي توصية.", checkpoint: "هل شعر العميل أنك فهمته؟" },
      { microAction: "اربط مشكلة عميل واحدة بنتيجة تجارية واحدة.", fieldExercise: "استخدم الربط لتوجيه المحادثة.", checkpoint: "هل ناسبت الحل المشكلة؟" },
      { microAction: "اكتب سؤالًا عن معايير القرار.", fieldExercise: "اسأل ما الذي يجعل العميل يختار خيارًا على آخر.", checkpoint: "هل عرفت معيار الشراء؟" },
      { microAction: "حضّر جملة إرشادية لا عرضًا بيعيًا.", fieldExercise: "شاركها كتوجيه مبني على كلام العميل.", checkpoint: "هل بدوت كمستشار؟" },
      { microAction: "حدد افتراضًا واحدًا لديك عن العميل.", fieldExercise: "اختبره بسؤال.", checkpoint: "هل كان افتراضك صحيحًا؟" },
      { microAction: "اختم محادثة بتوصية للخطوة التالية.", fieldExercise: "اشرح لماذا تناسب هذه الخطوة التشخيص.", checkpoint: "هل بدت الخطوة منطقية؟" },
    ],
  },
  time_territory_management: {
    en: [
      { microAction: "List today's opportunities by probability and value.", fieldExercise: "Start with the highest-value active opportunity.", checkpoint: "Did your first hour matter?" },
      { microAction: "Block one selling hour with no admin.", fieldExercise: "Use it only for calls, visits, follow-ups, or proposals.", checkpoint: "Was the hour protected?" },
      { microAction: "Mark one low-probability account to pause.", fieldExercise: "Move that energy to a better opportunity.", checkpoint: "Did focus improve?" },
      { microAction: "Write your route or call sequence before starting.", fieldExercise: "Follow the sequence unless a real priority changes.", checkpoint: "Did you reduce wasted movement?" },
      { microAction: "Choose three must-win actions for the day.", fieldExercise: "Complete them before optional tasks.", checkpoint: "Did priorities beat noise?" },
      { microAction: "Review one territory or pipeline gap.", fieldExercise: "Add one action to create coverage in that gap.", checkpoint: "Did you protect future pipeline?" },
      { microAction: "End the day by choosing tomorrow's first sales action.", fieldExercise: "Put it on your calendar before closing work.", checkpoint: "Will tomorrow start faster?" },
    ],
    ar: [
      { microAction: "رتب فرص اليوم حسب الاحتمال والقيمة.", fieldExercise: "ابدأ بأعلى فرصة نشطة من حيث القيمة.", checkpoint: "هل كانت الساعة الأولى مهمة؟" },
      { microAction: "احجز ساعة بيع بلا أعمال إدارية.", fieldExercise: "استخدمها فقط للمكالمات أو الزيارات أو المتابعات أو العروض.", checkpoint: "هل حميت الساعة؟" },
      { microAction: "حدد حسابًا ضعيف الاحتمال لتجميده.", fieldExercise: "انقل طاقتك إلى فرصة أفضل.", checkpoint: "هل زاد التركيز؟" },
      { microAction: "اكتب مسار زياراتك أو ترتيب مكالماتك قبل البدء.", fieldExercise: "اتبع الترتيب إلا إذا ظهرت أولوية حقيقية.", checkpoint: "هل قللت الحركة المهدرة؟" },
      { microAction: "اختر ثلاث أفعال لا بد من إنجازها اليوم.", fieldExercise: "أنجزها قبل المهام الاختيارية.", checkpoint: "هل غلبت الأولويات الضجيج؟" },
      { microAction: "راجع فجوة واحدة في المنطقة أو خط الأنابيب.", fieldExercise: "أضف فعلًا واحدًا لتغطية هذه الفجوة.", checkpoint: "هل حميت الفرص المستقبلية؟" },
      { microAction: "اختم اليوم باختيار أول فعل بيعي للغد.", fieldExercise: "ضعه في التقويم قبل إغلاق العمل.", checkpoint: "هل سيبدأ الغد أسرع؟" },
    ],
  },
  product_expertise: {
    en: [
      { microAction: "Pick one product you sell often and write 3 business problems it solves, not 3 features.", fieldExercise: "Use one problem-led explanation in your next conversation.", checkpoint: "Can the buyer repeat the business problem clearly?" },
      { microAction: "Translate one feature into problem solved, proof, and buyer outcome.", fieldExercise: "Use the translated version instead of the feature list.", checkpoint: "Did the value sound more practical?" },
      { microAction: "Record a 30-second explanation without technical language.", fieldExercise: "Use the same simple wording with one buyer.", checkpoint: "Could a non-expert understand it?" },
      { microAction: "Ask one buyer which product benefit matters most to their business result.", fieldExercise: "Let their answer guide the rest of the conversation.", checkpoint: "Did you stop guessing what matters?" },
      { microAction: "Create one before-and-after comparison for the product.", fieldExercise: "Show the buyer the difference between current state and improved state.", checkpoint: "Did the outcome become more visible?" },
      { microAction: "Write one proof story from a real customer or realistic use case.", fieldExercise: "Use the story when explaining value.", checkpoint: "Did the proof make the product more believable?" },
      { microAction: "Prepare one answer to: “Why should I choose this instead of doing nothing?”", fieldExercise: "Use the answer with one hesitant buyer.", checkpoint: "Did you make inaction feel costly?" },
    ],
    ar: [
      { microAction: "اختر منتجًا تبيعه كثيرًا واكتب 3 مشكلات تجارية يحلها، لا 3 مزايا.", fieldExercise: "استخدم شرحًا يبدأ بالمشكلة في محادثتك التالية.", checkpoint: "هل يستطيع العميل إعادة شرح المشكلة التجارية؟" },
      { microAction: "حوّل ميزة واحدة إلى: مشكلة محلولة، دليل، نتيجة للعميل.", fieldExercise: "استخدم النسخة المترجمة بدل قائمة المزايا.", checkpoint: "هل بدت القيمة أكثر عملية؟" },
      { microAction: "سجل شرحًا لمدة 30 ثانية دون لغة تقنية.", fieldExercise: "استخدم نفس الصياغة البسيطة مع عميل واحد.", checkpoint: "هل يفهمها شخص غير متخصص؟" },
      { microAction: "اسأل عميلًا أي فائدة من المنتج تهم نتيجته التجارية أكثر.", fieldExercise: "دع إجابته تقود بقية المحادثة.", checkpoint: "هل توقفت عن تخمين ما يهمه؟" },
      { microAction: "اصنع مقارنة قبل وبعد للمنتج.", fieldExercise: "أرِ العميل الفرق بين الوضع الحالي والوضع المحسن.", checkpoint: "هل أصبحت النتيجة مرئية أكثر؟" },
      { microAction: "اكتب قصة إثبات من عميل حقيقي أو حالة استخدام واقعية.", fieldExercise: "استخدم القصة عند شرح القيمة.", checkpoint: "هل جعل الدليل المنتج أكثر تصديقًا؟" },
      { microAction: "حضّر إجابة لسؤال: لماذا أختار هذا بدل ألا أفعل شيئًا؟", fieldExercise: "استخدم الإجابة مع عميل متردد.", checkpoint: "هل جعلت عدم التحرك مكلفًا؟" },
    ],
  },
  negotiation_skills: {
    en: [
      { microAction: "Write what you can trade that is not price.", fieldExercise: "Use one non-price trade if the buyer asks for a concession.", checkpoint: "Did you avoid giving value for free?" },
      { microAction: "Prepare your walk-away point before one negotiation.", fieldExercise: "Keep the conversation above that line.", checkpoint: "Did you protect the deal quality?" },
      { microAction: "Write one question that tests what the buyer values most.", fieldExercise: "Ask it before offering any concession.", checkpoint: "Did you learn what to trade?" },
      { microAction: "Prepare a conditional concession sentence.", fieldExercise: "Use “If we can do X, can you do Y?”", checkpoint: "Did every concession get a return?" },
      { microAction: "List the buyer's likely pressure tactic.", fieldExercise: "Respond with a question instead of reacting.", checkpoint: "Did you stay in control?" },
      { microAction: "Create a value recap before discussing price.", fieldExercise: "Use it when the conversation moves to cost.", checkpoint: "Did price sit inside value?" },
      { microAction: "Review one discount you gave too fast.", fieldExercise: "Write the trade you should ask for next time.", checkpoint: "Is your next negotiation stronger?" },
    ],
    ar: [
      { microAction: "اكتب ما يمكنك مبادلته غير السعر.", fieldExercise: "استخدم مبادلة غير سعرية إذا طلب العميل تنازلًا.", checkpoint: "هل تجنبت إعطاء قيمة مجانًا؟" },
      { microAction: "حدد حدك الأدنى قبل تفاوض واحد.", fieldExercise: "حافظ على المحادثة فوق هذا الحد.", checkpoint: "هل حميت جودة الصفقة؟" },
      { microAction: "اكتب سؤالًا يكشف ما يقدره العميل أكثر.", fieldExercise: "اسأله قبل تقديم أي تنازل.", checkpoint: "هل عرفت ماذا تبادل؟" },
      { microAction: "حضّر جملة تنازل مشروطة.", fieldExercise: "استخدم: إذا فعلنا كذا، هل يمكنكم فعل كذا؟", checkpoint: "هل حصل كل تنازل على مقابل؟" },
      { microAction: "حدد أسلوب ضغط محتمل من العميل.", fieldExercise: "رد بسؤال بدل الانفعال.", checkpoint: "هل بقيت مسيطرًا؟" },
      { microAction: "اصنع تلخيص قيمة قبل نقاش السعر.", fieldExercise: "استخدمه عندما ينتقل الحديث للتكلفة.", checkpoint: "هل بقي السعر داخل إطار القيمة؟" },
      { microAction: "راجع خصمًا قدمته بسرعة.", fieldExercise: "اكتب المقابل الذي ستطلبه المرة القادمة.", checkpoint: "هل أصبح تفاوضك القادم أقوى؟" },
    ],
  },
  attitude_motivation_mindset: {
    en: [
      { microAction: "Write the sales behavior you will control today.", fieldExercise: "Measure the day by that behavior, not by buyer mood.", checkpoint: "Did you focus on controllables?" },
      { microAction: "Choose one buyer problem that is worth solving.", fieldExercise: "Start your next conversation from that purpose.", checkpoint: "Did purpose improve your energy?" },
      { microAction: "Remove one complaint from your morning language.", fieldExercise: "Replace it with one action you can take.", checkpoint: "Did your language change your pace?" },
      { microAction: "Write one reason your product genuinely helps customers.", fieldExercise: "Use that belief in one conversation without exaggeration.", checkpoint: "Did confidence sound authentic?" },
      { microAction: "Choose one task you usually postpone.", fieldExercise: "Complete it before checking easy messages.", checkpoint: "Did action create momentum?" },
      { microAction: "Write one learning target for the day.", fieldExercise: "After each call, note one thing you learned.", checkpoint: "Did the day produce learning?" },
      { microAction: "Review one success from the week.", fieldExercise: "Repeat the exact behavior that created it.", checkpoint: "Can you reproduce your own momentum?" },
    ],
    ar: [
      { microAction: "اكتب السلوك البيعي الذي ستتحكم به اليوم.", fieldExercise: "قس اليوم بهذا السلوك لا بمزاج العميل.", checkpoint: "هل ركزت على ما يمكنك التحكم به؟" },
      { microAction: "اختر مشكلة عميل تستحق الحل.", fieldExercise: "ابدأ محادثتك التالية من هذا الهدف.", checkpoint: "هل رفع الهدف طاقتك؟" },
      { microAction: "احذف شكوى واحدة من لغة الصباح.", fieldExercise: "استبدلها بفعل يمكنك القيام به.", checkpoint: "هل غيرت اللغة سرعتك؟" },
      { microAction: "اكتب سببًا حقيقيًا يجعل منتجك يساعد العملاء.", fieldExercise: "استخدم هذا الإيمان في محادثة دون مبالغة.", checkpoint: "هل بدت الثقة حقيقية؟" },
      { microAction: "اختر مهمة تؤجلها عادة.", fieldExercise: "أنجزها قبل الرسائل السهلة.", checkpoint: "هل صنع الفعل زخمًا؟" },
      { microAction: "اكتب هدف تعلم لليوم.", fieldExercise: "بعد كل مكالمة، سجل شيئًا واحدًا تعلمته.", checkpoint: "هل أنتج اليوم تعلمًا؟" },
      { microAction: "راجع نجاحًا واحدًا من الأسبوع.", fieldExercise: "كرر السلوك الذي صنعه بالضبط.", checkpoint: "هل تستطيع إعادة إنتاج زخمك؟" },
    ],
  },
  dealing_with_boss: {
    en: [
      { microAction: "Write one sales obstacle you need your manager to understand.", fieldExercise: "Share it with evidence, not frustration.", checkpoint: "Did the conversation become more useful?" },
      { microAction: "Prepare one clear request for support.", fieldExercise: "Ask for a decision, resource, or coaching point.", checkpoint: "Did you make it easy to help you?" },
      { microAction: "Summarize your pipeline risk in three bullets.", fieldExercise: "Send or discuss it before it becomes urgent.", checkpoint: "Did you create alignment early?" },
      { microAction: "Write one update using facts, impact, and next action.", fieldExercise: "Use it in your next internal update.", checkpoint: "Was the update clearer?" },
      { microAction: "Identify one internal delay hurting a customer.", fieldExercise: "Escalate it with customer impact and proposed solution.", checkpoint: "Did you protect the customer outcome?" },
      { microAction: "Ask your manager one coaching question.", fieldExercise: "Apply the answer in one live opportunity.", checkpoint: "Did coaching turn into action?" },
      { microAction: "Clarify one target or priority that feels unclear.", fieldExercise: "Ask for the success measure in plain language.", checkpoint: "Do you know what good looks like?" },
    ],
    ar: [
      { microAction: "اكتب عائقًا بيعيًا يحتاج مديرك لفهمه.", fieldExercise: "شاركه بالدليل لا بالإحباط.", checkpoint: "هل أصبحت المحادثة أكثر فائدة؟" },
      { microAction: "حضّر طلب دعم واضح.", fieldExercise: "اطلب قرارًا أو موردًا أو نقطة تدريب.", checkpoint: "هل سهّلت مساعدتك؟" },
      { microAction: "لخص خطرًا في خط الأنابيب بثلاث نقاط.", fieldExercise: "ناقشه قبل أن يصبح عاجلًا.", checkpoint: "هل صنعت توافقًا مبكرًا؟" },
      { microAction: "اكتب تحديثًا بصيغة: حقائق، أثر، خطوة تالية.", fieldExercise: "استخدمه في تحديثك الداخلي القادم.", checkpoint: "هل أصبح التحديث أوضح؟" },
      { microAction: "حدد تأخيرًا داخليًا يضر عميلًا.", fieldExercise: "صعّده بأثره على العميل وحل مقترح.", checkpoint: "هل حميت نتيجة العميل؟" },
      { microAction: "اسأل مديرك سؤال تدريب واحد.", fieldExercise: "طبق الإجابة في فرصة حية.", checkpoint: "هل تحول التدريب إلى فعل؟" },
      { microAction: "وضح هدفًا أو أولوية غير واضحة.", fieldExercise: "اسأل عن معيار النجاح بلغة بسيطة.", checkpoint: "هل عرفت شكل النجاح؟" },
    ],
  },
  handling_difficult_customers: {
    en: [
      { microAction: "Write the difficult customer behavior you expect today.", fieldExercise: "Prepare a calm boundary sentence before it happens.", checkpoint: "Did you respond instead of react?" },
      { microAction: "Prepare one empathy statement that does not surrender value.", fieldExercise: "Use it when a buyer is upset or demanding.", checkpoint: "Did the tone cool down?" },
      { microAction: "List the facts of one difficult account.", fieldExercise: "Separate facts from emotion before responding.", checkpoint: "Was your response cleaner?" },
      { microAction: "Write one question that redirects complaint into need.", fieldExercise: "Ask what outcome the customer wants now.", checkpoint: "Did the conversation move forward?" },
      { microAction: "Prepare a polite no for one unreasonable request.", fieldExercise: "Offer the best available alternative.", checkpoint: "Did you protect boundaries?" },
      { microAction: "Choose one difficult customer to follow up proactively.", fieldExercise: "Send a useful update before they chase you.", checkpoint: "Did proactivity reduce pressure?" },
      { microAction: "Review one tense conversation.", fieldExercise: "Write what you will repeat and what you will stop doing.", checkpoint: "Did you learn a pattern?" },
    ],
    ar: [
      { microAction: "اكتب سلوك العميل الصعب الذي تتوقعه اليوم.", fieldExercise: "حضّر جملة حدود هادئة قبل حدوثه.", checkpoint: "هل رددت بدل الانفعال؟" },
      { microAction: "حضّر جملة تعاطف لا تتنازل عن القيمة.", fieldExercise: "استخدمها عندما يكون العميل غاضبًا أو كثير الطلبات.", checkpoint: "هل هدأت النبرة؟" },
      { microAction: "اكتب حقائق حساب صعب واحد.", fieldExercise: "افصل الحقائق عن العاطفة قبل الرد.", checkpoint: "هل أصبح ردك أنظف؟" },
      { microAction: "اكتب سؤالًا يحول الشكوى إلى احتياج.", fieldExercise: "اسأل ما النتيجة التي يريدها العميل الآن.", checkpoint: "هل تحركت المحادثة للأمام؟" },
      { microAction: "حضّر رفضًا مهذبًا لطلب غير منطقي.", fieldExercise: "اعرض أفضل بديل متاح.", checkpoint: "هل حميت الحدود؟" },
      { microAction: "اختر عميلًا صعبًا للمتابعة الاستباقية.", fieldExercise: "أرسل تحديثًا مفيدًا قبل أن يلاحقك.", checkpoint: "هل قللت المبادرة الضغط؟" },
      { microAction: "راجع محادثة متوترة.", fieldExercise: "اكتب ما ستكرره وما ستتوقف عنه.", checkpoint: "هل تعلمت نمطًا؟" },
    ],
  },
  handling_difficult_colleagues: {
    en: [
      { microAction: "Write the internal behavior slowing one sale.", fieldExercise: "Ask the colleague for one specific action, not general help.", checkpoint: "Did the request become clearer?" },
      { microAction: "Prepare facts before raising an internal issue.", fieldExercise: "Discuss impact on customer or revenue, not personality.", checkpoint: "Did the conversation stay professional?" },
      { microAction: "Identify one colleague dependency.", fieldExercise: "Agree on owner, deadline, and handoff format.", checkpoint: "Did ambiguity reduce?" },
      { microAction: "Write one appreciation plus one clear request.", fieldExercise: "Use both in the same internal message.", checkpoint: "Did cooperation improve?" },
      { microAction: "Choose one repeated internal friction point.", fieldExercise: "Suggest a simple process fix.", checkpoint: "Did you move from complaint to system?" },
      { microAction: "Prepare one boundary for urgent interruptions.", fieldExercise: "Protect one selling block while offering a later time.", checkpoint: "Did you protect selling time?" },
      { microAction: "Review one internal conflict.", fieldExercise: "Write the shared customer goal before the next discussion.", checkpoint: "Did the common goal become visible?" },
    ],
    ar: [
      { microAction: "اكتب سلوكًا داخليًا يبطئ صفقة واحدة.", fieldExercise: "اطلب من الزميل فعلًا محددًا لا مساعدة عامة.", checkpoint: "هل أصبح الطلب أوضح؟" },
      { microAction: "حضّر الحقائق قبل طرح مشكلة داخلية.", fieldExercise: "ناقش أثرها على العميل أو الإيراد لا الشخصية.", checkpoint: "هل بقيت المحادثة مهنية؟" },
      { microAction: "حدد اعتمادًا واحدًا على زميل.", fieldExercise: "اتفق على المسؤول والموعد وشكل التسليم.", checkpoint: "هل قل الغموض؟" },
      { microAction: "اكتب تقديرًا واحدًا مع طلب واضح.", fieldExercise: "استخدم الاثنين في نفس الرسالة الداخلية.", checkpoint: "هل تحسن التعاون؟" },
      { microAction: "اختر نقطة احتكاك داخلية متكررة.", fieldExercise: "اقترح حلًا بسيطًا في العملية.", checkpoint: "هل انتقلت من الشكوى إلى النظام؟" },
      { microAction: "حضّر حدًا للمقاطعات العاجلة.", fieldExercise: "احمِ وقت بيع واحد مع اقتراح وقت لاحق.", checkpoint: "هل حميت وقت البيع؟" },
      { microAction: "راجع خلافًا داخليًا واحدًا.", fieldExercise: "اكتب هدف العميل المشترك قبل النقاش التالي.", checkpoint: "هل ظهر الهدف المشترك؟" },
    ],
  },
};

const OUTDOOR_MRI_COMPETENCY_ALIASES: Record<string, OutdoorMriCompetencyKey> = {
  mental_toughness: "mental_toughness",
  "Mental Toughness": "mental_toughness",
  "mental toughness": "mental_toughness",
  "الصلابة الذهنية": "mental_toughness",

  product_expertise: "product_expertise",
  "Product Expertise": "product_expertise",
  "product expertise": "product_expertise",
  "الخبرة في المنتج": "product_expertise",

  identifying_real_needs: "identifying_real_needs",
  "Identifying Real Needs": "identifying_real_needs",
  "identifying real needs": "identifying_real_needs",
  "تحديد الاحتياجات الحقيقية": "identifying_real_needs",

  handling_difficult_customers: "handling_difficult_customers",
  "Handling Difficult Customers": "handling_difficult_customers",
  "handling difficult customers": "handling_difficult_customers",
  "التعامل مع العملاء الصعبين": "handling_difficult_customers",

  time_territory_management: "time_territory_management",
  time_and_territory_management: "time_territory_management",
  "Time & Territory Management": "time_territory_management",
  "time & territory management": "time_territory_management",
  "إدارة الوقت والمنطقة": "time_territory_management",

  prospecting_finding_new_clients: "prospecting_finding_new_clients",
  prospecting_and_finding_new_clients: "prospecting_finding_new_clients",
  prospecting: "prospecting_finding_new_clients",
  finding_new_clients: "prospecting_finding_new_clients",
  lead_generation: "prospecting_finding_new_clients",
  "Prospecting & Finding New Clients": "prospecting_finding_new_clients",
  "prospecting & finding new clients": "prospecting_finding_new_clients",
  "البحث عن عملاء جدد": "prospecting_finding_new_clients",

  creating_irresistible_offers: "creating_irresistible_offers",
  "Creating Irresistible Offers": "creating_irresistible_offers",
  "creating irresistible offers": "creating_irresistible_offers",
  "إنشاء عروض لا تُقاوَم": "creating_irresistible_offers",

  mastering_closing: "mastering_closing",
  "Mastering Closing": "mastering_closing",
  "mastering closing": "mastering_closing",
  "إتقان الإغلاق": "mastering_closing",

  handling_difficult_colleagues: "handling_difficult_colleagues",
  "Handling Difficult Colleagues": "handling_difficult_colleagues",
  "handling difficult colleagues": "handling_difficult_colleagues",
  "التعامل مع الزملاء الصعبين": "handling_difficult_colleagues",

  consultative_selling: "consultative_selling",
  "Consultative Selling": "consultative_selling",
  "consultative selling": "consultative_selling",
  "المبيعات الاستشارية": "consultative_selling",

  destroying_objections: "destroying_objections",
  handling_objections: "destroying_objections",
  "Destroying Objections": "destroying_objections",
  "destroying objections": "destroying_objections",
  "Handling Objections": "destroying_objections",
  "handling objections": "destroying_objections",
  "تدمير الاعتراضات من الجذور": "destroying_objections",
  "التعامل مع الاعتراضات": "destroying_objections",

  attitude_motivation_mindset: "attitude_motivation_mindset",
  attitude_and_motivation_mindset: "attitude_motivation_mindset",
  "Attitude & Motivation Mindset": "attitude_motivation_mindset",
  "attitude & motivation mindset": "attitude_motivation_mindset",
  "العقلية والتحفيز": "attitude_motivation_mindset",

  negotiation_skills: "negotiation_skills",
  "Negotiation Skills": "negotiation_skills",
  "negotiation skills": "negotiation_skills",
  "مهارات التفاوض": "negotiation_skills",

  follow_up_discipline: "follow_up_discipline",
  followup_discipline: "follow_up_discipline",
  "Follow-Up Discipline": "follow_up_discipline",
  "follow-up discipline": "follow_up_discipline",
  "follow up discipline": "follow_up_discipline",
  "انضباط المتابعة": "follow_up_discipline",

  opening_conversations: "opening_conversations",
  "Opening Conversations": "opening_conversations",
  "opening conversations": "opening_conversations",
  "فتح المحادثات": "opening_conversations",

  dealing_with_boss: "dealing_with_boss",
  "Dealing with Boss": "dealing_with_boss",
  "dealing with boss": "dealing_with_boss",
  "Managing Up & Internal Alignment": "dealing_with_boss",
  "managing up & internal alignment": "dealing_with_boss",
  "التعامل مع المدير": "dealing_with_boss",
  "التعامل مع الإدارة وبناء التوافق الداخلي": "dealing_with_boss",
};

function getOutdoorMriCanonicalKey(input: string): OutdoorMriCompetencyKey {
  const raw = String(input || "").trim();
  const normalized = raw.toLowerCase().trim();
  return OUTDOOR_MRI_COMPETENCY_ALIASES[raw] || OUTDOOR_MRI_COMPETENCY_ALIASES[normalized] || "general_sales_execution";
}

function getOutdoorSalesFitnessDrills(competencyId: string | undefined, ar: boolean) {
  const key = getOutdoorMriCanonicalKey(competencyId || "");
  return OUTDOOR_SALES_FITNESS_DRILLS[key][ar ? "ar" : "en"];
}

function buildOutdoorSalesFitnessPlan(
  weakestRows: CompetencyRow[],
  strongestRow: CompetencyRow | null,
  lang: Language
): SalesFitnessDay[] {
  const ar = lang === "ar";
  const fallbackFocus = ar ? "أولوية بيعية" : "Sales Priority";
  const leverageFocus = strongestRow?.label || (ar ? "أقوى عضلة بيعية لديك" : "your strongest sales muscle");
  const weak = weakestRows.length ? weakestRows : [{ label: fallbackFocus } as CompetencyRow];

  const integrationTemplates = ar
    ? [
        {
          micro: (w: string, s: string) => `استخدم قوتك في ${s} لدعم ضعف ${w}.`,
          field: () => "ابدأ المحادثة بقوتك الطبيعية، ثم انتقل عمدًا إلى السلوك الأضعف.",
          check: "هل ساعدت القوة على تقليل الضعف؟",
        },
        {
          micro: (w: string, s: string) => `اكتب جملة تربط ${s} بـ ${w} في موقف بيع حقيقي.`,
          field: () => "استخدم الجملة مع فرصة نشطة بدل ترك كل مهارة منفصلة.",
          check: "هل أصبحت المحادثة أكثر تماسكًا؟",
        },
        {
          micro: (w: string, s: string) => `حضّر مثالًا يثبت قوتك في ${s} ويعالج فجوة ${w}.`,
          field: () => "استخدم المثال عندما يظهر تردد أو عدم وضوح لدى العميل.",
          check: "هل تحرك العميل خطوة للأمام؟",
        },
        {
          micro: (w: string, s: string) => `اختر فرصة واحدة تحتاج إلى ${w} وادخلها بثقة ${s}.`,
          field: () => "طبّق الاثنين معًا في زيارة أو مكالمة أو متابعة.",
          check: "هل خرجت بخطوة تالية واضحة؟",
        },
      ]
    : [
        {
          micro: (w: string, s: string) => `Use your strength in ${s} to support the weaker muscle: ${w}.`,
          field: () => "Start from your natural strength, then deliberately practice the weaker behavior.",
          check: "Did your strength reduce the impact of the weak area?",
        },
        {
          micro: (w: string, s: string) => `Write one sentence that connects ${s} with ${w} in a real sales moment.`,
          field: () => "Use that sentence with an active opportunity instead of treating the skills separately.",
          check: "Did the conversation feel more connected and controlled?",
        },
        {
          micro: (w: string, s: string) => `Prepare one proof point that uses ${s} and repairs a gap in ${w}.`,
          field: () => "Use the proof when the buyer shows hesitation or confusion.",
          check: "Did the buyer move one step forward?",
        },
        {
          micro: (w: string, s: string) => `Choose one opportunity that needs ${w} and enter it through your strength in ${s}.`,
          field: () => "Apply both muscles together in a visit, call, or follow-up.",
          check: "Did you leave with a clearer next step?",
        },
      ];

  const executionTemplates = ar
    ? [
        ["راجع خطتك اليومية قبل أول تواصل.", "اختر أهم فرصة واحدة وطبّق عليها أفضل سلوك من الخطة.", "هل بدأت اليوم بوضوح بدل رد الفعل؟"],
        ["اكتب هدفًا سلوكيًا واحدًا لليوم.", "لا تقيس اليوم بالمزاج؛ قسه بتنفيذ السلوك.", "هل أنهيت السلوك المطلوب؟"],
        ["راجع متابعة واحدة مؤجلة.", "أرسل متابعة قصيرة بهدف وخطوة تالية واضحة.", "هل أصبحت المتابعة محددة؟"],
        ["اختر فرصة عالقة.", "اطلب قرارًا أو موعدًا أو معلومة ناقصة بدل الانتظار.", "هل تحركت الفرصة؟"],
        ["اكتب اعتراضين محتملين.", "ازرع الدليل قبل أن يطرح العميل الاعتراض.", "هل منعت مقاومة قبل ظهورها؟"],
        ["راجع صفقة لم تتحرك.", "حدد السبب الحقيقي: ألم، ثقة، قيمة، وقت، أو قرار.", "هل عرفت العائق الحقيقي؟"],
        ["نظّف يومك من نشاط منخفض القيمة.", "انقل وقتًا واحدًا إلى فرصة أعلى احتمالًا.", "هل حميت ساعة بيع مهمة؟"],
        ["اختم محادثة بخطوة مؤرخة.", "لا تترك المحادثة بكلمة سنتابع فقط.", "هل توجد خطوة تالية بتاريخ؟"],
        ["راجع أقوى عادة بنيتها.", "كررها في موقفين اليوم.", "هل أصبحت أسهل من الأسبوع الأول؟"],
        ["راجع أضعف عادة ما زالت تقاومك.", "طبّق نسخة صغيرة منها مرة واحدة فقط.", "هل كسرت المقاومة؟"],
        ["اكتب درسًا واحدًا من آخر 70 يومًا.", "حوّل الدرس إلى قاعدة عمل يومية.", "هل القاعدة قابلة للتطبيق؟"],
        ["اختر عميلًا يحتاج قيمة أوضح.", "اشرح القيمة بلغة مشكلة ونتيجة لا بلغة مزايا.", "هل فهم العميل القيمة ببساطة؟"],
        ["راجع خط أنابيبك.", "ضع علامة على كل فرصة: تتحرك، عالقة، أو يجب إغلاقها.", "هل أصبحت الأولويات واضحة؟"],
        ["درّب نفسك على لا واضح.", "اطلب جوابًا واضحًا من فرصة غامضة بأدب.", "هل قلّ الغموض؟"],
        ["اكتب معيارك الشخصي للبيع الجيد.", "طبّقه في تواصل واحد اليوم.", "هل كان أداؤك مقصودًا؟"],
        ["راجع أفضل محادثة في الأسبوع.", "كرر عنصرًا واحدًا منها اليوم.", "هل استطعت إعادة القوة؟"],
        ["راجع أسوأ محادثة في الأسبوع.", "أعد كتابة لحظة واحدة منها بشكل أفضل.", "هل عرفت ما ستغيره؟"],
        ["ثبت روتين ما قبل البيع.", "قبل كل تواصل: هدف، سؤال، دليل، خطوة تالية.", "هل دخلت أكثر استعدادًا؟"],
        ["ثبت روتين ما بعد البيع.", "بعد كل تواصل: ما حدث، ما المعنى، ما الخطوة.", "هل أصبح التعلم أسرع؟"],
        ["اكتب خطة الأسبوع القادم.", "اختر 3 سلوكيات فقط لتحميها وتكررها.", "هل لديك نظام يستمر بعد اليوم 90؟"],
      ]
    : [
        ["Review your daily plan before the first outreach.", "Choose one important opportunity and apply the strongest behavior from this plan.", "Did you start with clarity instead of reaction?"],
        ["Write one behavioral target for the day.", "Measure the day by process completion, not mood.", "Did you complete the behavior?"],
        ["Review one delayed follow-up.", "Send a short follow-up with purpose and a clear next step.", "Did the follow-up become specific?"],
        ["Choose one stuck opportunity.", "Ask for a decision, date, or missing information instead of waiting.", "Did the opportunity move?"],
        ["Write two likely objections.", "Plant proof before the buyer raises the objection.", "Did you prevent resistance before it appeared?"],
        ["Review one stalled deal.", "Name the real barrier: pain, trust, value, timing, or decision.", "Do you know the real obstacle now?"],
        ["Remove one low-value activity from the day.", "Move that time to a higher-probability opportunity.", "Did you protect one real selling hour?"],
        ["End one conversation with a dated next step.", "Do not leave it at vague follow-up language.", "Is there a next step with a date?"],
        ["Review the strongest habit you built.", "Repeat it in two situations today.", "Is it easier than it was in week one?"],
        ["Review the weak habit that still resists you.", "Practice a small version of it once today.", "Did you break the resistance?"],
        ["Write one lesson from the last 70 days.", "Turn the lesson into one daily operating rule.", "Can you apply the rule tomorrow?"],
        ["Choose one buyer who needs clearer value.", "Explain value through problem and outcome, not features.", "Can the buyer explain the value simply?"],
        ["Review your pipeline.", "Mark each opportunity as moving, stuck, or should be closed.", "Are your priorities clearer?"],
        ["Practice a clean no.", "Ask a vague opportunity for a clear answer politely.", "Did uncertainty decrease?"],
        ["Write your personal standard for a good sales day.", "Apply it in one interaction today.", "Was your performance intentional?"],
        ["Review your best conversation this week.", "Repeat one strong element from it today.", "Could you reproduce the strength?"],
        ["Review your worst conversation this week.", "Rewrite one moment from it in a better way.", "Do you know what you will change?"],
        ["Stabilize your pre-sale routine.", "Before each interaction: goal, question, proof, next step.", "Did you enter better prepared?"],
        ["Stabilize your post-sale routine.", "After each interaction: what happened, what it means, next step.", "Did learning become faster?"],
        ["Write next week's plan.", "Choose only 3 behaviors to protect and repeat.", "Do you have a system that survives after day 90?"],
      ];

  const days: SalesFitnessDay[] = [];

  for (let i = 0; i < 42; i++) {
    const row = weak[Math.floor(i / 7) % weak.length];
    const focus = row?.label || fallbackFocus;
    const drills = getOutdoorSalesFitnessDrills(row?.competencyId, ar);
    const drill = drills[i % drills.length];
    days.push({
      day: i + 1,
      phase: ar ? "المرحلة 1: تقوية أضعف العضلات" : "Phase 1: Strengthen the Weakest Muscles",
      week: Math.floor(i / 7) + 1,
      focus,
      microAction: drill.microAction,
      fieldExercise: drill.fieldExercise,
      checkpoint: drill.checkpoint,
    });
  }

  for (let i = 0; i < 28; i++) {
    const focus = weak[i % weak.length]?.label || fallbackFocus;
    const template = integrationTemplates[i % integrationTemplates.length];
    days.push({
      day: i + 43,
      phase: ar ? "المرحلة 2: دمج الضعف مع القوة" : "Phase 2: Integrate Weak Muscles with Leverage",
      week: Math.floor((i + 42) / 7) + 1,
      focus,
      microAction: template.micro(focus, leverageFocus),
      fieldExercise: template.field(),
      checkpoint: template.check,
    });
  }

  for (let i = 0; i < 20; i++) {
    const focus = i % 2 === 0 ? leverageFocus : weak[i % weak.length]?.label || fallbackFocus;
    const [microAction, fieldExercise, checkpoint] = executionTemplates[i];
    days.push({
      day: i + 71,
      phase: ar ? "المرحلة 3: التنفيذ والتثبيت" : "Phase 3: Execute, Repeat, and Stabilize",
      week: Math.floor((i + 70) / 7) + 1,
      focus,
      microAction,
      fieldExercise,
      checkpoint,
    });
  }

  return days;
}

type LawyerMriCompetencyKey =
  | "legal_inquiry_handling"
  | "consultation_opening_control"
  | "legal_need_diagnosis"
  | "case_qualification_client_fit"
  | "client_trust_professional_authority"
  | "explaining_legal_strategy_simply"
  | "legal_value_framing"
  | "fee_presentation_retainer_confidence"
  | "fee_comparison_objections"
  | "trust_risk_outcome_objections"
  | "ethical_persuasion_boundaries"
  | "consultation_closing_engagement"
  | "post_consultation_follow_up"
  | "emotional_difficult_clients"
  | "client_experience_referral_growth";

const LAWYER_MRI_COMPETENCY_KEYS: LawyerMriCompetencyKey[] = [
  "legal_inquiry_handling",
  "consultation_opening_control",
  "legal_need_diagnosis",
  "case_qualification_client_fit",
  "client_trust_professional_authority",
  "explaining_legal_strategy_simply",
  "legal_value_framing",
  "fee_presentation_retainer_confidence",
  "fee_comparison_objections",
  "trust_risk_outcome_objections",
  "ethical_persuasion_boundaries",
  "consultation_closing_engagement",
  "post_consultation_follow_up",
  "emotional_difficult_clients",
  "client_experience_referral_growth",
];

const LAWYER_TREATMENT_DRILLS: Record<LawyerMriCompetencyKey, { en: LawyerTreatmentDrill[]; ar: LawyerTreatmentDrill[] }> = {
  legal_inquiry_handling: {
    en: [
      { microAction: "Write a 4-question intake filter for one new inquiry.", consultationDrill: "Before discussing the file, ask about matter type, urgency, parties involved, and expected decision date.", checkpoint: "Did you know whether the inquiry deserved a full consultation?" },
      { microAction: "Prepare one calm response for callers who demand instant advice.", consultationDrill: "Use it to move the caller into a structured consultation instead of giving rushed guidance.", checkpoint: "Did you protect professional boundaries before giving direction?" },
      { microAction: "Create one conflict-check prompt for inbound inquiries.", consultationDrill: "Ask for the names of relevant parties before hearing sensitive details.", checkpoint: "Was the inquiry screened before confidential detail expanded?" },
      { microAction: "Write one sentence that explains what the consultation can and cannot cover.", consultationDrill: "Use it at the start of the next inquiry call.", checkpoint: "Did the client understand the consultation boundary?" },
      { microAction: "Prepare a note template for inquiry source, issue, urgency, and next step.", consultationDrill: "Complete it during one inquiry instead of relying on memory.", checkpoint: "Could another professional understand the matter from your note?" },
      { microAction: "Identify one inquiry that should be redirected or declined early.", consultationDrill: "Explain the boundary professionally and point to the appropriate next route.", checkpoint: "Did you avoid taking in a poor-fit matter?" },
      { microAction: "Set one standard inquiry response time for today.", consultationDrill: "Respond within that window with either a consultation path or a clear boundary.", checkpoint: "Was every inquiry moved to a defined next step?" },
    ],
    ar: [
      { microAction: "اكتب فلتر استقبال من 4 أسئلة لاستفسار قانوني جديد.", consultationDrill: "قبل مناقشة الملف، اسأل عن نوع المسألة، درجة الاستعجال، الأطراف المعنية، وموعد القرار المتوقع.", checkpoint: "هل عرفت إن كان الاستفسار يستحق استشارة كاملة؟" },
      { microAction: "حضّر ردًا هادئًا لمن يطلب نصيحة فورية عبر الاتصال.", consultationDrill: "استخدمه لنقل المتصل إلى استشارة منظمة بدل إعطاء توجيه متسرع.", checkpoint: "هل حميت الحدود المهنية قبل تقديم أي توجيه؟" },
      { microAction: "أنشئ سؤال فحص تعارض مصالح للاستفسارات الواردة.", consultationDrill: "اطلب أسماء الأطراف ذات الصلة قبل سماع تفاصيل حساسة.", checkpoint: "هل تم فحص الاستفسار قبل توسع التفاصيل السرية؟" },
      { microAction: "اكتب جملة توضح ما تغطيه الاستشارة وما لا تغطيه.", consultationDrill: "استخدمها في بداية الاستفسار التالي.", checkpoint: "هل فهم العميل حدود الاستشارة؟" },
      { microAction: "حضّر قالب ملاحظة يتضمن مصدر الاستفسار، المسألة، الاستعجال، والخطوة التالية.", consultationDrill: "املأه أثناء استفسار واحد بدل الاعتماد على الذاكرة.", checkpoint: "هل يستطيع مهني آخر فهم المسألة من ملاحظتك؟" },
      { microAction: "حدد استفسارًا واحدًا يجب توجيهه أو رفضه مبكرًا.", consultationDrill: "اشرح الحد المهني بوضوح ووجّه العميل إلى المسار الأنسب.", checkpoint: "هل تجنبت إدخال ملف غير مناسب؟" },
      { microAction: "حدد زمن استجابة معياريًا للاستفسارات اليوم.", consultationDrill: "استجب ضمن هذا الزمن بمسار استشارة واضح أو حد مهني واضح.", checkpoint: "هل انتقل كل استفسار إلى خطوة محددة؟" },
    ],
  },
  consultation_opening_control: {
    en: [
      { microAction: "Write a 60-second opening script for your next consultation.", consultationDrill: "Start with purpose, agenda, confidentiality boundary, and decision path.", checkpoint: "Did the client know how the consultation would run?" },
      { microAction: "Prepare three agenda items before the client speaks in detail.", consultationDrill: "Name the agenda and ask permission to guide the sequence.", checkpoint: "Did you lead the structure without sounding controlling?" },
      { microAction: "Create one interruption phrase for clients who jump between facts.", consultationDrill: "Use it to pause, sequence the facts, and return to the legal issue.", checkpoint: "Did the conversation become easier to follow?" },
      { microAction: "Define the consultation outcome before the meeting starts.", consultationDrill: "Say whether the goal is assessment, legal options, next step, or readiness for the appropriate legal path.", checkpoint: "Did the consultation have a clear destination?" },
      { microAction: "Prepare a time-frame statement for long stories.", consultationDrill: "Tell the client how you will use the available time and when you will ask clarifying questions.", checkpoint: "Did time stay protected?" },
      { microAction: "Write one authority-building opening line without boasting.", consultationDrill: "Use professional calm, process clarity, and listening discipline.", checkpoint: "Did authority come from structure rather than ego?" },
      { microAction: "Close the opening by confirming the client’s main concern.", consultationDrill: "Reflect the issue in one sentence before moving into diagnosis.", checkpoint: "Did the client feel heard before analysis began?" },
    ],
    ar: [
      { microAction: "اكتب افتتاحية مدتها 60 ثانية للاستشارة التالية.", consultationDrill: "ابدأ بالهدف، جدول الاستشارة، حدود السرية، ومسار القرار المهني.", checkpoint: "هل عرف العميل كيف ستسير الاستشارة؟" },
      { microAction: "حضّر ثلاثة محاور قبل أن يدخل العميل في التفاصيل.", consultationDrill: "اذكر المحاور واطلب الإذن بقيادة التسلسل.", checkpoint: "هل قدت الهيكل دون أن تبدو متسلطًا؟" },
      { microAction: "أنشئ عبارة مقاطعة مهنية عندما ينتقل العميل بين الوقائع.", consultationDrill: "استخدمها لإيقاف التشتت، ترتيب الوقائع، والعودة للمسألة القانونية.", checkpoint: "هل أصبحت المحادثة أسهل في المتابعة؟" },
      { microAction: "حدد نتيجة الاستشارة قبل بدايتها.", consultationDrill: "وضح إن كان الهدف تقييمًا، خيارات قانونية، خطوة تالية، أو جاهزية للمسار القانوني المناسب.", checkpoint: "هل كان للاستشارة اتجاه واضح؟" },
      { microAction: "حضّر جملة لإدارة الوقت عندما يطول السرد.", consultationDrill: "اشرح للعميل كيف ستستخدم الوقت ومتى ستطرح أسئلة توضيحية.", checkpoint: "هل بقي الوقت محميًا؟" },
      { microAction: "اكتب افتتاحية تبني الهيبة المهنية دون مبالغة.", consultationDrill: "استخدم الهدوء المهني، وضوح العملية، وانضباط الاستماع.", checkpoint: "هل جاءت الهيبة من الهيكل لا من الاستعراض؟" },
      { microAction: "اختم الافتتاح بتأكيد القلق الأساسي لدى العميل.", consultationDrill: "اعكس المسألة في جملة واحدة قبل الانتقال للتشخيص.", checkpoint: "هل شعر العميل أنه مسموع قبل بدء التحليل؟" },
    ],
  },
  legal_need_diagnosis: {
    en: [
      { microAction: "Ask the client: What changed recently that made this urgent now?", consultationDrill: "Listen for trigger, risk, deadline, or pressure point before giving options.", checkpoint: "Did you identify the real reason for action?" },
      { microAction: "Write one question that separates symptoms from the legal issue.", consultationDrill: "Ask what outcome the client needs, not only what happened.", checkpoint: "Did the need become clearer than the story?" },
      { microAction: "Ask what happens if the matter remains unresolved for 90 days.", consultationDrill: "Capture practical, legal, and emotional consequences.", checkpoint: "Did the client name the cost of delay?" },
      { microAction: "Identify all decision stakeholders in one consultation.", consultationDrill: "Ask who else must approve, cooperate, or provide documents.", checkpoint: "Did you uncover hidden decision pressure?" },
      { microAction: "Summarize the legal need in one sentence before advising.", consultationDrill: "Say, 'The core issue I hear is...' and let the client correct it.", checkpoint: "Did the client confirm your diagnosis?" },
      { microAction: "Ask for the document or fact most likely to change the advice.", consultationDrill: "Pause analysis until the critical fact is clarified.", checkpoint: "Did you avoid premature conclusions?" },
      { microAction: "Rank the client’s concerns by legal risk, urgency, and desired outcome.", consultationDrill: "Show the ranking back to the client before proposing a route.", checkpoint: "Did the client see the order of priorities?" },
    ],
    ar: [
      { microAction: "اسأل العميل: ما الذي تغيّر مؤخرًا وجعل الأمر عاجلًا الآن؟", consultationDrill: "استمع للمحفز، المخاطر، الموعد النهائي، أو نقطة الضغط قبل عرض الخيارات.", checkpoint: "هل حددت السبب الحقيقي للتحرك؟" },
      { microAction: "اكتب سؤالًا يفرق بين الأعراض والمسألة القانونية.", consultationDrill: "اسأل عن النتيجة التي يحتاجها العميل، لا عن ما حدث فقط.", checkpoint: "هل أصبحت الحاجة أوضح من القصة؟" },
      { microAction: "اسأل ماذا يحدث إذا بقيت المسألة بلا حل لمدة 90 يومًا.", consultationDrill: "التقط العواقب العملية والقانونية والشعورية.", checkpoint: "هل سمّى العميل أثر التأخير؟" },
      { microAction: "حدد كل أصحاب القرار في استشارة واحدة.", consultationDrill: "اسأل من يجب أن يوافق أو يتعاون أو يقدم مستندات.", checkpoint: "هل كشفت ضغط قرار غير ظاهر؟" },
      { microAction: "لخص الحاجة القانونية في جملة واحدة قبل تقديم الرأي.", consultationDrill: "قل: المسألة الأساسية التي أسمعها هي... واترك العميل يصححها.", checkpoint: "هل أكد العميل تشخيصك؟" },
      { microAction: "اطلب المستند أو الواقعة الأكثر تأثيرًا في التوجيه القانوني.", consultationDrill: "أوقف التحليل حتى تتضح الواقعة الحرجة.", checkpoint: "هل تجنبت الاستنتاج المتسرع؟" },
      { microAction: "رتب مخاوف العميل حسب المخاطر القانونية والاستعجال والنتيجة المطلوبة.", consultationDrill: "اعرض الترتيب على العميل قبل اقتراح المسار.", checkpoint: "هل رأى العميل ترتيب الأولويات؟" },
    ],
  },
  case_qualification_client_fit: {
    en: [
      { microAction: "Write your minimum fit criteria for accepting a matter.", consultationDrill: "Check matter type, evidence, urgency, client cooperation, and scope fit.", checkpoint: "Did the matter meet your professional intake standard?" },
      { microAction: "Prepare one respectful decline sentence for poor-fit matters.", consultationDrill: "Use it when the issue falls outside your practice or risk tolerance.", checkpoint: "Did you protect the firm without embarrassing the client?" },
      { microAction: "Identify one red flag before proposing representation.", consultationDrill: "Ask about deadlines, prior counsel, missing documents, or unrealistic expectations.", checkpoint: "Was the risk visible before commitment?" },
      { microAction: "Ask what the client expects from the lawyer-client relationship.", consultationDrill: "Listen for cooperation, responsiveness, decision style, and boundary issues.", checkpoint: "Did you understand client fit beyond the legal issue?" },
      { microAction: "Create a matter-fit note with accept, pause, refer, or decline.", consultationDrill: "Classify one consultation immediately after it ends.", checkpoint: "Was the next route professionally clear?" },
      { microAction: "Ask what evidence the client can provide this week.", consultationDrill: "Tie case viability to available proof, not only the client’s narrative.", checkpoint: "Did evidence support the matter?" },
      { microAction: "Define one boundary that must exist before the next legal step.", consultationDrill: "State it calmly before discussing the professional agreement.", checkpoint: "Did the client accept the working boundary?" },
    ],
    ar: [
      { microAction: "اكتب معاييرك الدنيا لقبول ملف جديد.", consultationDrill: "افحص نوع المسألة، الأدلة، الاستعجال، تعاون العميل، وملاءمة نطاق العمل.", checkpoint: "هل يطابق الملف معيار القبول المهني؟" },
      { microAction: "حضّر جملة اعتذار محترمة للملفات غير المناسبة.", consultationDrill: "استخدمها عندما تكون المسألة خارج تخصصك أو مستوى المخاطر المقبول.", checkpoint: "هل حميت المكتب دون إحراج العميل؟" },
      { microAction: "حدد علامة خطر واحدة قبل اقتراح المسار القانوني.", consultationDrill: "اسأل عن المواعيد، محام سابق، مستندات مفقودة، أو توقعات غير واقعية.", checkpoint: "هل ظهرت المخاطر قبل قرار الاستمرار؟" },
      { microAction: "اسأل العميل ماذا يتوقع من علاقة المحامي والعميل.", consultationDrill: "استمع للتعاون، سرعة الاستجابة، أسلوب القرار، ومشكلات الحدود.", checkpoint: "هل فهمت ملاءمة العميل خارج المسألة القانونية؟" },
      { microAction: "أنشئ ملاحظة ملاءمة: قبول، توقف، إحالة، أو اعتذار.", consultationDrill: "صنّف استشارة واحدة فور انتهائها.", checkpoint: "هل أصبح المسار التالي واضحًا مهنيًا؟" },
      { microAction: "اسأل عن الدليل الذي يستطيع العميل توفيره هذا الأسبوع.", consultationDrill: "اربط جدوى الملف بالأدلة المتاحة لا بسرد العميل فقط.", checkpoint: "هل يدعم الدليل المسألة؟" },
      { microAction: "حدد حدًا مهنيًا واحدًا يجب وجوده قبل الخطوة القانونية التالية.", consultationDrill: "اذكره بهدوء قبل مناقشة الإجراء المناسب.", checkpoint: "هل قبل العميل حد العمل؟" },
    ],
  },
  client_trust_professional_authority: {
    en: [
      { microAction: "Prepare one credibility statement based on process, not self-praise.", consultationDrill: "Explain how you assess matters, protect risk, and guide decisions.", checkpoint: "Did trust come from method and clarity?" },
      { microAction: "Write one sentence that acknowledges client concern without overpromising.", consultationDrill: "Use it before explaining the legal path.", checkpoint: "Did empathy protect authority instead of weakening it?" },
      { microAction: "Choose one point where you will slow down your explanation.", consultationDrill: "Pause after the key risk and ask the client to reflect it back.", checkpoint: "Did the client understand the risk?" },
      { microAction: "Prepare a boundary phrase for requests outside professional responsibility.", consultationDrill: "Use the phrase while offering an appropriate alternative.", checkpoint: "Did the boundary increase trust?" },
      { microAction: "Document one promise you will not make.", consultationDrill: "Replace it with a process commitment you can honor.", checkpoint: "Did you avoid certainty you cannot ethically provide?" },
      { microAction: "Create one visual sequence for the matter path.", consultationDrill: "Show the client the stages from assessment to decision.", checkpoint: "Did the process reduce anxiety?" },
      { microAction: "End one consultation by summarizing facts, risk, route, and next step.", consultationDrill: "Confirm each point with the client before ending the consultation.", checkpoint: "Did the client leave with confidence in the structure?" },
    ],
    ar: [
      { microAction: "حضّر جملة مصداقية مبنية على المنهج لا على مدح الذات.", consultationDrill: "اشرح كيف تقيّم الملفات، تحمي من المخاطر، وتوجه القرارات.", checkpoint: "هل جاءت الثقة من المنهج والوضوح؟" },
      { microAction: "اكتب جملة تعترف بقلق العميل دون وعود زائدة.", consultationDrill: "استخدمها قبل شرح المسار القانوني.", checkpoint: "هل دعمت التعاطف الهيبة بدل إضعافها؟" },
      { microAction: "اختر نقطة واحدة ستبطئ عند شرحها.", consultationDrill: "توقف بعد المخاطر الأساسية واطلب من العميل إعادة فهمها.", checkpoint: "هل فهم العميل المخاطر؟" },
      { microAction: "حضّر عبارة حدود للطلبات خارج المسؤولية المهنية.", consultationDrill: "استخدم العبارة مع تقديم بديل مناسب.", checkpoint: "هل زاد الحد المهني الثقة؟" },
      { microAction: "وثّق وعدًا واحدًا لن تقدمه.", consultationDrill: "استبدله بتعهد إجرائي تستطيع الوفاء به.", checkpoint: "هل تجنبت يقينًا لا تستطيع تقديمه مهنيًا؟" },
      { microAction: "أنشئ تسلسلًا بصريًا بسيطًا لمسار الملف.", consultationDrill: "اعرض للعميل المراحل من التقييم إلى القرار.", checkpoint: "هل خفف وضوح المسار القلق؟" },
      { microAction: "اختم استشارة واحدة بتلخيص الوقائع والمخاطر والمسار والخطوة التالية.", consultationDrill: "أكد كل نقطة مع العميل قبل الإغلاق.", checkpoint: "هل خرج العميل بثقة في الهيكل؟" },
    ],
  },
  explaining_legal_strategy_simply: {
    en: [
      { microAction: "Translate one legal concept into plain client language.", consultationDrill: "Explain it without jargon, then ask the client what it means for their matter.", checkpoint: "Could the client repeat the idea accurately?" },
      { microAction: "Prepare a three-step legal strategy explanation.", consultationDrill: "Use: current position, legal route, expected decision point.", checkpoint: "Did the client see the strategy instead of fragments?" },
      { microAction: "Write one analogy that simplifies risk without minimizing it.", consultationDrill: "Use it only after explaining the legal substance.", checkpoint: "Did the analogy clarify rather than distract?" },
      { microAction: "Separate facts, legal issue, options, and next step on one page.", consultationDrill: "Walk the client through the four sections.", checkpoint: "Did the structure make the advice easier to follow?" },
      { microAction: "Prepare one sentence that explains uncertainty professionally.", consultationDrill: "Name what is known, what is unknown, and what must be verified.", checkpoint: "Did uncertainty feel managed?" },
      { microAction: "Ask the client to choose between two lawful routes after explanation.", consultationDrill: "Compare route, risk, effort, and decision requirement.", checkpoint: "Did the client understand the tradeoff?" },
      { microAction: "Record a 45-second explanation of one matter strategy.", consultationDrill: "Listen for jargon, length, and unclear sequencing before your next consultation.", checkpoint: "Was the explanation concise enough for a stressed client?" },
    ],
    ar: [
      { microAction: "حوّل مفهومًا قانونيًا واحدًا إلى لغة عميل بسيطة.", consultationDrill: "اشرحه دون مصطلحات ثقيلة، ثم اسأل العميل ماذا يعني ذلك لملفه.", checkpoint: "هل يستطيع العميل إعادة الفكرة بدقة؟" },
      { microAction: "حضّر شرحًا للاستراتيجية القانونية من ثلاث خطوات.", consultationDrill: "استخدم: الوضع الحالي، المسار القانوني، نقطة القرار المتوقعة.", checkpoint: "هل رأى العميل الاستراتيجية لا أجزاء متفرقة؟" },
      { microAction: "اكتب تشبيهًا يبسّط المخاطر دون التقليل منها.", consultationDrill: "استخدمه فقط بعد شرح الأساس القانوني.", checkpoint: "هل وضّح التشبيه الفكرة بدل تشتيتها؟" },
      { microAction: "افصل الوقائع، المسألة القانونية، الخيارات، والخطوة التالية في صفحة واحدة.", consultationDrill: "امشِ مع العميل عبر الأقسام الأربعة.", checkpoint: "هل جعل الهيكل الرأي أسهل في الفهم؟" },
      { microAction: "حضّر جملة تشرح عدم اليقين بطريقة مهنية.", consultationDrill: "اذكر ما هو معروف، وما هو غير معروف، وما يجب التحقق منه.", checkpoint: "هل بدا عدم اليقين مُدارًا؟" },
      { microAction: "اطلب من العميل الاختيار بين مسارين قانونيين بعد الشرح.", consultationDrill: "قارن المسار، المخاطر، الجهد، ومتطلبات القرار.", checkpoint: "هل فهم العميل المفاضلة؟" },
      { microAction: "سجّل شرحًا مدته 45 ثانية لاستراتيجية ملف واحد.", consultationDrill: "استمع للمصطلحات الثقيلة، الطول، وضعف التسلسل قبل الاستشارة التالية.", checkpoint: "هل كان الشرح مختصرًا بما يكفي لعميل متوتر؟" },
    ],
  },
  legal_value_framing: {
    en: [
      { microAction: "Write the legal value of one matter as risk reduced, decision improved, or harm prevented.", consultationDrill: "Use that frame before discussing professional legal fees.", checkpoint: "Did the client connect the work to a meaningful outcome?" },
      { microAction: "Prepare one before-and-after statement for legal representation.", consultationDrill: "Show the client the difference between acting alone and acting with structured counsel.", checkpoint: "Did the client see the value of guidance?" },
      { microAction: "List three consequences of an unmanaged legal issue.", consultationDrill: "Discuss the most relevant consequence in the consultation.", checkpoint: "Did the client understand what is being protected?" },
      { microAction: "Turn one legal task into a client outcome.", consultationDrill: "Explain the task through clarity, risk control, leverage, or decision quality.", checkpoint: "Did the work feel tied to client benefit?" },
      { microAction: "Prepare one proof story from a similar matter without revealing confidential detail.", consultationDrill: "Use it to show process value, not guaranteed result.", checkpoint: "Did the example build trust ethically?" },
      { microAction: "Ask which outcome matters most: speed, protection, leverage, closure, or certainty.", consultationDrill: "Use the answer to frame the legal path.", checkpoint: "Did the value match the client’s priority?" },
      { microAction: "Write a one-sentence value summary before discussing the next legal step.", consultationDrill: "Say what the client gains in clarity, protection, and next-step control.", checkpoint: "Did the client understand the reason to proceed?" },
    ],
    ar: [
      { microAction: "اكتب قيمة ملف قانوني واحد كخفض مخاطر أو تحسين قرار أو منع ضرر.", consultationDrill: "استخدم هذا الإطار قبل مناقشة أتعاب المحاماة.", checkpoint: "هل ربط العميل العمل بنتيجة مهمة؟" },
      { microAction: "حضّر جملة قبل وبعد للتمثيل القانوني.", consultationDrill: "أظهر الفرق بين التصرف منفردًا والتصرف مع إرشاد قانوني منظم.", checkpoint: "هل رأى العميل قيمة التوجيه؟" },
      { microAction: "اكتب ثلاث عواقب لمسألة قانونية غير مُدارة.", consultationDrill: "ناقش العاقبة الأكثر صلة أثناء الاستشارة.", checkpoint: "هل فهم العميل ما الذي تتم حمايته؟" },
      { microAction: "حوّل مهمة قانونية واحدة إلى نتيجة للعميل.", consultationDrill: "اشرح المهمة من خلال الوضوح أو ضبط المخاطر أو قوة الموقف أو جودة القرار.", checkpoint: "هل ارتبط العمل بمنفعة العميل؟" },
      { microAction: "حضّر قصة إثبات من ملف مشابه دون كشف تفاصيل سرية.", consultationDrill: "استخدمها لإظهار قيمة المنهج لا لضمان نتيجة.", checkpoint: "هل بنى المثال الثقة بشكل مهني؟" },
      { microAction: "اسأل أي نتيجة تهم العميل أكثر: السرعة، الحماية، قوة الموقف، الإغلاق، أو اليقين.", consultationDrill: "استخدم الإجابة لتأطير المسار القانوني.", checkpoint: "هل تطابقت القيمة مع أولوية العميل؟" },
      { microAction: "اكتب ملخص قيمة من جملة واحدة قبل نقاش الخطوة القانونية التالية.", consultationDrill: "قل ما يكسبه العميل من وضوح وحماية وسيطرة على الخطوة التالية.", checkpoint: "هل فهم العميل سبب التقدم؟" },
    ],
  },
  fee_presentation_retainer_confidence: {
    en: [
      { microAction: "Prepare a professional legal-fee explanation tied to scope of work.", consultationDrill: "Present scope, responsibilities, payment terms, and the appropriate legal procedure in one sequence.", checkpoint: "Did the discussion feel structured and confident?" },
      { microAction: "Write one sentence that separates legal fees from outcome promises.", consultationDrill: "Explain that fees cover professional work, analysis, preparation, and representation within scope.", checkpoint: "Did you avoid implying a guaranteed result?" },
      { microAction: "Create a scope checklist before discussing the next legal step.", consultationDrill: "Confirm what is included, what is excluded, and what requires separate approval.", checkpoint: "Did the client understand the boundary of work?" },
      { microAction: "Practice saying the professional legal fees without apology.", consultationDrill: "Pause after stating them and let the client process the information.", checkpoint: "Did you stay calm during silence?" },
      { microAction: "Prepare one response for: I need to think about it.", consultationDrill: "Ask what part of the scope, risk, or decision needs clarification.", checkpoint: "Did you uncover the real hesitation?" },
      { microAction: "Write the next administrative step after verbal approval.", consultationDrill: "Move to the appropriate professional procedure, required documents, and first action.", checkpoint: "Did verbal interest become a defined process?" },
      { microAction: "Review one past consultation where fees felt uncomfortable.", consultationDrill: "Rewrite the explanation around scope, legal risk, and client decision quality.", checkpoint: "Is the new explanation more professional?" },
    ],
    ar: [
      { microAction: "حضّر شرحًا لأتعاب المحاماة مرتبطًا بنطاق العمل.", consultationDrill: "اعرض النطاق، المسؤوليات، شروط السداد، والإجراء القانوني المناسب في تسلسل واحد.", checkpoint: "هل بدا النقاش منظمًا وواثقًا؟" },
      { microAction: "اكتب جملة تفصل أتعاب المحاماة عن وعود النتائج.", consultationDrill: "اشرح أن الأتعاب تغطي العمل المهني والتحليل والتحضير ضمن النطاق.", checkpoint: "هل تجنبت الإيحاء بضمان نتيجة؟" },
      { microAction: "أنشئ قائمة نطاق قبل مناقشة الخطوة القانونية التالية.", consultationDrill: "أكد ما هو داخل النطاق، ما هو خارجه، وما يحتاج موافقة منفصلة.", checkpoint: "هل فهم العميل حدود العمل؟" },
      { microAction: "تدرّب على ذكر أتعاب المحاماة دون اعتذار.", consultationDrill: "توقف بعد ذكرها ودع العميل يستوعب المعلومة.", checkpoint: "هل بقيت هادئًا أثناء الصمت؟" },
      { microAction: "حضّر ردًا على: أحتاج أن أفكر.", consultationDrill: "اسأل أي جزء من النطاق أو المخاطر أو القرار يحتاج توضيحًا.", checkpoint: "هل كشفت التردد الحقيقي؟" },
      { microAction: "اكتب الخطوة الإدارية التالية بعد الموافقة الشفهية.", consultationDrill: "انتقل إلى الإجراء المهني المناسب، المستندات المطلوبة، وأول إجراء.", checkpoint: "هل أصبحت الرغبة الشفهية عملية محددة؟" },
      { microAction: "راجع استشارة سابقة شعرت فيها بعدم ارتياح عند شرح الأتعاب.", consultationDrill: "أعد صياغة الشرح حول النطاق والمخاطر القانونية وجودة قرار العميل.", checkpoint: "هل أصبح الشرح أكثر مهنية؟" },
    ],
  },
  fee_comparison_objections: {
    en: [
      { microAction: "Write one calm response when a client compares professional legal fees with another provider.", consultationDrill: "Bring the conversation back to scope, experience, responsibility, and risk control.", checkpoint: "Did you avoid defending yourself emotionally?" },
      { microAction: "Prepare a scope-comparison table with three categories.", consultationDrill: "Compare included work, excluded work, and client responsibilities.", checkpoint: "Did the client compare scope rather than numbers alone?" },
      { microAction: "Ask what the client believes is included in the other offer.", consultationDrill: "Clarify assumptions before responding.", checkpoint: "Did you uncover an incomplete comparison?" },
      { microAction: "Explain the risk of choosing unclear representation terms.", consultationDrill: "Discuss documentation, responsibility, communication, and decision support.", checkpoint: "Did the client see the risk of vague scope?" },
      { microAction: "Prepare one non-defensive phrase for fee pressure.", consultationDrill: "Say what you can responsibly include, then stop negotiating against yourself.", checkpoint: "Did you protect professional authority?" },
      { microAction: "Offer a scope adjustment only if it is professionally sound.", consultationDrill: "Reduce or phase work by scope, not by weakening responsibility.", checkpoint: "Did the adjustment preserve quality and boundaries?" },
      { microAction: "Ask whether the client wants the lowest commitment or the most appropriate legal path.", consultationDrill: "Use the answer to guide the decision conversation.", checkpoint: "Did the client clarify decision criteria?" },
    ],
    ar: [
      { microAction: "اكتب ردًا هادئًا عندما يقارن العميل أتعاب المحاماة بمقدم خدمة آخر.", consultationDrill: "أعد الحديث إلى النطاق، الخبرة، المسؤولية، وضبط المخاطر.", checkpoint: "هل تجنبت الدفاع العاطفي عن نفسك؟" },
      { microAction: "حضّر جدول مقارنة نطاق من ثلاث خانات.", consultationDrill: "قارن العمل المشمول، العمل غير المشمول، ومسؤوليات العميل.", checkpoint: "هل قارن العميل النطاق لا الأرقام وحدها؟" },
      { microAction: "اسأل العميل عمّا يعتقد أنه مشمول في العرض الآخر.", consultationDrill: "وضح الافتراضات قبل الرد.", checkpoint: "هل كشفت مقارنة ناقصة؟" },
      { microAction: "اشرح مخاطر اختيار شروط تمثيل غير واضحة.", consultationDrill: "ناقش التوثيق، المسؤولية، التواصل، ودعم القرار.", checkpoint: "هل رأى العميل مخاطر النطاق الغامض؟" },
      { microAction: "حضّر عبارة غير دفاعية عند الضغط على الأتعاب.", consultationDrill: "اذكر ما تستطيع إدخاله بمسؤولية، ثم توقف عن التنازل ضد نفسك.", checkpoint: "هل حميت الهيبة المهنية؟" },
      { microAction: "اقترح تعديل نطاق فقط إذا كان مهنيًا وسليمًا.", consultationDrill: "خفف أو مرحل العمل حسب النطاق، لا عبر إضعاف المسؤولية.", checkpoint: "هل حافظ التعديل على الجودة والحدود؟" },
      { microAction: "اسأل إن كان العميل يريد أقل إجراء أم المسار القانوني الأنسب.", consultationDrill: "استخدم الإجابة لتوجيه نقاش القرار.", checkpoint: "هل وضّح العميل معيار قراره؟" },
    ],
  },
  trust_risk_outcome_objections: {
    en: [
      { microAction: "List the client’s objection as trust, risk, outcome, timing, or scope.", consultationDrill: "Ask one clarifying question before answering.", checkpoint: "Did you respond to the real objection?" },
      { microAction: "Prepare a risk explanation that does not create fear.", consultationDrill: "Name the legal risk, consequence, and responsible next step.", checkpoint: "Did the client feel informed rather than pressured?" },
      { microAction: "Write a response to: Can you guarantee the result?", consultationDrill: "Separate process control from outcome uncertainty.", checkpoint: "Did you stay ethical and confident?" },
      { microAction: "Ask what would make the client comfortable moving to the next professional step.", consultationDrill: "Listen for missing clarity, authority, documents, or timing.", checkpoint: "Did you identify the decision gap?" },
      { microAction: "Use one proof point from process, not promises.", consultationDrill: "Explain how the matter will be assessed, prepared, and managed.", checkpoint: "Did proof support trust without overclaiming?" },
      { microAction: "Turn one objection into a checklist item.", consultationDrill: "Document what must be clarified before the client decides.", checkpoint: "Did the objection become manageable?" },
      { microAction: "Summarize the client’s hesitation before answering it.", consultationDrill: "Say the hesitation back in neutral professional language.", checkpoint: "Did the client feel understood before you responded?" },
    ],
    ar: [
      { microAction: "صنّف اعتراض العميل: ثقة، مخاطر، نتيجة، توقيت، أو نطاق.", consultationDrill: "اطرح سؤالًا توضيحيًا واحدًا قبل الإجابة.", checkpoint: "هل أجبت على الاعتراض الحقيقي؟" },
      { microAction: "حضّر شرحًا للمخاطر دون صناعة خوف.", consultationDrill: "اذكر المخاطر القانونية، العاقبة، والخطوة المسؤولة التالية.", checkpoint: "هل شعر العميل بالوعي لا بالضغط؟" },
      { microAction: "اكتب ردًا على: هل تضمن النتيجة؟", consultationDrill: "افصل بين ضبط العملية وعدم اليقين في النتيجة.", checkpoint: "هل بقيت مهنيًا وواثقًا؟" },
      { microAction: "اسأل ما الذي يجعل العميل مرتاحًا للانتقال إلى الخطوة المهنية التالية.", consultationDrill: "استمع لنقص الوضوح أو الثقة أو المستندات أو التوقيت.", checkpoint: "هل حددت فجوة القرار؟" },
      { microAction: "استخدم نقطة إثبات من المنهج لا من الوعود.", consultationDrill: "اشرح كيف سيتم تقييم الملف وتحضيره وإدارته.", checkpoint: "هل دعم الإثبات الثقة دون مبالغة؟" },
      { microAction: "حوّل اعتراضًا واحدًا إلى بند في قائمة تحقق.", consultationDrill: "وثّق ما يجب توضيحه قبل أن يقرر العميل.", checkpoint: "هل أصبح الاعتراض قابلًا للإدارة؟" },
      { microAction: "لخص تردد العميل قبل الرد عليه.", consultationDrill: "أعد صياغة التردد بلغة مهنية محايدة.", checkpoint: "هل شعر العميل أنك فهمته قبل الرد؟" },
    ],
  },
  ethical_persuasion_boundaries: {
    en: [
      { microAction: "Write one ethical persuasion sentence that guides without pressuring.", consultationDrill: "Connect legal risk, client goal, and responsible next step.", checkpoint: "Did the client remain free to decide?" },
      { microAction: "Identify one line you will not cross while guiding the consultation.", consultationDrill: "Replace pressure with clarity, documentation, and next-step structure.", checkpoint: "Was the decision path ethical?" },
      { microAction: "Prepare a response when a client asks for unrealistic assurance.", consultationDrill: "Acknowledge the concern and explain what can be responsibly assessed.", checkpoint: "Did you protect both trust and professional duty?" },
      { microAction: "Ask permission before recommending the next step.", consultationDrill: "Say, 'Based on what you shared, may I outline the responsible route?'", checkpoint: "Did consent strengthen the recommendation?" },
      { microAction: "Document the basis for one recommendation.", consultationDrill: "Tie it to facts, risk, scope, and client objective.", checkpoint: "Could the recommendation be justified later?" },
      { microAction: "Remove one manipulative phrase from your consultation language.", consultationDrill: "Replace urgency pressure with consequence clarity.", checkpoint: "Did the language stay professional?" },
      { microAction: "Clarify that the client owns the decision after receiving advice.", consultationDrill: "Explain options and consequences, then ask how they wish to proceed.", checkpoint: "Did guidance preserve client autonomy?" },
    ],
    ar: [
      { microAction: "اكتب جملة إقناع مهني توجه دون ضغط.", consultationDrill: "اربط المخاطر القانونية، هدف العميل، والخطوة المسؤولة التالية.", checkpoint: "هل بقي العميل حرًا في القرار؟" },
      { microAction: "حدد حدًا واحدًا لن تتجاوزه عند توجيه العميل إلى الخطوة القانونية التالية.", consultationDrill: "استبدل الضغط بالوضوح والتوثيق وهيكل الخطوة التالية.", checkpoint: "هل بقي مسار القرار أخلاقيًا؟" },
      { microAction: "حضّر ردًا عندما يطلب العميل طمأنة غير واقعية.", consultationDrill: "اعترف بالقلق واشرح ما يمكن تقييمه بمسؤولية.", checkpoint: "هل حميت الثقة والواجب المهني معًا؟" },
      { microAction: "اطلب الإذن قبل توصية الخطوة التالية.", consultationDrill: "قل: بناءً على ما ذكرته، هل تسمح لي بتوضيح المسار المسؤول؟", checkpoint: "هل عزز الإذن قوة التوصية؟" },
      { microAction: "وثّق أساس توصية واحدة.", consultationDrill: "اربطها بالوقائع والمخاطر والنطاق وهدف العميل.", checkpoint: "هل يمكن تبرير التوصية لاحقًا؟" },
      { microAction: "احذف عبارة ضغط من لغة الاستشارة.", consultationDrill: "استبدل ضغط الاستعجال بوضوح العواقب.", checkpoint: "هل بقيت اللغة مهنية؟" },
      { microAction: "وضح أن القرار النهائي يبقى للعميل بعد تلقي الرأي.", consultationDrill: "اشرح الخيارات والعواقب، ثم اسأل كيف يرغب في المتابعة.", checkpoint: "هل حفظ التوجيه استقلال قرار العميل؟" },
    ],
  },
  consultation_closing_engagement: {
    en: [
      { microAction: "Prepare a next-step summary with issue, risk, route, scope, and next step.", consultationDrill: "Use it in the final five minutes of one consultation.", checkpoint: "Did the client know exactly what happens next?" },
      { microAction: "Ask a direct professional decision question.", consultationDrill: "Say, 'Are you ready to move into the appropriate legal procedure and begin the next step?'", checkpoint: "Did you avoid leaving the decision vague?" },
      { microAction: "Write one transition from advice to representation.", consultationDrill: "Connect the legal need to scope of work and first action.", checkpoint: "Did the transition feel natural?" },
      { microAction: "Prepare a response when the client asks to delay.", consultationDrill: "Ask what must be clarified before they can decide.", checkpoint: "Did delay become a specific issue?" },
      { microAction: "Create a final-minute checklist for consultations.", consultationDrill: "Confirm decision owner, documents needed, next-step route, and timing.", checkpoint: "Was the ending complete?" },
      { microAction: "Practice guiding the next step without apologizing for the professional procedure.", consultationDrill: "Use calm language and stop after the decision question.", checkpoint: "Did confidence remain steady?" },
      { microAction: "Send the next-step documents within the promised window.", consultationDrill: "Attach only what the client needs to act clearly.", checkpoint: "Did speed support trust and decision momentum?" },
    ],
    ar: [
      { microAction: "حضّر ملخص إغلاق يتضمن المسألة، المخاطر، المسار، النطاق، والخطوة التالية.", consultationDrill: "استخدمه في آخر خمس دقائق من استشارة واحدة.", checkpoint: "هل عرف العميل بدقة ماذا يحدث بعد ذلك؟" },
      { microAction: "اطرح سؤال قرار مهنيًا مباشرًا.", consultationDrill: "قل: هل أنت مستعد لاعتماد الإجراء القانوني المناسب والبدء بالخطوة التالية؟", checkpoint: "هل تجنبت ترك القرار غامضًا؟" },
      { microAction: "اكتب انتقالًا واحدًا من الرأي إلى الخطوة القانونية التالية.", consultationDrill: "اربط الحاجة القانونية بنطاق العمل وأول إجراء.", checkpoint: "هل بدا الانتقال طبيعيًا؟" },
      { microAction: "حضّر ردًا عندما يطلب العميل التأجيل.", consultationDrill: "اسأل ما الذي يجب توضيحه قبل أن يستطيع القرار.", checkpoint: "هل أصبح التأجيل مسألة محددة؟" },
      { microAction: "أنشئ قائمة تحقق للدقائق الأخيرة من الاستشارة.", consultationDrill: "أكد صاحب القرار، المستندات المطلوبة، مسار الاتفاق، والتوقيت.", checkpoint: "هل كان الإغلاق مكتملًا؟" },
      { microAction: "تدرّب على الإغلاق دون الاعتذار عن الخطوة المهنية.", consultationDrill: "استخدم لغة هادئة وتوقف بعد سؤال القرار.", checkpoint: "هل بقيت الثقة ثابتة؟" },
      { microAction: "أرسل مستندات الخطوة التالية ضمن الزمن الذي وعدت به.", consultationDrill: "أرفق فقط ما يحتاجه العميل للتصرف بوضوح.", checkpoint: "هل دعمت السرعة الثقة وحركة القرار؟" },
    ],
  },
  post_consultation_follow_up: {
    en: [
      { microAction: "Write a follow-up template with context, legal risk, recommended next step, and deadline.", consultationDrill: "Send it after one consultation without vague check-in language.", checkpoint: "Did the follow-up guide the decision?" },
      { microAction: "Send one follow-up within 30 minutes of a consultation.", consultationDrill: "Reference the client’s stated concern and the agreed next step.", checkpoint: "Did the client receive clear momentum?" },
      { microAction: "Create a follow-up tracker with date, matter, decision stage, and next action.", consultationDrill: "Update it for all open consultations today.", checkpoint: "Can you see every pending decision?" },
      { microAction: "Prepare one useful insight for a hesitant client.", consultationDrill: "Send clarification that helps the decision, not a reminder only.", checkpoint: "Did the message add professional value?" },
      { microAction: "Ask for a dated decision step.", consultationDrill: "Offer two reasonable times to review the next-step documents or missing questions.", checkpoint: "Did timing become specific?" },
      { microAction: "Review one old consultation that went silent.", consultationDrill: "Send a respectful closure or reactivation note based on legal risk and next step.", checkpoint: "Did you clean the open loop?" },
      { microAction: "Document the follow-up outcome immediately.", consultationDrill: "Record replied, pending, declined, engaged, or needs clarification.", checkpoint: "Is the file status accurate?" },
    ],
    ar: [
      { microAction: "اكتب قالب متابعة يتضمن السياق، المخاطر القانونية، الخطوة الموصى بها، والموعد.", consultationDrill: "أرسله بعد استشارة واحدة دون لغة متابعة غامضة.", checkpoint: "هل وجّهت المتابعة القرار؟" },
      { microAction: "أرسل متابعة واحدة خلال 30 دقيقة من الاستشارة.", consultationDrill: "اذكر قلق العميل المعلن والخطوة التالية المتفق عليها.", checkpoint: "هل تلقى العميل زخمًا واضحًا؟" },
      { microAction: "أنشئ سجل متابعة يتضمن التاريخ، الملف، مرحلة القرار، والخطوة التالية.", consultationDrill: "حدّثه لكل الاستشارات المفتوحة اليوم.", checkpoint: "هل ترى كل قرار معلق؟" },
      { microAction: "حضّر فكرة مفيدة لعميل متردد.", consultationDrill: "أرسل توضيحًا يساعد القرار لا تذكيرًا فقط.", checkpoint: "هل أضافت الرسالة قيمة مهنية؟" },
      { microAction: "اطلب خطوة قرار بتاريخ واضح.", consultationDrill: "اقترح وقتين مناسبين لمراجعة مستندات الخطوة التالية أو الأسئلة المتبقية.", checkpoint: "هل أصبح التوقيت محددًا؟" },
      { microAction: "راجع استشارة قديمة توقفت دون رد.", consultationDrill: "أرسل رسالة إغلاق أو إعادة تفعيل محترمة مبنية على المخاطر والخطوة التالية.", checkpoint: "هل أغلقت الحلقة المفتوحة؟" },
      { microAction: "وثّق نتيجة المتابعة فورًا.", consultationDrill: "سجل: رد، معلق، اعتذر، تم الاتفاق، أو يحتاج توضيحًا.", checkpoint: "هل حالة الملف دقيقة؟" },
    ],
  },
  emotional_difficult_clients: {
    en: [
      { microAction: "Prepare a grounding phrase for emotional clients.", consultationDrill: "Acknowledge emotion, then return to facts, risk, and next step.", checkpoint: "Did you calm the room without absorbing the emotion?" },
      { microAction: "Write one boundary phrase for disrespectful communication.", consultationDrill: "Use it calmly and explain the standard needed for effective representation.", checkpoint: "Did the boundary protect the consultation?" },
      { microAction: "Ask an unrealistic client what outcome they believe is certain.", consultationDrill: "Separate desired outcome from legally responsible assessment.", checkpoint: "Did expectation become more realistic?" },
      { microAction: "Document one difficult-client behavior in neutral language.", consultationDrill: "Record facts, not judgment, after the consultation.", checkpoint: "Would the note be professional if reviewed later?" },
      { microAction: "Create a pause routine for escalating conversations.", consultationDrill: "Pause, summarize, narrow the issue, and ask one controlled question.", checkpoint: "Did escalation reduce?" },
      { microAction: "Prepare one redirect from blame to evidence.", consultationDrill: "Ask what document, witness, or timeline supports the point.", checkpoint: "Did the conversation return to proof?" },
      { microAction: "Decide one condition that must be met before accepting a difficult client.", consultationDrill: "State the condition clearly before the next legal step.", checkpoint: "Did the client accept the working standard?" },
    ],
    ar: [
      { microAction: "حضّر عبارة تهدئة للعميل الانفعالي.", consultationDrill: "اعترف بالمشاعر، ثم أعد الحديث إلى الوقائع والمخاطر والخطوة التالية.", checkpoint: "هل هدأت الأجواء دون امتصاص الانفعال؟" },
      { microAction: "اكتب عبارة حدود للتواصل غير المحترم.", consultationDrill: "استخدمها بهدوء واشرح المعيار المطلوب لتمثيل فعال.", checkpoint: "هل حمى الحد الاستشارة؟" },
      { microAction: "اسأل العميل غير الواقعي عن النتيجة التي يعتقد أنها مؤكدة.", consultationDrill: "افصل بين النتيجة المرغوبة والتقييم القانوني المسؤول.", checkpoint: "هل أصبحت التوقعات أكثر واقعية؟" },
      { microAction: "وثّق سلوك عميل صعب بلغة محايدة.", consultationDrill: "سجل الوقائع لا الأحكام بعد الاستشارة.", checkpoint: "هل ستكون الملاحظة مهنية إذا روجعت لاحقًا؟" },
      { microAction: "أنشئ روتين توقف عند تصاعد المحادثة.", consultationDrill: "توقف، لخص، ضيق المسألة، واطرح سؤالًا منضبطًا.", checkpoint: "هل انخفض التصعيد؟" },
      { microAction: "حضّر انتقالًا من اللوم إلى الدليل.", consultationDrill: "اسأل عن المستند أو الشاهد أو التسلسل الزمني الذي يدعم النقطة.", checkpoint: "هل عادت المحادثة إلى الإثبات؟" },
      { microAction: "حدد شرطًا واحدًا يجب توفره قبل قبول عميل صعب.", consultationDrill: "اذكر الشرط بوضوح قبل الخطوة القانونية التالية.", checkpoint: "هل قبل العميل معيار العمل؟" },
    ],
  },
  client_experience_referral_growth: {
    en: [
      { microAction: "Map the client experience from inquiry to post-consultation follow-up.", consultationDrill: "Mark one point where trust can be strengthened today.", checkpoint: "Did you improve one client touchpoint?" },
      { microAction: "Write a closing note that thanks the client and confirms the next professional step.", consultationDrill: "Send it after one consultation or next-step conversation.", checkpoint: "Did the client receive clarity and respect?" },
      { microAction: "Ask one satisfied client what made the process feel clear.", consultationDrill: "Use the answer to improve your consultation structure.", checkpoint: "Did feedback reveal a repeatable strength?" },
      { microAction: "Prepare a referral request that protects professionalism.", consultationDrill: "Ask only after value has been delivered and explain the suitable referral profile.", checkpoint: "Did the request feel appropriate?" },
      { microAction: "Create one post-matter reflection question.", consultationDrill: "Ask what the client wished they understood earlier.", checkpoint: "Did you learn how to improve future guidance?" },
      { microAction: "Review one client communication for tone and clarity.", consultationDrill: "Rewrite it to be calmer, shorter, and more decision-oriented.", checkpoint: "Would a stressed client understand it quickly?" },
      { microAction: "Set one client-experience standard for this week.", consultationDrill: "Choose response clarity, next-step certainty, document guidance, or follow-up rhythm.", checkpoint: "Was the standard visible in real client communication?" },
    ],
    ar: [
      { microAction: "ارسم تجربة العميل من الاستفسار إلى المتابعة بعد الاستشارة.", consultationDrill: "حدد نقطة واحدة يمكن تقوية الثقة فيها اليوم.", checkpoint: "هل حسّنت نقطة تواصل واحدة مع العميل؟" },
      { microAction: "اكتب رسالة ختامية تشكر العميل وتؤكد الخطوة المهنية التالية.", consultationDrill: "أرسلها بعد استشارة أو نقاش اتفاق تمثيل.", checkpoint: "هل تلقى العميل وضوحًا واحترامًا؟" },
      { microAction: "اسأل عميلًا راضيًا ما الذي جعل العملية واضحة.", consultationDrill: "استخدم الإجابة لتحسين هيكل الاستشارة.", checkpoint: "هل كشف الرأي قوة قابلة للتكرار؟" },
      { microAction: "حضّر طلب إحالة يحافظ على المهنية.", consultationDrill: "اطلبه فقط بعد تقديم قيمة واشرح نوع الإحالة المناسبة.", checkpoint: "هل بدا الطلب مناسبًا؟" },
      { microAction: "أنشئ سؤال مراجعة بعد انتهاء الملف.", consultationDrill: "اسأل ما الذي كان العميل يتمنى فهمه مبكرًا.", checkpoint: "هل تعلمت كيف تحسن التوجيه مستقبلًا؟" },
      { microAction: "راجع تواصلًا واحدًا مع عميل من حيث النبرة والوضوح.", consultationDrill: "أعد كتابته ليكون أهدأ وأقصر وأكثر توجيهًا للقرار.", checkpoint: "هل يفهمه عميل متوتر بسرعة؟" },
      { microAction: "حدد معيار تجربة عميل لهذا الأسبوع.", consultationDrill: "اختر وضوح الرد، يقين الخطوة التالية، إرشاد المستندات، أو إيقاع المتابعة.", checkpoint: "هل ظهر المعيار في تواصل حقيقي مع العميل؟" },
    ],
  },
};

function getLawyerMriTreatmentKey(input: string | undefined): LawyerMriCompetencyKey {
  const normalized = normalizeCompetencySafe(input || "");
  return LAWYER_MRI_COMPETENCY_KEYS.includes(normalized as LawyerMriCompetencyKey)
    ? (normalized as LawyerMriCompetencyKey)
    : "legal_inquiry_handling";
}

function getLawyerTreatmentDrills(competencyId: string | undefined, ar: boolean) {
  const key = getLawyerMriTreatmentKey(competencyId);
  return LAWYER_TREATMENT_DRILLS[key][ar ? "ar" : "en"];
}

function getLawyerTreatmentPhase(day: number, ar: boolean) {
  if (day <= 14) return ar ? "الأيام 1–14: تثبيت إطار الاستشارة" : "Days 1–14: Stabilize the Consultation Frame";
  if (day <= 30) return ar ? "الأيام 15–30: تشخيص الحاجة القانونية الحقيقية" : "Days 15–30: Diagnose the Real Legal Need";
  if (day <= 45) return ar ? "الأيام 31–45: بناء الثقة والهيبة المهنية" : "Days 31–45: Build Trust and Professional Authority";
  if (day <= 60) return ar ? "الأيام 46–60: توضيح القيمة القانونية وأتعاب المحاماة" : "Days 46–60: Clarify Legal Value and Professional Fees";
  if (day <= 75) return ar ? "الأيام 61–75: معالجة الاعتراضات وقرار الاستمرار" : "Days 61–75: Handle Objections and Next-Step Decisions";
  return ar ? "الأيام 76–90: تنظيم المتابعة وتجربة العميل والإحالات" : "Days 76–90: Systemize Follow-Up, Client Experience, and Referrals";
}

function buildLawyerConversionTreatmentPlan(
  weakestRows: CompetencyRow[],
  strongestRow: CompetencyRow | null,
  lang: Language
): LawyerTreatmentDay[] {
  const ar = lang === "ar";
  const fallbackRows = LAWYER_MRI_COMPETENCY_KEYS.slice(0, 6).map((key) => ({
    competencyId: key,
    label: COMPETENCY_LABELS[key]?.[ar ? "ar" : "en"] || key.replace(/_/g, " "),
  })) as CompetencyRow[];
  const weak = weakestRows.length ? weakestRows : fallbackRows;
  const strongest = strongestRow?.label || (ar ? "أقوى منطقة لديك" : "your strongest area");

  const integrationTemplates = ar
    ? [
        {
          micro: (w: string, s: string) => `استخدم قوتك في ${s} لدعم فجوة ${w} داخل الاستشارة.`,
          drill: () => "ابدأ من السلوك الأقوى لديك، ثم أضف سؤالًا أو توضيحًا يعالج الفجوة الأضعف.",
          check: "هل أصبح مسار الاستشارة أكثر توازنًا؟",
        },
        {
          micro: () => "اكتب جملة ختامية تساعد العميل على اتخاذ القرار دون ضغط، مع توضيح المخاطر القانونية والخطوة المهنية التالية.",
          drill: () => "استخدم الجملة عند تلخيص المخاطر والخطوة التالية للعميل.",
          check: "هل ساعد الربط العميل على فهم القرار؟",
        },
        {
          micro: (w: string, s: string) => `حضّر مثالًا مهنيًا يثبت ${s} ويقوي ${w}.`,
          drill: () => "استخدم المثال دون كشف تفاصيل سرية أو وعد بنتيجة.",
          check: "هل زاد المثال الثقة دون مبالغة؟",
        },
        {
          micro: (w: string, s: string) => `اختر استشارة تحتاج ${w} وادخلها بثقة ${s}.`,
          drill: () => "طبّق السلوكين معًا: هيكل واضح، سؤال مناسب، وخطوة مهنية محددة.",
          check: "هل خرج العميل بخطوة قرار أوضح؟",
        },
      ]
    : [
        {
          micro: (w: string, s: string) => `Use your strength in ${s} to support the weaker area: ${w}.`,
          drill: () => "Start with your strongest consultation behavior, then deliberately add one question or explanation that repairs the weaker area.",
          check: "Did the consultation path become more balanced?",
        },
        {
          micro: () => "Write one closing sentence that helps the client decide without pressure, while making the legal risk and next professional step clear.",
          drill: () => "Use that sentence when summarizing legal risk and the next professional step.",
          check: "Did the connection help the client understand the decision?",
        },
        {
          micro: (w: string, s: string) => `Prepare one professional example that proves ${s} and strengthens ${w}.`,
          drill: () => "Use the example without revealing confidential detail or promising an outcome.",
          check: "Did the example build trust without overclaiming?",
        },
        {
          micro: (w: string, s: string) => `Choose one consultation that needs ${w} and enter it through your confidence in ${s}.`,
          drill: () => "Apply both behaviors together: clear structure, appropriate question, and defined professional step.",
          check: "Did the client leave with a clearer decision step?",
        },
      ];

  const rhythmTemplates = ar
    ? [
        ["راجع استشاراتك المفتوحة وحدد لكل واحدة خطوة مهنية تالية.", "صنّف كل ملف: يحتاج توضيحًا، اتفاق تمثيل، مستندات، أو إغلاقًا محترمًا.", "هل لا توجد استشارة معلقة بلا مسار؟"],
        ["ثبت روتينًا قبل كل استشارة: هدف، نطاق، سؤال تشخيص، وخطوة قرار.", "استخدم الروتين في أول استشارة اليوم.", "هل دخلت الاستشارة بإطار أوضح؟"],
        ["راجع متابعة واحدة مؤجلة.", "أرسل متابعة قصيرة بسياق، مخاطر، وخطوة مهنية محددة.", "هل تحولت المتابعة إلى قرار أو توضيح؟"],
        ["اختر مسألة تحتاج تبسيطًا قانونيًا.", "اشرحها في ثلاث جمل: الوضع، المخاطر، والخطوة التالية.", "هل يستطيع العميل فهمها دون مصطلحات ثقيلة؟"],
        ["راجع اتفاق تمثيل أرسلته مؤخرًا.", "تأكد أن النطاق، المسؤوليات، والمستندات المطلوبة واضحة.", "هل يستطيع العميل التحرك دون أسئلة أساسية؟"],
        ["اكتب درسًا واحدًا من آخر استشارة صعبة.", "حوّله إلى قاعدة عمل للاستشارة التالية.", "هل أصبحت القاعدة قابلة للتطبيق اليوم؟"],
        ["راجع عميلًا راضيًا أو ملفًا ناجح الإدارة.", "حدد السلوك المهني الذي صنع الثقة وكرره اليوم.", "هل يمكنك إعادة إنتاج هذا السلوك؟"],
        ["اختر محادثة فيها تردد.", "اسأل عن الجزء غير الواضح: النطاق، المخاطر، الأتعاب، أو التوقيت.", "هل أصبح التردد محددًا؟"],
        ["نظّف لغة رسالة واحدة.", "اجعلها أهدأ، أقصر، وأكثر ارتباطًا بمسار القرار المهني.", "هل أصبحت الرسالة أسهل على عميل متوتر؟"],
        ["حدد معيارًا أسبوعيًا لتجربة العميل.", "طبقه في كل استشارة: وضوح، سرعة، توثيق، أو متابعة.", "هل ظهر المعيار في العمل الحقيقي؟"],
        ["راجع الحد المهني الأكثر أهمية لديك.", "اذكره بوضوح في موقف مناسب دون اعتذار.", "هل دعم الحد الثقة المهنية؟"],
        ["اختم استشارة واحدة بسؤال قرار واضح.", "اسأل إن كان العميل مستعدًا لاعتماد الإجراء القانوني المناسب والبدء بالخطوة التالية.", "هل انتهت الاستشارة بقرار أو سبب واضح للتأجيل؟"],
        ["وثّق سبب قبول أو رفض ملف واحد.", "اكتب السبب بلغة مهنية مرتبطة بالنطاق والمخاطر والملاءمة.", "هل تستطيع الدفاع عن القرار مهنيًا؟"],
        ["راجع أفضل عادة بنيتها في الخطة.", "كررها في موقفين اليوم.", "هل أصبحت العادة أسهل من الأسبوع الأول؟"],
        ["اكتب خطة الأسبوع التالي بثلاث عادات فقط.", "اختر عادة للاستقبال، عادة للاستشارة، وعادة للمتابعة.", "هل لديك نظام يستمر بعد اليوم 90؟"],
      ]
    : [
        ["Review your open consultations and define one professional next step for each.", "Classify each matter as needing clarification, next-step documents, required information, or respectful closure.", "Is every consultation attached to a path?"],
        ["Stabilize a pre-consultation routine: goal, scope, diagnostic question, and decision step.", "Use the routine in your first consultation today.", "Did you enter with a clearer frame?"],
        ["Review one delayed follow-up.", "Send a short follow-up with context, legal risk, and a defined professional step.", "Did the follow-up become a decision or clarification path?"],
        ["Choose one matter that needs simpler legal explanation.", "Explain it in three sentences: position, risk, and next step.", "Could the client understand it without heavy legal language?"],
        ["Review one next-step document you sent recently.", "Check that scope, responsibilities, and required documents are clear.", "Can the client act without basic confusion?"],
        ["Write one lesson from the last difficult consultation.", "Turn it into an operating rule for the next consultation.", "Can you apply the rule today?"],
        ["Review one satisfied client or well-managed matter.", "Identify the professional behavior that created trust and repeat it today.", "Can you reproduce that behavior?"],
        ["Choose one hesitant client conversation.", "Ask which part is unclear: scope, risk, professional legal fees, or timing.", "Did the hesitation become specific?"],
        ["Clean up one client message.", "Make it calmer, shorter, and more connected to the client decision path.", "Would a stressed client understand it quickly?"],
        ["Set one client-experience standard for the week.", "Apply it in every consultation: clarity, speed, documentation, or follow-up.", "Was the standard visible in real work?"],
        ["Review your most important professional boundary.", "State it clearly in one relevant situation without apology.", "Did the boundary support trust?"],
        ["Close one consultation with a clear decision question.", "Ask whether the client is ready to approve the appropriate legal procedure and begin the next step.", "Did the consultation end with a decision or a clear reason for delay?"],
        ["Document why you accepted or declined one matter.", "Write the reason in professional language tied to scope, risk, and fit.", "Could you defend the decision professionally?"],
        ["Review the strongest habit you built in this plan.", "Repeat it in two situations today.", "Is the habit easier than it was in week one?"],
        ["Write next week's plan with only three habits.", "Choose one inquiry habit, one consultation habit, and one follow-up habit.", "Do you have a system that continues after day 90?"],
      ];

  const days: LawyerTreatmentDay[] = [];

  for (let i = 0; i < 42; i++) {
    const row = weak[Math.floor(i / 7) % weak.length];
    const drills = getLawyerTreatmentDrills(row?.competencyId, ar);
    const drill = drills[i % drills.length];
    const day = i + 1;
    days.push({
      day,
      phase: getLawyerTreatmentPhase(day, ar),
      week: Math.floor(i / 7) + 1,
      focus: row?.label || (ar ? "أولوية تجربة العميل القانونية" : "Legal client experience priority"),
      microAction: drill.microAction,
      consultationDrill: drill.consultationDrill,
      checkpoint: drill.checkpoint,
    });
  }

  for (let i = 0; i < 28; i++) {
    const row = weak[i % weak.length];
    const focus = row?.label || (ar ? "أولوية تجربة العميل القانونية" : "Legal client experience priority");
    const template = integrationTemplates[i % integrationTemplates.length];
    const day = i + 43;
    days.push({
      day,
      phase: getLawyerTreatmentPhase(day, ar),
      week: Math.floor((i + 42) / 7) + 1,
      focus,
      microAction: template.micro(focus, strongest),
      consultationDrill: template.drill(),
      checkpoint: template.check,
    });
  }

  for (let i = 0; i < 20; i++) {
    const focus = i % 2 === 0 ? strongest : weak[i % weak.length]?.label || (ar ? "إيقاع تجربة العميل القانونية" : "Legal client experience rhythm");
    const [microAction, consultationDrill, checkpoint] = rhythmTemplates[i % rhythmTemplates.length];
    const day = i + 71;
    days.push({
      day,
      phase: getLawyerTreatmentPhase(day, ar),
      week: Math.floor((i + 70) / 7) + 1,
      focus,
      microAction,
      consultationDrill,
      checkpoint,
    });
  }

  return days;
}


function mriBehaviorFamily(row: CompetencyRow, lang: Language) {
  const id = row.competencyId;

  const en: Record<string, string> = {
    sales_coaching_rep_development: "Coaching & rep development",
    pipeline_visibility_deal_inspection: "Pipeline inspection",
    pipeline_management_deal_inspection: "Pipeline inspection",
    forecast_judgment: "Forecast judgment",
    forecast_accuracy_judgment: "Forecast judgment",
    performance_accountability: "Performance accountability",
    target_setting_kpi_discipline: "Target and KPI discipline",
    motivation_team_energy: "Team motivation",
    sales_meeting_rhythm: "Meeting execution rhythm",
    one_on_one_management: "One-on-one management",
    hiring_onboarding_salespeople: "Hiring and onboarding",
    territory_resource_allocation: "Territory and resource allocation",
    handling_underperformance: "Underperformance management",
    managing_difficult_salespeople: "Difficult rep management",
    managing_top_performers: "Top performer management",
    manager_communication_executive_reporting: "Executive communication",
    decision_making_under_pressure: "Decision pressure",
    prospecting_finding_new_clients: "Pipeline creation",
    mental_toughness: "Mindset & pressure control",
    attitude_motivation_mindset: "Mindset & pressure control",
    opening_conversations: "Access & first impression",
    identifying_real_needs: "Diagnosis & discovery",
    consultative_selling: "Diagnosis & discovery",
    product_expertise: "Value translation",
    handling_objections: "Objection response",
    destroying_objections: "Objection prevention",
    creating_irresistible_offers: "Offer architecture",
    mastering_closing: "Decision control",
    follow_up_discipline: "Pipeline discipline",
    time_territory_management: "Execution discipline",
    negotiation_skills: "Value protection",
    dealing_with_boss: "Internal alignment",
    handling_difficult_customers: "Emotional control",
    handling_difficult_colleagues: "Internal coordination",
  };

  const ar: Record<string, string> = {
    sales_coaching_rep_development: "التدريب وتطوير المندوبين",
    pipeline_visibility_deal_inspection: "فحص مسار الفرص البيعية والصفقات",
    pipeline_management_deal_inspection: "فحص مسار الفرص البيعية والصفقات",
    forecast_judgment: "الحكم على التوقعات",
    forecast_accuracy_judgment: "الحكم على التوقعات",
    performance_accountability: "المساءلة على الأداء",
    target_setting_kpi_discipline: "الأهداف وانضباط المؤشرات",
    motivation_team_energy: "تحفيز وطاقة الفريق",
    sales_meeting_rhythm: "إيقاع اجتماعات المبيعات",
    one_on_one_management: "إدارة الاجتماعات الفردية",
    hiring_onboarding_salespeople: "التوظيف والتأهيل",
    territory_resource_allocation: "توزيع المناطق والموارد",
    handling_underperformance: "معالجة ضعف الأداء",
    managing_difficult_salespeople: "إدارة المندوبين الصعبين",
    managing_top_performers: "إدارة أصحاب الأداء العالي",
    manager_communication_executive_reporting: "التواصل والتقارير للإدارة العليا",
    decision_making_under_pressure: "اتخاذ القرار تحت الضغط",
    prospecting_finding_new_clients: "صناعة الفرص والعملاء الجدد",
    mental_toughness: "العقلية والتحكم تحت الضغط",
    attitude_motivation_mindset: "العقلية والتحكم تحت الضغط",
    opening_conversations: "الوصول والانطباع الأول",
    identifying_real_needs: "التشخيص والاكتشاف",
    consultative_selling: "التشخيص والاكتشاف",
    product_expertise: "ترجمة القيمة",
    handling_objections: "التعامل مع الاعتراضات",
    destroying_objections: "منع الاعتراضات من الجذور",
    creating_irresistible_offers: "هندسة العرض",
    mastering_closing: "التحكم في القرار",
    follow_up_discipline: "انضباط مسار التدفّق",
    time_territory_management: "انضباط التنفيذ",
    negotiation_skills: "حماية القيمة",
    dealing_with_boss: "التوافق الداخلي",
    handling_difficult_customers: "التحكم العاطفي",
    handling_difficult_colleagues: "التنسيق الداخلي",
  };

  return lang === "ar" ? ar[id] || row.label : en[id] || row.label;
}


function getBusinessHealthTreatmentMeta(row: CompetencyRow, lang: Language) {
  const id = row.competencyId;

  const en: Record<string, any> = {
    strategic_direction_business_clarity: {
      leakage: "The business may be moving fast without a clear enough direction, focus, ideal customer, or strategic stop-list.",
      root: "The root pattern is strategic blur: the company reacts to opportunities, pressure, and daily issues instead of operating from a small set of clear priorities.",
      stop: "Stop treating every customer request, product idea, or urgent issue as equally strategic.",
      start: "Start defining where the business will win, who it will serve best, what it will stop doing, and which priorities must guide the next 90 days.",
      drill: "Write a one-page direction map: ideal customer, strongest offer, top 3 priorities, top 3 stop-doing items, and one weekly review rhythm.",
      metric: "percentage of weekly decisions linked to the agreed strategic priorities",
      bonus: "SME Strategic Direction Map",
    },
    revenue_engine_sales_predictability: {
      leakage: "Revenue may depend on owner effort, random referrals, seasonal demand, or heroic sales activity instead of a predictable engine.",
      root: "The root pattern is revenue fragility: inquiries, conversion, follow-up, sales rhythm, and forecasting are not yet operating as one system.",
      stop: "Stop judging revenue health only by this month’s revenue number.",
      start: "Start measuring the full revenue engine: lead flow, conversion, follow-up, sales cycle, average deal value, and forecast confidence.",
      drill: "Map the last 20 customers and identify where each came from, how they converted, why they bought, and how long the decision took.",
      metric: "qualified inquiries converted into predictable revenue within a tracked sales cycle",
      bonus: "SME Revenue Engine Map",
    },
    marketing_positioning_lead_quality: {
      leakage: "Marketing may create activity, impressions, posts, or inquiries without attracting enough right-fit customers.",
      root: "The root pattern is weak positioning: the market does not clearly understand why this business is the safer, better, faster, or more valuable choice.",
      stop: "Stop increasing marketing noise before clarifying the message and target customer.",
      start: "Start tightening the promise, audience, proof, offer clarity, and channel focus.",
      drill: "Rewrite the main marketing message using: who we help, painful problem, outcome, proof, and next step.",
      metric: "percentage of leads that match the ideal customer profile and have a clear buying reason",
      bonus: "Positioning & Lead Quality Diagnostic",
    },
    customer_experience_retention: {
      leakage: "The business may win customers but fail to retain, delight, reactivate, or turn them into referrals.",
      root: "The root pattern is customer experience drift: delivery happens, but the company does not intentionally manage expectations, communication, recovery, and loyalty.",
      stop: "Stop assuming a customer is satisfied just because they did not complain.",
      start: "Start managing the customer journey before, during, and after delivery with clear touchpoints and recovery triggers.",
      drill: "Choose 10 recent customers and identify one moment where trust increased, dropped, or could have been strengthened.",
      metric: "repeat customers, referrals, reviews, complaints resolved, and reactivation rate",
      bonus: "Customer Experience Retention Map",
    },
    cash_flow_margins_financial_control: {
      leakage: "The business may be selling but still feel financially weak because cash, margins, costs, collections, and profitability are not visible enough.",
      root: "The root pattern is financial fog: the owner sees revenue but not the real profit mechanics, cash timing, margin leaks, or cost behavior.",
      stop: "Stop treating sales growth as proof of business strength.",
      start: "Start reviewing cash flow, gross margin, net margin, overdue payments, cost creep, and profitability by product or service line.",
      drill: "Review the last 90 days and identify the top three cash leaks and the top three profit contributors.",
      metric: "weekly cash visibility, margin by offer, overdue receivables, and net profit trend",
      bonus: "Cash Flow & Margin Control Sheet",
    },
    operations_systems_process_discipline: {
      leakage: "The business may depend on memory, people, and daily owner intervention instead of repeatable operating systems.",
      root: "The root pattern is operational dependency: work gets done, but the way it gets done is not documented, measured, or consistently followed.",
      stop: "Stop allowing every experienced employee to run the same process differently.",
      start: "Start documenting critical workflows, quality standards, handoffs, and escalation rules.",
      drill: "Choose one recurring process and write the standard steps, owner, quality check, and failure trigger.",
      metric: "critical processes documented, followed, measured, and improved",
      bonus: "SME Process Discipline Checklist",
    },
    people_roles_accountability: {
      leakage: "People may be busy but unclear about ownership, standards, decisions, and consequences.",
      root: "The root pattern is role fog: the business has employees, but not enough clarity around who owns what result and how performance is reviewed.",
      stop: "Stop using job titles as a replacement for ownership.",
      start: "Start defining role outcomes, key responsibilities, decision rights, and review rhythm.",
      drill: "For each key person, write: owns, measures, reports, decides, escalates.",
      metric: "roles with clear ownership, measurable outcomes, and review dates",
      bonus: "Roles & Accountability Map",
    },
    leadership_decision_making_rhythm: {
      leakage: "The owner or GM may make decisions through urgency, pressure, emotion, or incomplete information.",
      root: "The root pattern is leadership rhythm weakness: the business lacks a consistent operating cadence for priorities, decisions, numbers, and review.",
      stop: "Stop letting the loudest problem decide the week.",
      start: "Start using a weekly leadership rhythm: numbers, priorities, blockers, decisions, owners, deadlines.",
      drill: "Run one 45-minute weekly business review with a fixed agenda and no vague action items.",
      metric: "decisions made with owner, deadline, evidence, and follow-up review",
      bonus: "Weekly Owner/GM Decision Rhythm",
    },
    products_services_value_proposition: {
      leakage: "The business may sell too many unclear, low-margin, or poorly packaged products/services.",
      root: "The root pattern is offer clutter: the company has activity but not enough clarity around what should be sold, to whom, why, and at what margin.",
      stop: "Stop treating every product or service as equally worth selling.",
      start: "Start ranking offers by demand, margin, strategic fit, delivery complexity, and customer value.",
      drill: "List all offers and classify each as scale, fix, simplify, reposition, or stop.",
      metric: "revenue and margin concentration in the strongest strategic offers",
      bonus: "Offer Portfolio Health Map",
    },
    technology_data_management_visibility: {
      leakage: "The owner may not see the business clearly enough because data is scattered, late, manual, or missing.",
      root: "The root pattern is management blindness: the company has activity but not enough dashboard visibility over sales, cash, customers, operations, and people.",
      stop: "Stop relying on verbal updates and scattered files to understand business health.",
      start: "Start building a simple dashboard with the few numbers that show business reality every week.",
      drill: "Choose 12 numbers the owner/GM must see weekly across revenue, cash, customers, operations, people, and risk.",
      metric: "weekly visibility of the core business dashboard without chasing information",
      bonus: "SME Management Dashboard Blueprint",
    },
    risk_compliance_business_continuity: {
      leakage: "The business may be exposed to avoidable shocks through customer concentration, supplier dependency, compliance gaps, staff dependency, or weak continuity planning.",
      root: "The root pattern is unpriced risk: the business runs normally until a hidden dependency breaks.",
      stop: "Stop assuming the business is safe because nothing has gone wrong recently.",
      start: "Start identifying the few risks that could hurt cash, reputation, delivery, legality, or continuity.",
      drill: "Create a top-10 risk list and score each risk by likelihood, impact, owner, and prevention action.",
      metric: "critical risks with owners, controls, contingency plans, and review dates",
      bonus: "SME Risk & Continuity Register",
    },
    growth_readiness_scalability: {
      leakage: "Growth may create chaos if the business adds customers, people, or locations before systems are ready.",
      root: "The root pattern is scaling before strengthening: more demand enters a business that still relies on owner control, informal process, and fragile visibility.",
      stop: "Stop chasing growth before checking whether the business can absorb it without breaking service, cash, or team capacity.",
      start: "Start defining what must be systemized, delegated, measured, and protected before growth accelerates.",
      drill: "Write a scale-readiness checklist covering sales, delivery, cash, people, systems, technology, and leadership rhythm.",
      metric: "growth initiatives supported by capacity, process, cash, and management visibility",
      bonus: "Growth Readiness Roadmap",
    },
  };

  const ar: Record<string, any> = {
    strategic_direction_business_clarity: {
      leakage: "قد تتحرك الشركة بسرعة دون اتجاه واضح كفاية أو عميل مثالي أو قائمة واضحة بما يجب التوقف عنه.",
      root: "السبب الجذري هو غموض استراتيجي: الشركة تتفاعل مع الفرص والضغط والمشكلات اليومية بدل أن تعمل من أولويات قليلة وواضحة.",
      stop: "توقف عن التعامل مع كل طلب عميل أو فكرة منتج أو مشكلة عاجلة كأنها استراتيجية بنفس الدرجة.",
      start: "ابدأ بتحديد أين ستفوز الشركة، من تخدمه بأفضل شكل، ماذا يجب أن تتوقف عنه، وما أولويات الـ 90 يومًا القادمة.",
      drill: "اكتب خريطة اتجاه من صفحة واحدة: العميل المثالي، أقوى عرض، أهم 3 أولويات، أهم 3 أشياء يجب إيقافها، وإيقاع مراجعة أسبوعي.",
      metric: "نسبة القرارات الأسبوعية المرتبطة بالأولويات الاستراتيجية المتفق عليها",
      bonus: "خريطة الاتجاه الاستراتيجي للشركة",
    },
    revenue_engine_sales_predictability: {
      leakage: "قد تعتمد الإيرادات على جهد المالك أو الإحالات العشوائية أو موسمية الطلب بدل محرك إيرادات قابل للتوقع.",
      root: "السبب الجذري هو هشاشة الإيرادات: الاستفسارات والتحويل والمتابعة وإيقاع البيع والتوقعات لا تعمل كنظام واحد.",
      stop: "توقف عن الحكم على صحة الإيرادات من رقم مبيعات هذا الشهر فقط.",
      start: "ابدأ بقياس محرك الإيرادات كاملًا: تدفق العملاء المحتملين، التحويل، المتابعة، دورة البيع، متوسط قيمة الصفقة، وثقة التوقع.",
      drill: "ارسم آخر 20 عميلًا وحدد من أين جاء كل عميل، كيف تحول، لماذا اشترى، وكم استغرق القرار.",
      metric: "الاستفسارات المؤهلة التي تتحول إلى إيرادات متوقعة داخل دورة بيع واضحة",
      bonus: "خريطة محرك الإيرادات للشركات الصغيرة والمتوسطة",
    },
    marketing_positioning_lead_quality: {
      leakage: "قد يصنع التسويق نشاطًا ومنشورات واستفسارات دون جذب عدد كافٍ من العملاء المناسبين.",
      root: "السبب الجذري هو ضعف التموضع: السوق لا يفهم بوضوح لماذا هذه الشركة هي الخيار الأكثر أمانًا أو قيمة أو ملاءمة.",
      stop: "توقف عن زيادة الضجيج التسويقي قبل توضيح الرسالة والعميل المستهدف.",
      start: "ابدأ بتقوية الوعد، الجمهور، الدليل، وضوح العرض، وتركيز القنوات.",
      drill: "أعد صياغة الرسالة التسويقية الأساسية باستخدام: من نساعد، المشكلة المؤلمة، النتيجة، الدليل، والخطوة التالية.",
      metric: "نسبة العملاء المحتملين المطابقين للعميل المثالي ولديهم سبب شراء واضح",
      bonus: "تشخيص التموضع وجودة العملاء المحتملين",
    },
    customer_experience_retention: {
      leakage: "قد تكسب الشركة عملاء لكنها لا تحتفظ بهم أو تحولهم إلى إحالات ومراجعات وولاء.",
      root: "السبب الجذري هو انجراف تجربة العميل: يتم التسليم، لكن الشركة لا تدير التوقعات والتواصل والاسترجاع والولاء بوعي.",
      stop: "توقف عن افتراض أن العميل راضٍ فقط لأنه لم يشتكِ.",
      start: "ابدأ بإدارة رحلة العميل قبل وأثناء وبعد التسليم عبر نقاط تواصل واضحة ومؤشرات إنقاذ.",
      drill: "اختر 10 عملاء حديثين وحدد لحظة زادت فيها الثقة، انخفضت، أو كان يمكن تقويتها.",
      metric: "العملاء العائدون، الإحالات، التقييمات، الشكاوى المعالجة، ومعدل إعادة التفعيل",
      bonus: "خريطة تجربة العملاء والاحتفاظ بهم",
    },
    cash_flow_margins_financial_control: {
      leakage: "قد تبيع الشركة لكنها تبقى ضعيفة ماليًا لأن السيولة والهوامش والتكاليف والتحصيل والربحية ليست واضحة كفاية.",
      root: "السبب الجذري هو ضباب مالي: يرى المالك الإيرادات لكنه لا يرى آليات الربح الحقيقية، توقيت السيولة، هدر ونزيف في نسبة التدفق النقدي، أو سلوك التكلفة.",
      stop: "توقف عن اعتبار نمو المبيعات دليلًا كافيًا على قوة الشركة.",
      start: "ابدأ بمراجعة التدفق النقدي، الهامش الإجمالي، صافي الهامش، المتأخرات، زحف التكاليف، والربحية حسب المنتج أو الخدمة.",
      drill: "راجع آخر 90 يومًا وحدد أكبر 3 مسارات هدر ونزيف نقدية وأكبر 3 مصادر ربح.",
      metric: "وضوح السيولة الأسبوعية، الهامش حسب العرض، المتأخرات، واتجاه صافي الربح",
      bonus: "ورقة التحكم في التدفق النقدي والهوامش",
    },
    operations_systems_process_discipline: {
      leakage: "قد تعتمد الشركة على الذاكرة والأشخاص وتدخل المالك اليومي بدل أنظمة تشغيل قابلة للتكرار.",
      root: "السبب الجذري هو اعتماد تشغيلي: العمل يتم، لكن طريقة تنفيذه غير موثقة أو مقاسة أو متبعة بثبات.",
      stop: "توقف عن السماح لكل موظف خبير بأن يدير نفس العملية بطريقة مختلفة.",
      start: "ابدأ بتوثيق العمليات الحرجة، معايير الجودة، نقاط التسليم، وقواعد التصعيد.",
      drill: "اختر عملية متكررة واحدة واكتب خطواتها القياسية، المالك، فحص الجودة، ومؤشر الفشل.",
      metric: "العمليات الحرجة الموثقة والمتبعة والمقاسة والمحسنة",
      bonus: "قائمة انضباط العمليات للشركات الصغيرة والمتوسطة",
    },
    people_roles_accountability: {
      leakage: "قد يكون الناس مشغولين لكنهم غير واضحين بشأن الملكية، المعايير، القرارات، والعواقب.",
      root: "السبب الجذري هو غموض الأدوار: الشركة لديها موظفون لكن لا يوجد وضوح كافٍ حول من يملك أي نتيجة وكيف تتم مراجعة الأداء.",
      stop: "توقف عن استخدام المسميات الوظيفية كبديل عن الملكية.",
      start: "ابدأ بتحديد نتائج كل دور، المسؤوليات الأساسية، صلاحيات القرار، وإيقاع المراجعة.",
      drill: "لكل شخص أساسي، اكتب: يملك، يقيس، يرفع تقريرًا، يقرر، يصعّد.",
      metric: "الأدوار التي لديها ملكية واضحة ونتائج قابلة للقياس ومواعيد مراجعة",
      bonus: "خريطة الأدوار والمساءلة",
    },
    leadership_decision_making_rhythm: {
      leakage: "قد يتخذ المالك أو المدير العام قرارات تحت ضغط العجلة أو العاطفة أو معلومات ناقصة.",
      root: "السبب الجذري هو ضعف إيقاع القيادة: الشركة تفتقد إيقاعًا ثابتًا لمراجعة الأولويات والقرارات والأرقام.",
      stop: "توقف عن السماح للمشكلة الأعلى صوتًا أن تحدد أسبوع الشركة.",
      start: "ابدأ بإيقاع قيادي أسبوعي: أرقام، أولويات، عوائق، قرارات، ملاك، مواعيد.",
      drill: "نفذ مراجعة أسبوعية لمدة 45 دقيقة بأجندة ثابتة ودون بنود عمل غامضة.",
      metric: "القرارات التي لها مالك وموعد ودليل ومراجعة متابعة",
      bonus: "إيقاع قرار أسبوعي للمالك أو المدير العام",
    },
    products_services_value_proposition: {
      leakage: "قد تبيع الشركة منتجات أو خدمات كثيرة وغير واضحة أو منخفضة الهامش أو ضعيفة التغليف.",
      root: "السبب الجذري هو ازدحام العروض: توجد حركة، لكن لا يوجد وضوح كافٍ حول ماذا يجب بيعه، لمن، لماذا، وبأي هامش.",
      stop: "توقف عن التعامل مع كل منتج أو خدمة كأنها تستحق نفس الجهد.",
      start: "ابدأ بترتيب العروض حسب الطلب، الهامش، الملاءمة الاستراتيجية، تعقيد التسليم، وقيمة العميل.",
      drill: "اكتب كل العروض وصنف كل واحد: توسعة، إصلاح، تبسيط، إعادة تموضع، أو إيقاف.",
      metric: "تركيز الإيرادات والهامش في أقوى العروض الاستراتيجية",
      bonus: "خريطة صحة محفظة العروض",
    },
    technology_data_management_visibility: {
      leakage: "قد لا يرى المالك الشركة بوضوح لأن البيانات متفرقة أو متأخرة أو يدوية أو ناقصة.",
      root: "السبب الجذري هو عمى إداري: توجد حركة في الشركة لكن لا توجد لوحة رؤية كافية للمبيعات والسيولة والعملاء والعمليات والأفراد.",
      stop: "توقف عن الاعتماد على التحديثات الشفهية والملفات المتفرقة لفهم صحة الشركة.",
      start: "ابدأ ببناء لوحة بسيطة للأرقام القليلة التي تكشف واقع الشركة أسبوعيًا.",
      drill: "اختر 12 رقمًا يجب أن يراها المالك أو المدير العام أسبوعيًا عبر الإيرادات، السيولة، العملاء، العمليات، الأفراد، والمخاطر.",
      metric: "وضوح لوحة الإدارة الأسبوعية دون مطاردة المعلومات",
      bonus: "مخطط لوحة إدارة الشركة",
    },
    risk_compliance_business_continuity: {
      leakage: "قد تكون الشركة معرضة لصدمات يمكن تجنبها بسبب تركّز العملاء أو اعتماد الموردين أو فجوات الامتثال أو اعتمادها على موظف واحد.",
      root: "السبب الجذري هو مخاطر غير محسوبة: تعمل الشركة بشكل طبيعي إلى أن تنكسر تبعية مخفية.",
      stop: "توقف عن افتراض أن الشركة آمنة لمجرد أن شيئًا خطيرًا لم يحدث مؤخرًا.",
      start: "ابدأ بتحديد المخاطر القليلة التي قد تضرب السيولة، السمعة، التسليم، الالتزام، أو الاستمرارية.",
      drill: "أنشئ قائمة بأهم 10 مخاطر وقيّم كل خطر حسب الاحتمال، الأثر، المالك، وإجراء الوقاية.",
      metric: "المخاطر الحرجة التي لها ملاك وضوابط وخطط بديلة ومواعيد مراجعة",
      bonus: "سجل المخاطر واستمرارية الأعمال",
    },
    growth_readiness_scalability: {
      leakage: "قد يخلق النمو فوضى إذا أضافت الشركة عملاء أو موظفين أو فروعًا قبل جاهزية الأنظمة.",
      root: "السبب الجذري هو التوسع قبل التقوية: يدخل الطلب إلى شركة لا تزال تعتمد على تحكم المالك والعمليات غير الرسمية والرؤية الضعيفة.",
      stop: "توقف عن مطاردة النمو قبل التأكد أن الشركة تستطيع استيعابه دون كسر الخدمة أو السيولة أو قدرة الفريق.",
      start: "ابدأ بتحديد ما يجب تنظيمه، تفويضه، قياسه، وحمايته قبل تسريع النمو.",
      drill: "اكتب قائمة جاهزية النمو التي تغطي المبيعات، التسليم، السيولة، الأفراد، الأنظمة، التقنية، وإيقاع القيادة.",
      metric: "مبادرات النمو المدعومة بالقدرة والعملية والسيولة والرؤية الإدارية",
      bonus: "خارطة جاهزية النمو",
    },
  };

  return (lang === "ar" ? ar[id] : en[id]) || null;
}


function getMriTreatmentMeta(row: CompetencyRow, lang: Language, weakestLabel?: string, strongestLabel?: string) {
  const id = row.competencyId;

  const businessMeta = getBusinessHealthTreatmentMeta(row, lang);
  if (businessMeta) return businessMeta;

  const en: Record<string, any> = {
    sales_coaching_rep_development: {
      leakage: "Reps may repeat the same mistakes because coaching happens after problems instead of shaping behavior before the next opportunity.",
      root: "The root pattern is weak coaching rhythm: feedback is given, but it is not specific, observed, practiced, and followed up.",
      stop: "Stop giving general advice such as work harder, follow up more, or improve your attitude.",
      start: "Start coaching one observable behavior at a time and agree on the next field action.",
      drill: "For 7 days, run one 12-minute coaching conversation using: observation, question, behavior, practice, next action.",
      metric: "Reps leaving coaching with one clear behavior to execute.",
      bonus: "Sales Coaching Playbook",
    },
    pipeline_visibility_deal_inspection: {
      leakage: "The pipeline may look healthy while deals are actually weak, stale, or missing real next steps.",
      root: "The root pattern is accepting activity as evidence instead of inspecting buyer commitment, decision process, and next action.",
      stop: "Stop reviewing pipeline by deal value alone.",
      start: "Start inspecting each deal for decision stage, stakeholder access, risk, and next dated action.",
      drill: "Choose five deals and ask: what evidence proves this deal is alive?",
      metric: "Deals with verified next steps and clear buyer commitment.",
      bonus: "Pipeline Inspection Checklist",
    },
    pipeline_management_deal_inspection: {
      leakage: "The pipeline may become crowded with hopeful deals while management attention misses the few that truly need intervention.",
      root: "The root pattern is weak deal triage: not enough separation between real, risky, and dead opportunities.",
      stop: "Stop treating all open deals as equally important.",
      start: "Start classifying deals as advance, rescue, qualify out, or manager intervention.",
      drill: "Review the top 10 deals and assign one inspection status to each.",
      metric: "Pipeline reviewed by quality, risk, and next action rather than value only.",
      bonus: "Pipeline Inspection Checklist",
    },
    forecast_judgment: {
      leakage: "Forecasts may become optimistic because the team reports hope, not evidence.",
      root: "The root pattern is weak judgment under uncertainty: verbal confidence is accepted without proof.",
      stop: "Stop asking only whether the deal will close.",
      start: "Start asking what changed, who confirmed it, and what risk remains.",
      drill: "For every forecasted deal, capture one proof point and one risk point.",
      metric: "Forecasted deals with evidence, risk, and next action documented.",
      bonus: "Forecast Accuracy Checklist",
    },
    forecast_accuracy_judgment: {
      leakage: "The forecast may swing late in the month because weak assumptions were not challenged early enough.",
      root: "The root pattern is forecast softness: managers avoid uncomfortable inspection until pressure becomes urgent.",
      stop: "Stop letting reps forecast based only on confidence.",
      start: "Start grading forecast quality by buyer evidence, timeline, authority, and risk.",
      drill: "Run a 15-minute forecast challenge on the top five deals each week.",
      metric: "Forecast changes explained before the final week, not after the miss.",
      bonus: "Forecast Accuracy Checklist",
    },
    performance_accountability: {
      leakage: "Standards may slowly drop when missed actions are discussed but not followed by clear consequences or support.",
      root: "The root pattern is soft accountability: the manager wants to stay supportive but avoids making expectations measurable.",
      stop: "Stop accepting repeated explanations without a reset agreement.",
      start: "Start using clear standards: what must happen, by when, and how it will be reviewed.",
      drill: "Convert one recurring performance issue into a written expectation and follow-up date.",
      metric: "Missed commitments converted into clear reset agreements.",
      bonus: "Accountability Conversation Framework",
    },
    target_setting_kpi_discipline: {
      leakage: "The team may stay busy without knowing which few activities actually drive the target.",
      root: "The root pattern is KPI clutter: too many numbers and not enough connection to controllable behavior.",
      stop: "Stop presenting targets as pressure only.",
      start: "Start translating targets into weekly controllable actions and visible progress markers.",
      drill: "Choose three KPIs and connect each one to a weekly behavior the rep can control.",
      metric: "Team members who can explain their target, gap, and next controllable action.",
      bonus: "Sales KPI Execution Planner",
    },
    motivation_team_energy: {
      leakage: "Team energy may rise after wins and collapse after pressure because motivation is emotional, not operational.",
      root: "The root pattern is inconsistent leadership energy: the manager reacts to results instead of shaping the climate.",
      stop: "Stop using pressure as the main source of urgency.",
      start: "Start creating energy through clarity, recognition, visible progress, and fair standards.",
      drill: "Open every team day with one priority, one progress signal, and one behavior to execute.",
      metric: "Team activity maintained after difficult days or missed results.",
      bonus: "Team Motivation Reset",
    },
    sales_meeting_rhythm: {
      leakage: "Meetings may consume time without changing behavior, pipeline quality, or next actions.",
      root: "The root pattern is meeting drift: discussion replaces decision and follow-through.",
      stop: "Stop running meetings that end without owners and deadlines.",
      start: "Start designing every meeting around decisions, blockers, commitments, and follow-up.",
      drill: "For the next meeting, write the desired behavior change before building the agenda.",
      metric: "Meetings ending with owner, deadline, and next action.",
      bonus: "Sales Meeting Operating Rhythm",
    },
    one_on_one_management: {
      leakage: "One-on-ones may become friendly updates instead of performance-changing management conversations.",
      root: "The root pattern is low structure: the meeting lacks preparation, inspection, coaching, and accountability.",
      stop: "Stop asking only how things are going.",
      start: "Start using one-on-ones to inspect priorities, coach one behavior, and agree on one action.",
      drill: "Use a three-part one-on-one: pipeline, behavior, next commitment.",
      metric: "One-on-ones that end with a measurable action before the next meeting.",
      bonus: "One-on-One Manager Template",
    },
    hiring_onboarding_salespeople: {
      leakage: "New hires may take too long to become productive because onboarding is informal or personality-based.",
      root: "The root pattern is weak ramp design: the manager assumes the new hire will learn by exposure.",
      stop: "Stop treating onboarding as product training only.",
      start: "Start defining the first 30 days by behaviors, role plays, field practice, and evidence of readiness.",
      drill: "Create a 30-day ramp checklist for one new hire or future hire.",
      metric: "New hires reaching first productive sales behaviors faster.",
      bonus: "Sales Hiring & Onboarding Checklist",
    },
    territory_resource_allocation: {
      leakage: "High-potential accounts may receive the same attention as low-probability areas, wasting team capacity.",
      root: "The root pattern is resource equality: the manager distributes time fairly instead of commercially.",
      stop: "Stop allocating resources by habit or complaints.",
      start: "Start allocating time, support, and territory focus by potential, probability, and strategic value.",
      drill: "Rank territories/accounts by value, risk, and growth potential, then shift one resource decision.",
      metric: "Manager attention spent on the highest-value opportunities and people.",
      bonus: "Territory & Resource Allocation Map",
    },
    handling_underperformance: {
      leakage: "Low performance may continue too long because the manager delays hard conversations or confuses patience with support.",
      root: "The root pattern is delayed intervention: the issue is noticed early but addressed late.",
      stop: "Stop hoping underperformance will correct itself.",
      start: "Start separating skill gap, will gap, activity gap, and fit gap.",
      drill: "Diagnose one underperformer using skill, will, activity, and fit, then choose the correct intervention.",
      metric: "Underperformance cases with clear diagnosis and next action.",
      bonus: "Underperformance Treatment Plan",
    },
    managing_difficult_salespeople: {
      leakage: "One difficult salesperson may drain the manager, distract the team, and weaken standards.",
      root: "The root pattern is boundary weakness: the manager keeps managing mood instead of managing behavior.",
      stop: "Stop debating attitude without naming the specific behavior and impact.",
      start: "Start setting behavioral boundaries, consequences, and a short review cycle.",
      drill: "Write the behavior, team impact, required change, and review date before the next difficult conversation.",
      metric: "Difficult behavior converted into specific agreements and consequences.",
      bonus: "Difficult Salespeople Conversation Script",
    },
    managing_top_performers: {
      leakage: "Top performers may become independent, entitled, bored, or under-leveraged.",
      root: "The root pattern is neglect by success: the manager assumes strong performers need less management.",
      stop: "Stop giving top performers only praise or more pressure.",
      start: "Start giving them challenge, influence, recognition, and strategic development.",
      drill: "Create one growth challenge for each top performer that benefits both the person and the team.",
      metric: "Top performers retained, stretched, and used as positive leverage.",
      bonus: "Top Performer Growth Plan",
    },
    manager_communication_executive_reporting: {
      leakage: "Senior leaders may lose confidence when reports are late, vague, or too optimistic.",
      root: "The root pattern is weak upward clarity: the manager reports numbers without enough risk, cause, and action.",
      stop: "Stop reporting only what happened.",
      start: "Start reporting what changed, why it changed, what risk remains, and what action is next.",
      drill: "Use a weekly executive update: results, risks, causes, actions, support needed.",
      metric: "Executive conversations ending with clarity and confidence.",
      bonus: "Executive Sales Update Template",
    },
    decision_making_under_pressure: {
      leakage: "Pressure may lead to reactive decisions, inconsistent standards, or short-term fixes that damage the team later.",
      root: "The root pattern is pressure narrowing: urgency reduces the manager’s ability to diagnose before acting.",
      stop: "Stop making high-impact decisions while only looking at the loudest problem.",
      start: "Start using a short decision filter: facts, options, consequences, people impact, next review.",
      drill: "Before one pressure decision, write three options and one consequence for each.",
      metric: "Pressure decisions reviewed by evidence, impact, and follow-up.",
      bonus: "Manager Decision Filter",
    },
    prospecting_finding_new_clients: {
      leakage: "New opportunities may dry up because the seller depends too heavily on familiar lead sources, old contacts, or manager-provided pipeline.",
      root: "The root pattern is weak market creation: the seller works existing demand but does not consistently create fresh demand.",
      stop: "Stop waiting for old lead sources to recover before building new opportunity channels.",
      start: "Start opening new prospecting lanes through referrals, adjacent industries, client lookalikes, and problem-based outreach.",
      drill: "For 7 days, create 10 fresh prospect names from three different sources before touching your usual pipeline.",
      metric: "New qualified conversations created per week.",
      bonus: "How to Book Appointments with VIPs and Decision Makers",
    },
    mental_toughness: {
      leakage: "Rejection, silence, and pressure may interrupt activity before the pipeline has enough repetition to recover.",
      root: "The root pattern is often emotional recovery speed: the skill may exist, but pressure changes the seller’s state before the next action.",
      stop: "Stop waiting to feel confident before acting.",
      start: "Start using a 60-second reset after every rejection, then execute the next sales action immediately.",
      drill: "For 7 days, record every rejection and the time it took to return to productive action.",
      metric: "Minutes between rejection and next productive action.",
      bonus: "How to Motivate Yourself Under Pressure",
    },
    opening_conversations: {
      leakage: "The buyer may disconnect before discovery begins because the opening does not earn enough attention or relevance.",
      root: "The root pattern is usually weak first-frame control: the conversation starts like a pitch instead of a relevant business interruption.",
      stop: "Stop opening with long context, generic introductions, or product language.",
      start: "Start with a permission-based business question tied to a real commercial issue.",
      drill: "Use one 10-second opener for 20 prospects and track which ones continue into discovery.",
      metric: "Openings that become real discovery conversations.",
      bonus: "How to Book Appointments with VIPs and Decision Makers",
    },
    identifying_real_needs: {
      leakage: "Deals may look active but remain shallow because the real pain, consequence, or decision reason was not uncovered.",
      root: "The root pattern may be moving to solution too early before the buyer has fully described cost, urgency, and impact.",
      stop: "Stop accepting the first answer as the real need.",
      start: "Start asking: why this, why now, and what happens if nothing changes?",
      drill: "In every serious opportunity, capture one quantified pain and one consequence of inaction.",
      metric: "Opportunities with quantified pain and clear consequence.",
      bonus: "How to Increase Your Sales Using AI",
    },
    handling_objections: {
      leakage: "Objections may slow momentum because the response becomes defensive, too long, or disconnected from the buyer’s real fear.",
      root: "The root pattern is reacting to the words instead of diagnosing the concern behind the words.",
      stop: "Stop answering objections immediately.",
      start: "Start classifying the objection first: price fear, trust gap, urgency gap, or authority gap.",
      drill: "For 7 days, write every objection under one of the four categories before responding.",
      metric: "Objections that end with a clear next step.",
      bonus: "The 50 Best Answers to the 50 Hardest Objections",
    },
    destroying_objections: {
      leakage: "Objections may appear late because proof, urgency, risk, or value was not planted early enough.",
      root: "The root pattern is waiting until the buyer raises resistance instead of neutralizing resistance before it becomes powerful.",
      stop: "Stop treating objections as something that only happens at the end.",
      start: "Start pre-framing the two most likely objections before presenting the offer.",
      drill: "Before every proposal, write the two objections likely to appear and plant proof against both before the buyer raises them.",
      metric: "Objections prevented before proposal or closing.",
      bonus: "The 50 Best Answers to the 50 Hardest Objections",
    },
    creating_irresistible_offers: {
      leakage: "The offer may sound reasonable but not urgent enough to move the buyer into action.",
      root: "The root pattern is presenting features without enough consequence, contrast, proof, or next-step clarity.",
      stop: "Stop presenting the offer as a list of inclusions.",
      start: "Start building the offer around pain, cost of delay, outcome, proof, and next step.",
      drill: "Rewrite three offers using: current pain → cost of delay → desired outcome → proof → next step.",
      metric: "Offers that generate dated next-step commitment.",
      bonus: "How to Increase Your Sales Using AI",
    },
    mastering_closing: {
      leakage: "Conversations may end politely but without decision movement, leaving the pipeline full of maybes.",
      root: "The root pattern is often decision discomfort: the seller avoids the moment where the buyer must commit to the next step.",
      stop: "Stop ending conversations with vague follow-up language.",
      start: "Start using one of three closes: decision close, calendar close, or next-information close.",
      drill: "For 7 days, no serious conversation may end without a dated next step or a clear no.",
      metric: "Conversations ending with a dated next step.",
      bonus: "The 50 Best Answers to the 50 Hardest Objections",
    },
    follow_up_discipline: {
      leakage: "Warm opportunities may cool down because follow-up depends on memory, mood, or spare time.",
      root: "The root pattern is weak pipeline operating rhythm: interest is created but not protected.",
      stop: "Stop promising follow-up without scheduling it.",
      start: "Start booking the follow-up action before the current interaction ends.",
      drill: "Every follow-up must have a date, purpose, and message angle before it enters your calendar.",
      metric: "Follow-ups completed on the promised date.",
      bonus: "Time-Management Mastery for Outdoor Sales",
    },
    consultative_selling: {
      leakage: "The buyer may experience the conversation as selling, not diagnosis, even when the intention is helpful.",
      root: "The root pattern is product gravity: the conversation gets pulled toward features before the business problem is fully framed.",
      stop: "Stop proving product knowledge before proving business understanding.",
      start: "Start diagnosing decision friction, internal pressure, and business impact before suggesting options.",
      drill: "Replace one product statement per call with one business diagnosis question.",
      metric: "Buyer statements revealing impact, urgency, or internal pressure.",
      bonus: "How to Increase Your Sales Using AI",
    },
    time_territory_management: {
      leakage: "High-value selling hours may be consumed by low-probability visits, admin, travel, and reactive work.",
      root: "The root pattern is territory without triage: activity exists, but commercial probability does not control the day.",
      stop: "Stop treating all accounts and tasks as equal.",
      start: "Start ranking accounts by probability, value, urgency, and next-step clarity.",
      drill: "Plan tomorrow before leaving today: top 5 accounts, route order, reason for visit, desired next step.",
      metric: "Selling hours spent with high-probability accounts.",
      bonus: "Time-Management Mastery for Outdoor Sales",
    },
    product_expertise: {
      leakage: "Product knowledge may not convert if the buyer cannot translate it into their own business outcome.",
      root: "The root pattern is feature fluency without outcome translation.",
      stop: "Stop explaining features in isolation.",
      start: "Start translating each feature into problem solved, measurable outcome, proof, and best-fit buyer.",
      drill: "Pick three features and rewrite each into a buyer-outcome statement.",
      metric: "Product claims tied to measurable customer outcomes.",
      bonus: "How to Increase Your Sales Using AI",
    },
    negotiation_skills: {
      leakage: "Value may be lost through early discounting, reactive concessions, or pressure-based decision making.",
      root: "The root pattern is trading price for approval instead of trading concessions for commitments.",
      stop: "Stop giving concessions without receiving something commercially meaningful.",
      start: "Start preparing tradeables before every negotiation.",
      drill: "Before each negotiation, define three tradeables: timing, volume, payment, decision date, or stakeholder access.",
      metric: "Concessions exchanged for real buyer commitments.",
      bonus: "The 50 Best Answers to the 50 Hardest Objections",
    },
    attitude_motivation_mindset: {
      leakage: "Effort may rise and fall depending on mood, wins, praise, or recent disappointment.",
      root: "The root pattern is motivation dependency: performance is tied to emotion instead of process.",
      stop: "Stop using mood as the permission to act.",
      start: "Start anchoring the day to process completion, not emotional state.",
      drill: "Every morning, write one controllable process target and complete it before judging the day.",
      metric: "Process completion on difficult days.",
      bonus: "How to Motivate Yourself Under Pressure",
    },
    dealing_with_boss: {
      leakage: "Internal trust may weaken when managers receive surprises instead of early signals and clear plans.",
      root: "The root pattern is under-communication upward: problems are reported late or without options.",
      stop: "Stop hiding risk until it becomes urgent.",
      start: "Start sending early-warning updates with options and next actions.",
      drill: "Send a weekly 5-line update: wins, pipeline risk, support needed, next actions, forecast confidence.",
      metric: "Manager conversations ending with clarity and support.",
      bonus: "Time-Management Mastery for Outdoor Sales",
    },
    handling_difficult_customers: {
      leakage: "Difficult customers may consume emotional energy and pull the seller away from commercial control.",
      root: "The root pattern is emotional contagion: the customer’s intensity becomes the seller’s intensity.",
      stop: "Stop matching the customer’s emotional temperature.",
      start: "Start using calm-control sequence: acknowledge, clarify, boundary, next step.",
      drill: "In every difficult interaction, write the customer issue, the boundary, and the next step before replying.",
      metric: "Difficult conversations ending with a clear next action.",
      bonus: "How to Deal with Difficult Customers Without Losing Control",
    },
    handling_difficult_colleagues: {
      leakage: "Internal friction may delay customer responses, weaken coordination, and distract from selling priorities.",
      root: "The root pattern is unclear ownership: issues remain emotional because decisions, owners, and deadlines are vague.",
      stop: "Stop discussing internal friction without converting it into an agreement.",
      start: "Start asking: what must be decided, who owns it, and by when?",
      drill: "For 7 days, every internal issue must end with owner, deadline, and next step.",
      metric: "Internal issues resolved with owner, deadline, and next step.",
      bonus: "Time-Management Mastery for Outdoor Sales",
    },
  };

  const ar: Record<string, any> = {
    sales_coaching_rep_development: {
      leakage: "قد يكرر المندوبون نفس الأخطاء لأن التدريب يحدث بعد المشكلة بدل تشكيل السلوك قبل الفرصة التالية.",
      root: "السبب الجذري هو ضعف إيقاع التدريب: توجد ملاحظات، لكنها ليست محددة أو قابلة للممارسة والمتابعة.",
      stop: "توقف عن النصائح العامة مثل اجتهد أكثر أو تابع أكثر أو حسّن موقفك.",
      start: "ابدأ بتدريب سلوك واحد قابل للملاحظة في كل مرة واتفق على الإجراء الميداني التالي.",
      drill: "لمدة 7 أيام، نفّذ محادثة تدريب من 12 دقيقة: ملاحظة، سؤال، سلوك، تدريب، إجراء تالٍ.",
      metric: "عدد المندوبين الذين يخرجون من التدريب بسلوك واضح للتنفيذ.",
      bonus: "دليل تدريب مندوبي المبيعات",
    },
    pipeline_visibility_deal_inspection: {
      leakage: "قد يبدو مسار الفرص البيعية صحيًا بينما تكون الصفقات ضعيفة أو قديمة أو بلا خطوات تالية حقيقية.",
      root: "السبب الجذري هو قبول النشاط كدليل بدل فحص التزام العميل، مسار القرار، والخطوة التالية.",
      stop: "توقف عن مراجعة مسار الفرص البيعية حسب قيمة الصفقة فقط.",
      start: "ابدأ بفحص كل صفقة حسب مرحلة القرار، الوصول لصاحب القرار، المخاطر، والخطوة المؤرخة التالية.",
      drill: "اختر خمس صفقات واسأل: ما الدليل أن هذه الصفقة ما زالت حية؟",
      metric: "عدد الصفقات التي لها خطوة تالية مؤكدة والتزام واضح.",
      bonus: "قائمة فحص مسار الفرص البيعية",
    },
    pipeline_management_deal_inspection: {
      leakage: "قد يمتلئ مسار الفرص البيعية بصفقات متفائلة بينما يضيع تركيز المدير عن الصفقات التي تحتاج تدخلًا حقيقيًا.",
      root: "السبب الجذري هو ضعف فرز الصفقات: لا يوجد فصل كافٍ بين الفرص الحقيقية والخطرة والميتة.",
      stop: "توقف عن التعامل مع كل الصفقات المفتوحة وكأنها متساوية.",
      start: "ابدأ بتصنيف الصفقات: تقدّم، إنقاذ، تأهيل للخروج، أو تدخل إداري.",
      drill: "راجع أهم 10 صفقات وضع لكل واحدة حالة فحص واضحة.",
      metric: "مراجعة مسار الفرص البيعية حسب الجودة والمخاطر والخطوة التالية لا القيمة فقط.",
      bonus: "قائمة فحص مسار الفرص البيعية",
    },
    forecast_judgment: {
      leakage: "قد تصبح التوقعات متفائلة لأن الفريق يرفع الأمل بدل الدليل.",
      root: "السبب الجذري هو ضعف الحكم تحت الغموض: يتم قبول الثقة اللفظية دون إثبات.",
      stop: "توقف عن سؤال: هل ستُغلق الصفقة فقط؟",
      start: "ابدأ بالسؤال: ما الذي تغيّر؟ من أكده؟ وما الخطر المتبقي؟",
      drill: "لكل صفقة في التوقعات، التقط دليلًا واحدًا ونقطة خطر واحدة.",
      metric: "الصفقات المتوقعة التي لها دليل وخطر وخطوة تالية موثقة.",
      bonus: "قائمة دقة التوقعات",
    },
    forecast_accuracy_judgment: {
      leakage: "قد تتغير التوقعات في نهاية الشهر لأن الافتراضات الضعيفة لم تُراجع مبكرًا.",
      root: "السبب الجذري هو ليونة التوقعات: يتجنب المدير الفحص المزعج حتى يصبح الضغط عاجلًا.",
      stop: "توقف عن قبول توقعات المندوب المبنية على الثقة فقط.",
      start: "ابدأ بتقييم جودة التوقع حسب دليل العميل، الجدول الزمني، الصلاحية، والمخاطر.",
      drill: "نفّذ تحدي توقعات لمدة 15 دقيقة على أهم خمس صفقات أسبوعيًا.",
      metric: "تغييرات التوقع التي تُفسر قبل الأسبوع الأخير لا بعد فوات الأوان.",
      bonus: "قائمة دقة التوقعات",
    },
    performance_accountability: {
      leakage: "قد تنخفض المعايير تدريجيًا عندما تُناقش الالتزامات المفقودة دون عواقب أو دعم واضح.",
      root: "السبب الجذري هو مساءلة لينة: يريد المدير أن يكون داعمًا لكنه يتجنب جعل التوقعات قابلة للقياس.",
      stop: "توقف عن قبول التبريرات المتكررة دون اتفاق إعادة ضبط.",
      start: "ابدأ بمعايير واضحة: ماذا يجب أن يحدث، متى، وكيف ستتم المراجعة.",
      drill: "حوّل مشكلة أداء متكررة واحدة إلى توقع مكتوب وتاريخ متابعة.",
      metric: "الالتزامات المفقودة التي تتحول إلى اتفاقات إعادة ضبط واضحة.",
      bonus: "إطار محادثة المساءلة",
    },
    target_setting_kpi_discipline: {
      leakage: "قد يبقى الفريق مشغولًا دون معرفة الأنشطة القليلة التي تقود الهدف فعليًا.",
      root: "السبب الجذري هو ازدحام المؤشرات: أرقام كثيرة وربط ضعيف بالسلوك القابل للتحكم.",
      stop: "توقف عن عرض الأهداف كضغط فقط.",
      start: "ابدأ بترجمة الأهداف إلى أفعال أسبوعية قابلة للتحكم ومؤشرات تقدم واضحة.",
      drill: "اختر ثلاثة مؤشرات واربط كل واحد بسلوك أسبوعي يستطيع المندوب التحكم به.",
      metric: "عدد أعضاء الفريق الذين يستطيعون شرح الهدف والفجوة والإجراء التالي.",
      bonus: "مخطط تنفيذ مؤشرات المبيعات",
    },
    motivation_team_energy: {
      leakage: "قد ترتفع طاقة الفريق بعد الفوز وتهبط بعد الضغط لأن التحفيز عاطفي وليس تشغيليًا.",
      root: "السبب الجذري هو عدم ثبات طاقة القيادة: يتفاعل المدير مع النتائج بدل تشكيل المناخ.",
      stop: "توقف عن استخدام الضغط كمصدر رئيسي للاستعجال.",
      start: "ابدأ بصناعة الطاقة عبر الوضوح، التقدير، التقدم المرئي، والمعايير العادلة.",
      drill: "افتح كل يوم للفريق بأولوية واحدة، إشارة تقدم واحدة، وسلوك مطلوب التنفيذ.",
      metric: "استمرار نشاط الفريق بعد الأيام الصعبة أو النتائج الضعيفة.",
      bonus: "إعادة ضبط طاقة الفريق",
    },
    sales_meeting_rhythm: {
      leakage: "قد تستهلك الاجتماعات الوقت دون تغيير السلوك أو جودة مسار الفرص البيعية أو الخطوات التالية.",
      root: "السبب الجذري هو انحراف الاجتماع: النقاش يحل محل القرار والمتابعة.",
      stop: "توقف عن إدارة اجتماعات تنتهي بلا مالك ولا موعد.",
      start: "ابدأ بتصميم كل اجتماع حول القرارات، العوائق، الالتزامات، والمتابعة.",
      drill: "قبل الاجتماع القادم، اكتب التغيير السلوكي المطلوب قبل بناء الأجندة.",
      metric: "الاجتماعات التي تنتهي بمالك وموعد وخطوة تالية.",
      bonus: "إيقاع تشغيل اجتماعات المبيعات",
    },
    one_on_one_management: {
      leakage: "قد تتحول الاجتماعات الفردية إلى تحديثات ودية بدل محادثات تغير الأداء.",
      root: "السبب الجذري هو ضعف الهيكلة: الاجتماع يفتقد التحضير والفحص والتدريب والمساءلة.",
      stop: "توقف عن سؤال: كيف تسير الأمور فقط؟",
      start: "ابدأ باستخدام الاجتماعات الفردية لفحص الأولويات وتدريب سلوك واحد والاتفاق على فعل واحد.",
      drill: "استخدم هيكلًا من ثلاث خطوات: مسار الفرص البيعية، السلوك، الالتزام التالي.",
      metric: "الاجتماعات الفردية التي تنتهي بإجراء قابل للقياس قبل الاجتماع التالي.",
      bonus: "قالب الاجتماع الفردي للمدير",
    },
    hiring_onboarding_salespeople: {
      leakage: "قد يستغرق الموظفون الجدد وقتًا طويلًا للإنتاجية لأن التأهيل غير رسمي أو مبني على الشخصية.",
      root: "السبب الجذري هو ضعف تصميم مرحلة الانطلاق: يفترض المدير أن الموظف سيتعلم بالاحتكاك فقط.",
      stop: "توقف عن اعتبار التأهيل تدريبًا على المنتج فقط.",
      start: "ابدأ بتحديد أول 30 يومًا عبر السلوكيات، التمثيل، التدريب الميداني، ودليل الجاهزية.",
      drill: "أنشئ قائمة انطلاق لمدة 30 يومًا لموظف جديد أو تعيين قادم.",
      metric: "وصول الموظفين الجدد إلى أول سلوكيات إنتاجية بسرعة أكبر.",
      bonus: "قائمة التوظيف والتأهيل",
    },
    territory_resource_allocation: {
      leakage: "قد تحصل الحسابات عالية الإمكانات على نفس الاهتمام مثل المناطق ضعيفة الاحتمال، فتضيع طاقة الفريق.",
      root: "السبب الجذري هو مساواة الموارد: يوزع المدير الوقت بعدالة شكلية لا تجارية.",
      stop: "توقف عن توزيع الموارد حسب العادة أو الشكاوى.",
      start: "ابدأ بتوزيع الوقت والدعم والتركيز حسب الإمكانات والاحتمال والقيمة الاستراتيجية.",
      drill: "رتب المناطق أو الحسابات حسب القيمة والخطر وإمكانات النمو، ثم غيّر قرارًا واحدًا في التوزيع.",
      metric: "وقت المدير المصروف على أعلى الفرص والأشخاص قيمة.",
      bonus: "خريطة توزيع المناطق والموارد",
    },
    handling_underperformance: {
      leakage: "قد يستمر ضعف الأداء طويلًا لأن المدير يؤجل المحادثات الصعبة أو يخلط الصبر بالدعم.",
      root: "السبب الجذري هو التدخل المتأخر: تتم ملاحظة المشكلة مبكرًا ومعالجتها متأخرًا.",
      stop: "توقف عن الأمل أن يصحح الأداء الضعيف نفسه.",
      start: "ابدأ بفصل فجوة المهارة، فجوة الإرادة، فجوة النشاط، وفجوة الملاءمة.",
      drill: "شخّص مندوبًا ضعيف الأداء عبر المهارة والإرادة والنشاط والملاءمة، ثم اختر التدخل الصحيح.",
      metric: "حالات ضعف الأداء التي لها تشخيص واضح وخطوة تالية.",
      bonus: "خطة علاج ضعف الأداء",
    },
    managing_difficult_salespeople: {
      leakage: "قد يستنزف مندوب صعب المدير ويشتت الفريق ويضعف المعايير.",
      root: "السبب الجذري هو ضعف الحدود: يواصل المدير إدارة المزاج بدل إدارة السلوك.",
      stop: "توقف عن مناقشة الموقف العام دون تسمية السلوك المحدد وأثره.",
      start: "ابدأ بوضع حدود سلوكية وعواقب ودورة مراجعة قصيرة.",
      drill: "اكتب السلوك، أثره على الفريق، التغيير المطلوب، وتاريخ المراجعة قبل المحادثة الصعبة.",
      metric: "تحويل السلوك الصعب إلى اتفاقات محددة وعواقب واضحة.",
      bonus: "نص محادثة المندوب الصعب",
    },
    managing_top_performers: {
      leakage: "قد يصبح أصحاب الأداء العالي مستقلين أكثر من اللازم أو متطلبين أو يشعرون بالملل أو لا يتم استثمارهم.",
      root: "السبب الجذري هو الإهمال بسبب النجاح: يفترض المدير أن القوي يحتاج إدارة أقل.",
      stop: "توقف عن إعطاء أصحاب الأداء العالي مديحًا فقط أو ضغطًا إضافيًا فقط.",
      start: "ابدأ بمنحهم تحديًا وتأثيرًا وتقديرًا وتطويرًا استراتيجيًا.",
      drill: "أنشئ تحديًا للنمو لكل صاحب أداء عالٍ يفيد الشخص والفريق معًا.",
      metric: "الاحتفاظ بأصحاب الأداء العالي وتوسيع أثرهم الإيجابي.",
      bonus: "خطة نمو أصحاب الأداء العالي",
    },
    manager_communication_executive_reporting: {
      leakage: "قد تفقد الإدارة العليا الثقة عندما تكون التقارير متأخرة أو غامضة أو متفائلة أكثر من اللازم.",
      root: "السبب الجذري هو ضعف الوضوح للأعلى: يرفع المدير الأرقام دون شرح كافٍ للمخاطر والسبب والإجراء.",
      stop: "توقف عن رفع ما حدث فقط.",
      start: "ابدأ برفع ما تغيّر، لماذا تغيّر، ما الخطر المتبقي، وما الإجراء التالي.",
      drill: "استخدم تحديثًا أسبوعيًا: النتائج، المخاطر، الأسباب، الإجراءات، والدعم المطلوب.",
      metric: "المحادثات مع الإدارة العليا التي تنتهي بوضوح وثقة.",
      bonus: "قالب تحديث مبيعات تنفيذي",
    },
    decision_making_under_pressure: {
      leakage: "قد يؤدي الضغط إلى قرارات تفاعلية أو معايير غير ثابتة أو حلول قصيرة المدى تضر الفريق لاحقًا.",
      root: "السبب الجذري هو ضيق الرؤية تحت الضغط: الاستعجال يقلل قدرة المدير على التشخيص قبل الفعل.",
      stop: "توقف عن اتخاذ قرارات عالية الأثر وأنت تنظر فقط إلى أعلى مشكلة صوتًا.",
      start: "ابدأ بفلتر قرار قصير: حقائق، خيارات، عواقب، أثر على الناس، ومراجعة تالية.",
      drill: "قبل قرار واحد تحت الضغط، اكتب ثلاثة خيارات وعاقبة واحدة لكل خيار.",
      metric: "قرارات الضغط التي تتم مراجعتها بالدليل والأثر والمتابعة.",
      bonus: "فلتر قرار المدير",
    },
    prospecting_finding_new_clients: {
      leakage: "قد يجف تدفق الفرص الجديدة بسبب الاعتماد الزائد على مصادر العملاء المعتادة أو العلاقات القديمة أو العملاء الذين يقدّمهم المدير.",
      root: "السبب الجذري هو ضعف صناعة السوق: يعمل البائع على الطلب الموجود، لكنه لا يصنع طلبًا جديدًا باستمرار.",
      stop: "توقف عن انتظار عودة مصادر العملاء القديمة قبل بناء قنوات فرص جديدة.",
      start: "ابدأ بفتح مسارات تنقيب جديدة عبر الإحالات، الصناعات المجاورة، العملاء المشابهين، والتواصل المبني على المشكلة.",
      drill: "لمدة 7 أيام، أنشئ 10 أسماء عملاء محتملين جدد من ثلاثة مصادر مختلفة قبل لمس مسار التدفّق المعتاد.",
      metric: "عدد المحادثات المؤهلة الجديدة التي يتم إنشاؤها أسبوعيًا.",
      bonus: "كيف تحجز مواعيد مع كبار الشخصيات وصناع القرار",
    },
    mental_toughness: {
      leakage: "قد يقطع الرفض أو الصمت أو الضغط نشاطك قبل أن يحصل مسار التدفّق على تكرار كافٍ للتعافي.",
      root: "السبب الجذري غالبًا هو سرعة التعافي العاطفي: المهارة موجودة، لكن الضغط يغيّر الحالة قبل الإجراء التالي.",
      stop: "توقف عن انتظار الشعور بالثقة قبل التحرك.",
      start: "ابدأ بروتين إعادة ضبط لمدة 60 ثانية بعد كل رفض، ثم نفّذ الإجراء البيعي التالي فورًا.",
      drill: "لمدة 7 أيام، سجّل كل رفض والوقت الذي استغرقته للعودة إلى إجراء منتج.",
      metric: "الدقائق بين الرفض وأول إجراء منتج بعده.",
      bonus: "كيف تحفّز نفسك تحت الضغط",
    },
    opening_conversations: {
      leakage: "قد ينفصل العميل قبل بدء الاكتشاف لأن الافتتاح لم يكسب انتباهًا أو صلة كافية.",
      root: "السبب الجذري عادة هو ضعف التحكم في الإطار الأول: تبدأ المحادثة كعرض بدل أن تكون مقاطعة عبثية ذات صلة.",
      stop: "توقف عن الافتتاح بسياق طويل أو مقدمات عامة أو لغة منتج.",
      start: "ابدأ بسؤال تجاري مبني على الإذن ومرتبط بقضية حقيقية.",
      drill: "استخدم افتتاحًا واحدًا من 10 ثوانٍ مع 20 عميلًا محتملًا وتتبع من يتحول إلى اكتشاف.",
      metric: "الافتتاحات التي تتحول إلى محادثات اكتشاف حقيقية.",
      bonus: "كيف تحجز مواعيد مع كبار الشخصيات وصناع القرار",
    },
    identifying_real_needs: {
      leakage: "قد تبدو الصفقات نشطة لكنها تبقى سطحية لأن الألم الحقيقي أو العاقبة أو سبب القرار لم يُكشف.",
      root: "السبب الجذري قد يكون الانتقال إلى الحل مبكرًا قبل أن يصف العميل التكلفة والإلحاح والأثر.",
      stop: "توقف عن قبول أول إجابة كأنها الاحتياج الحقيقي.",
      start: "ابدأ بالسؤال: لماذا هذا؟ لماذا الآن؟ ماذا يحدث إذا لم يتغير شيء؟",
      drill: "في كل فرصة جادة، التقط ألمًا مقاسًا ونتيجة واحدة لعدم التحرك.",
      metric: "الفرص التي تحتوي على ألم مقاس ونتيجة واضحة.",
      bonus: "كيف تزيد مبيعاتك باستخدام الذكاء الاصطناعي",
    },
    handling_objections: {
      leakage: "قد تبطئ الاعتراضات الزخم لأن الرد يصبح دفاعيًا أو طويلًا أو بعيدًا عن خوف العميل الحقيقي.",
      root: "السبب الجذري هو الرد على الكلمات بدل تشخيص القلق خلف الكلمات.",
      stop: "توقف عن الرد على الاعتراض فورًا.",
      start: "ابدأ بتصنيف الاعتراض: خوف سعر، فجوة ثقة، فجوة إلحاح، أو فجوة صلاحية.",
      drill: "لمدة 7 أيام، اكتب كل اعتراض تحت إحدى الفئات الأربع قبل الرد.",
      metric: "الاعتراضات التي تنتهي بخطوة تالية واضحة.",
      bonus: "أفضل 50 إجابة لأصعب 50 اعتراض بيعي",
    },
    destroying_objections: {
      leakage: "قد تظهر الاعتراضات متأخرة لأن الدليل أو الإلحاح أو المخاطر أو القيمة لم تُزرع مبكرًا.",
      root: "السبب الجذري هو الانتظار حتى يطرح العميل المقاومة بدل تحييدها قبل أن تصبح قوية.",
      stop: "توقف عن اعتبار الاعتراض شيئًا يحدث في النهاية فقط.",
      start: "ابدأ بتأطير الاعتراضين المتوقعين قبل تقديم العرض.",
      drill: "قبل كل عرض، اكتب الاعتراضين المتوقعين وازرع دليلًا ضد كل واحد قبل أن يطرحه العميل.",
      metric: "الاعتراضات التي تم منعها قبل العرض أو الإغلاق.",
      bonus: "أفضل 50 إجابة لأصعب 50 اعتراض بيعي",
    },
  };

  const fallbackEn = LAWYER_COMPETENCY_IDS.has(id)
    ? {
        leakage: `${row.label} may be creating hidden friction in the legal consultation journey, especially when the client needs trust, clarity, reassurance, or confidence around professional fees.`,
        root: `The likely root pattern is inconsistency: the lawyer's expertise may be strong, but the client may not experience enough structure, value clarity, or decision guidance.`,
        stop: `Stop treating ${row.label} as a general communication skill. Treat it as a measurable professional behavior inside the consultation journey.`,
        start: `Start choosing one repeatable behavior connected to ${row.label} and apply it in every relevant legal inquiry, consultation, fee discussion, or follow-up.`,
        drill: `For 7 days, write one correction action before every situation where ${row.label} matters in the client journey.`,
        metric: `Daily execution of the selected ${row.label} correction behavior.`,
        bonus: "Legal Client Experience Guidance Guide",
      }
    : {
        leakage: `${row.label} may be creating hidden friction in the sales process, especially when pressure rises or the buyer becomes less responsive.`,
        root: `The likely root pattern is inconsistency: the behavior may appear sometimes, but not reliably enough to protect the deal.`,
        stop: `Stop treating ${row.label} as a general skill. Treat it as a measurable behavior.`,
        start: `Start choosing one repeatable behavior connected to ${row.label} and apply it in every relevant interaction.`,
        drill: `For 7 days, write one correction action before every situation where ${row.label} matters.`,
        metric: `Daily execution of the selected ${row.label} correction behavior.`,
        bonus: "How to Increase Your Sales Using AI",
      };

  const fallbackAr = LAWYER_COMPETENCY_IDS.has(id)
    ? {
        leakage: `قد تسبب ${row.label} احتكاكًا خفيًا في رحلة الاستشارة القانونية، خصوصًا عندما يحتاج العميل إلى الثقة والوضوح والطمأنة والثقة في أتعاب المحاماة.`,
        root: `السبب الجذري المحتمل هو عدم الثبات: قد تكون الخبرة القانونية قوية، لكن العميل لا يختبر ما يكفي من الهيكلة أو وضوح القيمة أو توجيه القرار.`,
        stop: `توقف عن التعامل مع ${row.label} كمهارة تواصل عامة. تعامل معها كسلوك مهني قابل للقياس داخل رحلة الاستشارة.`,
        start: `ابدأ باختيار سلوك واحد متكرر مرتبط بـ ${row.label} وطبقه في كل استفسار قانوني أو استشارة أو نقاش حول أتعاب المحاماة أو متابعة.`,
        drill: `لمدة 7 أيام، اكتب إجراء تصحيح واحد قبل كل موقف تكون فيه ${row.label} مهمة في رحلة العميل.`,
        metric: `التنفيذ اليومي لسلوك التصحيح المختار في ${row.label}.`,
        bonus: "دليل توجيه تجربة العميل القانونية",
      }
    : {
        leakage: `قد تسبب ${row.label} احتكاكًا خفيًا في عملية البيع، خصوصًا عندما يرتفع الضغط أو تقل استجابة العميل.`,
        root: `السبب الجذري المحتمل هو عدم الثبات: قد يظهر السلوك أحيانًا، لكنه ليس ثابتًا بما يكفي لحماية الصفقة.`,
        stop: `توقف عن التعامل مع ${row.label} كمهارة عامة. تعامل معها كسلوك قابل للقياس.`,
        start: `ابدأ باختيار سلوك واحد متكرر مرتبط بـ ${row.label} وطبقه في كل تفاعل مناسب.`,
        drill: `لمدة 7 أيام، اكتب إجراء تصحيح واحد قبل كل موقف تكون فيه ${row.label} مهمة.`,
        metric: `التنفيذ اليومي لسلوك التصحيح المختار في ${row.label}.`,
        bonus: "كيف تزيد مبيعاتك باستخدام الذكاء الاصطناعي",
      };

  const meta = lang === "ar" ? ar[id] || fallbackAr : en[id] || fallbackEn;

  const patternNote =
    lang === "ar"
      ? `في هذا التقرير، تتم قراءة ${row.label} بجانب أضعف إشارة لديك (${weakestLabel || row.label}) وأقوى رافعة لديك (${strongestLabel || row.label}) حتى لا يكون العلاج معزولًا عن بقية نمطك.`
      : `In this report, ${row.label} is read alongside your weakest signal (${weakestLabel || row.label}) and your strongest leverage point (${strongestLabel || row.label}), so the treatment is not isolated from the rest of your pattern.`;

  return { ...meta, patternNote };
}

function getPatternArchetype(overall: number, weakest: CompetencyRow[], strongest: CompetencyRow[], lang: Language, context: "lawyer" | "business" | "manager" | "sales" = "sales") {
  const weakestNames = weakest.map((x) => x.label).join(", ");
  const strongestNames = strongest.map((x) => x.label).join(", ");

  if (context === "business") {
    if (lang === "ar") {
      if (overall < 30) return { title: "نمط هدر ونزيف حاد في صحة الشركة", body: `الصورة الحالية تشير إلى أن المشكلة ليست في مجال واحد فقط. أضعف المجالات (${weakestNames}) قد تخلق سلسلة ضغط تبدأ من ضعف الرؤية وتنتهي بهدر ونزيف في السيولة أو العملاء أو التشغيل أو وقت المالك. ابدأ بأكبر هدر ونزيف، ثم ابنِ خارطة علاج حوله.` };
      if (overall < 50) return { title: "نمط إنذار في صحة الشركة يحتاج إلى تثبيت سريع", body: `الشركة تعمل، لكنها لا تعمل بقوة كافية. أضعف المجالات (${weakestNames}) تحتاج إلى تدخل مبكر، بينما يمكن استخدام أقوى المجالات (${strongestNames}) كرافعة لتثبيت الشركة وتقوية نظامها التشغيلي.` };
      if (overall < 75) return { title: "نمط فرصة نمو غير مكتملة يحتاج إلى نظام تشغيل أوضح", body: `صحة الشركة ليست ضعيفة، لكنها غير محمية بما يكفي. المطلوب هو تحويل أقوى المجالات (${strongestNames}) إلى نظام مراجعة وتشغيل ثابت، واستخدامها لدعم أضعف المجالات (${weakestNames}).` };
      return { title: "نمط صحة شركة قوي يحتاج إلى حماية وتوسيع", body: `الشركة تمتلك قاعدة صحية قوية. الخطر ليس الضعف، بل التراخي أو النمو غير المنظم. استخدم أقوى المجالات (${strongestNames}) كمعايير أسبوعية، وراقب أضعف المجالات (${weakestNames}) حتى لا تصبح هدراً ونزيفاً لاحقاً.` };
    }
    if (overall < 30) return { title: "High-Leakage Business Health Pattern", body: `The current pattern suggests the problem is not one isolated area. The weakest areas (${weakestNames}) may create a pressure chain that starts with poor visibility and ends with leakage in cash, customers, operations, or owner time. Start with the biggest leak and build the roadmap around it.` };
    if (overall < 50) return { title: "Business Health Warning Pattern Requiring Stabilization", body: `The business is operating, but not strongly enough. The weakest areas (${weakestNames}) need early treatment, while the strongest areas (${strongestNames}) can be used as leverage to stabilize the company and strengthen its operating system.` };
    if (overall < 75) return { title: "Unfinished Growth Pattern Requiring a Clearer Operating System", body: `The business is not broken, but its health is not protected enough. The treatment is to turn the strongest areas (${strongestNames}) into a stable review and execution rhythm, and use them to support the weakest areas (${weakestNames}).` };
    return { title: "Strong Business Health Pattern Requiring Protection and Scale Discipline", body: `The company has a strong health base. The danger is not failure; it is drift or unmanaged growth. Use the strongest areas (${strongestNames}) as weekly operating standards and monitor the weakest areas (${weakestNames}) so they do not become future leakage.` };
  }

  if (context === "lawyer") {
    if (lang === "ar") {
      if (overall < 30) {
        return {
          title: "نمط احتكاك حاد في تجربة العميل القانونية",
          body: `الصورة الحالية تشير إلى أن المشكلة ليست في كفاءة واحدة فقط. أضعف المناطق (${weakestNames}) قد تخلق سلسلة نقاط احتكاك تبدأ من أول استفسار وتنتهي بتردد العميل أو توقف رحلة العميل. لا تبدأ بكل شيء. ابدأ بأبرز نقطة احتكاك في رحلة العميل وطوّرها كنظام مهني.`,
        };
      }
      if (overall < 50) {
        return {
          title: "نمط إنذار في تجربة العميل يحتاج إلى ضبط الاستشارة",
          body: `هناك خبرة قانونية موجودة، لكنها لا تظهر للعميل بثبات تحت ضغط الاستشارة أو أتعاب المحاماة أو المقارنة مع محامٍ آخر. أضعف المناطق (${weakestNames}) تحتاج إلى علاج مبكر، بينما يمكن استخدام أقوى المناطق (${strongestNames}) كرافعة مهنية.`,
        };
      }
      if (overall < 75) {
        return {
          title: "نمط فرصة قانونية غير مكتملة يحتاج إلى خطوة قانونية أوضح",
          body: `الأداء المهني ليس ضعيفًا، لكنه ليس محميًا بما يكفي. المطلوب هو بناء عادات استشارة ثابتة حول أقوى المناطق (${strongestNames})، واستخدامها لدعم أضعف المناطق (${weakestNames}).`,
        };
      }
      return {
        title: "نمط قوة في تجربة العميل القانونية يحتاج إلى حماية وتوسيع",
        body: `قدرتك العامة على توجيه رحلة العميل القانونية قوية. الخطر ليس الضعف، بل التراخي. استخدم أقوى المناطق (${strongestNames}) كمعايير مهنية يومية، وراقب أضعف المناطق (${weakestNames}) حتى لا تتحول إلى نقاط احتكاك لاحقًا.`,
      };
    }

    if (overall < 30) {
      return {
        title: "High-Friction Legal Client Experience Pattern",
        body: `The current pattern suggests the issue is not one isolated skill. The weakest areas (${weakestNames}) may be creating a friction chain that begins with the first legal inquiry and ends with hesitation, comparison, or no clear next legal step. Do not start everywhere. Start with the first client journey friction point and build guidance around it.`,
      };
    }
    if (overall < 50) {
      return {
        title: "Legal Client Experience Warning Pattern",
        body: `There is legal expertise in the system, but it may not be showing clearly and consistently under consultation pressure, professional-fee discussion, or comparison with another lawyer. The weakest areas (${weakestNames}) need early treatment, while the strongest areas (${strongestNames}) can be used as professional leverage.`,
      };
    }
    if (overall < 75) {
      return {
        title: "Unfinished Legal Client Experience Pattern Requiring Systemization",
        body: `Your professional performance is not broken, but it is not protected enough. The guidance plan is to build repeatable consultation habits around the strongest areas (${strongestNames}) and use them to support the weakest areas (${weakestNames}).`,
      };
    }
    return {
      title: "Strong Legal Client Experience Pattern Requiring Protection",
      body: `Your overall ability to guide the legal client journey is strong. The danger is not failure; it is drift. Use the strongest areas (${strongestNames}) as daily professional standards and monitor the weakest areas (${weakestNames}) so they do not become future friction points.`,
    };
  }

  if (lang === "ar") {
    if (overall < 30) {
      return {
        title: "نمط هدر ونزيف حاد يحتاج إلى علاج من الجذور",
        body: `الصورة الحالية تشير إلى أن المشكلة ليست في نقطة واحدة فقط. أضعف المناطق (${weakestNames}) قد تخلق سلسلة هدر ونزيف تبدأ من السلوك اليومي وتنتهي بفرص أقل أو صفقات أبطأ. لا تبدأ بكل شيء. ابدأ بأول هدر ونزيف ثم ابنِ روتين علاج حوله.`,
      };
    }
    if (overall < 50) {
      return {
        title: "نمط إنذار تجاري يحتاج إلى ضبط الإيقاع",
        body: `هناك قدرة موجودة، لكنها غير ثابتة تحت الضغط. أضعف المناطق (${weakestNames}) تحتاج إلى علاج مبكر، بينما يمكن استخدام أقوى المناطق (${strongestNames}) كرافعة لتسريع التحسن.`,
      };
    }
    if (overall < 75) {
      return {
        title: "نمط فرصة غير مكتملة يحتاج إلى تحويل السلوك إلى نظام",
        body: `الأداء ليس ضعيفًا، لكنه ليس محميًا بما يكفي. المطلوب هو تحويل أقوى المناطق (${strongestNames}) إلى نظام يومي، واستخدامها لدعم أضعف المناطق (${weakestNames}).`,
      };
    }
    return {
      title: "نمط قوة يحتاج إلى حماية وتوسيع",
      body: `الأداء العام قوي. الخطر ليس الفشل، بل التراخي. استخدم أقوى المناطق (${strongestNames}) كمعايير تشغيل يومية، وراقب أضعف المناطق (${weakestNames}) حتى لا تصبح هدراً ونزيفاً لاحقًا.`,
    };
  }

  if (overall < 30) {
    return {
      title: "High-Leakage Pattern Requiring Root Treatment",
      body: `The current pattern suggests the issue is not one isolated skill. The weakest areas (${weakestNames}) may be creating a leakage chain that begins in daily behavior and ends in fewer opportunities or slower deals. Do not start everywhere. Start with the first leak and build treatment around it.`,
    };
  }
  if (overall < 50) {
    return {
      title: "Commercial Warning Pattern Requiring Rhythm Correction",
      body: `There is ability in the system, but it is not stable under pressure. The weakest areas (${weakestNames}) need early treatment, while the strongest areas (${strongestNames}) can be used as leverage to accelerate improvement.`,
    };
  }
  if (overall < 75) {
    return {
      title: "Unfinished Opportunity Pattern Requiring Systemization",
      body: `Performance is not broken, but it is not protected enough. The treatment is to turn the strongest areas (${strongestNames}) into a daily operating system and use them to support the weakest areas (${weakestNames}).`,
    };
  }
  return {
    title: "Strength Pattern Requiring Protection and Expansion",
    body: `Overall performance is strong. The danger is not failure; it is drift. Use the strongest areas (${strongestNames}) as daily operating standards and monitor the weakest areas (${weakestNames}) so they do not become future leakage.`,
  };
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const slug = params.slug;
  const attemptId = searchParams?.attemptId?.trim() || "";
  const urlLang = (searchParams?.lang || "").trim();

  if (!attemptId) {
    return <div className="p-10 text-center">Missing attemptId</div>;
  }

  const supabase = getSupabaseAdmin();

  const { data: attempt, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  const lang: Language = pickLang((attempt as any)?.language, urlLang);
  const ar = lang === "ar";

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center" data-rtl={ar ? "true" : "false"}>
        <div className="max-w-2xl mx-auto bg-white border rounded-3xl shadow-xl p-8">
          <h1 className="text-3xl font-black text-slate-900">
            {ar ? "التقرير غير موجود" : "Report not found"}
          </h1>
          <Link
            className="mt-6 inline-flex rounded-2xl bg-slate-900 text-white px-6 py-3 font-black"
            href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}
          >
            {ar ? "العودة إلى النتائج" : "Back to Results"}
          </Link>
        </div>
      </div>
    );
  }

  const assessment = await getAssessmentConfigServer(supabase, slug);
  const mri = isMriReport(slug, (attempt as any).assessment_id);
  const salesManager = isSalesManagerAssessment(slug, (attempt as any).assessment_id);
  const lawyer = isLawyerAssessment(slug, (attempt as any).assessment_id);
  const businessHealth = isBusinessHealthAssessment(slug, (attempt as any).assessment_id);
  const outdoorSalesMri = isOutdoorSalesMriReport(slug, (attempt as any).assessment_id);
  const outdoorSalesScan = isOutdoorSalesScanReport(slug, (attempt as any).assessment_id);
  const lawyerClientConversionMri =
    slug === "lawyer-client-conversion-mri" ||
    (attempt as any).assessment_id === "lawyer_client_conversion_mri";

  const labelsFromConfig: Record<string, { en: string; ar: string }> = {};
  const comps = Array.isArray((assessment as any)?.config?.competencies)
    ? (assessment as any).config.competencies
    : [];

  for (const c of comps) {
    const id = normalizeCompetencySafe(c?.id);
    if (!id) continue;
    labelsFromConfig[id] = {
      en: String(c?.en || ""),
      ar: String(c?.ar || ""),
    };
  }

  function getCompetencyLabel(competencyId: string): string {
    const key = normalizeCompetencySafe(competencyId);
    if (outdoorSalesMri && key === "dealing_with_boss") {
      return ar ? "التعامل مع الإدارة وبناء التوافق الداخلي" : "Managing Up & Internal Alignment";
    }

    const meta = COMPETENCY_LABELS[key] || labelsFromConfig[key] || null;

    if (meta) {
      return ar ? meta.ar || meta.en || key : meta.en || meta.ar || key;
    }

    return key.replace(/_/g, " ");
  }

  const competencyResults = Array.isArray((attempt as any).competency_results)
    ? (attempt as any).competency_results
    : [];

  const rows: CompetencyRow[] = competencyResults.map((raw: any) => {
    const competencyId = normalizeCompetencySafe(raw?.competencyId || raw?.key);
    const percentage = pct(raw?.percentage);
    return {
      competencyId,
      label: getCompetencyLabel(competencyId),
      percentage,
      tier: tierFromPercentage(percentage),
      score: Number(raw?.score || 0),
      maxScore: Number(raw?.maxScore || 0),
    };
  });

  const sortedRows = sortRows(rows);
  const strongest = getStrongest(rows);
  const weakest = getWeakest(rows);
  const priorityRows = getPriorityRows(rows);

  const strengths = rows.filter((r) => r.tier === "Strength");
  const opportunities = rows.filter((r) => r.tier === "Opportunity");
  const threats = rows.filter((r) => r.tier === "Threat");
  const weaknesses = rows.filter((r) => r.tier === "Weakness");

  const overall = pct((attempt as any).total_percentage);
  const overallTier: Tier = tierFromPercentage(overall);
  const identity = extractIdentity(attempt);

  const topThreeRisks = [...rows].sort((a, b) => a.percentage - b.percentage).slice(0, 3);
  const topThreeStrengths = [...rows].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  const weakestSixForTreatment = [...rows].sort((a, b) => a.percentage - b.percentage).slice(0, 6);
  const outdoorSalesFitnessPlan = outdoorSalesMri
    ? buildOutdoorSalesFitnessPlan(weakestSixForTreatment, topThreeStrengths[0] || null, lang)
    : [];
  const lawyerTreatmentPlan = lawyerClientConversionMri
    ? buildLawyerConversionTreatmentPlan(weakestSixForTreatment, topThreeStrengths[0] || null, lang)
    : [];
  const salesManager90DayPlan = salesManager
    ? buildSalesManager90DayPlan(weakestSixForTreatment, lang)
    : [];

  const reportTitle =
    lawyer && ar && mri ? (
      <ArabicLawyerBrand report />
    ) : salesManager && ar && mri ? (
      <ArabicSalesManagerMriTitle text="تقرير التشخيص المتقدم لمدير المبيعات" />
    ) : (ar
      ? (assessment as any)?.title_ar || (assessment as any)?.name_ar || ""
      : (assessment as any)?.title_en || (assessment as any)?.name_en || "") ||
    (mri
      ? ar
        ? lawyer ? "تقرير معيار كسب الموكلين™ من Career Labs AI" : businessHealth ? "تقرير Business Health MRI للشركات الصغيرة والمتوسطة" : salesManager ? "تقرير التشخيص المتقدم لمدير المبيعات" : "تقرير Outdoor Sales MRI المتقدم"
        : lawyer ? "Client Acquisition Standard™ by Career Labs AI Report" : businessHealth ? "Advanced SME Business Health MRI Report" : salesManager ? "Advanced Sales Manager MRI Report" : "Advanced Outdoor Sales MRI Report"
      : lawyer
      ? ar
        ? "تشخيص تجربة العميل القانونية"
        : "Legal Client Experience Diagnostic"
      : salesManager
      ? ar
        ? "فحص مدير المبيعات القيادي"
        : "Sales Manager Leadership Scan"
      : ar
      ? "فحص مندوبي المبيعات"
      : "Outdoor Sales Scan");

  const hardRtlCss = `
    [data-rtl="true"] * { direction: rtl !important; }
    [data-rtl="true"] .force-ltr { direction: ltr !important; text-align: left !important; unicode-bidi: isolate !important; }
    [data-rtl="true"] .rtl-text { text-align: right !important; unicode-bidi: plaintext !important; }
    [data-rtl="false"] .rtl-text { text-align: left !important; }
  `;

  const t = {
    en: {
      back: "Back to Results",
      badge: mri
        ? lawyer ? "Legal Client Experience Diagnostic" : businessHealth ? "Forensic SME Business Health Diagnostic" : "Full Diagnostic & Treatment Tool"
        : lawyer ? "Legal Client Experience Diagnostic" : businessHealth ? "SME Business Health Vital Signs Check" : salesManager ? "Sales Manager Leadership Blood Test" : "Sales Performance Blood Test",
      subtitle: mri
        ? lawyer
          ? "A personalized Client Acquisition Standard™ by Career Labs AI report designed to diagnose the legal client journey from first inquiry to the appropriate next legal step, including consultation clarity, legal-value clarity, professional fees, objections, and follow-up."
          : businessHealth
          ? "A personalized SME Business Health MRI designed to diagnose where the company is leaking cash, customers, team energy, execution discipline, owner time, and growth readiness then turn the findings into a practical business revamp roadmap."
          : salesManager
          ? "A personalized Sales Manager MRI designed to diagnose leadership patterns, team performance leaks, and management treatment priorities."
          : "A personalized Sales MRI designed to diagnose the full sales performance body and turn the findings into a practical treatment plan."
        : lawyer
        ? "A fast diagnostic scan of your legal client experience health from first impression to client trust, fee confidence, objections, and next legal step clarity."
        : businessHealth
        ? "A fast business health scan that checks the company’s vital signs across direction, revenue, marketing, cash, operations, people, owner dependency, and growth readiness."
        : salesManager
        ? "A fast leadership scan of your sales-management health like a blood test for the way you coach, inspect, forecast, motivate, and hold the team accountable."
        : "A fast diagnostic scan of your sales performance body like a blood test for field sales.",
      overall: lawyer ? "Legal Client Journey Health Index" : businessHealth ? "SME Business Health Score" : salesManager ? "Overall Sales Management Health Score" : "Overall Sales Health Score",
      overallMarker: lawyer ? "Legal Client Journey Health Index" : businessHealth ? "Business Health Index" : salesManager ? "Overall Sales Management Index" : "Overall Sales Health Index",
      participant: "Participant Identity",
      health: lawyer ? "Client Experience Health Zone" : businessHealth ? "Business Health Temperature" : salesManager ? "Management Health Zone" : "Sales Health Zone",
      bloodPanel: mri
        ? lawyer ? "15-Competency Client Acquisition Standard™ Panel" : businessHealth ? "12-Area SME Business Health MRI Panel" : salesManager ? "15-Competency Sales Manager MRI Panel" : "15-Competency Sales MRI Panel"
        : lawyer ? "Legal Client Journey Health Index: Overall Score + Professional Markers" : businessHealth ? "SME Business Health Panel: Overall Score + Vital Signs" : salesManager ? "Sales Manager Panel: Overall Score + 7 Leadership Markers" : "Sales Health Panel: Overall Score + 7 Core Markers",
      bloodPanelSub: mri
        ? lawyer
          ? "This deep diagnostic examines the full legal client journey across 15 competencies to reveal where consultation trust, legal-value clarity, professional-fee confidence, next legal step clarity, and client experience may need attention."
          : businessHealth
          ? "This deep diagnostic examines the business across 12 health areas to reveal where revenue, cash, customers, operations, people, owner dependency, risk, visibility, and growth readiness may be leaking."
          : salesManager
          ? "This is your deep management diagnostic panel. It examines the wider sales-manager role across 15 competencies to reveal strengths, leaks, root patterns, and treatment priorities."
          : "This is your deep diagnostic panel. It examines the wider sales performance body across 15 competencies to reveal strengths, leaks, root patterns, and treatment priorities."
        : lawyer
        ? "This panel combines your Legal Client Journey Health Index with core markers that reveal where you create trust, where clients hesitate, and what needs professional guidance."
        : businessHealth
        ? "This panel combines your overall business health score with the core areas that reveal where the company is stable, where it is leaking, and what needs executive treatment."
        : salesManager
        ? "This panel combines your overall management score with seven core markers that reveal where your leadership is strong, where the team may be leaking performance, and what needs attention."
        : "This panel combines your overall sales health score with the seven core markers that reveal where performance is strong, where it is leaking, and what needs treatment.",
      strongest: lawyer ? "Client Experience Priorities" : businessHealth ? "Strongest Business Health Signal" : salesManager ? "Strongest Management Signal" : "Strongest Signal",
      weakest: lawyer ? "Areas Requiring Attention" : businessHealth ? "Biggest Hidden Business Leak" : salesManager ? "Biggest Hidden Team Performance Leak" : "Biggest Hidden Revenue Leak",
      commercial: lawyer ? "Professional Interpretation" : businessHealth ? "Business Health Interpretation" : salesManager ? "Management Interpretation" : "Commercial Interpretation",
      swot: lawyer ? "Legal Client Experience SWOT Analysis" : businessHealth ? "SME Business Health SWOT Analysis" : "Strategic SWOT Analysis",
      actions: mri ? (lawyer ? "Professional Guidance Plan" : businessHealth ? "Business Revamp Treatment Priorities" : "Personal Treatment Priorities") : "Priority Execution Plan",
      prescriptionHeadline: lawyer ? "Your Client Acquisition Standard™ Shows the Friction Points. The Guidance Plan Shows What to Address First." : businessHealth ? "Your Business Health MRI Shows the Leaks. The Roadmap Shows What to Stabilize and Revamp First." : salesManager ? "Your Leadership Scan Shows the Symptoms. The Manager MRI Gives You the Treatment Plan." : "Your Scan Is the Blood Test. The MRI Gives You the Prescription.",
      prescriptionSubhead: lawyer ? "Client Acquisition Standard™ by Career Labs AI is a full diagnostic and professional guidance tool for legal inquiries, consultations, client trust, professional legal fees, objections, next legal steps, and client experience." : businessHealth ? "The Advanced SME Business Health MRI is a full diagnostic and roadmap tool for owners and general managers who want to stabilize leaks, strengthen the operating system, and identify the next revamp priorities." : salesManager ? "The Advanced Sales Manager MRI is a full diagnostic and treatment tool for coaching, pipeline, accountability, forecasting, and team execution." : "The Advanced Outdoor Sales MRI is a full diagnostic and treatment tool for your sales performance body.",
      prescriptionCta: lawyer ? "Get My Full Client Acquisition Standard™ Report" : businessHealth ? "Get My SME Business Health Roadmap" : salesManager ? "Get My Full Sales Manager MRI" : "Get My Full Sales MRI & 90-Day Prescription",
      enterpriseTitle: lawyer ? "For Law Firms, Managing Partners & Legal Platforms" : businessHealth ? "For SME Owners, General Managers & Partners" : salesManager ? "For Sales Directors, CEOs & Business Owners" : "For Sales Managers & Business Owners",
      enterpriseCta: lawyer ? "Diagnose the Lawyer Before You Train the Lawyer" : businessHealth ? "Diagnose the Business Before You Revamp the Business" : "Diagnose the Team Before You Train the Team",
    },
    ar: {
      back: "العودة إلى النتائج",
      badge: mri
        ? lawyer ? "تشخيص تجربة العميل القانونية" : businessHealth ? "تشخيص عميق ودقيق لصحة الشركات الصغيرة والمتوسطة" : "أداة تشخيص وعلاج كاملة"
        : lawyer ? "تشخيص تجربة العميل القانونية" : businessHealth ? "SCAN العلامات الحيوية لصحة الشركة" : salesManager ? "SCAN قيادي لمدير المبيعات" : "فحص دم لأداء المبيعات",
      subtitle: mri
        ? lawyer
          ? "تقرير معيار كسب الموكلين™ من Career Labs AI لتشخيص رحلة العميل من الاستفسار إلى الخطوة القانونية المناسبة، مروراً بالاستشارة، وضوح القيمة القانونية، أتعاب المحاماة، الاعتراضات، والمتابعة."
          : businessHealth
          ? "تقرير SME Business Health MRI شخصي لتشخيص أين تهدر الشركة السيولة، العملاء، طاقة الفريق، انضباط التنفيذ، وقت المالك، وجاهزية النمو  ثم تحويل النتائج إلى خارطة طريق عملية لتقوية الشركة."
          : salesManager
          ? "تقرير شخصي مفصل لتشخيص أنماط القيادة، وهدر ونزيف أداء الفريق، وأولويات التطوير الإداري."
          : "تقرير Sales MRI شخصي مصمم لتشخيص الجسم البيعي الكامل وتحويل النتائج إلى خطة علاج عملية."
        : lawyer
        ? "تشخيص سريع لصحة تجربة العميل القانونية من الانطباع الأول إلى ثقة العميل، عرض أتعاب المحاماة، الاعتراضات، والخطوة القانونية التالية."
        : businessHealth
        ? "SCAN سريع للعلامات الحيوية للشركة عبر الاتجاه، الإيرادات، التسويق، السيولة، العمليات، الأفراد، اعتماد الشركة على المالك، وجاهزية النمو."
        : salesManager
        ? "تشخيص قيادي سريع لصحة إدارتك لفريق المبيعات يشمل التدريب، ومسار الفرص البيعية، والتوقع، والتحفيز، والمساءلة."
        : "SCAN تشخيصي سريع لجسم أدائك البيعي  كأنه تحليل دم مهني وظيفي لمندوبي المبيعات.",
      overall: lawyer ? "مؤشر صحة رحلة العميل القانونية" : businessHealth ? "مؤشر صحة الشركة" : salesManager ? "مؤشر صحة إدارة المبيعات العام" : "مؤشر الصحة البيعية العام",
      overallMarker: lawyer ? "مؤشر صحة رحلة العميل القانونية" : businessHealth ? "مؤشر صحة الأعمال" : salesManager ? "مؤشر صحة إدارة المبيعات العام" : "مؤشر الصحة البيعية العام",
      participant: "هوية المشارك",
      health: lawyer ? "مستوى صحة تجربة العميل القانونية" : businessHealth ? "درجة حرارة صحة الشركة" : salesManager ? "منطقة الصحة الإدارية" : "منطقة الصحة البيعية",
      bloodPanel: mri
        ? lawyer ? "لوحة معيار كسب الموكلين™ عبر ١٥ كفاءة" : businessHealth ? "لوحة SME Business Health MRI عبر ١٢ منطقة" : salesManager ? "لوحة التشخيص المتقدم لمدير المبيعات عبر ١٥ كفاءة" : "لوحة MRI التشخيصية عبر ١٥ كفاءة"
        : lawyer ? "مؤشر صحة رحلة العميل القانونية: النتيجة العامة + المؤشرات المهنية" : businessHealth ? "لوحة صحة الشركة: النتيجة العامة + العلامات الحيوية" : salesManager ? "لوحة مدير المبيعات: النتيجة العامة + ٧ مؤشرات قيادية" : "لوحة الصحة البيعية: النتيجة العامة + ٧ مؤشرات أساسية",
      bloodPanelSub: mri
        ? lawyer
          ? "يفحص هذا التشخيص العميق رحلة العميل القانونية عبر ١٥ كفاءة ليكشف أين تحتاج ثقة العميل، وضوح القيمة القانونية، أتعاب المحاماة، الخطوة القانونية التالية، وتجربة العميل إلى تطوير."
          : businessHealth
          ? "يفحص هذا التشخيص العميق الشركة عبر ١٢ منطقة صحية ليكشف أين قد تتسرب الإيرادات، السيولة، العملاء، العمليات، الأفراد، وقت المالك، المخاطر، وضوح الإدارة، وجاهزية النمو."
          : salesManager
          ? "هذه لوحة تشخيص إداري عميق تفحص دور مدير المبيعات عبر ١٥ كفاءة لكشف نقاط القوة، الهدر والنزيف، الأسباب الجذرية، وأولويات العلاج."
          : "هذه لوحة تشخيص عميق تفحص جسم الأداء البيعي عبر ١٥ كفاءة لكشف نقاط القوة، الهدر والنزيف، الأسباب الجذرية، وأولويات العلاج."
        : lawyer
        ? "تجمع هذه اللوحة بين مؤشر صحة رحلة العميل القانونية والمؤشرات الأساسية التي تكشف أين تصنع الثقة، أين يتردد العميل، وما الذي يحتاج إلى توجيه مهني."
        : businessHealth
        ? "تجمع هذه اللوحة بين مؤشر صحة الشركة والمناطق الأساسية التي تكشف أين الشركة مستقرة، أين تتسرب، وما الذي يحتاج إلى علاج تنفيذي."
        : salesManager
        ? "تجمع هذه اللوحة بين نتيجتك الإدارية العامة وسبعة مؤشرات قيادية تكشف أين قيادتك قوية، أين يتسرّب أداء الفريق، وما الذي يحتاج إلى انتباه."
        : "تجمع هذه اللوحة بين مؤشر صحتك البيعية والسبعة مؤشرات الأساسية التي تكشف أين الأداء قوي، أين يتسرب، وما الذي يحتاج إلى علاج.",
      strongest: lawyer ? "أولويات تجربة العميل" : businessHealth ? "أقوى إشارة في صحة الشركة" : salesManager ? "أقوى إشارة إدارية" : "أقوى إشارة",
      weakest: lawyer ? "مجالات تحتاج إلى تطوير" : businessHealth ? "أكبر هدر ونزيف خفي في الشركة" : salesManager ? "أكبر هدر ونزيف مخفي في أداء الفريق" : "أكبر هدر ونزيف مخفي في الإيرادات",
      commercial: lawyer ? "التفسير المهني" : businessHealth ? "تفسير صحة الشركة" : salesManager ? "التفسير الإداري" : "التفسير العملي",
      swot: lawyer ? "تحليل SWOT لتجربة العميل القانونية" : businessHealth ? "تحليل SWOT لصحة الشركة" : salesManager ? "تحليل نقاط القوة والفرص والتهديدات والضعف" : "تحليل SWOT الاستراتيجي",
      actions: mri ? (lawyer ? "خطة التوجيه المهني" : businessHealth ? "أولويات علاج وإعادة تقوية الشركة" : "أولويات العلاج الشخصية") : "خطة التنفيذ ذات الأولوية",
      prescriptionHeadline: lawyer ? "تقريرك يكشف نقاط الاحتكاك. وخطة التوجيه توضّح ما يجب تطويره أولًا." : businessHealth ? "تقرير صحة الشركة يكشف الهدر والنزيف. وخارطة الطريق توضّح ما يجب تثبيته وتقويته أولًا." : salesManager ? "التشخيص القيادي يكشف الأعراض، والتشخيص المتقدم يقدّم خطة التطوير." : "ال SCAN  هو تحليل الدم. أما الـ MRI فيعطيك الوصفة العلاجية.",
      prescriptionSubhead: lawyer ? "معيار كسب الموكلين™ من Career Labs AI هو أداة تشخيص وتوجيه كاملة للاستفسارات القانونية، الاستشارة، ثقة العميل، أتعاب المحاماة، الاعتراضات، الخطوة القانونية التالية، وتجربة العميل." : businessHealth ? "تقرير Advanced SME Business Health MRI هو أداة تشخيص وخارطة طريق لأصحاب الشركات والمدراء العامين الذين يريدون تثبيت الهدر، تقوية نظام التشغيل، وتحديد أولويات إعادة بناء الشركة." : salesManager ? "أداة تشخيص وتطوير متكاملة تفحص التدريب، ومسار الفرص البيعية، والمساءلة، والتوقعات، وتنفيذ الفريق." : "تقرير Advanced Outdoor Sales MRI هو أداة تشخيص وعلاج كاملة لجسم أدائك البيعي.",
      prescriptionCta: lawyer ? "احصل على تقرير معيار كسب الموكلين™ الكامل" : businessHealth ? "احصل على خارطة طريق صحة الشركة" : salesManager ? "احصل على تقرير التشخيص المتقدم لمدير المبيعات" : "احصل على تقرير MRI الكامل ووصفة الـ ٩٠ يومًا",
      enterpriseTitle: lawyer ? "لشركات المحاماة والشركاء الإداريين والمنصات القانونية" : businessHealth ? "لأصحاب الشركات الصغيرة والمتوسطة والمدراء العامين والشركاء" : salesManager ? "لمدراء المبيعات والرؤساء التنفيذيين وأصحاب الشركات" : "لمدراء المبيعات وأصحاب الشركات",
      enterpriseCta: lawyer ? "شخّص المحامي قبل أن تدرّبه" : businessHealth ? "شخّص الشركة قبل أن تعيد بناءها" : "شخّص الفريق قبل أن تدرّبه",
    },
  }[lang];

  const overallMeaningText = lawyer
    ? lawyerOverallMeaning(overall, overallTier, lang)
    : businessHealth
    ? businessHealthOverallMeaning(overall, overallTier, lang)
    : salesManager
    ? managerOverallMeaning(overall, overallTier, lang)
    : overallCommercialMeaning(overall, overallTier, lang);

  const rowCommercialText = (row: CompetencyRow) =>
    lawyer
      ? lawyerCommercialMeaning(row.tier, row.label, lang)
      : businessHealth
      ? businessHealthCommercialMeaning(row.tier, row.label, lang)
      : salesManager
      ? managerCommercialMeaning(row.tier, row.label, lang)
      : commercialMeaning(row.tier, row.label, lang);

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      data-rtl={ar ? "true" : "false"}
      className="scan-report-container min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900"
    >
      <style dangerouslySetInnerHTML={{ __html: hardRtlCss }} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* TOP BAR */}
        <div className="print-hide flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-md p-4">
          <div className="text-xs sm:text-sm text-slate-600 font-bold rtl-text">
            {ar ? "معرّف التقرير" : "Report ID"}:{" "}
            <span className="font-mono text-blue-700 force-ltr">{shortAttemptId(attemptId)}</span>
          </div>

<div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full lg:w-auto">

  <EmailReportButton />

  <Link
    href={`/${slug}/results?attemptId=${encodeURIComponent(attemptId)}&lang=${lang}`}
    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2.5 transition-all shadow-lg text-sm min-h-[44px] whitespace-nowrap"
  >
    {t.back}
  </Link>

</div>

</div>

        {/* COVER */}
        <section className={`${mri ? "web-cover-print-hide" : ""} avoid-break relative overflow-hidden rounded-3xl shadow-2xl border border-slate-800/10`}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-400 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-indigo-400 blur-3xl" />
          </div>

          <div className="relative p-7 sm:p-10 md:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_.7fr] gap-8 lg:gap-12 items-center">
              <div className="space-y-5 sm:space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs sm:text-sm font-black text-blue-100 uppercase tracking-widest">
                  {mri ? "🔬" : "🧪"} {t.badge}
                </div>

                <div>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-tight rtl-text">
                    {reportTitle}
                  </h1>
                  <p className="mt-4 text-base sm:text-xl text-blue-100 leading-relaxed max-w-3xl rtl-text">
                    {lawyer && ar && mri ? (
                      <>
                        <ArabicLawyerBrand report /> لتشخيص رحلة العميل من الاستفسار إلى الخطوة القانونية المناسبة، مروراً بالاستشارة، ووضوح القيمة القانونية، وأتعاب المحاماة، والاعتراضات، والمتابعة.
                      </>
                    ) : salesManager && ar && mri ? (
                      <>
                        <ArabicSalesManagerMriTitle text="تقرير شخصي مفصل للتشخيص المتقدم لمدير المبيعات" />
                        {" "}لتشخيص أنماط القيادة، وهدر ونزيف أداء الفريق، وأولويات التطوير الإداري.
                      </>
                    ) : t.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <InfoChip label={ar ? "الاسم" : "Name"} value={identity.fullName} />
                  <InfoChip label={ar ? "الشركة" : "Company"} value={identity.company} />
                  <InfoChip label={ar ? "البريد" : "Email"} value={identity.email} forceLtr />
                </div>
              </div>


              <div className="relative flex justify-center">
                <div className="relative h-64 w-64 sm:h-72 sm:w-72 rounded-full border-[12px] border-white/10 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl">
                  <div className="absolute inset-6 rounded-full border border-white/10" />
                  <div className="text-center">
                    <div className="text-6xl sm:text-7xl font-black text-white">{overall}%</div>
                    <div className="mt-2 text-xs font-black uppercase tracking-widest text-blue-100">
                      {t.overall}
                    </div>
                    <div className="mt-4">
                      <span className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${tierBadgeClass(overallTier)}`}>
                        {getTierLabel(overallTier, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* MRI VALUE POSITIONING */}
        {mri && (
          <section className="avoid-break rounded-3xl overflow-hidden shadow-2xl border border-indigo-200">
            <div className="bg-gradient-to-br from-indigo-950 via-slate-950 to-blue-950 text-white p-7 sm:p-10">
              <div className="inline-flex rounded-full bg-amber-400/20 border border-amber-300/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-100">
                {ar ? "تقرير مدفوع متقدم" : "Premium Advanced Report"}
              </div>

              <h2 className="mt-5 text-3xl sm:text-5xl font-black leading-tight rtl-text">
                {ar
                  ? "هذا ليس تقرير نتائج. هذه أداة تشخيص وعلاج كاملة."
                  : "This Is Not a Score Report. It Is a Full Diagnostic and Treatment Tool."}
              </h2>

              <p className="mt-5 text-base sm:text-xl text-blue-100 leading-relaxed max-w-4xl rtl-text">
                {lawyer
                  ? ar
                    ? "يعرض هذا التقرير الشخصي المفصل صورة أعمق لتجربة العميل القانونية. إنه لا يكتفي بإخبارك أين انخفضت الدرجة، بل يساعدك على فهم أنماط الاستشارة، ثقة العميل، عرض أتعاب المحاماة، الخطوة القانونية التالية، وأولويات التوجيه التي يجب التعامل معها أولًا."
                    : "This personalized report gives you a deeper view of your legal client experience. It does not simply tell you where the score is low; it helps you understand consultation patterns, client-trust risks, professional-fee confidence, next legal steps, and the guidance priorities that should be addressed first."
                  : businessHealth
                  ? ar
                    ? "يعرض هذا التقرير الشخصي المفصل صورة أعمق لصحة الشركة كنظام كامل. إنه لا يكتفي بإخبارك أين انخفضت الدرجة، بل يساعدك على فهم مصادر الهدر والنزيف في السيولة، العملاء، العمليات، الأفراد، وقت المالك، المخاطر، وجاهزية النمو  ثم يحوّلها إلى أولويات تقوية وخارطة طريق عملية."
                    : "This personalized report gives you a deeper view of the business health body as a complete operating system. It does not simply tell you where the score is low; it helps you understand cash leaks, customer leaks, operating gaps, people accountability issues, owner-time dependency, risk exposure, and growth-readiness priorities."
                  : salesManager
                  ? ar
                    ? "يعرض هذا التقرير الشخصي المفصل صورة أعمق لطريقة قيادتك لفريق المبيعات. إنه لا يكتفي بإخبارك أين انخفضت الدرجة، بل يساعدك على فهم أنماط القيادة، هدر ونزيف في أداء الفريق، وأولويات العلاج الإداري التي يجب التعامل معها أولًا."
                    : "This personalized report gives you a deeper view of how you lead sales performance through people, pipeline, coaching, forecasting, and accountability. It does not simply tell you where the score is low; it helps you understand leadership patterns, team-performance risks, and management treatment priorities."
                  : ar
                  ? "يعرض هذا التقرير الشخصي المفصل صورة أعمق لجسم أدائك البيعي. إنه لا يكتفي بإخبارك أين انخفضت الدرجة، بل يساعدك على فهم الأسباب الجذرية، المخاطر التجارية، وأولويات العلاج التي يجب التعامل معها أولًا."
                  : "This personalized report gives you a deeper view of your sales performance body. It does not simply tell you where the score is low; it helps you understand root patterns, commercial risks, and the treatment priorities that should be corrected first."}
              </p>

              <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">
                <DarkInsight
                  title={ar ? "تشخيص أعمق" : "Deeper diagnosis"}
                  body={
                    lawyer
                      ? ar
                        ? "يفحص التقرير ١٥ كفاءة في تجربة العميل القانونية بدل الاكتفاء بالمؤشرات السريعة."
                        : "The report examines 15 legal client experience competencies instead of stopping at basic markers."
                      : businessHealth
                      ? ar
                        ? "يفحص التقرير ١٢ منطقة حيوية في صحة الشركة بدل الاكتفاء بمؤشرات عامة أو انطباعات سريعة."
                        : "The report examines 12 business health areas instead of stopping at basic indicators or surface impressions."
                      : salesManager
                      ? ar
                        ? "يفحص التقرير ١٥ كفاءة إدارية لمدير المبيعات بدل الاكتفاء بالمؤشرات السريعة."
                        : "The report examines 15 sales-management competencies instead of stopping at basic markers."
                      : ar
                      ? "يفحص التقرير ١٥ كفاءة بيعية بدل الاكتفاء بالمؤشرات الأساسية."
                      : "The report examines 15 sales competencies instead of stopping at basic markers."
                  }
                />
                <DarkInsight
                  title={ar ? "خطة علاج شخصية" : "Personal treatment plan"}
                  body={
                    lawyer
                      ? ar
                        ? "أولويات التوجيه مبنية على إجاباتك ودرجاتك في رحلة الاستفسار القانوني والاستشارة وأتعاب المحاماة والخطوة القانونية التالية، وليست نصائح عامة."
                        : "The legal client experience guidance priorities are built from your answers and scores across inquiry, consultation, professional fees, and next legal steps, not from generic advice."
                      : salesManager
                      ? ar
                        ? "ترتيب أولويات العلاج الإداري مبني على إجاباتك ودرجاتك، وليس على نصائح عامة للقيادة."
                        : "The management treatment priorities are built from your answers and scores, not from generic leadership advice."
                      : ar
                      ? "ترتيب أولويات العلاج مبني على إجاباتك ودرجاتك، وليس على نصائح عامة."
                      : "The treatment priorities are built from your answers and scores, not from generic advice."
                  }
                />
                <DarkInsight
                  title={ar ? "وصفة ٩٠ يومًا" : "90-day prescription"}
                  body={
                    lawyer
                      ? ar
                        ? "الخطة تساعدك على معرفة ما الذي يجب إصلاحه أولًا في افتتاح الاستشارة، بناء الثقة، شرح القيمة القانونية، عرض أتعاب المحاماة، والمتابعة بعد الاستشارة."
                        : "The plan helps you know what to fix first in consultation opening, client trust, legal-value clarity, professional fees, and post-consultation follow-up."
                      : salesManager
                      ? ar
                        ? "الخطة تساعدك على معرفة ما الذي يجب إصلاحه أولًا في التدريب، مسار الفرص البيعية، المساءلة، وإيقاع الفريق."
                        : "The plan helps you know what to fix first in coaching, pipeline inspection, accountability, and team rhythm."
                      : ar
                      ? "الخطة تساعدك على معرفة ماذا تصلح أولًا، ماذا تتدرب عليه، وماذا تتوقف عن فعله."
                      : "The plan helps you know what to fix first, what to practice, and what to stop doing."
                  }
                />
              </div>
            </div>
          </section>
        )}


        {/* OVERALL DIAGNOSIS */}
        <section className="avoid-break rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
          {sectionTitle(t.overall, ar ? "قراءة تشخيصية سريعة لما تكشفه النتيجة العامة." : "A quick diagnostic reading of what the overall score reveals.")}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-3xl bg-slate-950 text-white p-6 shadow-xl">
              <div className="text-sm font-black text-blue-200 uppercase tracking-widest">{t.health}</div>
              <div className="mt-3 text-3xl font-black rtl-text">{lawyer ? lawyerHealthLabel(overall, lang) : businessHealth ? businessHealthLabel(overall, lang) : healthLabel(overall, lang)}</div>
              <div className="mt-4">
                <span className={`inline-flex rounded-full px-4 py-2 text-sm font-black ${tierBadgeClass(overallTier)}`}>
                  {overall}% · {getTierLabel(overallTier, lang)}
                </span>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-6">
              <h3 className="text-xl font-black text-slate-950 rtl-text">
                {businessHealth ? (ar ? "ما الذي يعنيه هذا لصحة الشركة؟" : "What this means for the business") : ar ? "ما الذي يعنيه هذا عملياً" : "What this means commercially"}
              </h3>
              <p className="mt-3 text-slate-700 leading-relaxed rtl-text">
                {overallMeaningText}
              </p>
            </div>
          </div>
        </section>

        {/* SALES HEALTH / MRI PANEL */}
        <section className={`${mri ? "web-diagnostic-panel-print-hide" : ""} rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8`}>
          {sectionTitle(
            salesManager && ar && mri ? (
              <ArabicSalesManagerMriTitle text="لوحة التشخيص المتقدم لمدير المبيعات عبر ١٥ كفاءة" />
            ) : t.bloodPanel,
            t.bloodPanelSub
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`avoid-break rounded-3xl border-2 ${tierSoftClass(overallTier)} p-5 shadow-sm`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {ar ? "المؤشر العام" : "Overall Marker"}
                  </div>
                  <h3 className="mt-1 text-xl font-black text-slate-950 rtl-text">{t.overallMarker}</h3>
                </div>

                <div className="text-right force-ltr">
                  <div className="text-3xl font-black text-slate-950">{overall}%</div>
                  <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(overallTier)}`}>
                    {getTierLabel(overallTier, lang)}
                  </span>
                </div>
              </div>

              <div className="mt-4 h-3 rounded-full bg-white/80 overflow-hidden border border-slate-200">
                <div className="h-full rounded-full bg-slate-900" style={{ width: `${overall}%` }} />
              </div>

              <p className="mt-4 text-sm font-semibold text-slate-700 leading-relaxed rtl-text">
                {lawyer
                  ? ar
                    ? "القراءة المجمعة لمؤشرات تجربة العميل القانونية."
                    : "The combined reading of your full legal client experience MRI."
                  : businessHealth
                  ? ar
                    ? "القراءة المجمعة لمناطق صحة الشركة الاثنتي عشرة."
                    : "The combined reading of your full SME Business Health MRI."
                  : salesManager
                  ? ar
                    ? "القراءة المجمعة لمؤشرات إدارتك لفريق المبيعات."
                    : "The combined reading of your sales-management leadership scan."
                  : ar ? "القراءة المجمعة لكل مؤشرات أدائك البيعي." : "The combined reading of your full sales performance scan."}
              </p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed rtl-text">
                {overallMeaningText}
              </p>
            </div>

            {sortedRows.map((row, idx) => (
              <div key={`${row.competencyId}-${idx}`} className={`avoid-break rounded-3xl border-2 ${tierSoftClass(row.tier)} p-5 shadow-sm`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      {ar ? "المؤشر" : `Marker ${idx + 1}`}
                    </div>
                    <h3 className="mt-1 text-xl font-black text-slate-950 rtl-text">{row.label}</h3>
                  </div>

                  <div className="text-right force-ltr">
                    <div className="text-3xl font-black text-slate-950">{row.percentage}%</div>
                    <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(row.tier)}`}>
                      {getTierLabel(row.tier, lang)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 h-3 rounded-full bg-white/80 overflow-hidden border border-slate-200">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: `${row.percentage}%` }} />
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-700 leading-relaxed rtl-text">
                  {shortDiagnosis(row.tier, lang)}
                </p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed rtl-text">
                  {rowCommercialText(row)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* MRI ROOT-CAUSE SNAPSHOT */}
        {mri && (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
            {sectionTitle(
              ar ? "خريطة الأسباب الجذرية" : "Root-Cause Priority Map",
              ar
                ? "هذه الخريطة تختار أقل المناطق أداءً وتحوّلها إلى أولويات علاجية واضحة."
                : "This map selects the lowest-performing areas and turns them into clear treatment priorities."
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {topThreeRisks.map((row, index) => (
                <div key={`risk-${row.competencyId}`} className={`rounded-3xl border-2 ${tierSoftClass(row.tier)} p-5 shadow-sm`}>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500 rtl-text">
                    {ar ? `أولوية علاج ${index + 1}` : `Treatment Priority ${index + 1}`}
                  </div>
                  <h3 className="mt-2 text-xl font-black text-slate-950 rtl-text">{row.label}</h3>
                  <div className="mt-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(row.tier)}`}>
                      {row.percentage}% · {getTierLabel(row.tier, lang)}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-slate-700 leading-relaxed rtl-text">
                    {lawyer
                      ? ar
                        ? "هذه المنطقة قد تكون سببًا جذريًا في تردد العميل أو ضعف الثقة أو تأخر الخطوة القانونية التالية. ابدأ تطويرها قبل محاولة إصلاح كل شيء."
                        : "This area may be a root contributor to client hesitation, weak client trust, professional-fee hesitation, or delayed next legal steps. Address it before trying to fix everything."
                      : businessHealth
                      ? ar
                        ? "هذه المنطقة قد تكون سببًا جذريًا في هدر ونزيف في السيولة أو العملاء أو طاقة الفريق أو وقت المالك أو جاهزية النمو. ابدأ علاجها قبل محاولة إصلاح كل شيء."
                        : "This area may be a root contributor to cash leakage, customer leakage, team-energy drain, owner-time dependency, or weak growth readiness. Treat it before trying to fix everything."
                      : salesManager
                      ? ar
                        ? "هذه المنطقة قد تكون سببًا جذريًا في هدر ونزيف في أداء الفريق أو ضعف الانضباط أو تراجع وضوح القيادة. ابدأ علاجها قبل محاولة إصلاح كل شيء."
                        : "This area may be a root contributor to team-performance leakage, weak execution discipline, or loss of leadership clarity. Treat it before trying to fix everything."
                      : ar
                      ? "هذه المنطقة قد تكون سببًا جذريًا في هدر ونزيف الفرص أو ضعف الزخم أو تراجع الثقة أثناء البيع. ابدأ علاجها قبل محاولة إصلاح كل شيء."
                      : "This area may be a root contributor to opportunity leakage, weak momentum, or loss of confidence during the sale. Treat it before trying to fix everything."}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}


        {/* STRONGEST / WEAKEST */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SignalCard
            title={t.strongest}
            row={strongest}
            lang={lang}
            description={
              lawyer
                ? ar
                  ? "هذه هي المنطقة التي يمكن استخدامها كرافعة مهنية، لأنها تكشف سلوكًا يساعد العميل المحتمل على الثقة بك وفهم قيمتك القانونية واتخاذ الخطوة القانونية التالية."
                  : "This is the area you can use as professional leverage because it reveals a behavior that supports client trust, legal-value clarity, and next-step confidence."
                : businessHealth
                ? ar
                  ? "هذه هي المنطقة التي يمكن استخدامها كرافعة تنفيذية، لأنها تكشف جزءًا من الشركة يمكن أن يساعد في تثبيت السيولة، العملاء، الفريق، أو قابلية النمو."
                  : "This is the area you can use as executive leverage because it reveals a part of the business that can help stabilize cash, customers, people, execution, or growth readiness."
                : salesManager
                ? ar
                  ? "هذه هي المنطقة التي يمكن استخدامها كرافعة إدارية، لأنها تكشف سلوكًا قياديًا يدعم ثقة الفريق والانضباط والتنفيذ."
                  : "This is the area you can use as management leverage because it reveals a leadership behavior that supports team confidence, discipline, and execution."
                : ar
                ? "هذه هي المنطقة التي يمكن استخدامها كرافعة للأداء، لأنها تكشف سلوكًا يدعم الثقة والتحكم في المحادثة."
                : "This is the area you can use as leverage because it reveals a behavior that supports confidence and sales control."
            }
          />

          <SignalCard
            title={t.weakest}
            row={weakest}
            lang={lang}
            description={
              lawyer
                ? ar
                  ? "هذه ليست مجرد نتيجة منخفضة. إنها غالبًا المكان الذي يبدأ فيه تردد العميل أو ضعف الثقة أو عدم وضوح القيمة القانونية قبل أن يصبح واضحًا."
                  : "This is not just a low score. It is often where client hesitation, weak client trust, unclear legal value, or delayed next legal steps begin before they become obvious."
                : businessHealth
                ? ar
                  ? "هذه ليست مجرد نتيجة منخفضة. إنها غالبًا المكان الذي يبدأ فيه هدر ونزيف في الشركة قبل أن يظهر في السيولة، العملاء، العمليات، الفريق، أو وقت المالك."
                  : "This is not just a low score. It is often where business leakage begins before it shows up clearly in cash, customers, operations, people, or owner time."
                : salesManager
                ? ar
                  ? "هذه ليست مجرد نتيجة منخفضة. إنها غالبًا المكان الذي يبدأ فيه هدر ونزيف في أداء الفريق أو ضعف المساءلة أو اضطراب مسار الفرص البيعية دون أن يكون واضحًا في البداية."
                  : "This is not just a low score. It is often where team-performance leakage, weak accountability, or pipeline confusion begins before it becomes obvious."
                : ar
                ? "هذه ليست مجرد نتيجة منخفضة. إنها غالبًا المكان الذي يبدأ فيه هدر ونزيف في الفرص دون أن يكون واضحًا في البداية."
                : "This is not just a low score. It is often where opportunity leakage begins before it becomes obvious."
            }
          />
        </section>

        {/* COMMERCIAL INTERPRETATION */}
        <section className="avoid-break rounded-3xl bg-gradient-to-br from-slate-950 to-blue-950 text-white shadow-2xl p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight rtl-text">
              {t.commercial}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-blue-100 leading-relaxed rtl-text">
              {lawyer
                ? ar
                  ? "قراءة مهنية مختصرة لما قد يحدث داخل رحلة الاستشارة، الثقة، أتعاب المحاماة، والخطوة القانونية التالية."
                  : "A practical professional reading of what may be happening inside the legal inquiry, consultation, trust, fee, and next-step journey."
                : salesManager
                ? ar
                  ? "قراءة إدارية مختصرة لما قد يحدث داخل الفريق ومسار الفرص البيعية."
                  : "A practical management reading of what may be happening inside the team and pipeline."
                : ar ? "قراءة عملية مختصرة لما قد يحدث في الميدان." : "A practical commercial reading of what may be happening in the field."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DarkInsight
              title={lawyer ? (ar ? "ما يعيشه العميل المحتمل" : "What potential clients experience") : businessHealth ? (ar ? "ما تعيشه الشركة فعليًا" : "What the business is experiencing") : salesManager ? (ar ? "ما يعيشه الفريق" : "What the team experiences") : (ar ? "ما يشعر به العميل" : "What prospects experience")}
              body={
                lawyer
                  ? ar
                    ? "العميل المحتمل لا يرى نتيجتك. هو يختبر وضوحك، هدوءك، قدرتك على تشخيص المشكلة القانونية، شرح الخيارات، عرض أتعاب المحاماة بثقة، وتحديد الخطوة القانونية التالية."
                    : "Potential clients do not see your score. They experience your clarity, calm authority, legal diagnosis, explanation of options, confidence in presenting professional fees, and ability to guide the next legal step."
                  : businessHealth
                  ? ar
                    ? "الشركة لا تعيش نتيجتك كرقم. هي تعيشها كتدفق نقدي مضغوط، عملاء يتسربون، عمليات تعتمد على الأشخاص، فريق ينتظر التوجيه، وقرارات تحتاج إلى رؤية أوضح."
                    : "The business does not experience your score as a number. It experiences it as cash pressure, customer leakage, people dependency, operational friction, scattered visibility, and decisions made without enough rhythm."
                  : salesManager
                  ? ar
                    ? "الفريق لا يرى نتيجتك. هو يختبر طريقة تدريبك، فحصك لمسار الفرص البيعية، وضوح المساءلة، وعدالة تعاملك مع الأداء الصعب."
                    : "The team does not see your score. They experience your coaching rhythm, pipeline inspection, accountability clarity, and fairness with difficult performance."
                  : ar
                  ? "العميل لا يرى درجاتك. هو يشعر بطريقة افتتاحك، عمق أسئلتك، صبرك مع الاعتراضات، وقدرتك على المتابعة."
                  : "Prospects do not see your score. They experience your opening, question depth, patience with objections, and follow-up discipline."
              }
            />

            <DarkInsight
              title={lawyer ? (ar ? "أين تظهر نقاط الاحتكاك" : "Where friction happens") : ar ? "أين يحدث الهدر والنزيف" : "Where leakage happens"}
              body={
                weakest
                  ? ar
                    ? lawyer
                      ? `أبرز نقطة احتكاك ظاهرة الآن مرتبطة بـ ${weakest.label}. هذه المنطقة قد تؤثر على ثقة العميل، وضوح الاستشارة القانونية، عرض أتعاب المحاماة، أو الخطوة القانونية التالية قبل أن يظهر السبب الحقيقي.`
                      : businessHealth
                      ? `أكبر هدر ونزيف ظاهر الآن مرتبط بـ ${weakest.label}. هذه المنطقة قد تستنزف السيولة أو العملاء أو وقت المالك أو طاقة الفريق أو جاهزية النمو قبل أن يظهر السبب الحقيقي.`
                      : salesManager
                      ? `أكبر هدر ونزيف ظاهر الآن مرتبط بـ ${weakest.label}. هذه المنطقة قد تؤثر على أداء الفريق أو وضوح مسار الفرص البيعية أو الانضباط قبل أن يظهر السبب الحقيقي.`
                      : `أكبر هدر ونزيف ظاهر الآن مرتبط بـ ${weakest.label}. هذه المنطقة قد تجعل الفرص تتوقف أو تضعف قبل أن تعرف السبب الحقيقي.`
                    : lawyer
                    ? `The clearest friction signal is currently connected to ${weakest.label}. This area may weaken client trust, consultation clarity, professional fee confidence, or the next legal step before the real reason is visible.`
                    : businessHealth
                    ? `The clearest business leak is currently connected to ${weakest.label}. This area may quietly drain cash, customers, owner time, team energy, operating discipline, or growth readiness before the root cause becomes obvious.`
                    : salesManager
                    ? `The clearest leakage signal is currently connected to ${weakest.label}. This area may weaken team performance, pipeline clarity, or execution discipline before the real reason is visible.`
                    : `The clearest leakage signal is currently connected to ${weakest.label}. This area may stall or weaken opportunities before the real reason is visible.`
                  : ar
                  ? lawyer ? "لا توجد بيانات كافية لتحديد نقطة الاحتكاك." : "لا توجد بيانات كافية لتحديد منطقة الهدر والنزيف."
                  : lawyer ? "There is not enough data to identify the friction area." : "There is not enough data to identify the leakage area."
              }
            />

            <DarkInsight
              title={ar ? "ما يجب إصلاحه أولًا" : "What to fix first"}
              body={
                ar
                  ? "لا تبدأ بإصلاح كل شيء. ابدأ بالمؤشر الأضعف، ثم المؤشر الواقع في منطقة الخطر، ثم حوّل نقاط القوة إلى روتين يومي."
                  : "Do not try to fix everything first. Start with the weakest marker, then the warning-zone marker, then turn your strengths into daily routines."
              }
            />
          </div>
        </section>

        {/* SWOT */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
          {sectionTitle(
            t.swot,
            ar
              ? lawyer ? "ليس مجرد تصنيف للكفاءات، بل قراءة لما تعنيه النتائج داخل تجربة العميل القانونية." : businessHealth ? "ليس مجرد تصنيف للمناطق، بل قراءة لما تعنيه النتائج داخل صحة الشركة واستقرارها وقابليتها للنمو." : "ليس مجرد تصنيف للكفاءات، بل قراءة لما تعنيه النتائج في الأداء البيعي الحقيقي."
              : lawyer ? "Not just a category list but a practical reading of what the results mean inside the legal client experience journey." : businessHealth ? "Not just a category list but a practical reading of what the results mean inside the company’s health, stability, and growth system." : "Not just a category list but a practical reading of what the results mean in real sales performance."
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SwotBox
              title={ar ? "نقاط القوة" : "Strengths"}
              tier="Strength"
              rows={strengths}
              empty={ar ? "لا توجد نقاط قوة واضحة حتى الآن." : "No clear strengths yet."}
              explanation={
                ar
                  ? lawyer ? "هذه المناطق يمكن تثبيتها كعادات مهنية ثابتة تعزز الثقة، وضوح الاستشارة، والخطوة القانونية التالية." : "هذه المناطق يمكن تحويلها إلى عادات ثابتة تدعم بقية الأداء."
                  : lawyer ? "These areas can be turned into repeatable professional habits that strengthen trust, consultation clarity, and next legal steps." : "These areas can be turned into repeatable habits that support the rest of the performance."
              }
              lang={lang}
            />

            <SwotBox
              title={ar ? "الفرص" : "Opportunities"}
              tier="Opportunity"
              rows={opportunities}
              empty={ar ? "لا توجد فرص مصنفة هنا." : "No opportunities listed here."}
              explanation={
                lawyer
                  ? ar
                    ? "هذه المناطق ليست ضعيفة، لكنها تحتاج إلى صياغة مهنية أوضح حتى تزيد الثقة وتدعم الخطوة القانونية التالية."
                    : "These areas are not broken, but they need clearer professional structure before they reliably improve trust and next-step decisions."
                  : ar
                  ? "هذه المناطق ليست ضعيفة، لكنها تحتاج إلى تنظيم وممارسة حتى تصبح مصدر قوة."
                  : "These areas are not broken, but they need structure and practice before they become strengths."
              }
              lang={lang}
            />

            <SwotBox
              title={ar ? "التهديدات" : "Threats"}
              tier="Threat"
              rows={threats}
              empty={ar ? "لا توجد مناطق خطر واضحة." : "No clear threats listed."}
              explanation={
                lawyer
                  ? ar
                    ? "هذه إشارات إنذار. إذا تُركت دون تطوير، قد تسبب زعزعة في ثقة العميل، وضوح الاستشارة، عرض أتعاب المحاماة، أو الخطوة القانونية التالية."
                    : "These are warning signals. If left unaddressed, they may create friction in client trust, consultation clarity, professional-fee confidence, or next legal steps."
                  : salesManager
                  ? ar
                    ? "هذه إشارات إنذار. إذا تُركت دون علاج، قد تسبب هدراً ونزيفاً في وضوح مسار الفرص البيعية، المساءلة، جودة التوقعات، أو تنفيذ الفريق."
                    : "These are warning signals. If left untreated, they may create leakage in pipeline clarity, accountability, forecast quality, or team execution."
                  : businessHealth
                  ? ar
                    ? "هذه إشارات إنذار. إذا تُركت دون علاج، قد تسبب هدراً ونزيفاً في السيولة والعملاء والتنفيذ ووقت المالك واستعداد الشركة للنمو."
                    : "These are warning signals. If left untreated, they may create leakage in cash, customers, execution, owner time, or growth readiness."
                  : ar
                  ? "هذه إشارات إنذار. إذا تُركت دون علاج، قد تسبب هدراً ونزيفاً في مسار التدفّق والمتابعة والثقة."
                  : "These are warning signals. If left untreated, they may create leakage in pipeline movement, follow-up, or confidence."
              }
              lang={lang}
            />

            <SwotBox
              title={ar ? "نقاط الضعف" : "Weaknesses"}
              tier="Weakness"
              rows={weaknesses}
              empty={ar ? "لا توجد نقاط ضعف مصنفة هنا." : "No weaknesses listed here."}
              explanation={
                lawyer
                  ? ar
                    ? "هذه المناطق تحتاج إلى تطوير مهني مباشر، لأنها غالبًا تؤثر على الانطباع الأول، ثقة العميل، وضوح القيمة القانونية، أو الخطوة القانونية التالية."
                    : "These areas need direct professional guidance because they often affect first impressions, client trust, legal-value clarity, or next-step progress."
                  : salesManager
                  ? ar
                    ? "هذه المناطق تحتاج إلى تدخل إداري مباشر، لأنها غالبًا تؤثر على التدريب، المساءلة، وضوح التوقعات، أو تنفيذ الفريق."
                    : "These areas need direct management intervention because they often affect coaching, accountability, forecast clarity, or team execution."
                  : businessHealth
                  ? ar
                    ? "هذه المناطق تحتاج إلى تدخل مباشر، لأنها غالبًا تؤثر على وضوح الإدارة أو تدفق الإيرادات أو استقرار التشغيل أو ثقة العملاء."
                    : "These areas need direct intervention because they often affect management visibility, revenue flow, operating stability, or customer confidence."
                  : ar
                  ? "هذه المناطق تحتاج إلى تدخل مباشر، لأنها غالبًا تؤثر على الانطباع الأول أو تقدم الصفقة."
                  : "These areas need direct intervention because they often affect first impressions or deal progression."
              }
              lang={lang}
            />
          </div>
        </section>

        {/* SCAN-ONLY PRIORITY ACTIONS */}
        {!mri && (
          <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
            {sectionTitle(
              t.actions,
              ar
                ? "اخترنا لك التوصيات حسب المناطق الأضعف والأكثر خطورة، وليس بصورة عامة."
                : "These recommendations are selected from your weakest and highest-risk areas, not from generic advice."
            )}

            <div className="space-y-5">
              <ActionBlock
                index={1}
                title={lawyer ? (ar ? "أولوية مهنية عامة" : "Overall Professional Priority") : salesManager ? (ar ? "أولوية إدارية عامة" : "Overall Management Priority") : (ar ? "أولوية عامة" : "Overall Priority")}
                tier={overallTier}
                percentage={overall}
                recommendations={getRecommendations(lawyer ? "lawyer_client_conversion_overall_score" : salesManager ? "sales_manager_overall_score" : "overall_score", overallTier, lang)}
                lang={lang}
              />

              {priorityRows.map((row, idx) => (
                <ActionBlock
                  key={row.competencyId}
                  index={idx + 2}
                  title={row.label}
                  tier={row.tier}
                  percentage={row.percentage}
                  recommendations={getRecommendations(row.competencyId, row.tier, lang)}
                  lang={lang}
                />
              ))}
            </div>
          </section>
        )}

        {/* MRI PATTERN-BASED TREATMENT PAGES */}
        {mri && (
          <div className="page-break">
            <MriDetailedTreatmentSection
              rows={rows}
              weakestSix={[...rows].sort((a, b) => a.percentage - b.percentage).slice(0, 6)}
              compactRows={[...rows].sort((a, b) => a.percentage - b.percentage).slice(6)}
              strongestRows={topThreeStrengths}
              overall={overall}
              lang={lang}
              ar={ar}
              lawyer={lawyer}
              salesManager={salesManager}
              businessHealth={businessHealth}
            />
          </div>
        )}

{/* MRI 90-DAY PRESCRIPTION */}
{mri && (
  <section className="page-break rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
    {outdoorSalesMri ? (
      <>
        {sectionTitle(
          ar ? "خطة اللياقة البيعية خلال 90 يومًا" : "90-Day Sales Fitness Plan",
          ar
            ? "خطة تطوير يومية مبنية على أضعف عضلاتك البيعية. كل يوم يمنحك إجراءً صغيرًا لتطبيقه في مواقف بيع حقيقية."
            : "A daily field-development plan based on your weakest sales muscles. Each day gives you one small action to practice in real selling situations."
        )}
        <OutdoorSalesFitnessPlanSection days={outdoorSalesFitnessPlan} lang={lang} />
      </>
    ) : lawyerClientConversionMri ? (
      <>
        <LawyerPlanPersonalizationBox
          weakestRows={weakestSixForTreatment}
          strongestRow={topThreeStrengths[0] || null}
          lang={lang}
        />
        {sectionTitle(
          ar ? "خطة التوجيه المهني لتجربة العميل القانونية خلال 90 يومًا" : "90-Day Legal Client Experience Guidance Plan",
          ar
            ? "خطة يومية عملية مبنية على أضعف مناطق تجربة العميل القانونية لديك. كل يوم يمنحك إجراءً مصغّرًا وتطبيقًا داخل الاستشارة القانونية ومؤشر تحقق واضح."
            : "A daily professional guidance plan based on your weakest legal client experience areas. Each day gives you one micro-action, one legal consultation drill, and one proof of execution."
        )}
        <LawyerTreatmentPlanSection
          days={lawyerTreatmentPlan}
          lang={lang}
          supportFocus={topThreeStrengths[0]?.label || (ar ? "أقوى منطقة داعمة لديك" : "Your strongest leverage area")}
        />
      </>
    ) : salesManager ? (
      <>
        {sectionTitle(
          ar ? "خطة التنفيذ الإداري لمدة ٩٠ يومًا" : "90-Day Sales Management Execution Plan",
          ar
            ? "خطة يومية لمدير المبيعات مبنية على أضعف ستة مجالات قيادية لديك. كل يوم يمنحك إجراءً إداريًا وسؤال فحص ودليل تنفيذ."
            : "A daily manager plan built from your weakest six leadership areas. Each day gives you one management action, one inspection question, and one proof of execution."
        )}
        <SalesManager90DayPlanSection days={salesManager90DayPlan} lang={lang} />
      </>
    ) : (
      <>
    {sectionTitle(
      businessHealth
        ? ar
          ? "خارطة علاج صحة الشركة خلال ٩٠ يومًا"
          : "90-Day SME Business Health Treatment Roadmap"
        : lawyer
        ? ar
          ? "خطة التوجيه المهني لتجربة العميل القانونية خلال ٩٠ يومًا"
          : "90-Day Legal Client Experience Guidance Plan"
        : salesManager
        ? ar
          ? "خطة علاج إدارة المبيعات خلال ٩٠ يومًا"
          : "90-Day Sales Management Treatment Plan"
        : ar
        ? "وصفة الأداء البيعي خلال ٩٠ يومًا"
        : "90-Day Sales Performance Prescription",
      businessHealth
        ? ar
          ? "هذه ليست دورة تدريبية. إنها خارطة علاج تنفيذية مبنية على مؤشرات صحة الشركة، وأكبر نسبة هدر ونزيف، وأولويات التثبيت والنمو."
          : "This is not a training course. It is an execution roadmap based on your business health signals, biggest leaks, and stabilization priorities."
        : lawyer
        ? ar
          ? "هذه ليست دورة تدريبية. إنها خطة توجيه مهنية مبنية على نقاط الاحتكاك في الاستشارة وأولويات تجربة العميل."
          : "This is not a training course. It is a professional guidance plan based on consultation friction and legal client experience priorities."
        : salesManager
        ? ar
          ? "هذه ليست دورة تدريبية. إنها خطة علاج إدارية مبنية على هدر ونزيف في القيادة وأولويات أداء الفريق."
          : "This is not a training course. It is a management treatment plan based on your leadership leaks and team-performance priorities."
        : ar
        ? "هذه ليست دورة تدريبية. إنها خطة علاج تنفيذية مبنية على ترتيب أولوياتك الحالية."
        : "This is not a training course. It is an execution treatment plan based on your current priority order."
    )}

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <PrescriptionPhase
        ar={ar}
        phase="1"
        titleEn={
          businessHealth
            ? "Days 1–30: Stop the Business Leakage"
            : lawyer ? "Days 1–30: Reduce the Friction" : "Days 1–30: Stop the Leakage"
        }
        titleAr={
          businessHealth
            ? "الأيام ١–٣٠: أوقف الهدر والنزيف في  الشركة"
            : lawyer ? "الأيام ١–٣٠: قلّل نقاط الاحتكاك" : "الأيام ١–٣٠: أوقف الهدر والنزيف"
        }
        bodyEn={
          businessHealth
            ? `Focus first on ${topThreeRisks[0]?.label || "your weakest business health area"}. Reduce the issue most likely leaking cash, customers, execution, owner time, or growth capacity, then build a simple correction rhythm the business can repeat weekly.`
            : lawyer
            ? `Focus first on ${topThreeRisks[0]?.label || "your lowest score"}. Reduce the consultation behavior most likely creating client hesitation, weakening professional-fee confidence, or delaying the next legal step, then build a simple correction routine you can repeat daily.`
            : salesManager
            ? `Focus first on ${topThreeRisks[0]?.label || "your lowest score"}. Reduce the management behavior most likely leaking team performance, then build a simple correction rhythm you can repeat weekly.`
            : `Focus first on ${topThreeRisks[0]?.label || "your lowest score"}. Reduce the behavior that is most likely leaking opportunities, then build a simple correction routine you can repeat daily.`
        }
        bodyAr={
          businessHealth
            ? `ابدأ أولًا بـ ${topThreeRisks[0]?.label || "أضعف مجال في صحة الشركة"}. قلّل المشكلة التي قد تسرّب السيولة، العملاء، التنفيذ، وقت المالك، أو قدرة الشركة على النمو، ثم ابنِ إيقاع تصحيح بسيط يمكن تكراره أسبوعيًا.`
            : lawyer
            ? `ابدأ أولًا بـ ${topThreeRisks[0]?.label || "أضعف نتيجة لديك"}. قلّل سلوك الاستشارة الذي قد يضعف ثقة العميل أو الثقة في أتعاب المحاماة أو وضوح الخطوة القانونية التالية، ثم ابنِ روتين تصحيح بسيط يمكنك تكراره يوميًا.`
            : salesManager
            ? `ابدأ أولًا بـ ${topThreeRisks[0]?.label || "أضعف نتيجة لديك"}. قلّل السلوك الإداري الذي قد يسبب أكبر هدر ونزيف في أداء الفريق، ثم ابنِ إيقاع تصحيح بسيط يمكنك تكراره أسبوعيًا.`
            : `ابدأ أولًا بـ ${topThreeRisks[0]?.label || "أضعف نتيجة لديك"}. قلّل السلوك الذي قد يسبب أكبر هدر ونزيف للفرص، ثم ابنِ روتين تصحيح بسيط يمكنك تكراره يوميًا.`
        }
      />

      <PrescriptionPhase
        ar={ar}
        phase="2"
        titleEn={
          businessHealth
            ? "Days 31–60: Build a Stronger Operating Rhythm"
            : lawyer
            ? "Days 31–60: Build a Stronger Consultation Rhythm"
            : salesManager
            ? "Days 31–60: Build New Management Rhythm"
            : "Days 31–60: Build New Selling Behavior"
        }
        titleAr={
          businessHealth
            ? "الأيام ٣١–٦٠: ابنِ إيقاع تشغيل أقوى"
            : lawyer
            ? "الأيام ٣١–٦٠: ابنِ إيقاع استشارة أقوى"
            : salesManager
            ? "الأيام ٣١–٦٠: ابنِ إيقاعًا إداريًا جديدًا"
            : "الأيام ٣١–٦٠: ابنِ سلوكًا بيعيًا جديدًا"
        }
        bodyEn={
          businessHealth
            ? `Use your stronger areas, especially ${topThreeStrengths[0]?.label || "your strongest business health area"}, to support the weaker areas and create a more stable operating rhythm across revenue, cash, customers, people, and execution.`
            : lawyer
            ? `Use your stronger areas, especially ${topThreeStrengths[0]?.label || "your strengths"}, to support weaker consultation behaviors and create a more stable inquiry-to-next-step rhythm.`
            : salesManager
            ? `Use your stronger areas, especially ${topThreeStrengths[0]?.label || "your strengths"}, to support weaker management behaviors and create a more stable team execution rhythm.`
            : `Use your stronger areas, especially ${topThreeStrengths[0]?.label || "your strengths"}, to support the weaker behaviors and create a more stable sales rhythm.`
        }
        bodyAr={
          businessHealth
            ? `استخدم مناطق قوتك، خاصة ${topThreeStrengths[0]?.label || "أقوى مجال في صحة الشركة"}، لدعم المجالات الأضعف وبناء إيقاع تشغيل أكثر ثباتًا في الإيرادات، السيولة، العملاء، الأشخاص، والتنفيذ.`
            : lawyer
            ? `استخدم مناطق قوتك، خاصة ${topThreeStrengths[0]?.label || "نقاط قوتك"}، لدعم سلوكيات الاستشارة الأضعف وبناء إيقاع أكثر ثباتًا من الاستفسار إلى الخطوة القانونية المناسبة.`
            : salesManager
            ? `استخدم مناطق قوتك، خاصة ${topThreeStrengths[0]?.label || "نقاط قوتك"}، لدعم السلوكيات الإدارية الأضعف وبناء إيقاع تنفيذ أكثر ثباتًا داخل الفريق.`
            : `استخدم مناطق قوتك، خاصة ${topThreeStrengths[0]?.label || "نقاط قوتك"}، لدعم السلوكيات الأضعف وبناء إيقاع بيعي أكثر ثباتًا.`
        }
      />

      <PrescriptionPhase
        ar={ar}
        phase="3"
        titleEn={
          businessHealth
            ? "Days 61–90: Stabilize, Systemize, and Scale"
            : "Days 61–90: Sharpen and Repeat"
        }
        titleAr={
          businessHealth
            ? "الأيام ٦١–٩٠: ثبّت، نظّم، واستعد للنمو"
            : "الأيام ٦١–٩٠: صقِل وكرّر"
        }
        bodyEn={
          businessHealth
            ? "Turn the corrected priorities into a business operating system: review the numbers, inspect customer flow, strengthen accountability, reduce owner dependency, and protect the business from avoidable risk."
            : lawyer
            ? "Turn the corrected behaviors into a legal client experience operating system: open consultations better, diagnose needs better, explain legal value better, present professional fees better, and guide the next step with more confidence."
            : salesManager
            ? "Turn the corrected behaviors into a sales-management operating system: coach better, inspect better, forecast better, and hold the team accountable with more clarity."
            : "Turn the corrected behaviors into a personal sales operating system: prepare better, ask better, follow up better, and close with more control."
        }
        bodyAr={
          businessHealth
            ? "حوّل الأولويات المصححة إلى نظام تشغيل للشركة: راجع الأرقام، افحص تدفق العملاء، قوِّ المساءلة، خفّف اعتماد الشركة على المالك، واحمِ العمل من المخاطر التي يمكن تجنبها."
            : lawyer
            ? "حوّل السلوكيات المصححة إلى نظام تشغيل لتجربة العميل القانونية: افتح الاستشارات بشكل أفضل، شخّص الاحتياج أفضل، اشرح القيمة القانونية أفضل، اعرض أتعاب المحاماة بثقة أكبر، ووجّه الخطوة القانونية التالية بوضوح أقوى."
            : salesManager
            ? "حوّل السلوكيات المصححة إلى نظام تشغيل لإدارة المبيعات: درّب أفضل، افحص مسار الفرص البيعية أفضل، توقّع أفضل، وحاسب الفريق بوضوح أكبر."
            : "حوّل السلوكيات المصححة إلى نظام تشغيل شخصي للبيع: حضّر أفضل، اسأل أفضل، تابع أفضل، وأغلق بتحكم أكبر."
        }
      />
    </div>
      </>
    )}
  </section>
)}

        {/* OUTDOOR SALES SCAN MRI PRESCRIPTION UPSELL */}
        {outdoorSalesScan && (
          <section className="avoid-break rounded-3xl overflow-hidden shadow-2xl border border-indigo-200">
            <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 md:p-10">
              <div className="inline-flex rounded-full bg-amber-300 text-slate-950 px-4 py-2 text-xs font-black uppercase tracking-widest">
                {ar ? "الـ Scan كشف الإشارات" : "Your Scan Found the Signals"}
              </div>

              <h2 className="mt-5 text-3xl sm:text-5xl font-black leading-tight rtl-text">
                {ar
                  ? "الـ Scan يُظهر إشارات التحذير. أما الـ MRI فيكشف لك ماذا تصلح أولًا."
                  : "The Scan shows the warning lights. The MRI shows what to fix first."}
              </h2>

              <p className="mt-4 max-w-4xl text-base sm:text-xl leading-relaxed text-blue-100 rtl-text">
                {ar
                  ? "يمنحك Outdoor Sales Scan المجاني قراءة سريعة لـ 7 مؤشرات بيعية أساسية. أما Outdoor Sales MRI فيذهب أعمق: يشخّص 15 كفاءة بيعية، يكشف أضعف مناطق العلاج، ويعطيك خطة لياقة بيعية لمدة 90 يومًا."
                  : "Your free Outdoor Sales Scan gives you a fast reading of 7 key sales signals. The Outdoor Sales MRI goes deeper: it diagnoses 15 sales competencies, identifies your weakest treatment areas, and gives you a 90-day field correction plan."}
              </p>

              <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-3xl bg-white/10 border border-white/15 p-5 sm:p-6">
                  <h3 className="text-xl font-black text-white rtl-text">
                    {ar ? "ماذا يعطيك الـ Scan؟" : "What the Scan gives you"}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-blue-100 rtl-text">
                    {ar
                      ? "فحص سريع لصحة أهم السلوكيات البيعية الميدانية. يساعدك على رؤية إشارات التحذير الأساسية."
                      : "A fast health check across your core outdoor sales behaviors. It shows where warning signs may exist."}
                  </p>
                </div>

                <div className="rounded-3xl bg-white text-slate-950 p-5 sm:p-6 shadow-2xl">
                  <h3 className="text-xl font-black rtl-text">
                    {ar ? "ماذا يعطيك الـ MRI؟" : "What the MRI gives you"}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-700 rtl-text">
                    {ar
                      ? "تشخيصًا أعمق، أولويات الأسباب الجذرية، صفحات علاج تفصيلية، وخطة لياقة بيعية يومية لمدة 90 يومًا."
                      : "A deeper diagnosis, root-cause priorities, detailed treatment pages, and a 90-day Sales Fitness Plan."}
                  </p>
                </div>
              </div>

              <div className="mt-7 rounded-3xl bg-white/10 border border-white/15 p-5 sm:p-6">
                <h3 className="text-xl font-black text-white rtl-text">
                  {ar ? "ماذا ستجد داخل تقرير Outdoor Sales MRI الكامل؟" : "Inside the full Outdoor Sales MRI"}
                </h3>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(ar
                  ? [
                      "تشخيص عميق من 75 سؤالًا",
                      "15 كفاءة بيعية",
                      "خريطة أولويات الأسباب الجذرية",
                      "صفحات علاج تفصيلية",
                      "خطة يومية لمدة 90 يومًا",
                      "أدلة عملية إضافية للتطبيق",
                    ]
                  : [
                      "75-question deep diagnostic",
                      "15 sales competencies",
                      "Root-cause priority map",
                      "Detailed treatment pages",
                      "90-day daily action plan",
                      "Practical bonus guides",
                    ]).map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl bg-white/10 border border-white/15 p-4">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-950">
                      ✓
                    </span>
                    <span className="text-sm sm:text-base font-bold text-blue-50 rtl-text">{item}</span>
                  </div>
                ))}
                </div>
              </div>

              <p className="mt-7 text-lg sm:text-xl font-black text-amber-200 rtl-text">
                {ar
                  ? "لا تخمّن ما الذي يجب إصلاحه. شخّصه بطريقة صحيحة."
                  : "Do not guess what to fix. Diagnose it properly."}
              </p>

              <div className="mt-6">
                <a
                  href={ar ? OUTDOOR_SCAN_MRI_URL_AR : OUTDOOR_SCAN_MRI_URL_EN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="print-hide inline-flex w-full sm:w-auto items-center justify-center rounded-2xl bg-white text-slate-950 px-6 py-4 font-black shadow-xl hover:bg-amber-50 transition text-center"
                >
                  {ar
                    ? "احصل على تقرير Sales MRI الكامل وخطة الـ 90 يومًا"
                    : "Get My Full Sales MRI & 90-Day Prescription"}
                </a>
              </div>
            </div>
          </section>
        )}

        {/* SCAN-ONLY MRI PRESCRIPTION UPSELL */}
        {!mri && !outdoorSalesScan && (
          <section className="avoid-break rounded-3xl overflow-hidden shadow-2xl border border-indigo-200">
            <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-7 sm:p-10">
              <div className="inline-flex rounded-full bg-rose-500/20 border border-rose-300/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-100">
                {ar ? "لا تتوقف عند نتيجة ال SCAN" : "Do Not Stop at the Scan"}
              </div>

              <h2 className="mt-5 text-3xl sm:text-5xl font-black leading-tight rtl-text">
                {lawyer && ar ? (
                  <>
                    <ArabicLawyerBrand /> هو أداة تشخيص وتوجيه كاملة للاستفسارات القانونية، والاستشارة، وثقة العميل، وأتعاب المحاماة، والاعتراضات، والخطوة القانونية التالية، وتجربة العميل.
                  </>
                ) : salesManager && ar ? (
                  <>
                    التشخيص القيادي يكشف الأعراض، أما{" "}
                    <ArabicSalesManagerMriTitle text="التشخيص المتقدم لمدير المبيعات" />
                    {" "}فيقدّم خطة التطوير.
                  </>
                ) : t.prescriptionHeadline}
              </h2>

              <p className="mt-4 text-lg sm:text-2xl font-black leading-relaxed text-amber-200 max-w-4xl rtl-text">
                {salesManager && ar ? (
                  <>
                    <ArabicSalesManagerMriTitle text="أداة تشخيص وتطوير متكاملة" />
                    {" "}تفحص ١٥ كفاءة إدارية في إدارة المبيعات، تشمل التدريب، ومسار الفرص البيعية، والمساءلة، والتوقعات، وتنفيذ الفريق.
                  </>
                ) : t.prescriptionSubhead}
              </p>

              <div className="mt-7 grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-6 items-stretch">
                <div className="rounded-3xl bg-white/10 border border-white/15 p-6 sm:p-7 backdrop-blur-md">
                  <h3 className="text-2xl font-black text-white rtl-text">
                    {ar ? "لماذا لا يكفي ال SCAN وحده؟" : "Why the scan alone is not enough"}
                  </h3>

                  <div className="mt-4 space-y-4 text-blue-100 leading-relaxed rtl-text">
                    <p>
                      {ar
                        ? "ال SCAN يشبه تحليل الدم: يكشف لك أن هناك مؤشرات يجب الانتباه لها. لكنه لا يمنحك الفحص الكامل، ولا الوصفة العلاجية، ولا خطة التصحيح اليومية."
                        : "The scan is like a blood test: it reveals signals you must not ignore. But it does not give you the full examination, the treatment prescription, or the day-by-day correction path."}
                    </p>

                    <p>
                      {ar
                        ? "معظم الناس يقرؤون النتيجة، يشعرون بالاهتمام لدقائق، ثم يعودون إلى نفس العادات التي صنعت النتيجة. هنا يحدث الخطر: أن ترى علامة الإنذار ثم تتركها كما هي."
                        : "Most people read the result, feel interested for a few minutes, then return to the same habits that created the result. That is the dangerous part: seeing the warning sign and leaving it untreated."}
                    </p>

                    <p className="font-black text-white">
                      {ar
                        ? businessHealth
                          ? "إذا كشف التشخيص هدراً ونزيفاً في صحة الشركة، فالخطوة الذكية ليست تجاهله. الخطوة الذكية هي فحص نظام الشركة كاملًا، معرفة الجذر، ثم اتباع خارطة الطريق."
                          : "إذا كشف الفحص هدراً ونزيفاً، فالخطوة الذكية ليست تجاهله. الخطوة الذكية هي فحص الجسم المهني كاملًا، معرفة الجذر، ثم اتباع الوصفة."
                        : businessHealth
                        ? "If the MRI exposed a business leak, the smart move is not to ignore it. The smart move is to examine the full business operating system, identify the root pattern, and follow the roadmap."
                        : "If the scan exposed a leak, the smart move is not to ignore it. The smart move is to examine the full career body, identify the root pattern, and follow the prescription."}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-white text-slate-950 p-6 sm:p-7 shadow-2xl">
                  <div className="inline-flex rounded-full bg-blue-100 text-blue-800 px-4 py-2 text-xs font-black uppercase tracking-widest">
                    {ar ? "ما الذي ستحصل عليه؟" : "What you unlock"}
                  </div>

                  <h3 className="mt-4 text-2xl font-black rtl-text">
                    {ar ? "تقرير شخصي مفصل وخطة علاج كاملة" : "A personalized detailed report and full treatment plan"}
                  </h3>

                  <div className="mt-5 space-y-3">
                    {(ar
                      ? businessHealth
                        ? [
                            "تقرير SME Business Health MRI شخصي ومفصل مبني على إجاباتك ونتائجك",
                            "أداة تشخيص وخارطة طريق تفحص ١٢ منطقة في صحة الشركة",
                            "كشف الأسباب الجذرية خلف هدر ونزيف السيولة والعملاء وضعف الأنظمة واعتماد الشركة على المالك ومخاطر النمو",
                            "ترتيب واضح لما يجب تثبيته وتقويته وإعادة بنائه أولًا بدل التخمين",
                            "خارطة تثبيت عملية لمدة ٩٠ يومًا دون الجلوس في دورة تدريبية طويلة",
                            "اتجاه إعادة بناء لمدة ١٢ شهرًا يوضح ما يجب إصلاحه وتنظيمه وتفويضه وقياسه وحمايته",
                            "أدوات تنفيذ تساعد المالك أو المدير العام على التحرك بناءً على التشخيص وليس القراءة فقط",
                          ]
                        : salesManager
                        ? [
                            <ArabicSalesManagerMriTitle key="personal-report" text="تقرير شخصي مفصل للتشخيص المتقدم لمدير المبيعات" />,
                            <ArabicSalesManagerMriTitle key="diagnostic-tool" text="أداة تشخيص وتطوير متكاملة تفحص ١٥ كفاءة إدارية في إدارة المبيعات" />,
                            "كشف الأسباب الجذرية خلف ضعف التدريب، واضطراب مسار الفرص البيعية، ومخاطر التوقعات، وفجوات المساءلة",
                            "ترتيب واضح لما يجب تطويره أولًا بدل التخمين",
                            "خطة التنفيذ الإداري لمدة ٩٠ يومًا دون الجلوس في دورة تدريبية طويلة",
                            "مسار تصحيح يومي يوضح ما يجب فحصه وتدريبه وتعزيزه",
                            "أدوات تنفيذ تساعدك على التطبيق وليس القراءة فقط",
                          ]
                        : [
                            "تقرير Sales MRI شخصي مفصل من حوالي ٣٠ صفحة مبني على إجاباتك ونتائجك",
                            "أداة تشخيص وعلاج كاملة تفحص ١٥ كفاءة في جسم أدائك البيعي",
                            "كشف الأسباب الجذرية خلف تعثّر الصفقات وضعف الزخم",
                            "ترتيب واضح لما يجب إصلاحه أولًا بدل التخمين",
                            "وصفة أداء عملية لمدة ٩٠ يومًا دون الجلوس في دورة تدريبية طويلة",
                            "مسار تصحيح يومي يساعدك على معرفة ماذا تفعل وماذا تتوقف عن فعله",
                            "٦ مكافآت تنفيذية تساعدك على التطبيق وليس القراءة فقط",
                          ]
                      : businessHealth
                        ? [
                            "A personalized, super-detailed SME Business Health MRI report based on your answers and scores",
                            "A full diagnostic and roadmap tool examining 12 business health areas",
                            "The root patterns behind cash leakage, customer leakage, weak systems, owner dependency, risk exposure, and growth-readiness gaps",
                            "A clear priority order of what to stabilize, strengthen, and revamp first instead of guessing",
                            "A practical 90-day stabilization roadmap without sitting through a long course",
                            "A 12-month business revamp direction showing what to fix, systemize, delegate, measure, and protect",
                            "Implementation tools that help the owner or GM act on the diagnosis, not just read it",
                          ]
                        : salesManager
                        ? [
                            "A personalized, super-detailed Sales Manager MRI report of around 30 pages based on your answers and scores",
                            "A full diagnostic and treatment tool examining 15 sales-management competencies",
                            "The root patterns behind weak coaching, poor pipeline visibility, forecast risk, and team accountability leaks",
                            "A clear priority order of what to correct first instead of guessing",
                            "A practical 90-day management prescription without sitting through a long training course",
                            "A day-by-day correction path showing what to inspect, coach, reset, and reinforce",
                            "Implementation tools that help you act like a stronger sales leader, not just read",
                          ]
                        : [
                            "A personalized, super-detailed Sales MRI report of around 30 pages based on your answers and scores",
                            lawyer ? "A full diagnostic and professional guidance tool examining 15 competencies in your legal client experience" : salesManager ? "A full diagnostic and treatment tool examining 15 competencies in your sales-management leadership body" : "A full diagnostic and treatment tool examining 15 competencies in your sales performance body",
                            lawyer ? "The root patterns behind unclear consultations, weak trust, professional fee resistance, and delayed next legal steps" : "The root patterns behind stalled deals, weak momentum, and hidden leakage",
                            "A clear priority order of what to correct first instead of guessing",
                            "A practical 90-day performance prescription without sitting through a long training course",
                            "A day-by-day correction path showing what to do and what to stop doing",
                            "6 implementation bonuses that help you act, not just read",
                          ]
                    ).map((x, index) => (
                      <div key={index} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="shrink-0 h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-black">
                          ✓
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-700 rtl-text">{x}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-7 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-1 shadow-2xl max-w-3xl">
                <div className="rounded-[1.35rem] bg-slate-950/95 p-6 sm:p-7">
                  <h3 className="text-2xl sm:text-3xl font-black text-white rtl-text">
                    {ar ? "هذه ليست دورة تدريبية أخرى." : "This is not another training course."}
                  </h3>

                  <p className="mt-3 text-blue-100 leading-relaxed rtl-text">
                    {ar
                      ? "لا فيديوهات طويلة. لا تكديس نظري. لا نصائح عامة. إنها وصفة علاج عملية ومفصلة مبنية على نتائجك، لتعرف ماذا تعمل عليه، ماذا تتوقف عن فعله، وما الذي يجب إصلاحه أولًا."
                      : "No long videos. No theory overload. No generic sales advice. It is a practical, detailed treatment prescription built from your results, showing what to work on, what to stop doing, and what to fix first."}
                  </p>

                  <a
                    href={ar ? MRI_CHECKOUT_URL_AR : MRI_CHECKOUT_URL_EN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="print-hide mt-6 inline-flex w-full sm:w-auto items-center justify-center rounded-2xl bg-white text-slate-950 px-6 py-4 font-black shadow-xl hover:bg-amber-50 transition"
                  >
                    🚀{" "}
                    {salesManager && ar ? (
                      <ArabicSalesManagerMriTitle text="احصل على تقرير التشخيص المتقدم لمدير المبيعات" />
                    ) : t.prescriptionCta}
                  </a>

                </div>
              </div>
            </div>
          </section>
        )}

{!outdoorSalesMri && !outdoorSalesScan && !lawyerClientConversionMri && (
<>
{/* ENTERPRISE CTA */}

<section className="web-enterprise-print-hide avoid-break mt-8">

  <div className="rounded-[32px] overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 shadow-2xl border border-blue-800">

    <div className="p-8 sm:p-12 text-center">

      <div className="inline-flex rounded-full bg-amber-300 text-slate-900 px-5 py-2 text-sm font-black tracking-wider">
        👥 {ar ? "تقييمات الفرق والإدارات" : "TEAM & DEPARTMENT ASSESSMENTS"}
      </div>

      <h2 className="mt-6 text-4xl sm:text-5xl font-black text-white rtl-text">
        {t.enterpriseTitle}
      </h2>

      <p className="mt-4 text-xl font-bold text-blue-100 rtl-text max-w-4xl mx-auto">
        {t.enterpriseCta}
      </p>

      <p className="mt-8 text-lg leading-relaxed text-slate-200 rtl-text max-w-5xl mx-auto">
        {ar
          ? "إذا كان هذا التقييم يقدم رؤية واضحة لشخص واحد، فإن قيمته تصبح أكبر بكثير عند تطبيقه على فريق كامل. يحصل المديرون وقادة الأعمال على صورة واضحة لنقاط القوة والفجوات وأولويات التطوير وفرص التدريب عبر الأشخاص المسؤولين عن تحقيق النتائج."
          : "If this assessment provides valuable insight for one person, its impact becomes significantly greater when applied across an entire team. Managers and business leaders gain a clear view of strengths, performance gaps, development priorities, and coaching opportunities across the people responsible for delivering results."}
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {(ar
          ? [
              "تقييم شامل للفريق",
              "أقوى ٣ نقاط قوة",
              "أهم ٣ فجوات أداء",
              "أولويات تطوير واضحة"
            ]
          : [
              "Team Assessment Overview",
              "Top 3 Strengths",
              "Top 3 Performance Gaps",
              "Clear Development Priorities"
            ]
        ).map((x) => (

          <div
            key={x}
            className="rounded-3xl border border-blue-700 bg-white/10 backdrop-blur-sm p-5 text-white font-bold shadow-lg"
          >
            ✓ {x}
          </div>

        ))}

      </div>

      <div className="mt-10 rounded-3xl bg-white/10 border border-blue-700 backdrop-blur-sm p-8">

        <p className="text-xl font-black text-white rtl-text">
          {ar
            ? "للاستفسار عن تقييمات الفرق أو الإدارات أو البرامج المؤسسية المخصصة"
            : "For Team Assessments, Department Assessments, and Custom Organizational Programs"}
        </p>

        <div className="mt-5">
  <a
    href="mailto:support@careerlabsai.com"
    className="block text-center font-black text-base sm:text-xl text-white break-all px-4 hover:text-blue-100 transition force-ltr"
  >
    support@careerlabsai.com
  </a>
</div>

        <div className="mt-6 flex justify-center">

          <a
            href="https://wa.me/61416489994"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 text-lg font-black text-green-700 shadow-xl hover:scale-105 transition-all"
          >
            WhatsApp: +61 4 1648 9994
          </a>

        </div>

        <p className="mt-6 text-blue-100 rtl-text">
          {ar
            ? "تتوفر عروض مخصصة للفرق والإدارات والمؤسسات."
            : "Custom team and organizational assessment proposals are available."}
        </p>

      </div>

    </div>

  </div>

</section>
</>
)}

{lawyerClientConversionMri && (
  <section className="avoid-break rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
    <p className="text-sm sm:text-base font-bold leading-relaxed text-slate-700 rtl-text">
      {ar
        ? "تم إعداد هذا التقرير بناءً على إجابات هذا المشارك ونمط نتائجه التشخيصية، ولا يُعد بديلًا عن تشخيص محامٍ آخر أو عضو آخر في الفريق."
        : "This report was generated from this participant’s assessment responses and score pattern. It should not be treated as a substitute diagnosis for another lawyer or team member."}
    </p>
  </section>
)}

      </main>
    </div>
  );
}
function InfoChip({ label, value, forceLtr = false }: { label: string; value: string; forceLtr?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-md">
      <div className="text-[10px] font-black uppercase tracking-widest text-blue-100">{label}</div>
      <div className={`mt-1 text-sm font-bold text-white break-words ${forceLtr ? "force-ltr" : "rtl-text"}`}>
        {value || "—"}
      </div>
    </div>
  );
}

function SignalCard({
  title,
  row,
  lang,
  description,
}: {
  title: string;
  row: CompetencyRow | null;
  lang: Language;
  description: string;
}) {
  if (!row) {
    return (
      <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6">
        <h2 className="text-2xl font-black text-slate-950 rtl-text">{title}</h2>
        <p className="mt-3 text-slate-600 rtl-text">{lang === "ar" ? "لا توجد بيانات كافية." : "Not enough data."}</p>
      </section>
    );
  }

  return (
    <section className={`avoid-break rounded-3xl border-2 ${tierSoftClass(row.tier)} shadow-xl p-6`}>
      <h2 className="text-2xl font-black text-slate-950 rtl-text">{title}</h2>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-900 rtl-text">{row.label}</h3>
          <p className="mt-2 text-slate-700 leading-relaxed rtl-text">{description}</p>
        </div>

        <div className="force-ltr text-right">
          <div className="text-4xl font-black text-slate-950">{row.percentage}%</div>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(row.tier)}`}>
            {getTierLabel(row.tier, lang)}
          </span>
        </div>
      </div>
    </section>
  );
}

function DarkInsight({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-white/10 border border-white/15 p-5">
      <h3 className="text-lg font-black text-white rtl-text">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-blue-100 rtl-text">{body}</p>
    </div>
  );
}

function SwotBox({
  title,
  tier,
  rows,
  empty,
  explanation,
  lang,
}: {
  title: string;
  tier: Tier;
  rows: CompetencyRow[];
  empty: string;
  explanation: string;
  lang: Language;
}) {
  return (
    <div className={`avoid-break rounded-3xl border-2 ${tierSoftClass(tier)} p-5`}>
      <div className="flex items-center justify-between gap-4">
        <h3 className={`text-xl font-black rtl-text ${tierTextClass(tier)}`}>{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(tier)}`}>
          {rows.length}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-700 leading-relaxed rtl-text">{explanation}</p>

      <div className="mt-4 space-y-2">
        {rows.length ? (
          rows.map((r) => (
            <div key={r.competencyId} className="rounded-2xl bg-white/70 border border-white p-3 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-800 rtl-text">{r.label}</span>
              <span className="text-sm font-black text-slate-950 force-ltr">{r.percentage}%</span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white/70 border border-white p-3 text-sm italic text-slate-600 rtl-text">
            {empty}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBlock({
  index,
  title,
  tier,
  percentage,
  recommendations,
  lang,
}: {
  index: number;
  title: string;
  tier: Tier;
  percentage: number;
  recommendations: string[];
  lang: Language;
}) {
  const clean = recommendations.map(cleanRecommendation).filter(Boolean).slice(0, 3);

  return (
    <div className={`avoid-break rounded-3xl border-2 ${tierSoftClass(tier)} p-5 sm:p-6`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
            {lang === "ar" ? `أولوية ${index}` : `Priority ${index}`}
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-950 rtl-text">{title}</h3>
        </div>

        <div className="force-ltr">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(tier)}`}>
            {percentage}% · {getTierLabel(tier, lang)}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3">
        {clean.length ? (
          clean.map((rec, i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black">
                  {i + 1}
                </div>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed rtl-text">{rec}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 text-slate-600 italic rtl-text">
            {lang === "ar" ? "لا توجد توصيات متاحة لهذه المنطقة." : "No recommendations available for this area."}
          </div>
        )}
      </div>
    </div>
  );
}


function MriDetailedTreatmentSection({
  rows,
  weakestSix,
  compactRows,
  strongestRows,
  overall,
  lang,
  ar,
  lawyer = false,
  salesManager = false,
  businessHealth = false,
}: {
  rows: CompetencyRow[];
  weakestSix: CompetencyRow[];
  compactRows: CompetencyRow[];
  strongestRows: CompetencyRow[];
  overall: number;
  lang: Language;
  ar: boolean;
  lawyer?: boolean;
  salesManager?: boolean;
  businessHealth?: boolean;
}) {
  const pattern = getPatternArchetype(overall, weakestSix.slice(0, 3), strongestRows.slice(0, 2), lang, lawyer ? "lawyer" : businessHealth ? "business" : salesManager ? "manager" : "sales");
  const weakestLabel = weakestSix[0]?.label || "";
  const strongestLabel = strongestRows[0]?.label || "";

  return (
    <section className="rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8">
      {sectionTitle(
        lawyer
          ? ar ? "صفحات توجيه تجربة العميل القانونية حسب نمطك" : "Legal Client Experience Guidance Pages Based on Your Pattern"
          : businessHealth
          ? ar ? "صفحات علاج صحة الشركة حسب نمطك" : "Business Health Treatment Pages Based on Your Pattern"
          : ar ? "صفحات العلاج التفصيلية حسب نمطك" : "Detailed Treatment Pages Based on Your Pattern",
        lawyer
          ? ar
            ? "التقرير لا يكرر نفس النص لكل محامٍ. يتم توسيع أضعف ٦ مناطق لديك في رحلة الاستفسار والاستشارة وأتعاب المحاماة والخطوة القانونية التالية، بينما تظهر بقية الكفاءات كملخصات حماية أو رافعة."
            : "This report does not repeat the same advice for every lawyer. Your weakest 6 areas in the inquiry, consultation, professional-fee, and next-step journey are expanded into guidance pages, while the remaining competencies appear as compact leverage or protection summaries."
          : businessHealth
          ? ar
            ? "التقرير لا يكرر نفس النص لكل شركة. يتم توسيع أضعف ٦ مجالات في صحة الشركة إلى صفحات علاج، بينما تظهر بقية المجالات كملخصات حماية أو رافعة."
            : "This report does not repeat the same advice for every business. Your weakest 6 business health areas are expanded into treatment pages, while the remaining areas appear as compact leverage or protection summaries."
          : ar
          ? "التقرير لا يكرر نفس النص لكل شخص. يتم توسيع أضعف ٦ مناطق لديك، بينما تظهر بقية الكفاءات كملخصات حماية أو رافعة."
          : "This report does not repeat the same advice for every person. Your weakest 6 areas are expanded into treatment pages, while the remaining competencies appear as compact leverage or protection summaries."
      )}

      <div className="avoid-break rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-6 sm:p-7 shadow-xl mb-6">
        <div className="inline-flex rounded-full bg-white/10 border border-white/15 px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-100">
          {lawyer ? (ar ? "نمط تجربة العميل القانونية" : "Legal Client Experience Pattern") : businessHealth ? (ar ? "نمط صحة الشركة" : "Business Health Pattern") : (ar ? "نمط الأداء العام" : "Overall Performance Pattern")}
        </div>
        <h3 className="mt-4 text-2xl sm:text-3xl font-black leading-tight rtl-text">
          {pattern.title}
        </h3>
        <p className="mt-3 text-blue-100 leading-relaxed rtl-text">
          {pattern.body}
        </p>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniPatternBox
            ar={ar}
            labelEn={lawyer ? "Primary client friction point" : businessHealth ? "Primary business leak" : "Primary leakage"}
            labelAr={lawyer ? "أبرز أولوية في رحلة العميل القانونية" : businessHealth ? "هدر الشركة الأساسي" : "الهدر الأساسي"}
            value={weakestSix[0]?.label || "—"}
            value2={weakestSix[0] ? `${weakestSix[0].percentage}% · ${getTierLabel(weakestSix[0].tier, lang)}` : ""}
          />
          <MiniPatternBox
            ar={ar}
            labelEn={lawyer ? "Secondary next-step risk" : businessHealth ? "Secondary business risk" : "Secondary risk"}
            labelAr={lawyer ? "الأولوية التالية للتطوير" : businessHealth ? "خطر الشركة الثاني" : "الخطر الثاني"}
            value={weakestSix[1]?.label || "—"}
            value2={weakestSix[1] ? `${weakestSix[1].percentage}% · ${getTierLabel(weakestSix[1].tier, lang)}` : ""}
          />
          <MiniPatternBox
            ar={ar}
            labelEn={lawyer ? "Best professional leverage" : businessHealth ? "Best business leverage" : "Best leverage"}
            labelAr={lawyer ? "أفضل رافعة مهنية" : businessHealth ? "أفضل رافعة للشركة" : "أفضل رافعة"}
            value={strongestRows[0]?.label || "—"}
            value2={strongestRows[0] ? `${strongestRows[0].percentage}% · ${getTierLabel(strongestRows[0].tier, lang)}` : ""}
          />
        </div>
      </div>

      <div className="space-y-6">
        {weakestSix.map((row, index) => (
          <MriDeepTreatmentPage
            key={`deep-${row.competencyId}-${index}`}
            row={row}
            index={index}
            lang={lang}
            ar={ar}
            weakestLabel={weakestLabel}
            strongestLabel={strongestLabel}
          />
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-950 rtl-text">
          {businessHealth ? (ar ? "ملخص المجالات المتبقية: حماية ورافعة" : "Remaining Business Areas: Protection and Leverage Summary") : ar ? "ملخص الكفاءات المتبقية: حماية ورافعة" : "Remaining Competencies: Protection and Leverage Summary"}
        </h3>
        <p className="mt-2 text-slate-600 leading-relaxed rtl-text">
          {businessHealth
            ? ar
              ? "هذه المجالات لا تحتاج إلى نفس عمق العلاج الآن. لكنها مهمة لأنها قد تعمل كرافعات تدعم خارطة الطريق أو كمجالات يجب حمايتها من التراجع."
              : "These areas do not need the same treatment depth right now. They matter because they can work as leverage points for the roadmap or as areas that must be protected from drift."
            : ar
            ? "هذه المناطق لا تحتاج إلى نفس عمق العلاج الآن. لكنها مهمة لأنها قد تعمل كرافعات تدعم خطة العلاج أو كمناطق يجب حمايتها من التراجع."
            : "These areas do not need the same treatment depth right now. They matter because they can work as leverage points for the treatment plan or as areas that must be protected from drift."}
        </p>

        <div className="compact-grid mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {compactRows.map((row, index) => (
            <MriCompactSummaryCard
              key={`compact-${row.competencyId}-${index}`}
              row={row}
              lang={lang}
              ar={ar}
              weakestLabel={weakestLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniPatternBox({
  ar,
  labelEn,
  labelAr,
  value,
  value2,
}: {
  ar: boolean;
  labelEn: string;
  labelAr: string;
  value: string;
  value2?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/15 p-4">
      <div className="text-[11px] font-black uppercase tracking-widest text-blue-100 rtl-text">
        {ar ? labelAr : labelEn}
      </div>
      <div className="mt-2 text-base sm:text-lg font-black text-white rtl-text">
        {value}
      </div>
      {value2 && <div className="mt-1 text-xs text-blue-100 force-ltr">{value2}</div>}
    </div>
  );
}

function MriDeepTreatmentPage({
  row,
  index,
  lang,
  ar,
  weakestLabel,
  strongestLabel,
}: {
  row: CompetencyRow;
  index: number;
  lang: Language;
  ar: boolean;
  weakestLabel: string;
  strongestLabel: string;
}) {
  const meta = getMriTreatmentMeta(row, lang, weakestLabel, strongestLabel);
  const recommendations = getRecommendations(row.competencyId, row.tier, lang)
    .map(cleanRecommendation)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <article className={`treatment-page rounded-3xl border-2 ${tierSoftClass(row.tier)} shadow-xl overflow-hidden`}>
      <div className="bg-white p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest rtl-text">
              {ar ? `صفحة علاج تفصيلية ${index + 1}` : `Detailed Treatment Page ${index + 1}`}
            </div>
            <h3 className="mt-2 text-2xl sm:text-4xl font-black text-slate-950 rtl-text">
              {row.label}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(row.tier)}`}>
                {row.percentage}% · {getTierLabel(row.tier, lang)}
              </span>
              <span className="inline-flex rounded-full px-3 py-1 text-xs font-black bg-slate-100 text-slate-700">
                {mriBehaviorFamily(row, lang)}
              </span>
            </div>
          </div>

          <div className="force-ltr text-left lg:text-right">
            <div className="text-5xl font-black text-slate-950">{row.percentage}%</div>
            <div className="mt-1 text-xs font-black uppercase tracking-widest text-slate-500">
              {BUSINESS_HEALTH_AREA_IDS.has(row.competencyId) ? (ar ? "درجة المجال" : "Area Score") : (ar ? "درجة الكفاءة" : "Competency Score")}
            </div>
          </div>
        </div>

        <div className="mt-5 h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div className="h-full rounded-full bg-slate-950" style={{ width: `${row.percentage}%` }} />
        </div>
      </div>

      <div className="p-6 sm:p-7 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TreatmentInsight
          title={ar ? "ما الذي تكشفه هذه النتيجة؟" : "What this score reveals"}
          body={detailedMeaningFor(row, lang)}
        />
        <TreatmentInsight
          title={
            LAWYER_COMPETENCY_IDS.has(row.competencyId)
              ? ar ? "أين تظهر نقاط الاحتكاك؟" : "Where friction may happen"
              : ar ? "أين يحدث الهدر والنزيف؟" : "Where leakage may happen"
          }
          body={meta.leakage}
        />
        <TreatmentInsight
          title={ar ? "الفرضية الجذرية" : "Root-cause hypothesis"}
          body={meta.root}
        />
        <TreatmentInsight
          title={ar ? "قراءة النمط الشخصي" : "Pattern-based reading"}
          body={meta.patternNote}
        />
      </div>

      <div className="px-6 sm:px-7 pb-6 sm:pb-7">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-3xl bg-rose-50 border-2 border-rose-200 p-5">
            <div className="text-sm font-black text-rose-700 uppercase tracking-widest rtl-text">
              {ar ? "توقف عن هذا" : "Stop doing this"}
            </div>
            <p className="mt-2 text-slate-800 font-bold leading-relaxed rtl-text">
              {meta.stop}
            </p>
          </div>

          <div className="rounded-3xl bg-emerald-50 border-2 border-emerald-200 p-5">
            <div className="text-sm font-black text-emerald-700 uppercase tracking-widest rtl-text">
              {ar ? "ابدأ بهذا" : "Start doing this"}
            </div>
            <p className="mt-2 text-slate-800 font-bold leading-relaxed rtl-text">
              {meta.start}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-3xl bg-slate-950 text-white p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-200 rtl-text">
                {BUSINESS_HEALTH_AREA_IDS.has(row.competencyId) ? (ar ? "وصفة عمل لمدة ٧ أيام" : "7-Day Business Prescription") : ar ? "وصفة ٧ أيام" : "7-Day Field Prescription"}
              </div>
              <p className="mt-2 text-blue-100 leading-relaxed rtl-text">{meta.drill}</p>
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-200 rtl-text">
                {ar ? "مؤشر القياس" : "Metric to Track"}
              </div>
              <p className="mt-2 text-blue-100 leading-relaxed rtl-text">{meta.metric}</p>
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-amber-200 rtl-text">
                {ar ? "أداة العلاج المناسبة" : "Recommended Remedy Tool"}
              </div>
              <p className="mt-2 text-white font-black leading-relaxed rtl-text">{meta.bonus}</p>
            </div>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="extra-treatment-note mt-4 rounded-3xl bg-white border border-slate-200 p-5">
            <div className="text-sm font-black text-slate-500 uppercase tracking-widest rtl-text">
              {ar ? "ملاحظة علاج إضافية" : "Additional Treatment Note"}
            </div>
            <div className="mt-3 space-y-3">
              {recommendations.map((rec, i) => (
                <p key={i} className="text-sm sm:text-base text-slate-700 leading-relaxed rtl-text">
                  <span className="font-black text-slate-950">{i + 1}. </span>
                  {rec}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function TreatmentInsight({ title, body }: { title: string; body: string }) {
  return (
    <div className="treatment-insight rounded-3xl bg-white/80 border border-white p-5 shadow-sm">
      <div className="text-sm font-black text-slate-500 uppercase tracking-widest rtl-text">{title}</div>
      <p className="mt-2 text-slate-700 leading-relaxed rtl-text">{body}</p>
    </div>
  );
}

function MriCompactSummaryCard({
  row,
  lang,
  ar,
  weakestLabel,
}: {
  row: CompetencyRow;
  lang: Language;
  ar: boolean;
  weakestLabel: string;
}) {
  const meta = getMriTreatmentMeta(row, lang, weakestLabel, row.label);

  const note =
    row.tier === "Strength"
      ? ar
        ? `هذه رافعة قوة. استخدمها لدعم منطقة ${weakestLabel || "الضعف الأساسية"} دون جعلها مشروع علاج طويل.`
        : `This is a leverage strength. Use it to support ${weakestLabel || "your main weak area"} without turning it into a long treatment project.`
      : row.tier === "Opportunity"
      ? ar
        ? "هذه فرصة تحسين. تحتاج إلى عادة صغيرة وثابتة، وليس تدخلًا كاملًا."
        : "This is an improvement opportunity. It needs a small consistent habit, not full intervention."
      : ar
      ? LAWYER_COMPETENCY_IDS.has(row.competencyId) ? "راقب هذه المنطقة. ليست ضمن أضعف ٦ الآن، لكنها قد تصبح نقطة احتكاك إذا أهملت." : "راقب هذه المنطقة. ليست ضمن أضعف ٦ الآن، لكنها قد تتحول إلى هدر ونزيف إذا أهملت."
      : "Monitor this area. It is not in the weakest 6 right now, but it can become leakage if ignored.";

  return (
    <div className={`rounded-3xl border-2 ${tierSoftClass(row.tier)} p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500 rtl-text">
            {ar ? "ملخص حماية" : "Protection Summary"}
          </div>
          <h4 className="mt-1 text-lg sm:text-xl font-black text-slate-950 rtl-text">{row.label}</h4>
        </div>
        <div className="force-ltr text-right">
          <div className="text-2xl font-black text-slate-950">{row.percentage}%</div>
          <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeClass(row.tier)}`}>
            {getTierLabel(row.tier, lang)}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-700 leading-relaxed rtl-text">
        {note}
      </p>

      <div className="mt-4 rounded-2xl bg-white/75 border border-white p-3">
        <div className="text-xs font-black uppercase tracking-widest text-slate-500 rtl-text">
          {ar ? "إجراء حماية واحد" : "One protection action"}
        </div>
        <p className="mt-1 text-sm font-bold text-slate-700 leading-relaxed rtl-text">
          {meta.start}
        </p>
      </div>
    </div>
  );
}


function SalesManager90DayPlanSection({
  days,
  lang,
}: {
  days: SalesManagerPlanDay[];
  lang: Language;
}) {
  const ar = lang === "ar";
  const phases = [
    {
      phase: 1 as const,
      title: ar
        ? "الأيام 1–30: تثبيت أضعف مجالين إداريين"
        : "Days 1–30: Stabilise the two weakest management areas",
    },
    {
      phase: 2 as const,
      title: ar
        ? "الأيام 31–60: بناء إيقاع فريق قابل للتكرار"
        : "Days 31–60: Build repeatable team rhythm",
    },
    {
      phase: 3 as const,
      title: ar
        ? "الأيام 61–90: تثبيت المعايير ومراجعة الأدلة وحماية الأداء"
        : "Days 61–90: Embed standards, review evidence, and protect performance",
    },
  ];

  return (
    <div className="mt-6 space-y-8">
      {phases.map(({ phase, title }) => {
        const phaseDays = days.filter((day) => day.phase === phase);
        return (
          <div key={phase}>
            <div className="avoid-break rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-sm">
              <h3 className="text-lg sm:text-xl font-black rtl-text">{title}</h3>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4">
              {phaseDays.map((day) => (
                <article
                  key={day.day}
                  className="avoid-break rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-indigo-700 rtl-text">
                        {ar ? `اليوم ${day.day}` : `Day ${day.day}`}
                      </div>
                      <h4 className="mt-1 text-lg font-black text-slate-950 rtl-text">
                        {day.competencyLabel}
                      </h4>
                    </div>
                    <span className="inline-flex w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-800">
                      {ar ? "خطة يومية" : "Daily plan"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-widest text-slate-500 rtl-text">
                        {ar ? "الإجراء" : "Action"}
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800 rtl-text">
                        {day.action}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <div className="text-xs font-black uppercase tracking-widest text-amber-800 rtl-text">
                        {ar ? "سؤال المدير" : "Manager question"}
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800 rtl-text">
                        {day.managerQuestion}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-xs font-black uppercase tracking-widest text-emerald-800 rtl-text">
                        {ar ? "دليل التنفيذ" : "Proof of execution"}
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800 rtl-text">
                        {day.proof}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PrescriptionPhase({
  ar,
  phase,
  titleEn,
  titleAr,
  bodyEn,
  bodyAr,
}: {
  ar: boolean;
  phase: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white font-black">
        {phase}
      </div>
      <h3 className="mt-4 text-xl font-black text-slate-950 rtl-text">
        {ar ? titleAr : titleEn}
      </h3>
      <p className="mt-3 text-sm sm:text-base text-slate-700 leading-relaxed rtl-text">
        {ar ? bodyAr : bodyEn}
      </p>
    </div>
  );
}

function LawyerPlanPersonalizationBox({
  weakestRows,
  strongestRow,
  lang,
}: {
  weakestRows: CompetencyRow[];
  strongestRow: CompetencyRow | null;
  lang: Language;
}) {
  const ar = lang === "ar";

  return (
    <div className="avoid-break mb-6 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-5 sm:p-6 shadow-sm">
      <div className="text-xs font-black uppercase tracking-widest text-indigo-700 rtl-text">
        {ar ? "تخصيص الخطة" : "Plan Personalization"}
      </div>
      <h3 className="mt-2 text-xl sm:text-2xl font-black text-slate-950 rtl-text">
        {ar ? "لماذا تم بناء خطة الـ 90 يومًا بهذه الطريقة؟" : "Why This 90-Day Plan Was Generated for You"}
      </h3>
      <p className="mt-3 text-sm sm:text-base font-semibold leading-relaxed text-slate-700 rtl-text">
        {ar
          ? "تم بناء هذه الخطة بناءً على أضعف ست كفاءات ظهرت في نتائجك، مع استخدام أقوى منطقة لديك كرافعة دعم. لذلك لا تُعرض الخطة كقائمة عامة، بل كمسار توجيه يبدأ بالمناطق الأكثر احتمالًا لإضعاف الثقة، أو وضوح الاستشارة، أو الثقة في أتعاب المحاماة، أو المتابعة، أو الخطوة القانونية التالية بناءً على نتائجك."
          : "This guidance plan is based on your weakest six Client Acquisition Standard™ competencies and your strongest leverage area. The sequence below is not a generic checklist. It prioritizes the areas most likely to create friction in client trust, consultation clarity, fee confidence, follow-up discipline, or next legal steps based on your own results."}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.7fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-black text-slate-950 rtl-text">
            {ar ? "مناطق العلاج ذات الأولوية:" : "Your Priority Treatment Areas:"}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {weakestRows.map((row) => (
              <div key={row.competencyId} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-sm font-bold text-slate-700 rtl-text">{row.label}</span>
                <span className="shrink-0 rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                  {row.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-black text-emerald-900 rtl-text">
            {ar ? "أقوى منطقة داعمة لديك:" : "Your Strongest Leverage Area:"}
          </div>
          <div className="mt-3 rounded-xl bg-white px-3 py-3">
            <div className="text-sm font-bold text-slate-800 rtl-text">
              {strongestRow?.label || (ar ? "أقوى منطقة لديك" : "Your strongest area")}
            </div>
            <div className="mt-2 inline-flex rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white">
              {strongestRow?.percentage ?? 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LawyerTreatmentPlanSection({
  days,
  lang,
  supportFocus,
}: {
  days: LawyerTreatmentDay[];
  lang: Language;
  supportFocus: string;
}) {
  const ar = lang === "ar";
  const phases = Array.from(
    days.reduce((groups, day) => {
      const phaseDays = groups.get(day.phase) || [];
      phaseDays.push(day);
      groups.set(day.phase, phaseDays);
      return groups;
    }, new Map<string, LawyerTreatmentDay[]>())
  );

  return (
    <div className="space-y-6">
      {phases.map(([phase, phaseDays]) => {
        const startDay = phaseDays[0]?.day || 1;
        const endDay = phaseDays[phaseDays.length - 1]?.day || startDay;
        const primaryFocuses = Array.from(new Set(phaseDays.map((day) => day.focus).filter(Boolean)))
          .filter((focus) => focus !== supportFocus)
          .slice(0, 3);
        const weeks = Array.from(
          phaseDays.reduce((groups, day) => {
            const weekDays = groups.get(day.week) || [];
            weekDays.push(day);
            groups.set(day.week, weekDays);
            return groups;
          }, new Map<number, LawyerTreatmentDay[]>())
        );

        return (
          <div
            key={phase}
            className="avoid-break rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 rtl-text">
                  {ar ? "مرحلة علاجية" : "Treatment Phase"}
                </div>
                <h3 className="mt-1 text-lg sm:text-xl font-black text-slate-950 rtl-text">
                  {phase}
                </h3>
              </div>
              <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                {ar ? `الأيام ${startDay}-${endDay}` : `Days ${startDay}-${endDay}`}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 rtl-text">
                  {ar ? "محور العلاج الأساسي" : "Primary Treatment Focus"}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(primaryFocuses.length ? primaryFocuses : [phaseDays[0]?.focus || (ar ? "أولوية العلاج" : "Treatment priority")]).map((focus) => (
                    <span key={focus} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 rtl-text">
                      {focus}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="text-[11px] font-black uppercase tracking-widest text-emerald-700 rtl-text">
                  {ar ? "محور الدعم" : "Support Focus"}
                </div>
                <div className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-900 rtl-text">
                  {supportFocus}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {weeks.map(([week, weekDays]) => (
                <div key={week} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h4 className="text-sm font-black text-slate-900 rtl-text">
                      {ar ? `الأسبوع ${week}` : `Week ${week}`}
                    </h4>
                    <span className="text-xs font-bold text-slate-500 rtl-text">
                      {ar
                        ? `الأيام ${weekDays[0]?.day}-${weekDays[weekDays.length - 1]?.day}`
                        : `Days ${weekDays[0]?.day}-${weekDays[weekDays.length - 1]?.day}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {weekDays.map((day) => (
                      <article
                        key={day.day}
                        className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 rtl-text">
                              {ar ? "اليوم" : "Day"} {day.day}
                            </div>
                            <h5 className="mt-1 text-base font-black text-slate-950 rtl-text">
                              {day.focus}
                            </h5>
                          </div>
                          <span className="inline-flex w-fit rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                            {ar ? "تطبيق مهني" : "Professional drill"}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                          <div className="rounded-2xl bg-slate-100 p-3">
                            <div className="text-[11px] font-black uppercase tracking-widest text-slate-600 rtl-text">
                              {ar ? "الإجراء المصغّر" : "Micro-Action"}
                            </div>
                            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 rtl-text">
                              {day.microAction}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-indigo-50 p-3">
                            <div className="text-[11px] font-black uppercase tracking-widest text-indigo-700 rtl-text">
                              {ar ? "التطبيق داخل الاستشارة القانونية" : "Legal Consultation Drill"}
                            </div>
                            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 rtl-text">
                              {day.consultationDrill}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-emerald-50 p-3">
                            <div className="text-[11px] font-black uppercase tracking-widest text-emerald-700 rtl-text">
                              {ar ? "مؤشر التحقق" : "Checkpoint"}
                            </div>
                            <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 rtl-text">
                              {day.checkpoint}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OutdoorSalesFitnessPlanSection({
  days,
  lang,
}: {
  days: SalesFitnessDay[];
  lang: Language;
}) {
  const ar = lang === "ar";
  const weeks = Array.from(
    days.reduce((groups, day) => {
      const weekDays = groups.get(day.week) || [];
      weekDays.push(day);
      groups.set(day.week, weekDays);
      return groups;
    }, new Map<number, SalesFitnessDay[]>())
  );

  return (
    <div className="space-y-5">
      {weeks.map(([week, weekDays]) => {
        const phase = weekDays[0]?.phase || "";
        const startDay = weekDays[0]?.day || 1;
        const endDay = weekDays[weekDays.length - 1]?.day || startDay;

        return (
          <div
            key={week}
            className="avoid-break rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5 shadow-sm"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 rtl-text">
                  {ar ? `الأسبوع ${week}` : `Week ${week}`}
                </div>
                <h3 className="mt-1 text-lg sm:text-xl font-black text-slate-950 rtl-text">
                  {phase}
                </h3>
              </div>
              <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                {ar ? `الأيام ${startDay}-${endDay}` : `Days ${startDay}-${endDay}`}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              {weekDays.map((day) => (
                <article
                  key={day.day}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h4 className="text-base font-black text-slate-950 rtl-text">
                      {ar ? `اليوم ${day.day}` : `Day ${day.day}`} — {day.focus}
                    </h4>
                    <span className="inline-flex w-fit rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                      {ar ? "تمرين يومي" : "Daily drill"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 rtl-text">
                        {ar ? "الإجراء الصغير" : "Micro-action"}
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 rtl-text">
                        {day.microAction}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-3">
                      <div className="text-[11px] font-black uppercase tracking-widest text-blue-700 rtl-text">
                        {ar ? "تمرين ميداني" : "Field exercise"}
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 rtl-text">
                        {day.fieldExercise}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-3">
                      <div className="text-[11px] font-black uppercase tracking-widest text-emerald-700 rtl-text">
                        {ar ? "نقطة التحقق" : "Checkpoint"}
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700 rtl-text">
                        {day.checkpoint}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
