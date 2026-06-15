"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { getAssessmentConfig } from "@/lib/actions";
import {
  getRecommendations,
  normalizeCompetencyId,
  tierFromPercentage,
  Tier,
  Language,
} from "@/lib/pdf-recommendations";
import {
  Loader2,
  Share2,
  Check,
  FileText,
  Target,
  User,
  Mail,
  Building2,
  Fingerprint,
  TrendingUp,
  ShieldAlert,
  Stethoscope,
  Activity,
  AlertTriangle,
  Award,
  ArrowRight,
  Zap,
  Download,
} from "lucide-react";
import { toast } from "sonner";

const MRI_ASSESSMENT_ID = "outdoor_sales_mri";
const SCAN_ASSESSMENT_ID = "outdoor_sales_scan";

const MRI_PAYMENT_URL_EN =
  "https://www.levelupbusinessconsulting.com/courses/outdoor-sales-page-english-mri";

const MRI_PAYMENT_URL_AR =
  "https://www.levelupbusinessconsulting.com/courses/outdoor-sales-page-arabic-mri";


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
  pipeline_visibility_deal_inspection: { en: "Pipeline Visibility & Deal Inspection", ar: "رؤية البايبلاين وفحص الصفقات" },
  pipeline_management_deal_inspection: { en: "Pipeline Management & Deal Inspection", ar: "إدارة البايبلاين وفحص الصفقات" },
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
  consultative_selling: { en: "Consultative Selling", ar: "المبيعات الاستشارية" },
  destroying_objections: { en: "Destroying Objections", ar: "تدمير الاعتراضات من الجذور" },
  creating_irresistible_offers: { en: "Creating Irresistible Offers", ar: "إنشاء عروض لا تُقاوَم" },
  mastering_closing: { en: "Mastering Closing", ar: "إتقان الإغلاق" },
  follow_up_discipline: { en: "Follow-Up Discipline", ar: "انضباط المتابعة" },
  time_territory_management: { en: "Time & Territory Management", ar: "إدارة الوقت والمنطقة" },
  product_expertise: { en: "Product Expertise", ar: "الخبرة في المنتج" },
  negotiation_skills: { en: "Negotiation Skills", ar: "مهارات التفاوض" },
  attitude_motivation_mindset: { en: "Attitude & Motivation Mindset", ar: "العقلية والتحفيز" },
  dealing_with_boss: { en: "Dealing with Boss", ar: "التعامل مع المدير" },
  handling_difficult_customers: { en: "Handling Difficult Customers", ar: "التعامل مع العملاء الصعبين" },
  handling_difficult_colleagues: { en: "Handling Difficult Colleagues", ar: "التعامل مع الزملاء الصعبين" },
};

type ResultRow = {
  competencyId: string;
  percentage: number;
  derivedTier: Tier;
  score?: number;
  maxScore?: number;
  [key: string]: any;
};

function normalizeCompetencySafe(raw: any) {
  return normalizeCompetencyId(String(raw || ""));
}


function isSalesManagerAssessment(routeSlug?: string, attemptAssessmentId?: string | null, configType?: string | null) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();
  return s.includes("sales-manager") || a.includes("sales_manager") || c.includes("sales_manager");
}

function isLawyerAssessment(routeSlug?: string, attemptAssessmentId?: string | null, configType?: string | null) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();
  return s.includes("lawyer-client-conversion") || a.includes("lawyer_client_conversion") || c.includes("lawyer_client_conversion") || s.includes("lawyer") || a.includes("lawyer");
}

function isBusinessHealthAssessment(routeSlug?: string, attemptAssessmentId?: string | null, configType?: string | null) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();
  return s.includes("sme-business-health") || a.includes("sme_business_health") || c.includes("sme_business_health") || s.includes("business-health") || a.includes("business_health");
}


function isProbablyMRI(routeSlug?: string, attemptAssessmentId?: string | null, configType?: string | null) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();

  return s.includes("mri") || a.includes("mri") || c === "mri" || a === MRI_ASSESSMENT_ID;
}

function isOutdoorSalesMri(routeSlug?: string, attemptAssessmentId?: string | null) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  return s === "outdoor-mri" || a === MRI_ASSESSMENT_ID;
}

function isProbablyScan(routeSlug?: string, attemptAssessmentId?: string | null, configType?: string | null) {
  const s = String(routeSlug || "").toLowerCase();
  const a = String(attemptAssessmentId || "").toLowerCase();
  const c = String(configType || "").toLowerCase();

  return s.includes("scan") || a.includes("scan") || c === "scan" || a === SCAN_ASSESSMENT_ID;
}

function safePct(n: any) {
  const v = Math.round(Number(n) || 0);
  return Math.max(0, Math.min(100, v));
}

function shortAttemptId(id: string) {
  const x = String(id || "");
  return x ? x.slice(0, 8) : "";
}

function tierBadgeColor(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "bg-emerald-600 text-white";
    case "Opportunity":
      return "bg-blue-600 text-white";
    case "Threat":
      return "bg-amber-500 text-white";
    case "Weakness":
    default:
      return "bg-rose-700 text-white";
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

function tierBarColor(tier: Tier) {
  switch (tier) {
    case "Strength":
      return "from-emerald-500 to-emerald-600";
    case "Opportunity":
      return "from-blue-500 to-blue-600";
    case "Threat":
      return "from-amber-500 to-orange-500";
    case "Weakness":
    default:
      return "from-rose-600 to-red-700";
  }
}

function tierShortLabel(tier: Tier, ar: boolean) {
  if (!ar) return tier;
  if (tier === "Strength") return "قوة";
  if (tier === "Opportunity") return "فرصة";
  if (tier === "Threat") return "تهديد";
  return "ضعف";
}

function healthLabel(overall: number, ar: boolean) {
  if (ar) {
    if (overall >= 75) return "منطقة أداء قوية";
    if (overall >= 50) return "منطقة فرصة واضحة";
    if (overall >= 30) return "منطقة إنذار";
    return "منطقة هدر حاد";
  }

  if (overall >= 75) return "Strong Performance Zone";
  if (overall >= 50) return "Clear Opportunity Zone";
  if (overall >= 30) return "Warning Zone";
  return "High Leakage Zone";
}

function healthMeaning(overall: number, ar: boolean) {
  if (ar) {
    if (overall >= 75) return "لديك قاعدة أداء قوية، لكن القوة تحتاج إلى نظام يومي يحميها ويضاعف أثرها.";
    if (overall >= 50) return "لديك أساس جيد، لكن هناك هدر واضح قد تمنعك من الوصول إلى مستوى أعلى.";
    if (overall >= 30) return "هناك إشارات إنذار تحتاج إلى علاج عملي قبل أن تتحول إلى عادات ثابتة.";
    return "هناك فجوة أداء واضحة تحتاج إلى تشخيص أعمق وخطة علاج عملية بدل التخمين.";
  }

  if (overall >= 75) return "You have a strong base, but strength needs a daily system to protect and multiply it.";
  if (overall >= 50) return "You have a useful base, but visible leakage may be preventing the next performance level.";
  if (overall >= 30) return "There are warning signals that need practical correction before they become permanent habits.";
  return "There is a clear performance gap that needs deeper diagnosis and a practical treatment plan, not more guessing.";
}


function businessHealthLabel(overall: number, ar: boolean) {
  if (ar) {
    if (overall >= 75) return "منطقة صحة أعمال قوية";
    if (overall >= 50) return "منطقة فرصة واضحة لتقوية الشركة";
    if (overall >= 30) return "منطقة إنذار في صحة الشركة";
    return "منطقة هدر حاد في الأعمال";
  }

  if (overall >= 75) return "Strong Business Health Zone";
  if (overall >= 50) return "Clear Business Improvement Zone";
  if (overall >= 30) return "Business Health Warning Zone";
  return "High Business Leakage Zone";
}

function businessHealthMeaning(overall: number, ar: boolean) {
  if (ar) {
    if (overall >= 75) return "الشركة لديها أساس صحي يمكن تقويته وتحويله إلى نظام تشغيل يحمي النقد والعملاء والفريق والنمو.";
    if (overall >= 50) return "الشركة لديها قاعدة قابلة للبناء، لكن بعض الهدر أو النزف قد يحد من الاستقرار أو الربحية أو جاهزية النمو.";
    if (overall >= 30) return "هناك إشارات إنذار في صحة الشركة تحتاج إلى تشخيص وخارطة طريق قبل أن تتحول إلى ضغط دائم.";
    return "هناك هدر ونزيف واضح في صحة الشركة يحتاج إلى علاج منظم بدل المزيد من الاجتهاد والتخمين.";
  }

  if (overall >= 75) return "The business has a healthy base that can be turned into a stronger operating system for cash, customers, people, and growth.";
  if (overall >= 50) return "The business has a workable base, but some leaks may still be limiting stability, profitability, or growth readiness.";
  if (overall >= 30) return "There are business health warning signals that need diagnosis and a roadmap before they become permanent pressure.";
  return "There is a clear business health leakage pattern that needs structured treatment, not more guessing or random effort.";
}


function cleanRecommendationText(input: string) {
  let text = String(input || "").trim();

  text = text.replace(/\*\*/g, "");

  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text
      .replace(/^[“"'`]+/, "")
      .replace(/^\(?\d{1,2}\)?[.)\-:]\s*/, "")
      .replace(/^\d{1,2}\s*[-–—]\s*/, "")
      .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "")
      .replace(/^[•●▪◦✔✓✅✦★☆▶►→⚡📊📋🧠🔍🎯💡📞🛡️📝📌🧩🧭🧪📈🔬\s]+/, "")
      .trim();
  }

  return text.replace(/\s+/g, " ").trim();
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
    dig(attempt, "participant.name"),
    dig(attempt, "registration.full_name"),
    dig(attempt, "registration.name"),
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
    dig(attempt, "contact.company"),
    dig(attempt, "organization.name")
  );

  const email = isEmailLike(rawEmail) ? rawEmail.trim() : "—";

  let fullName = rawName.trim() || "—";
  if ((fullName === "—" || !fullName) && email !== "—") {
    const m = email.match(/^([^@]+)/);
    if (m) fullName = m[1].replace(/[._-]/g, " ").replace(/\d+/g, "").trim() || "—";
  }

  const company = rawCompany.trim() || "—";
  return { fullName, email, company };
}

function ParticipantIdentityCard({
  ar,
  fullName,
  email,
  company,
  attemptId,
}: {
  ar: boolean;
  fullName: string;
  email: string;
  company: string;
  attemptId: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-xl">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-blue-200 to-indigo-300 blur-3xl opacity-40" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-purple-200 to-blue-300 blur-3xl opacity-30" />
      </div>

      <div className="relative p-5 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 md:mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Award className="text-blue-600" size={20} />
              <div className="text-lg md:text-xl font-black text-slate-900 rtl-text">
                {ar ? "بطاقة هوية المشارك" : "Participant Identity Card"}
              </div>
            </div>
            <div className="text-xs md:text-sm text-slate-600 rtl-text">
              {ar
                ? "هوية احترافية مختصرة لربط النتيجة بصاحب التقرير."
                : "A clean professional identity card linked to this result."}
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 px-3 md:px-4 py-2 md:py-2.5 bg-white shadow-sm self-start sm:self-auto">
            <Fingerprint size={16} className="text-slate-600" />
            <span className="text-xs md:text-sm font-black text-slate-700">
              ID:{" "}
              <span className="font-mono text-blue-600 force-ltr">
                {shortAttemptId(attemptId) || "—"}
              </span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          <IdentityBox icon={<User size={20} />} label={ar ? "الاسم الكامل" : "Full Name"} value={fullName} />
          <IdentityBox icon={<Mail size={20} />} label={ar ? "البريد الإلكتروني" : "Email"} value={email} forceLtr />
          <IdentityBox icon={<Building2 size={20} />} label={ar ? "الشركة" : "Company"} value={company} />
        </div>
      </div>
    </section>
  );
}

function IdentityBox({
  icon,
  label,
  value,
  forceLtr = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  forceLtr?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-slate-200 bg-white p-4 md:p-6 shadow-sm">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="shrink-0 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1.5 md:mb-2 rtl-text">
            {label}
          </div>
          <div className={`text-base md:text-lg font-bold text-slate-900 break-words leading-tight ${forceLtr ? "force-ltr" : "rtl-text"}`}>
            {value || "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsContent() {
  const params = useParams<{ slug: string }>();
  const routeSlug = params?.slug;

  const searchParams = useSearchParams();
  const attemptId = (searchParams.get("attemptId") || "").trim();
  const langParam = (searchParams.get("lang") || "").trim();

  const { language, setLanguage } = useLocale();

  useEffect(() => {
    if (langParam === "ar" || langParam === "en") {
      if (langParam !== language) setLanguage(langParam);
    }
  }, [langParam, language, setLanguage]);

  const ar = language === "ar";

  const [attempt, setAttempt] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!attemptId) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) setLoading(true);

      const attRes = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("id", attemptId)
        .maybeSingle();

      if (cancelled) return;

      const att = attRes.data ?? null;
      setAttempt(att);

      try {
        const conf = await (getAssessmentConfig as any)?.(routeSlug);
        if (!cancelled) setConfig(conf ?? null);
      } catch {
        if (!cancelled) setConfig(null);
      }

      if (!cancelled) setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [attemptId, routeSlug]);

  const isMri = isProbablyMRI(routeSlug, attempt?.assessment_id, config?.type);
  const isSalesManager = isSalesManagerAssessment(routeSlug, attempt?.assessment_id, config?.type);
  const isLawyer = isLawyerAssessment(routeSlug, attempt?.assessment_id, config?.type);
  const isBusinessHealth = isBusinessHealthAssessment(routeSlug, attempt?.assessment_id, config?.type);
  const isScan = isProbablyScan(routeSlug, attempt?.assessment_id, config?.type) && !isMri;
  const isOutdoorMri = isOutdoorSalesMri(routeSlug, attempt?.assessment_id);

  const labelsFromConfig = useMemo(() => {
    const out: Record<string, { en: string; ar: string }> = {};
    const arr = (config?.config?.competencies || []) as any[];

    for (const c of arr) {
      const id = normalizeCompetencySafe(c?.id);
      if (!id) continue;
      out[id] = { en: String(c?.en || ""), ar: String(c?.ar || "") };
    }

    return out;
  }, [config]);

  const getCompetencyLabel = (res: any) => {
    const id = normalizeCompetencySafe(res?.competencyId || res?.key);
    if (isOutdoorMri && id === "dealing_with_boss") {
      return ar ? "التعامل مع الإدارة وبناء التوافق الداخلي" : "Managing Up & Internal Alignment";
    }

    const meta = (id && COMPETENCY_LABELS[id]) || (id && labelsFromConfig[id]) || null;

    if (meta) return ar ? meta.ar || meta.en : meta.en || meta.ar;
    return String(res?.name || id || "");
  };

  const competencyRows: ResultRow[] = useMemo(() => {
    const rows = Array.isArray(attempt?.competency_results) ? attempt.competency_results : [];

    return rows.map((r: any) => {
      const id = normalizeCompetencySafe(r?.competencyId || r?.key);
      const percentage = safePct(r?.percentage ?? 0);
      const derivedTier = tierFromPercentage(percentage);

      return {
        ...r,
        competencyId: id,
        percentage,
        derivedTier,
      };
    });
  }, [attempt]);

  const sortedRows = useMemo(() => {
    return [...competencyRows].sort((a, b) => safePct(b.percentage) - safePct(a.percentage));
  }, [competencyRows]);

  const weakestRows = useMemo(() => {
    return [...competencyRows].sort((a, b) => safePct(a.percentage) - safePct(b.percentage));
  }, [competencyRows]);

  const strongest = sortedRows[0] || null;
  const weakest = weakestRows[0] || null;

  const swotData = useMemo(() => {
    return {
      strengths: competencyRows.filter((r) => r.derivedTier === "Strength"),
      opportunities: competencyRows.filter((r) => r.derivedTier === "Opportunity"),
      threats: competencyRows.filter((r) => r.derivedTier === "Threat"),
      weaknesses: competencyRows.filter((r) => r.derivedTier === "Weakness"),
    };
  }, [competencyRows]);

  const overallPct = safePct(attempt?.total_percentage ?? 0);
  const overallTier: Tier = tierFromPercentage(overallPct);
  const identity = useMemo(() => extractIdentity(attempt), [attempt]);

  const titleFromDb =
    (ar ? config?.title_ar || config?.name_ar || "" : config?.title_en || config?.name_en || "") || "";

  const heroTitle =
    titleFromDb ||
    (isLawyer
      ? ar
        ? "نتائج Lawyer Client Conversion MRI"
        : "Lawyer Client Conversion MRI Results"
      : isBusinessHealth
      ? ar
        ? "نتائج Business Health MRI للشركات الصغيرة والمتوسطة"
        : "SME Business Health MRI Results"
      : isSalesManager
      ? ar
        ? "نتائج فحص مدير المبيعات"
        : "Sales Manager Scan Results"
      : ar
      ? "نتائج فحص المبيعات الميدانية"
      : "Outdoor Sales Scan Results");

  const heroSubtitle = isLawyer
    ? ar
      ? "هذه صفحة النتائج السريعة لتشخيص تحويل العملاء للمحامين. التقرير الكامل يوضح هدر ونزيف الاستشارات القانونية المدفوعة ، الثقة، أتعاب المحاماة، الاعتراضات، وخطوات العلاج المهني."
      : "This is your quick legal client-conversion dashboard. The full report shows consultation leaks, trust signals, professional-fee confidence, objections, and treatment steps."
    : isBusinessHealth
    ? ar
      ? "هذه صفحة النتائج السريعة لصحة الشركة. التقرير الكامل يوضح نسبة الهدر والنزيف، المخاطر، العلامات الحيوية، وأولويات خارطة الطريق."
      : "This is your quick business health dashboard. The full report shows business leaks, risks, vital signs, and roadmap priorities."
    : isSalesManager
    ? ar
      ? "هذه صفحة النتائج السريعة لقيادة المبيعات. التقرير الكامل يوضح التشخيص الإداري، نقاط القوة، نسبة الهدر، وخطوات التنفيذ."
      : "This is your quick sales-management dashboard. The full report shows the leadership diagnosis, strengths, leaks, and execution steps."
    : ar
    ? "هذه صفحة النتائج السريعة. التقرير الكامل يحتوي على التشخيص التفصيلي، SWOT، وخطة التنفيذ."
    : "This is your quick result dashboard. The full report contains the detailed diagnosis, SWOT, and execution plan.";

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(ar ? "تم نسخ الرابط!" : "Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(ar ? "تعذر نسخ الرابط" : "Failed to copy link");
    }
  };

  const goToFullReport = () => {
    if (!attemptId) return;
    window.location.href = `/${routeSlug}/report?attemptId=${encodeURIComponent(attemptId)}&lang=${encodeURIComponent(language)}`;
  };

  const handlePrint = () => {
    window.print();
  };

const MRI_PAYMENT_URL =
  ar ? MRI_PAYMENT_URL_AR : MRI_PAYMENT_URL_EN;

const mriLinkReady =
  MRI_PAYMENT_URL && !MRI_PAYMENT_URL.includes("PASTE_");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
          <div className="text-sm font-bold text-slate-600">
            {ar ? "جارٍ تحميل نتائجك..." : "Loading your results..."}
          </div>
        </div>
      </div>
    );
  }

  if (!attemptId) return <div className="p-10 text-center">Missing attemptId</div>;

  if (!attempt) {
    return (
      <div className="p-10 text-center">
        {ar ? "النتائج غير موجودة" : "Results not found"}
      </div>
    );
  }

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      data-rtl={ar ? "true" : "false"}
      className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
    >
      <style jsx global>{`
        [data-rtl="true"] * { direction: rtl !important; }
        [data-rtl="true"] .force-ltr { direction: ltr !important; text-align: left !important; unicode-bidi: isolate !important; }
        [data-rtl="true"] .rtl-text { text-align: right !important; unicode-bidi: plaintext !important; }
        [data-rtl="false"] .rtl-text { text-align: left !important; }
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8 md:space-y-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl shadow-2xl border border-slate-800/10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-400 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-400 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="relative p-6 sm:p-8 md:p-10 lg:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-8 lg:gap-12 items-center">
              <div className="space-y-5 sm:space-y-6 text-center lg:text-start">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs sm:text-sm font-black uppercase tracking-widest backdrop-blur-sm">
                  <Check size={16} />
                  {ar ? "اكتمل التشخيص بنجاح" : "Scan Completed"}
                </div>

                <div>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight rtl-text">
                    {heroTitle}
                  </h1>
                  <p className="mt-4 text-base sm:text-xl text-blue-100 leading-relaxed rtl-text">
                    {heroSubtitle}
                  </p>
                </div>

                <div className="print-hide flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
                  <Button
                    onClick={goToFullReport}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-black px-6 sm:px-8 py-6 sm:py-7 rounded-2xl flex gap-2 sm:gap-3 shadow-xl transition-all active:scale-95 text-sm sm:text-base min-h-[48px]"
                  >
                    <FileText size={20} />
                    {ar ? "افتح التقرير التشخيصي الكامل" : "View Full Diagnostic Report"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="w-full sm:w-auto border-2 border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold px-6 sm:px-8 py-6 sm:py-7 rounded-2xl flex gap-2 sm:gap-3 backdrop-blur-sm transition-all active:scale-95 text-sm sm:text-base min-h-[48px]"
                  >
                    {copied ? <Check size={20} className="text-emerald-300" /> : <Share2 size={20} />}
                    {ar ? "مشاركة" : "Share"}
                  </Button>
                </div>
              </div>

              <div className="relative flex justify-center">
              <div className="relative h-72 w-72 sm:h-80 sm:w-80 rounded-full border-[12px] border-white/10 bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl">
                  <div className="absolute inset-6 rounded-full border border-white/10" />
                  <div className="text-center">
                    <div className="text-6xl sm:text-7xl font-black text-white">
                      {overallPct}%
                    </div>
                   <div className="mt-2 text-[10px] sm:text-xs font-black uppercase tracking-wide text-blue-100 px-6 leading-tight">
                      {isLawyer ? (ar ? "مؤشر تحويل العملاء" : "Client Conversion Score") : isSalesManager ? (ar ? "مؤشر صحة الإدارة" : "Management Health Score") : (ar ? "مؤشر الصحة البيعية" : "Sales Health Score")}
                    </div>
                    <div className="mt-4">
                      <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black shadow-xl ${tierBadgeColor(overallTier)}`}>
                        <Target size={15} />
                        {tierShortLabel(overallTier, ar)}
                      </span>
                    </div>
                    <p className="mt-4 text-xs sm:text-sm text-blue-100/90 max-w-[220px] mx-auto text-center">
                      {isBusinessHealth ? businessHealthLabel(overallPct, ar) : healthLabel(overallPct, ar)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ParticipantIdentityCard
          ar={ar}
          fullName={identity.fullName}
          email={identity.email}
          company={identity.company}
          attemptId={attemptId}
        />

        {/* QUICK DIAGNOSIS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          <QuickSignalCard
            ar={ar}
            title={ar ? "أقوى إشارة" : "Strongest Signal"}
            icon={<TrendingUp size={22} />}
            row={strongest}
            getLabel={getCompetencyLabel}
            body={
              ar
                ? "هذه المنطقة يمكن استخدامها كرافعة للأداء."
                : "This area can be used as leverage for better performance."
            }
          />

          <QuickSignalCard
            ar={ar}
            title={ar ? "أكبر هدر ونزيف مخفي" : "Biggest Hidden Leak"}
            icon={<ShieldAlert size={22} />}
            row={weakest}
            getLabel={getCompetencyLabel}
            body={
              ar
                ? "هذه المنطقة غالبًا تحتاج إلى علاج سريع قبل أن تستمر في اهدار الفرص."
                : "This area likely needs fast correction before it keeps leaking opportunities."
            }
          />

          <div className={`rounded-3xl border-2 ${tierSoftClass(overallTier)} p-6 shadow-xl`}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
                <Activity size={22} />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-500 rtl-text">
                  {ar ? "القراءة العامة" : "Overall Reading"}
                </div>
                <h3 className="text-xl font-black text-slate-950 rtl-text">
                  {isBusinessHealth ? businessHealthLabel(overallPct, ar) : healthLabel(overallPct, ar)}
                </h3>
              </div>
            </div>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-700 rtl-text">
              {isBusinessHealth ? businessHealthMeaning(overallPct, ar) : healthMeaning(overallPct, ar)}
            </p>
          </div>
        </section>

        {/* 8-POINT PANEL */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-xl p-5 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 rtl-text">
                {isLawyer ? (ar ? "لوحة تحويل العملاء القانونية السريعة" : "Quick Legal Client Conversion Panel") : isBusinessHealth ? (ar ? "لوحة صحة الشركة السريعة" : "Quick Business Health Panel") : isSalesManager ? (ar ? "لوحة صحة إدارة المبيعات السريعة" : "Quick Sales Management Panel") : (ar ? "لوحة الصحة البيعية السريعة" : "Quick Sales Health Panel")}
              </h3>
              <div className="text-sm text-slate-500 mt-1 rtl-text">
                {isBusinessHealth
                  ? ar
                    ? "النتيجة العامة + ١٢ منطقة صحية في لقطة واحدة."
                    : "Overall score + 12 business health areas in one clean dashboard."
                  : isSalesManager
                  ? ar
                    ? "النتيجة العامة + ٧ مؤشرات قيادية في لقطة واحدة."
                    : "Overall score + 7 leadership markers in one clean dashboard."
                  : ar
                  ? "النتيجة العامة + ٧ مؤشرات أساسية في لقطة واحدة."
                  : "Overall score + 7 core markers in one clean dashboard."}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HealthMarkerCard
              ar={ar}
              label={isLawyer ? (ar ? "مؤشر صحة تحويل العملاء للمحامين" : "Legal Client Conversion Health Score") : isBusinessHealth ? (ar ? "مؤشر صحة الشركة" : "SME Business Health Score") : isSalesManager ? (ar ? "مؤشر صحة إدارة المبيعات العام" : "Overall Sales Management Score") : (ar ? "مؤشر الصحة البيعية العام" : "Overall Sales Health Score")}
              percentage={overallPct}
              tier={overallTier}
              subtitle={isBusinessHealth ? (ar ? "القراءة المجمعة للعلامات الحيوية للشركة" : "Combined reading of the company’s vital signs") : ar ? "القراءة المجمعة لكل التشخيص" : "Combined reading of the full scan"}
              isOverall
            />

            {sortedRows.map((res, index) => (
              <HealthMarkerCard
                key={`${res.competencyId}-${index}`}
                ar={ar}
                label={getCompetencyLabel(res)}
                percentage={safePct(res.percentage)}
                tier={res.derivedTier}
                subtitle={isBusinessHealth ? (ar ? `المنطقة ${index + 1}` : `Area ${index + 1}`) : ar ? `المؤشر ${index + 1}` : `Marker ${index + 1}`}
              />
            ))}
          </div>
        </section>

        {/* SWOT SNAPSHOT */}
        <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-xl p-5 sm:p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg">
              <Award size={24} />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 rtl-text">
                {ar ? "لقطة SWOT سريعة" : "Quick SWOT Snapshot"}
              </h3>
              <div className="text-sm text-slate-500 mt-1 rtl-text">
                {ar
                  ? "التقرير الكامل يعطي التفسير التفصيلي وخطة التنفيذ."
                  : "The full report gives the detailed interpretation and execution plan."}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SwotMiniCard ar={ar} titleAr="القوة" titleEn="Strengths" count={swotData.strengths.length} color="emerald" />
            <SwotMiniCard ar={ar} titleAr="الفرص" titleEn="Opportunities" count={swotData.opportunities.length} color="blue" />
            <SwotMiniCard ar={ar} titleAr="التهديدات" titleEn="Threats" count={swotData.threats.length} color="amber" />
            <SwotMiniCard ar={ar} titleAr="الضعف" titleEn="Weaknesses" count={swotData.weaknesses.length} color="rose" />
          </div>
        </section>

        {/* FAST ACTION PREVIEW */}
        {isScan && (
          <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-xl p-5 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 mb-5 sm:mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 rtl-text">
                  {ar ? "ما يجب الانتباه له الآن" : "What to Watch Now"}
                </h3>
                <div className="text-sm text-slate-500 mt-1 rtl-text">
                  {ar
                    ? "هذه مجرد معاينة. التقرير الكامل يعطي خطة تنفيذ أوسع."
                    : "This is only a preview. The full report gives a wider execution plan."}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PreviewActionCard
                ar={ar}
                title={ar ? "افتح التقرير الكامل" : "Open the full report"}
                body={
                  ar
                    ? "اقرأ التفسير الكامل لكل مؤشر، تحليل SWOT، وخطوات التنفيذ السريعة."
                    : "Read the full interpretation of each marker, SWOT, and the fast execution steps."
                }
                buttonText={ar ? "افتح التقرير التشخيصي الكامل" : "View Full Diagnostic Report"}
                onClick={goToFullReport}
                icon={<FileText size={22} />}
              />

              <PreviewActionCard
                ar={ar}
                title={ar ? "لا تترك الهدر والنزيف بلا علاج" : "Do not leave the leak untreated"}
                body={
                  ar
                    ? "إذا كشف التشخيص إشارة إنذار، فالخطوة التالية هي التشخيص الكامل والوصفة العلاجية."
                    : "If the scan exposed a warning sign, the next step is the full diagnosis and treatment prescription."
                }
                buttonText={isLawyer ? (ar ? "احصل على Lawyer Client Conversion MRI الكامل" : "Get My Full Lawyer Client Conversion MRI") : ar ? "احصل على MRI الكامل ووصفة ٩٠ يومًا" : "Get Full Sales MRI & 90-Day Prescription"}
               href={
  mriLinkReady
    ? (ar ? MRI_PAYMENT_URL_AR : MRI_PAYMENT_URL)
    : undefined
}
                disabled={!mriLinkReady}
                icon={<Stethoscope size={22} />}
              />
            </div>
          </section>
        )}

        {/* MRI PRESCRIPTION CARD */}
        {isScan && (
          <section className="print-hide rounded-3xl overflow-hidden shadow-2xl border border-indigo-200">
            <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white p-7 sm:p-10">
              <div className="inline-flex rounded-full bg-rose-500/20 border border-rose-300/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-100">
                {ar ? "لا تتوقف عند هذا التشخيص المقتضب" : "Do Not Stop at the Scan"}
              </div>

              <h2 className="mt-5 text-3xl sm:text-5xl font-black leading-tight rtl-text">
                {isSalesManager
                  ? ar
                    ? "التشخيص القيادي يكشف الأعراض. أما Sales Manager MRI فيعطيك خطة العلاج."
                    : "Your Leadership Scan Shows the Symptoms. The Manager MRI Gives You the Treatment Plan."
                  : ar
                  ? "التشخيص الأولي هو تحليل الدم. أما الـ MRI فيعطيك الوصفة العلاجية."
                  : "Your Scan Is the Blood Test. The MRI Gives You the Prescription."}
              </h2>

              <p className="mt-4 text-lg sm:text-2xl font-black leading-relaxed text-amber-200 max-w-4xl rtl-text">
                {isSalesManager
                  ? ar
                    ? "تقرير Advanced Sales Manager MRI هو أداة تشخيص وعلاج كاملة للتدريب، البايبلاين، التوقعات، المساءلة، وتنفيذ الفريق."
                    : "The Advanced Sales Manager MRI is a full diagnostic and treatment tool for coaching, pipeline, forecasting, accountability, and team execution."
                  : ar
                  ? isLawyer
                    ? "تقرير Lawyer Client Conversion MRI المتقدم هو أداة تشخيص وعلاج كاملة لرحلة الاستفسار القانوني، الاستشارة، أتعاب المحاماة، الاعتراضات، قرار التعاقد، وتجربة العميل."
                    : "تقرير Advanced Outdoor Sales MRI هو أداة تشخيص وعلاج كاملة لجسم أدائك البيعي."
                  : isLawyer
                    ? "The Advanced Lawyer Client Conversion MRI is a full diagnostic and treatment tool for legal inquiries, consultations, professional fees, objections, engagement decisions, and client experience."
                    : "The Advanced Outdoor Sales MRI is a full diagnostic and treatment tool for your sales performance body."}
              </p>

              <div className="mt-7 grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-6 items-stretch">
                <div className="rounded-3xl bg-white/10 border border-white/15 p-6 sm:p-7 backdrop-blur-md">
                  <h3 className="text-2xl font-black text-white rtl-text">
                    {ar ? "لماذا لا يكفي هذا التشخيص وحده؟" : "Why the scan alone is not enough"}
                  </h3>

                  <div className="mt-4 space-y-4 text-blue-100 leading-relaxed rtl-text">
                    <p>
                      {ar
                        ? "هذا التشخيص يكشف علامات الإنذار، لكنه لا يعطيك التشخيص العميق والكامل ولا خطة العلاج اليومية."
                        : "The scan reveals warning signs, but it does not give you the full examination or the daily treatment path."}
                    </p>

                    <p>
                      {ar
                        ? "معظم الناس يقرؤون النتيجة ثم يعودون لنفس العادات. هنا يحدث الخطر: أن ترى الهدر ثم تتركه كما هو."
                        : "Most people read the result and go back to the same habits. That is the risk: seeing the leak and leaving it untreated."}
                    </p>

                    <p className="font-black text-white">
                      {ar
                        ? isSalesManager
                          ? "الخطوة الذكية هي فحص نمط القيادة كاملًا، معرفة الجذر، ثم اتباع خطة علاج إدارية واضحة."
                          : "الخطوة الذكية هي فحص الجسم المهني كاملًا، معرفة الجذر، ثم اتباع الوصفة."
                        : isSalesManager
                        ? "The smart move is to examine the full leadership pattern, identify the root, and follow a clear management treatment plan."
                        : "The smart move is to examine the full career body, identify the root pattern, and follow the prescription."}
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
                      ? [
                          isLawyer ? "تقرير Lawyer Client Conversion MRI شخصي مفصل مبني على إجاباتك ونتائجك" : isSalesManager ? "تقرير Sales Manager MRI شخصي مفصل مبني على إجاباتك ونتائجك" : "تقرير Sales MRI شخصي مفصل من حوالي ٣٠ صفحة مبني على إجاباتك ونتائجك",
                          isSalesManager ? "أداة تشخيص وعلاج كاملة تفحص ١٥ كفاءة في إدارة فريق المبيعات" : "أداة تشخيص وعلاج كاملة تفحص ١٥ كفاءة في جسم أدائك البيعي",
                          "وصفة أداء عملية لمدة ٩٠ يومًا دون الجلوس في دورة تدريبية طويلة",
                          "مسار تصحيح يومي يساعدك على معرفة ماذا تفعل وماذا تتوقف عن فعله",
                          "٥ مكافآت تنفيذية تساعدك على التطبيق وليس القراءة فقط",
                        ]
                      : [
                          isLawyer ? "A personalized Lawyer Client Conversion MRI report based on your answers and scores" : isSalesManager ? "A personalized Sales Manager MRI report based on your answers and scores" : "A personalized, super-detailed Sales MRI report of around 30 pages based on your answers and scores",
                          isSalesManager ? "A full diagnostic and treatment tool examining 15 sales-management competencies" : "A full diagnostic and treatment tool examining 15 competencies in your sales performance body",
                          "A practical 90-day performance prescription without sitting through a long training course",
                          "A day-by-day correction path showing what to do and what to stop doing",
                          "5 implementation bonuses that help you act, not just read",
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
                      ? "لا فيديوهات طويلة. لا تكديس نظري. لا نصائح عامة. إنها وصفة علاج عملية ومفصلة مبنية على نتائجك."
                      : "No long videos. No theory overload. No generic sales advice. It is a practical, detailed treatment prescription built from your results."}
                  </p>

                {mriLinkReady ? (
  <div className="mt-6 flex flex-col items-center">
    <a
      href={ar ? MRI_PAYMENT_URL_AR : MRI_PAYMENT_URL_EN}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center rounded-2xl bg-white text-slate-950 px-6 py-4 font-black shadow-xl hover:bg-amber-50 transition text-center"
    >
      🚀 {isLawyer
        ? (ar
            ? "احصل على تقرير Lawyer Client Conversion MRI الكامل"
            : "Get My Full Lawyer Client Conversion MRI")
        : (ar
            ? "احصل على تقرير MRI الكامل ووصفة الـ ٩٠ يومًا"
            : "Get My Full Sales MRI & 90-Day Prescription")}
    </a>

    <p
      className="mt-4 text-xs text-blue-100/70 max-w-md text-center leading-relaxed"
      style={{ textAlign: "center" }}
    >
      {ar
        ? "انتقل إلى صفحة الـ MRI للاطلاع على التشخيص المتقدم، خطة الـ90 يومًا، والمكافآت التنفيذية."
        : "Continue to the MRI page to explore the advanced diagnosis, 90-day prescription, and executive bonuses."}
    </p>
  </div>
) : (
  <div className="mt-6 flex flex-col items-center">
    <div className="inline-flex items-center justify-center rounded-2xl bg-white/15 text-white/70 px-6 py-4 font-black shadow-xl cursor-not-allowed text-center">
      {ar
        ? "اضغط هنا للحصول على التفاصيل الكاملة"
        : "Click here for full details about MRI"}
    </div>

    </div>
)}

                </div>
              </div>
            </div>
          </section>
        )}

        {isMri && (
          <section className="rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl p-6 sm:p-8 md:p-10 text-white">
            <div className="flex items-center gap-3 mb-6">
              <Stethoscope className="text-white" size={28} />
              <h3 className="text-2xl sm:text-3xl font-black rtl-text">
                {ar ? "تقرير MRI التشخيصي" : "MRI Diagnostic Report"}
              </h3>
            </div>

            <p className="text-white/90 leading-relaxed rtl-text">
              {ar
                ? isOutdoorMri
                  ? "تقرير Outdoor Sales MRI الكامل جاهز الآن. افتح التقرير الكامل للاطلاع على التشخيص التفصيلي، أولويات العلاج، تحليل SWOT، وخطة التنفيذ لمدة 90 يومًا."
                  : "هذا هو التقرير المتقدم. سيتم تطوير عرض MRI التفصيلي في المرحلة التالية."
                : isOutdoorMri
                ? "Your full Outdoor Sales MRI report is ready. Open the full report to view your detailed diagnosis, priority treatment areas, SWOT analysis, and 90-day execution plan."
                : "This is the advanced report flow. The detailed MRI presentation will be refined in the next stage."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function QuickSignalCard({
  ar,
  title,
  icon,
  row,
  getLabel,
  body,
}: {
  ar: boolean;
  title: string;
  icon: React.ReactNode;
  row: ResultRow | null;
  getLabel: (x: any) => string;
  body: string;
}) {
  return (
    <div className={`rounded-3xl border-2 ${row ? tierSoftClass(row.derivedTier) : "border-slate-200 bg-white"} p-6 shadow-xl`}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-slate-500 rtl-text">
            {title}
          </div>
          <h3 className="text-xl font-black text-slate-950 rtl-text">
            {row ? getLabel(row) : "—"}
          </h3>
        </div>
      </div>

      {row && (
        <div className="mt-4">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black force-ltr ${tierBadgeColor(row.derivedTier)}`}>
            {safePct(row.percentage)}% · {tierShortLabel(row.derivedTier, ar)}
          </span>
        </div>
      )}

      <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-700 rtl-text">
        {body}
      </p>
    </div>
  );
}

function HealthMarkerCard({
  ar,
  label,
  percentage,
  tier,
  subtitle,
  isOverall = false,
}: {
  ar: boolean;
  label: string;
  percentage: number;
  tier: Tier;
  subtitle: string;
  isOverall?: boolean;
}) {
  return (
    <div className={`rounded-3xl border-2 ${tierSoftClass(tier)} p-5 shadow-sm ${isOverall ? "ring-2 ring-slate-900/10" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest rtl-text">
            {subtitle}
          </div>
          <h3 className="mt-1 text-lg sm:text-xl font-black text-slate-950 rtl-text">
            {label}
          </h3>
        </div>

        <div className="text-right force-ltr">
          <div className="text-3xl font-black text-slate-950">{percentage}%</div>
          <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${tierBadgeColor(tier)}`}>
            {tierShortLabel(tier, ar)}
          </span>
        </div>
      </div>

      <div className="mt-4 h-3 rounded-full bg-white/80 overflow-hidden border border-slate-200">
        <div className={`h-full rounded-full bg-gradient-to-r ${tierBarColor(tier)}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function SwotMiniCard({
  ar,
  titleAr,
  titleEn,
  count,
  color,
}: {
  ar: boolean;
  titleAr: string;
  titleEn: string;
  count: number;
  color: "emerald" | "blue" | "amber" | "rose";
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    rose: "border-rose-200 bg-rose-50 text-rose-800",
  }[color];

  return (
    <div className={`rounded-3xl border-2 p-5 shadow-sm ${styles}`}>
      <div className="text-xs font-black uppercase tracking-widest rtl-text">
        {ar ? titleAr : titleEn}
      </div>
      <div className="mt-2 text-4xl font-black">{count}</div>
    </div>
  );
}

function PreviewActionCard({
  ar,
  title,
  body,
  buttonText,
  onClick,
  href,
  disabled,
  icon,
}: {
  ar: boolean;
  title: string;
  body: string;
  buttonText: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  icon: React.ReactNode;
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-950 rtl-text">
          {title}
        </h3>
      </div>

      <p className="mt-4 text-sm sm:text-base leading-relaxed text-slate-700 rtl-text">
        {body}
      </p>

      <div
        className={`mt-5 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black shadow-lg transition ${
          disabled
            ? "bg-slate-200 text-slate-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
        }`}
      >
        {buttonText}
        {!disabled && <ArrowRight size={18} />}
      </div>
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xl hover:shadow-2xl transition no-underline">
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="text-left rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-xl hover:shadow-2xl transition disabled:hover:shadow-xl"
      dir={ar ? "rtl" : "ltr"}
    >
      {content}
    </button>
  );
}

export default function DynamicResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4">
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
            <div className="text-sm font-bold text-slate-600">Loading...</div>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
