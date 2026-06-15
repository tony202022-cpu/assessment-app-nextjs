// FILE: app/(site)/[slug]/report/page.tsx
import "server-only";
import EmailReportButton from "@/components/EmailReportButton";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  getRecommendations,
  Tier,
  Language,
  normalizeCompetencyId,
  tierFromPercentage,
} from "@/lib/pdf-recommendations";

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
  // Lawyer Client Conversion assessments
  legal_inquiry_handling: { en: "Legal Inquiry Handling", ar: "التعامل مع الاستفسار القانوني" },
  consultation_opening_control: { en: "Consultation Opening & Control", ar: "افتتاح الاستشارة والسيطرة عليها" },
  legal_need_diagnosis: { en: "Legal Need Diagnosis", ar: "تشخيص الحاجة القانونية الحقيقية" },
  case_qualification_client_fit: { en: "Case Qualification & Client Fit", ar: "تأهيل القضية وملاءمة العميل" },
  client_trust_professional_authority: { en: "Client Trust & Professional Authority", ar: "ثقة العميل والهيبة المهنية" },
  explaining_legal_strategy_simply: { en: "Explaining Legal Strategy Simply", ar: "شرح الاستراتيجية القانونية ببساطة" },
  legal_value_framing: { en: "Legal Value Framing", ar: "تأطير القيمة القانونية" },
  fee_presentation_retainer_confidence: { en: "Fee Presentation & Retainer Confidence", ar: "عرض أتعاب المحاماة والثقة في اتفاق التمثيل" },
  fee_comparison_objections: { en: "Fee & Comparison Objections", ar: "اعتراضات أتعاب المحاماة والمقارنة" },
  trust_risk_outcome_objections: { en: "Trust, Risk & Outcome Objections", ar: "اعتراضات الثقة والمخاطر والنتائج" },
  ethical_persuasion_boundaries: { en: "Ethical Persuasion & Professional Boundaries", ar: "الإقناع المهني الأخلاقي والحدود المهنية" },
  consultation_closing_engagement: { en: "Consultation Closing & Engagement Commitment", ar: "إغلاق الاستشارة والالتزام بالتعاقد" },
  post_consultation_follow_up: { en: "Follow-Up Discipline After Consultation", ar: "انضباط المتابعة بعد الاستشارة" },
  emotional_difficult_clients: { en: "Managing Emotional, Difficult or Unrealistic Clients", ar: "إدارة العملاء الانفعاليين أو الصعبين أو غير الواقعيين" },
  client_experience_referral_growth: { en: "Client Experience, Satisfaction & Referral Growth", ar: "تجربة العميل والرضا ونمو الإحالات" },

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
  pipeline_visibility_deal_inspection: { en: "Pipeline Visibility & Deal Inspection", ar: "رؤية مسار التدفّق وفحص الصفقات" },
  pipeline_management_deal_inspection: { en: "Pipeline Management & Deal Inspection", ar: "إدارة مسار التدفّق وفحص الصفقات" },
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
  manager_communication_upward_reporting: { en: "Manager Communication & Executive Reporting", ar: "تواصل المدير والتقارير للإدارة العليا" },
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
    if (overall >= 75) return "منطقة تحويل عملاء قوية";
    if (overall >= 50) return "منطقة فرصة واضحة لتحويل العملاء";
    if (overall >= 30) return "منطقة إنذار في تحويل العملاء";
    return "منطقة تتطلب تدخلاً عاجلاً في الاستشارات";
  }

  if (overall >= 75) return "Strong Client Conversion Zone";
  if (overall >= 50) return "Clear Client Conversion Opportunity Zone";
  if (overall >= 30) return "Client Conversion Warning Zone";
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
    if (tier === "Opportunity") return "الصورة العامة جيدة لكنها غير مكتملة. هناك أساس إداري يمكن البناء عليه، لكن بعض الهدر والنزيف في التدريب أو مسار التدفّق أو المساءلة قد تحد من نتائج الفريق.";
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
    if (tier === "Threat") return `تشير نتيجة ${label} إلى منطقة إنذار قد تؤثر على أداء الفريق أو وضوح مسار التدفّق أو المساءلة إذا لم تُعالج بسرعة.`;
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
    if (tier === "Strength") return "الصورة العامة تشير إلى قدرة قوية على تحويل الاستشارات القانونية إلى تعاقدات مهنية بثقة ووضوح. المطلوب الآن هو تحويل هذه القوة إلى نظام ثابت لا يعتمد على قوة القضية وحدها.";
    if (tier === "Opportunity") return "الصورة العامة جيدة لكنها غير مكتملة. لديك أساس مهني يمكن البناء عليه، لكن بعض الهدر والنزيف في الثقة أو شرح القيمة أو عرض أتعاب المحاماة أو المتابعة قد تجعل العميل يتردد أو يذهب لمحامٍ آخر.";
    if (tier === "Threat") return "الصورة العامة تظهر إنذارًا مهنيًا. بعض سلوكيات الاستشارة قد تُضعف ثقة العميل أو تقلل وضوح القيمة أو تجعل أتعاب المحاماة تبدو منفصلة عن حجم المخاطر والعمل القانوني المطلوب.";
    return "الصورة العامة تظهر فجوة واضحة في تحويل الاستشارات إلى تعاقدات قانونية. هذا لا يعني ضعفك كمحامٍ، بل يعني أن خبرتك القانونية قد لا تظهر للعميل بطريقة تجعله يثق، يقرر، ويلتزم.";
  }
  if (tier === "Strength") return "Your legal client-conversion health is strong. The next step is to turn your strongest consultation behaviors into a repeatable professional engagement system.";
  if (tier === "Opportunity") return "Your legal client-conversion health has a useful base, but some leaks may still be limiting client trust, legal-value clarity, professional-fee confidence, or engagement commitment.";
  if (tier === "Threat") return "Your legal client-conversion health is showing warning signals. Some consultation behaviors may be weakening trust, urgency, fee confidence, or the client’s decision to engage you.";
  return "Your legal client-conversion health is showing a clear gap. This is not a judgment on your legal ability; it means your expertise may not be becoming visible enough for the client to trust, decide, and engage.";
}

function lawyerCommercialMeaning(tier: Tier, label: string, lang: Language) {
  if (lang === "ar") {
    if (tier === "Strength") return `تشير نتيجة ${label} إلى جانب مهني قوي يساعد العميل على فهمك والثقة بك واتخاذ قرار التعاقد بثبات.`;
    if (tier === "Opportunity") return `تشير نتيجة ${label} إلى أساس جيد، لكنه يحتاج إلى وضوح أكبر حتى لا يفقد العميل الثقة أو يتردد عند مناقشة أتعاب المحاماة أو خطوات القضية.`;
    if (tier === "Threat") return `تشير نتيجة ${label} إلى منطقة إنذار قد تُضعف تحويل الاستشارة إلى تعاقد إذا لم يتم علاجها بطريقة مهنية وأخلاقية.`;
    return `تشير نتيجة ${label} إلى فجوة واضحة قد تجعل خبرتك القانونية أقل ظهورًا للعميل، أو تجعل العميل يقارن أتعاب المحاماة دون فهم القيمة والمخاطر والمسار القانوني.`;
  }
  if (tier === "Strength") return `${label} is currently a professional strength. It helps potential clients understand you, trust your judgment, and move toward engagement with greater confidence.`;
  if (tier === "Opportunity") return `${label} has a useful foundation, but it needs more clarity before it can reliably protect trust, professional-fee confidence, and engagement commitment.`;
  if (tier === "Threat") return `${label} is creating a warning signal. If left untreated, it may weaken consultation conversion, client confidence, or the decision to formally engage you.`;
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

function sectionTitle(text: string, sub?: string) {
  return (
    <div className="avoid-break mb-5">
      <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight rtl-text">
        {text}
      </h2>
      {sub && <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed rtl-text">{sub}</p>}
    </div>
  );
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
    manager_communication_upward_reporting: "Executive communication",
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
    pipeline_visibility_deal_inspection: "فحص مسار التدفّق والصفقات",
    pipeline_management_deal_inspection: "فحص مسار التدفّق والصفقات",
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
    manager_communication_upward_reporting: "التواصل والتقارير للإدارة العليا",
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
    manager_communication_upward_reporting: {
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
      leakage: "قد يبدو مسار التدفّق صحيًا بينما تكون الصفقات ضعيفة أو قديمة أو بلا خطوات تالية حقيقية.",
      root: "السبب الجذري هو قبول النشاط كدليل بدل فحص التزام العميل، مسار القرار، والخطوة التالية.",
      stop: "توقف عن مراجعة مسار التدفّق حسب قيمة الصفقة فقط.",
      start: "ابدأ بفحص كل صفقة حسب مرحلة القرار، الوصول لصاحب القرار، المخاطر، والخطوة المؤرخة التالية.",
      drill: "اختر خمس صفقات واسأل: ما الدليل أن هذه الصفقة ما زالت حية؟",
      metric: "عدد الصفقات التي لها خطوة تالية مؤكدة والتزام واضح.",
      bonus: "قائمة فحص مسار التدفّق",
    },
    pipeline_management_deal_inspection: {
      leakage: "قد يمتلئ مسار التدفّق بصفقات متفائلة بينما يضيع تركيز المدير عن الصفقات التي تحتاج تدخلًا حقيقيًا.",
      root: "السبب الجذري هو ضعف فرز الصفقات: لا يوجد فصل كافٍ بين الفرص الحقيقية والخطرة والميتة.",
      stop: "توقف عن التعامل مع كل الصفقات المفتوحة وكأنها متساوية.",
      start: "ابدأ بتصنيف الصفقات: تقدّم، إنقاذ، تأهيل للخروج، أو تدخل إداري.",
      drill: "راجع أهم 10 صفقات وضع لكل واحدة حالة فحص واضحة.",
      metric: "مراجعة مسار التدفّق حسب الجودة والمخاطر والخطوة التالية لا القيمة فقط.",
      bonus: "قائمة فحص مسار التدفّق",
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
      leakage: "قد تستهلك الاجتماعات الوقت دون تغيير السلوك أو جودة مسار التدفّق أو الخطوات التالية.",
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
      drill: "استخدم هيكلًا من ثلاث خطوات: مسار التدفّق، السلوك، الالتزام التالي.",
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
    manager_communication_upward_reporting: {
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
        bonus: "Lawyer Client Conversion Treatment Guide",
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
        bonus: "دليل علاج تحويل العملاء للمحامين",
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
          title: "نمط هدر ونزيف حاد في كسب الاستشارات القانونية",
          body: `الصورة الحالية تشير إلى أن المشكلة ليست في كفاءة واحدة فقط. أضعف المناطق (${weakestNames}) قد تخلق سلسلة هدر ونزيف تبدأ من أول استفسار وتنتهي بتردد العميل أو ضياع قرار التعاقد. لا تبدأ بكل شيء. ابدأ بأول هدر ونزيف في رحلة العميل وعالجه كنظام مهني.`,
        };
      }
      if (overall < 50) {
        return {
          title: "نمط إنذار في تحويل العملاء يحتاج إلى ضبط الاستشارة",
          body: `هناك خبرة قانونية موجودة، لكنها لا تظهر للعميل بثبات تحت ضغط الاستشارة أو أتعاب المحاماة أو المقارنة مع محامٍ آخر. أضعف المناطق (${weakestNames}) تحتاج إلى علاج مبكر، بينما يمكن استخدام أقوى المناطق (${strongestNames}) كرافعة مهنية.`,
        };
      }
      if (overall < 75) {
        return {
          title: "نمط فرصة قانونية غير مكتملة يحتاج إلى نظام تعاقد أوضح",
          body: `الأداء المهني ليس ضعيفًا، لكنه ليس محميًا بما يكفي. المطلوب هو تحويل أقوى المناطق (${strongestNames}) إلى عادات استشارة ثابتة، واستخدامها لدعم أضعف المناطق (${weakestNames}).`,
        };
      }
      return {
        title: "نمط قوة في تحويل العملاء يحتاج إلى حماية وتوسيع",
        body: `قدرتك العامة على تحويل الاستشارات إلى تعاقدات قوية. الخطر ليس الضعف، بل التراخي. استخدم أقوى المناطق (${strongestNames}) كمعايير مهنية يومية، وراقب أضعف المناطق (${weakestNames}) حتى لا تتحول إلى هدر ونزيف لاحق.`,
      };
    }

    if (overall < 30) {
      return {
        title: "High-Leakage Legal Client Conversion Pattern",
        body: `The current pattern suggests the issue is not one isolated skill. The weakest areas (${weakestNames}) may be creating a leakage chain that begins with the first legal inquiry and ends with hesitation, comparison, or no engagement decision. Do not start everywhere. Start with the first consultation leak and build treatment around it.`,
      };
    }
    if (overall < 50) {
      return {
        title: "Legal Client Conversion Warning Pattern",
        body: `There is legal expertise in the system, but it may not be showing clearly and consistently under consultation pressure, professional-fee discussion, or comparison with another lawyer. The weakest areas (${weakestNames}) need early treatment, while the strongest areas (${strongestNames}) can be used as professional leverage.`,
      };
    }
    if (overall < 75) {
      return {
        title: "Unfinished Legal Engagement Pattern Requiring Systemization",
        body: `Your professional performance is not broken, but it is not protected enough. The treatment is to turn the strongest areas (${strongestNames}) into repeatable consultation habits and use them to support the weakest areas (${weakestNames}).`,
      };
    }
    return {
      title: "Strong Legal Client Conversion Pattern Requiring Protection",
      body: `Your overall ability to convert consultations into professional engagements is strong. The danger is not failure; it is drift. Use the strongest areas (${strongestNames}) as daily professional standards and monitor the weakest areas (${weakestNames}) so they do not become future leakage.`,
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

    const meta = labelsFromConfig[key] || COMPETENCY_LABELS[key] || null;

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

  const reportTitle =
    (ar
      ? (assessment as any)?.title_ar || (assessment as any)?.name_ar || ""
      : (assessment as any)?.title_en || (assessment as any)?.name_en || "") ||
    (mri
      ? ar
        ? lawyer ? "تقرير Lawyer Client Conversion MRI المتقدم" : businessHealth ? "تقرير Business Health MRI للشركات الصغيرة والمتوسطة" : salesManager ? "تقرير Sales Manager MRI المتقدم" : "تقرير Outdoor Sales MRI المتقدم"
        : lawyer ? "Advanced Lawyer Client Conversion MRI Report" : businessHealth ? "Advanced SME Business Health MRI Report" : salesManager ? "Advanced Sales Manager MRI Report" : "Advanced Outdoor Sales MRI Report"
      : lawyer
      ? ar
        ? "فحص تحويل العملاء للمحامين"
        : "Lawyer Client Conversion Scan"
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
        ? lawyer ? "Forensic Legal Client Conversion Diagnostic" : businessHealth ? "Forensic SME Business Health Diagnostic" : "Full Diagnostic & Treatment Tool"
        : lawyer ? "Lawyer Client Conversion Blood Test" : businessHealth ? "SME Business Health Vital Signs Check" : salesManager ? "Sales Manager Leadership Blood Test" : "Sales Performance Blood Test",
      subtitle: mri
        ? lawyer
          ? "A personalized Lawyer Client Conversion MRI designed to diagnose how legal inquiries become paid professional engagements  from first inquiry to consultation, legal-value clarity, professional fees, objections, and follow-up."
          : businessHealth
          ? "A personalized SME Business Health MRI designed to diagnose where the company is leaking cash, customers, team energy, execution discipline, owner time, and growth readiness then turn the findings into a practical business revamp roadmap."
          : salesManager
          ? "A personalized Sales Manager MRI designed to diagnose leadership patterns, team performance leaks, and management treatment priorities."
          : "A personalized Sales MRI designed to diagnose the full sales performance body and turn the findings into a practical treatment plan."
        : lawyer
        ? "A fast diagnostic scan of your legal consultation conversion health from first impression to client trust, fee confidence, objections, and engagement commitment."
        : businessHealth
        ? "A fast business health scan that checks the company’s vital signs across direction, revenue, marketing, cash, operations, people, owner dependency, and growth readiness."
        : salesManager
        ? "A fast leadership scan of your sales-management health like a blood test for the way you coach, inspect, forecast, motivate, and hold the team accountable."
        : "A fast diagnostic scan of your sales performance body like a blood test for field sales.",
      overall: lawyer ? "Legal Client Conversion Health Score" : businessHealth ? "SME Business Health Score" : salesManager ? "Overall Sales Management Health Score" : "Overall Sales Health Score",
      overallMarker: lawyer ? "Legal Client Conversion Index" : businessHealth ? "Business Health Index" : salesManager ? "Overall Sales Management Index" : "Overall Sales Health Index",
      participant: "Participant Identity",
      health: lawyer ? "Client Conversion Health Zone" : businessHealth ? "Business Health Temperature" : salesManager ? "Management Health Zone" : "Sales Health Zone",
      bloodPanel: mri
        ? lawyer ? "15-Competency Lawyer Client Conversion MRI Panel" : businessHealth ? "12-Area SME Business Health MRI Panel" : salesManager ? "15-Competency Sales Manager MRI Panel" : "15-Competency Sales MRI Panel"
        : lawyer ? "Lawyer Client Conversion Panel: Overall Score + Professional Markers" : businessHealth ? "SME Business Health Panel: Overall Score + Vital Signs" : salesManager ? "Sales Manager Panel: Overall Score + 7 Leadership Markers" : "Sales Health Panel: Overall Score + 7 Core Markers",
      bloodPanelSub: mri
        ? lawyer
          ? "This deep diagnostic examines the full legal client journey across 15 competencies to reveal where consultation trust, legal-value clarity, professional-fee confidence, engagement commitment, and client experience may be leaking."
          : businessHealth
          ? "This deep diagnostic examines the business across 12 health areas to reveal where revenue, cash, customers, operations, people, owner dependency, risk, visibility, and growth readiness may be leaking."
          : salesManager
          ? "This is your deep management diagnostic panel. It examines the wider sales-manager role across 15 competencies to reveal strengths, leaks, root patterns, and treatment priorities."
          : "This is your deep diagnostic panel. It examines the wider sales performance body across 15 competencies to reveal strengths, leaks, root patterns, and treatment priorities."
        : lawyer
        ? "This panel combines your overall client-conversion score with core markers that reveal where you create trust, where clients hesitate, and what needs professional treatment."
        : businessHealth
        ? "This panel combines your overall business health score with the core areas that reveal where the company is stable, where it is leaking, and what needs executive treatment."
        : salesManager
        ? "This panel combines your overall management score with seven core markers that reveal where your leadership is strong, where the team may be leaking performance, and what needs attention."
        : "This panel combines your overall sales health score with the seven core markers that reveal where performance is strong, where it is leaking, and what needs treatment.",
      strongest: lawyer ? "Strongest Legal Conversion Signal" : businessHealth ? "Strongest Business Health Signal" : salesManager ? "Strongest Management Signal" : "Strongest Signal",
      weakest: lawyer ? "Biggest Hidden Consultation Leak" : businessHealth ? "Biggest Hidden Business Leak" : salesManager ? "Biggest Hidden Team Performance Leak" : "Biggest Hidden Revenue Leak",
      commercial: lawyer ? "Professional Interpretation" : businessHealth ? "Business Health Interpretation" : salesManager ? "Management Interpretation" : "Commercial Interpretation",
      swot: lawyer ? "Lawyer Client Conversion SWOT Analysis" : businessHealth ? "SME Business Health SWOT Analysis" : "Strategic SWOT Analysis",
      actions: mri ? (lawyer ? "Professional Treatment Priorities" : businessHealth ? "Business Revamp Treatment Priorities" : "Personal Treatment Priorities") : "Priority Execution Plan",
      prescriptionHeadline: lawyer ? "Your Legal MRI Shows the Consultation Leaks. The Treatment Plan Shows What to Fix First." : businessHealth ? "Your Business Health MRI Shows the Leaks. The Roadmap Shows What to Stabilize and Revamp First." : salesManager ? "Your Leadership Scan Shows the Symptoms. The Manager MRI Gives You the Treatment Plan." : "Your Scan Is the Blood Test. The MRI Gives You the Prescription.",
      prescriptionSubhead: lawyer ? "The Advanced Lawyer Client Conversion MRI is a full diagnostic and treatment tool for legal inquiries, consultations, client trust, professional fees, objections, engagement commitment, and client experience." : businessHealth ? "The Advanced SME Business Health MRI is a full diagnostic and roadmap tool for owners and general managers who want to stabilize leaks, strengthen the operating system, and identify the next revamp priorities." : salesManager ? "The Advanced Sales Manager MRI is a full diagnostic and treatment tool for coaching, pipeline, accountability, forecasting, and team execution." : "The Advanced Outdoor Sales MRI is a full diagnostic and treatment tool for your sales performance body.",
      prescriptionCta: lawyer ? "Get My Full Lawyer Client Conversion MRI" : businessHealth ? "Get My SME Business Health Roadmap" : salesManager ? "Get My Full Sales Manager MRI" : "Get My Full Sales MRI & 90-Day Prescription",
      enterpriseTitle: lawyer ? "For Law Firms, Managing Partners & Legal Platforms" : businessHealth ? "For SME Owners, General Managers & Partners" : salesManager ? "For Sales Directors, CEOs & Business Owners" : "For Sales Managers & Business Owners",
      enterpriseCta: lawyer ? "Diagnose the Lawyer Before You Train the Lawyer" : businessHealth ? "Diagnose the Business Before You Revamp the Business" : "Diagnose the Team Before You Train the Team",
    },
    ar: {
      back: "العودة إلى النتائج",
      badge: mri
        ? lawyer ? "تشخيص عميق ودقيق لتحويل العملاء للمحامين" : businessHealth ? "تشخيص عميق ودقيق لصحة الشركات الصغيرة والمتوسطة" : "أداة تشخيص وعلاج كاملة"
        : lawyer ? "SCAN تحويل العملاء للمحامين" : businessHealth ? "SCAN العلامات الحيوية لصحة الشركة" : salesManager ? "SCAN قيادي لمدير المبيعات" : "فحص دم لأداء المبيعات",
      subtitle: mri
        ? lawyer
          ? "تقرير Lawyer Client Conversion MRI شخصي لتشخيص كيف تتحول الاستفسارات القانونية إلى تعاقدات مهنية مدفوعة  من أول استفسار إلى الاستشارة، وضوح القيمة القانونية، أتعاب المحاماة، الاعتراضات، والمتابعة."
          : businessHealth
          ? "تقرير SME Business Health MRI شخصي لتشخيص أين تهدر الشركة السيولة، العملاء، طاقة الفريق، انضباط التنفيذ، وقت المالك، وجاهزية النمو  ثم تحويل النتائج إلى خارطة طريق عملية لتقوية الشركة."
          : salesManager
          ? "تقرير Sales Manager MRI شخصي لتشخيص أنماط القيادة، وهدر ونزيف في أداء الفريق، وأولويات العلاج الإداري."
          : "تقرير Sales MRI شخصي مصمم لتشخيص الجسم البيعي الكامل وتحويل النتائج إلى خطة علاج عملية."
        : lawyer
        ? "SCAN سريع لصحة تحويل الاستشارات القانونية  من الانطباع الأول إلى ثقة العميل، عرض أتعاب المحاماة، الاعتراضات، وقرار التعاقد."
        : businessHealth
        ? "SCAN سريع للعلامات الحيوية للشركة عبر الاتجاه، الإيرادات، التسويق، السيولة، العمليات، الأفراد، اعتماد الشركة على المالك، وجاهزية النمو."
        : salesManager
        ? "SCAN قيادي سريع لصحة إدارتك لفريق المبيعات كأنه تحليل دم لطريقة التدريب، SCAN مسار التدفّق، التوقع، التحفيز، والمساءلة."
        : "SCAN تشخيصي سريع لجسم أدائك البيعي  كأنه تحليل دم مهني وظيفي لمندوبي المبيعات.",
      overall: lawyer ? "مؤشر صحة تحويل العملاء للمحامين" : businessHealth ? "مؤشر صحة الشركة" : salesManager ? "مؤشر صحة إدارة المبيعات العام" : "مؤشر الصحة البيعية العام",
      overallMarker: lawyer ? "مؤشر تحويل الاستشارات إلى تعاقدات" : businessHealth ? "مؤشر صحة الأعمال" : salesManager ? "مؤشر صحة إدارة المبيعات العام" : "مؤشر الصحة البيعية العام",
      participant: "هوية المشارك",
      health: lawyer ? "منطقة صحة تحويل العملاء" : businessHealth ? "درجة حرارة صحة الشركة" : salesManager ? "منطقة الصحة الإدارية" : "منطقة الصحة البيعية",
      bloodPanel: mri
        ? lawyer ? "لوحة Lawyer Client Conversion MRI عبر ١٥ كفاءة" : businessHealth ? "لوحة SME Business Health MRI عبر ١٢ منطقة" : salesManager ? "لوحة Sales Manager MRI عبر ١٥ كفاءة" : "لوحة MRI التشخيصية عبر ١٥ كفاءة"
        : lawyer ? "لوحة تحويل العملاء للمحامين: النتيجة العامة + المؤشرات المهنية" : businessHealth ? "لوحة صحة الشركة: النتيجة العامة + العلامات الحيوية" : salesManager ? "لوحة مدير المبيعات: النتيجة العامة + ٧ مؤشرات قيادية" : "لوحة الصحة البيعية: النتيجة العامة + ٧ مؤشرات أساسية",
      bloodPanelSub: mri
        ? lawyer
          ? "يفحص هذا التشخيص العميق رحلة العميل القانوني عبر ١٥ كفاءة ليكشف أين قد تتسرّب ثقة العميل، وضوح القيمة القانونية، الثقة في عرض أتعاب المحاماة، قرار التعاقد، وتجربة العميل."
          : businessHealth
          ? "يفحص هذا التشخيص العميق الشركة عبر ١٢ منطقة صحية ليكشف أين قد تتسرب الإيرادات، السيولة، العملاء، العمليات، الأفراد، وقت المالك، المخاطر، وضوح الإدارة، وجاهزية النمو."
          : salesManager
          ? "هذه لوحة تشخيص إداري عميق تفحص دور مدير المبيعات عبر ١٥ كفاءة لكشف نقاط القوة، الهدر والنزيف، الأسباب الجذرية، وأولويات العلاج."
          : "هذه لوحة تشخيص عميق تفحص جسم الأداء البيعي عبر ١٥ كفاءة لكشف نقاط القوة، الهدر والنزيف، الأسباب الجذرية، وأولويات العلاج."
        : lawyer
        ? "تجمع هذه اللوحة بين نتيجة تحويل العملاء والمؤشرات الأساسية التي تكشف أين تصنع الثقة، أين يتردد العميل، وما الذي يحتاج إلى علاج مهني."
        : businessHealth
        ? "تجمع هذه اللوحة بين مؤشر صحة الشركة والمناطق الأساسية التي تكشف أين الشركة مستقرة، أين تتسرب، وما الذي يحتاج إلى علاج تنفيذي."
        : salesManager
        ? "تجمع هذه اللوحة بين نتيجتك الإدارية العامة وسبعة مؤشرات قيادية تكشف أين قيادتك قوية، أين يتسرّب أداء الفريق، وما الذي يحتاج إلى انتباه."
        : "تجمع هذه اللوحة بين مؤشر صحتك البيعية والسبعة مؤشرات الأساسية التي تكشف أين الأداء قوي، أين يتسرب، وما الذي يحتاج إلى علاج.",
      strongest: lawyer ? "أقوى إشارة في تحويل العملاء" : businessHealth ? "أقوى إشارة في صحة الشركة" : salesManager ? "أقوى إشارة إدارية" : "أقوى إشارة",
      weakest: lawyer ? "أكبر هدر ونزيف مخفي في الاستشارة القانونية" : businessHealth ? "أكبر هدر ونزيف خفي في الشركة" : salesManager ? "أكبر هدر ونزيف مخفي في أداء الفريق" : "أكبر هدر ونزيف مخفي في الإيرادات",
      commercial: lawyer ? "التفسير المهني" : businessHealth ? "تفسير صحة الشركة" : salesManager ? "التفسير الإداري" : "التفسير العملي",
      swot: lawyer ? "تحليل SWOT لتحويل العملاء للمحامين" : businessHealth ? "تحليل SWOT لصحة الشركة" : "تحليل SWOT الاستراتيجي",
      actions: mri ? (lawyer ? "أولويات العلاج المهني" : businessHealth ? "أولويات علاج وإعادة تقوية الشركة" : "أولويات العلاج الشخصية") : "خطة التنفيذ ذات الأولوية",
      prescriptionHeadline: lawyer ? "تقريرك يكشف هدر ونزيف. وخطة العلاج توضّح ما يجب إصلاحه أولًا." : businessHealth ? "تقرير صحة الشركة يكشف الهدر والنزيف. وخارطة الطريق توضّح ما يجب تثبيته وتقويته أولًا." : salesManager ? "ال SCAN القيادي يكشف الأعراض. أما Manager MRI فيعطيك خطة العلاج." : "ال SCAN  هو تحليل الدم. أما الـ MRI فيعطيك الوصفة العلاجية.",
      prescriptionSubhead: lawyer ? "تقرير Advanced Lawyer Client Conversion MRI هو أداة تشخيص وعلاج كاملة للاستفسارات القانونية، الاستشارة، ثقة العميل، أتعاب المحاماة، الاعتراضات، قرار التعاقد، وتجربة العميل." : businessHealth ? "تقرير Advanced SME Business Health MRI هو أداة تشخيص وخارطة طريق لأصحاب الشركات والمدراء العامين الذين يريدون تثبيت الهدر، تقوية نظام التشغيل، وتحديد أولويات إعادة بناء الشركة." : salesManager ? "تقرير Advanced Sales Manager MRI هو أداة تشخيص وعلاج كاملة للتدريب، مسار التدفّق، المساءلة، التوقعات، وتنفيذ الفريق." : "تقرير Advanced Outdoor Sales MRI هو أداة تشخيص وعلاج كاملة لجسم أدائك البيعي.",
      prescriptionCta: lawyer ? "احصل على Lawyer Client Conversion MRI الكامل" : businessHealth ? "احصل على خارطة طريق صحة الشركة" : salesManager ? "احصل على Sales Manager MRI الكامل" : "احصل على تقرير MRI الكامل ووصفة الـ ٩٠ يومًا",
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
                    {t.subtitle}
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
                    ? "يعرض هذا التقرير الشخصي المفصل صورة أعمق لطريقة تحويل الاستفسارات القانونية إلى تعاقدات مهنية. إنه لا يكتفي بإخبارك أين انخفضت الدرجة، بل يساعدك على فهم أنماط الاستشارة، ثقة العميل، عرض أتعاب المحاماة، قرار التعاقد، وأولويات العلاج التي يجب التعامل معها أولًا."
                    : "This personalized report gives you a deeper view of your legal client-conversion body. It does not simply tell you where the score is low; it helps you understand consultation patterns, client-trust risks, professional-fee confidence, engagement decisions, and the treatment priorities that should be corrected first."
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
                        ? "يفحص التقرير ١٥ كفاءة لتحويل الاستشارات القانونية إلى تعاقدات بدل الاكتفاء بالمؤشرات السريعة."
                        : "The report examines 15 legal client-conversion competencies instead of stopping at basic markers."
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
                        ? "أولويات العلاج مبنية على إجاباتك ودرجاتك في رحلة الاستفسار القانوني والاستشارة وأتعاب المحاماة وقرار التعاقد، وليست نصائح عامة."
                        : "The legal client-conversion treatment priorities are built from your answers and scores across inquiry, consultation, professional fees, and engagement decisions not from generic advice."
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
                        ? "الخطة تساعدك على معرفة ما الذي يجب إصلاحه أولًا في التدريب، مسار التدفّق، المساءلة، وإيقاع الفريق."
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
          {sectionTitle(t.bloodPanel, t.bloodPanelSub)}

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
                    ? "القراءة المجمعة لمؤشرات تحويل الاستشارات القانونية إلى تعاقدات."
                    : "The combined reading of your full legal client-conversion MRI."
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
                        ? "هذه المنطقة قد تكون سببًا جذريًا في خسارة الاستشارة وضياعها أو ضعف الثقة أو تأخر قرار التعاقد. ابدأ علاجها قبل محاولة إصلاح كل شيء."
                        : "This area may be a root contributor to consultation leakage, weak client trust, professional-fee hesitation, or delayed engagement decisions. Treat it before trying to fix everything."
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
                  ? "هذه هي المنطقة التي يمكن استخدامها كرافعة مهنية، لأنها تكشف سلوكًا يساعد العميل المحتمل على الثقة بك وفهم قيمتك القانونية واتخاذ قرار التعاقد."
                  : "This is the area you can use as professional leverage because it reveals a behavior that supports client trust, legal-value clarity, and engagement confidence."
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
                  ? "هذه ليست مجرد نتيجة منخفضة. إنها غالبًا المكان الذي يبدأ فيه زعزعة الثقة أو وضوح القيمة القانونية أو قرار التعاقد قبل أن يصبح واضحًا."
                  : "This is not just a low score. It is often where consultation leakage, weak client trust, unclear legal value, or delayed engagement decisions begin before they become obvious."
                : businessHealth
                ? ar
                  ? "هذه ليست مجرد نتيجة منخفضة. إنها غالبًا المكان الذي يبدأ فيه هدر ونزيف في الشركة قبل أن يظهر في السيولة، العملاء، العمليات، الفريق، أو وقت المالك."
                  : "This is not just a low score. It is often where business leakage begins before it shows up clearly in cash, customers, operations, people, or owner time."
                : salesManager
                ? ar
                  ? "هذه ليست مجرد نتيجة منخفضة. إنها غالبًا المكان الذي يبدأ فيه هدر ونزيف في أداء الفريق أو ضعف المساءلة أو اضطراب مسار التدفّق دون أن يكون واضحًا في البداية."
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
                  ? "قراءة مهنية مختصرة لما قد يحدث داخل رحلة الاستشارة، الثقة، أتعاب المحاماة، وقرار التعاقد."
                  : "A practical professional reading of what may be happening inside the legal inquiry, consultation, trust, fee, and engagement journey."
                : salesManager
                ? ar
                  ? "قراءة إدارية مختصرة لما قد يحدث داخل الفريق ومسار التدفّق."
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
                    ? "العميل المحتمل لا يرى نتيجتك. هو يختبر وضوحك، هدوءك، قدرتك على تشخيص المشكلة القانونية، شرح الخيارات، عرض أتعاب المحاماة بثقة، وتحديد خطوة التعاقد التالية."
                    : "Potential clients do not see your score. They experience your clarity, calm authority, legal diagnosis, explanation of options, confidence in presenting professional fees, and ability to guide the next engagement step."
                  : businessHealth
                  ? ar
                    ? "الشركة لا تعيش نتيجتك كرقم. هي تعيشها كتدفق نقدي مضغوط، عملاء يتسربون، عمليات تعتمد على الأشخاص، فريق ينتظر التوجيه، وقرارات تحتاج إلى رؤية أوضح."
                    : "The business does not experience your score as a number. It experiences it as cash pressure, customer leakage, people dependency, operational friction, scattered visibility, and decisions made without enough rhythm."
                  : salesManager
                  ? ar
                    ? "الفريق لا يرى نتيجتك. هو يختبر طريقة تدريبك، فحصك للبايبلاين، وضوح المساءلة، وعدالة تعاملك مع الأداء الصعب."
                    : "The team does not see your score. They experience your coaching rhythm, pipeline inspection, accountability clarity, and fairness with difficult performance."
                  : ar
                  ? "العميل لا يرى درجاتك. هو يشعر بطريقة افتتاحك، عمق أسئلتك، صبرك مع الاعتراضات، وقدرتك على المتابعة."
                  : "Prospects do not see your score. They experience your opening, question depth, patience with objections, and follow-up discipline."
              }
            />

            <DarkInsight
              title={ar ? "أين يحدث الهدر والنزيف" : "Where leakage happens"}
              body={
                weakest
                  ? ar
                    ? lawyer
                      ? `أكبر هدر ظاهر الآن مرتبط بـ ${weakest.label}. هذه المنطقة قد تؤثر على ثقة العميل، وضوح الاستشارة القانونية، عرض أتعاب المحاماة، أو قرار التعاقد قبل أن يظهر السبب الحقيقي.`
                      : businessHealth
                      ? `أكبر هدر ونزيف ظاهر الآن مرتبط بـ ${weakest.label}. هذه المنطقة قد تستنزف السيولة أو العملاء أو وقت المالك أو طاقة الفريق أو جاهزية النمو قبل أن يظهر السبب الحقيقي.`
                      : salesManager
                      ? `أكبر هدر ونزيف ظاهر الآن مرتبط بـ ${weakest.label}. هذه المنطقة قد تؤثر على أداء الفريق أو وضوح مسار التدفّق أو الانضباط قبل أن يظهر السبب الحقيقي.`
                      : `أكبر هدر ونزيف ظاهر الآن مرتبط بـ ${weakest.label}. هذه المنطقة قد تجعل الفرص تتوقف أو تضعف قبل أن تعرف السبب الحقيقي.`
                    : lawyer
                    ? `The clearest leakage signal is currently connected to ${weakest.label}. This area may weaken client trust, consultation clarity, professional fee confidence, or the engagement decision before the real reason is visible.`
                    : businessHealth
                    ? `The clearest business leak is currently connected to ${weakest.label}. This area may quietly drain cash, customers, owner time, team energy, operating discipline, or growth readiness before the root cause becomes obvious.`
                    : salesManager
                    ? `The clearest leakage signal is currently connected to ${weakest.label}. This area may weaken team performance, pipeline clarity, or execution discipline before the real reason is visible.`
                    : `The clearest leakage signal is currently connected to ${weakest.label}. This area may stall or weaken opportunities before the real reason is visible.`
                  : ar
                  ? "لا توجد بيانات كافية لتحديد منطقة الهدر والنزيف."
                  : "There is not enough data to identify the leakage area."
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
              ? lawyer ? "ليس مجرد تصنيف للكفاءات، بل قراءة لما تعنيه النتائج داخل رحلة تحويل الاستشارة القانونية إلى تعاقد مهني." : businessHealth ? "ليس مجرد تصنيف للمناطق، بل قراءة لما تعنيه النتائج داخل صحة الشركة واستقرارها وقابليتها للنمو." : "ليس مجرد تصنيف للكفاءات، بل قراءة لما تعنيه النتائج في الأداء البيعي الحقيقي."
              : lawyer ? "Not just a category list but a practical reading of what the results mean inside the legal consultation-to-engagement journey." : businessHealth ? "Not just a category list but a practical reading of what the results mean inside the company’s health, stability, and growth system." : "Not just a category list but a practical reading of what the results mean in real sales performance."
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SwotBox
              title={ar ? "نقاط القوة" : "Strengths"}
              tier="Strength"
              rows={strengths}
              empty={ar ? "لا توجد نقاط قوة واضحة حتى الآن." : "No clear strengths yet."}
              explanation={
                ar
                  ? lawyer ? "هذه المناطق يمكن تحويلها إلى عادات مهنية ثابتة تعزز الثقة، وضوح الاستشارة، وقرار التعاقد." : "هذه المناطق يمكن تحويلها إلى عادات ثابتة تدعم بقية الأداء."
                  : lawyer ? "These areas can be turned into repeatable professional habits that strengthen trust, consultation clarity, and engagement decisions." : "These areas can be turned into repeatable habits that support the rest of the performance."
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
                    ? "هذه المناطق ليست ضعيفة، لكنها تحتاج إلى صياغة مهنية أوضح حتى تزيد الثقة وتدعم قرار التعاقد."
                    : "These areas are not broken, but they need clearer professional structure before they reliably improve trust and engagement decisions."
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
                    ? "هذه إشارات إنذار. إذا تُركت دون علاج، قد تسبب زعزعة في ثقة العميل، وضوح الاستشارة، عرض أتعاب المحاماة، أو قرار التعاقد."
                    : "These are warning signals. If left untreated, they may create leakage in client trust, consultation clarity, professional-fee confidence, or engagement decisions."
                  : salesManager
                  ? ar
                    ? "هذه إشارات إنذار. إذا تُركت دون علاج، قد تسبب هدراً ونزيفاً في وضوح مسار التدفّق، المساءلة، جودة التوقعات، أو تنفيذ الفريق."
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
                    ? "هذه المناطق تحتاج إلى علاج مهني مباشر، لأنها غالبًا تؤثر على الانطباع الأول، ثقة العميل، وضوح القيمة القانونية، أو قرار التعاقد."
                    : "These areas need direct professional treatment because they often affect first impressions, client trust, legal-value clarity, or engagement decision progress."
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
    {sectionTitle(
      businessHealth
        ? ar
          ? "خارطة علاج صحة الشركة خلال ٩٠ يومًا"
          : "90-Day SME Business Health Treatment Roadmap"
        : lawyer
        ? ar
          ? "وصفة تحويل الاستشارات القانونية خلال ٩٠ يومًا"
          : "90-Day Legal Client Conversion Treatment Plan"
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
          ? "هذه ليست دورة تدريبية. إنها خطة علاج مهنية مبنية على نسبة خسارات الاستشارات والعملاء  وأولويات تحويل العميل إلى تعاقد."
          : "This is not a training course. It is a professional treatment plan based on your consultation leaks and client-engagement priorities."
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
            : "Days 1–30: Stop the Leakage"
        }
        titleAr={
          businessHealth
            ? "الأيام ١–٣٠: أوقف الهدر والنزيف في  الشركة"
            : "الأيام ١–٣٠: أوقف الهدر والنزيف"
        }
        bodyEn={
          businessHealth
            ? `Focus first on ${topThreeRisks[0]?.label || "your weakest business health area"}. Reduce the issue most likely leaking cash, customers, execution, owner time, or growth capacity, then build a simple correction rhythm the business can repeat weekly.`
            : lawyer
            ? `Focus first on ${topThreeRisks[0]?.label || "your lowest score"}. Reduce the consultation behavior most likely leaking client trust, professional-fee confidence, or engagement commitment, then build a simple correction routine you can repeat daily.`
            : salesManager
            ? `Focus first on ${topThreeRisks[0]?.label || "your lowest score"}. Reduce the management behavior most likely leaking team performance, then build a simple correction rhythm you can repeat weekly.`
            : `Focus first on ${topThreeRisks[0]?.label || "your lowest score"}. Reduce the behavior that is most likely leaking opportunities, then build a simple correction routine you can repeat daily.`
        }
        bodyAr={
          businessHealth
            ? `ابدأ أولًا بـ ${topThreeRisks[0]?.label || "أضعف مجال في صحة الشركة"}. قلّل المشكلة التي قد تسرّب السيولة، العملاء، التنفيذ، وقت المالك، أو قدرة الشركة على النمو، ثم ابنِ إيقاع تصحيح بسيط يمكن تكراره أسبوعيًا.`
            : lawyer
            ? `ابدأ أولًا بـ ${topThreeRisks[0]?.label || "أضعف نتيجة لديك"}. قلّل سلوك الاستشارة الذي قد يسرّب ثقة العميل أو الثقة في أتعاب المحاماة أو الالتزام بالتعاقد، ثم ابنِ روتين تصحيح بسيط يمكنك تكراره يوميًا.`
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
            ? `Use your stronger areas, especially ${topThreeStrengths[0]?.label || "your strengths"}, to support weaker consultation behaviors and create a more stable inquiry-to-engagement rhythm.`
            : salesManager
            ? `Use your stronger areas, especially ${topThreeStrengths[0]?.label || "your strengths"}, to support weaker management behaviors and create a more stable team execution rhythm.`
            : `Use your stronger areas, especially ${topThreeStrengths[0]?.label || "your strengths"}, to support the weaker behaviors and create a more stable sales rhythm.`
        }
        bodyAr={
          businessHealth
            ? `استخدم مناطق قوتك، خاصة ${topThreeStrengths[0]?.label || "أقوى مجال في صحة الشركة"}، لدعم المجالات الأضعف وبناء إيقاع تشغيل أكثر ثباتًا في الإيرادات، السيولة، العملاء، الأشخاص، والتنفيذ.`
            : lawyer
            ? `استخدم مناطق قوتك، خاصة ${topThreeStrengths[0]?.label || "نقاط قوتك"}، لدعم سلوكيات الاستشارة الأضعف وبناء إيقاع أكثر ثباتًا من الاستفسار إلى التعاقد.`
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
            ? "Turn the corrected behaviors into a legal client-conversion operating system: open consultations better, diagnose needs better, explain legal value better, present professional fees better, and follow up with more confidence."
            : salesManager
            ? "Turn the corrected behaviors into a sales-management operating system: coach better, inspect better, forecast better, and hold the team accountable with more clarity."
            : "Turn the corrected behaviors into a personal sales operating system: prepare better, ask better, follow up better, and close with more control."
        }
        bodyAr={
          businessHealth
            ? "حوّل الأولويات المصححة إلى نظام تشغيل للشركة: راجع الأرقام، افحص تدفق العملاء، قوِّ المساءلة، خفّف اعتماد الشركة على المالك، واحمِ العمل من المخاطر التي يمكن تجنبها."
            : lawyer
            ? "حوّل السلوكيات المصححة إلى نظام تشغيل لتحويل العملاء للمحامين: افتح الاستشارات بشكل أفضل، شخّص الاحتياج أفضل، اشرح القيمة القانونية أفضل، اعرض أتعاب المحاماة بثقة أكبر، وتابع بوضوح أقوى."
            : salesManager
            ? "حوّل السلوكيات المصححة إلى نظام تشغيل لإدارة المبيعات: درّب أفضل، افحص مسار التدفّق أفضل، توقّع أفضل، وحاسب الفريق بوضوح أكبر."
            : "حوّل السلوكيات المصححة إلى نظام تشغيل شخصي للبيع: حضّر أفضل، اسأل أفضل، تابع أفضل، وأغلق بتحكم أكبر."
        }
      />
    </div>
  </section>
)}

        {/* SCAN-ONLY MRI PRESCRIPTION UPSELL */}
        {!mri && (
          <section className="avoid-break rounded-3xl overflow-hidden shadow-2xl border border-indigo-200">
            <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-7 sm:p-10">
              <div className="inline-flex rounded-full bg-rose-500/20 border border-rose-300/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-100">
                {ar ? "لا تتوقف عند نتيجة ال SCAN" : "Do Not Stop at the Scan"}
              </div>

              <h2 className="mt-5 text-3xl sm:text-5xl font-black leading-tight rtl-text">
                {t.prescriptionHeadline}
              </h2>

              <p className="mt-4 text-lg sm:text-2xl font-black leading-relaxed text-amber-200 max-w-4xl rtl-text">
                {t.prescriptionSubhead}
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
                        : [
                          "تقرير Sales MRI شخصي مفصل من حوالي ٣٠ صفحة مبني على إجاباتك ونتائجك",
                          salesManager ? "أداة تشخيص وعلاج كاملة تفحص ١٥ كفاءة في جسم قيادتك لفريق المبيعات" : "أداة تشخيص وعلاج كاملة تفحص ١٥ كفاءة في جسم أدائك البيعي",
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
                            lawyer ? "A full diagnostic and treatment tool examining 15 competencies in your legal client-conversion body" : salesManager ? "A full diagnostic and treatment tool examining 15 competencies in your sales-management leadership body" : "A full diagnostic and treatment tool examining 15 competencies in your sales performance body",
                            lawyer ? "The root patterns behind unclear consultations, weak trust, professional fee resistance, and delayed engagement decisions" : "The root patterns behind stalled deals, weak momentum, and hidden leakage",
                            "A clear priority order of what to correct first instead of guessing",
                            "A practical 90-day performance prescription without sitting through a long training course",
                            "A day-by-day correction path showing what to do and what to stop doing",
                            "6 implementation bonuses that help you act, not just read",
                          ]
                    ).map((x) => (
                      <div key={x} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
                    🚀 {t.prescriptionCta}
                  </a>

                </div>
              </div>
            </div>
          </section>
        )}

{!outdoorSalesMri && (
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
          ? ar ? "صفحات علاج تحويل الاستشارة القانونية حسب نمطك" : "Legal Client Conversion Treatment Pages Based on Your Pattern"
          : businessHealth
          ? ar ? "صفحات علاج صحة الشركة حسب نمطك" : "Business Health Treatment Pages Based on Your Pattern"
          : ar ? "صفحات العلاج التفصيلية حسب نمطك" : "Detailed Treatment Pages Based on Your Pattern",
        lawyer
          ? ar
            ? "التقرير لا يكرر نفس النص لكل محامٍ. يتم توسيع أضعف ٦ مناطق لديك في رحلة الاستفسار والاستشارة وأتعاب المحاماة وقرار التعاقد، بينما تظهر بقية الكفاءات كملخصات حماية أو رافعة."
            : "This report does not repeat the same advice for every lawyer. Your weakest 6 areas in the inquiry, consultation, professional-fee, and engagement journey are expanded into treatment pages, while the remaining competencies appear as compact leverage or protection summaries."
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
          {lawyer ? (ar ? "نمط تحويل العملاء القانونيين" : "Legal Client Conversion Pattern") : businessHealth ? (ar ? "نمط صحة الشركة" : "Business Health Pattern") : (ar ? "نمط الأداء العام" : "Overall Performance Pattern")}
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
            labelEn={lawyer ? "Primary consultation leak" : businessHealth ? "Primary business leak" : "Primary leakage"}
            labelAr={lawyer ? "خسارة العميل والاستشارة الأساسي" : businessHealth ? "هدر الشركة الأساسي" : "الهدر الأساسي"}
            value={weakestSix[0]?.label || "—"}
            value2={weakestSix[0] ? `${weakestSix[0].percentage}% · ${getTierLabel(weakestSix[0].tier, lang)}` : ""}
          />
          <MiniPatternBox
            ar={ar}
            labelEn={lawyer ? "Secondary engagement risk" : businessHealth ? "Secondary business risk" : "Secondary risk"}
            labelAr={lawyer ? "خطر التعاقد الثاني" : businessHealth ? "خطر الشركة الثاني" : "الخطر الثاني"}
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
          title={ar ? "أين يحدث الهدر والنزيف؟" : "Where leakage may happen"}
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
        ? `هذه رافعة قوة. استخدمها لدعم منطقة ${weakestLabel || "الضعف الأساسية"} دون تحويلها إلى مشروع علاج طويل.`
        : `This is a leverage strength. Use it to support ${weakestLabel || "your main weak area"} without turning it into a long treatment project.`
      : row.tier === "Opportunity"
      ? ar
        ? "هذه فرصة تحسين. تحتاج إلى عادة صغيرة وثابتة، وليس تدخلًا كاملًا."
        : "This is an improvement opportunity. It needs a small consistent habit, not full intervention."
      : ar
      ? "راقب هذه المنطقة. ليست ضمن أضعف ٦ الآن، لكنها قد تتحول إلى هدر ونزيف إذا أهملت."
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
