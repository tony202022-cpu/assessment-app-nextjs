import type { ReportDefinition } from "@/modules/report-engine";

export const SME_REPORT_SECTION_IDS = [
  "executive-summary",
  "competencies",
  "charts",
  "strengths",
  "weaknesses",
  "recommendations",
  "ninety-day-plan",
  "daily-schedule",
] as const;

export const smeBusinessHealthReportDefinition: ReportDefinition = {
  id: "sme-business-health-report",
  version: "1.0.0",
  assessmentId: "sme_business_health_mri",
  supportedLocales: ["en", "ar"],
  defaultLocale: "en",
  template: {
    id: "sme-business-health-legacy-parity",
    version: "1.0.0",
    layout: "single-column",
    sectionOrder: [...SME_REPORT_SECTION_IDS],
    audienceSections: { participant: [...SME_REPORT_SECTION_IDS] },
  },
  theme: {
    id: "sme-business-health",
    version: "1.0.0",
    colors: {
      primary: "#0f172a",
      secondary: "#1d4ed8",
      accent: "#d97706",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      mutedText: "#64748b",
      positive: "#047857",
      warning: "#b45309",
      negative: "#be123c",
    },
    typography: {
      bodyFont: "Inter, sans-serif",
      headingFont: "Inter, sans-serif",
      arabicFont: "IBM Plex Sans Arabic, sans-serif",
      baseSize: 16,
    },
    spacing: { section: 32, widget: 16 },
  },
  sections: [
    section("executive-summary", "executive-summary", { en: "Executive Summary", ar: "الملخص التنفيذي" }, "text", "executiveSummary"),
    section("competencies", "competencies", { en: "Business Health Areas", ar: "مجالات صحة الشركة" }, "competency-list", "competencies"),
    section("charts", "charts", { en: "Business Health Charts", ar: "رسوم صحة الشركة" }, "chart", "chart"),
    section("strengths", "strengths", { en: "Strengths", ar: "نقاط القوة" }, "list", "strengths"),
    section("weaknesses", "weaknesses", { en: "Weakest Areas", ar: "أضعف المجالات" }, "list", "weakestCompetencies"),
    section("recommendations", "recommendations", { en: "Recommendations", ar: "التوصيات" }, "recommendation-list", "recommendations"),
    section("ninety-day-plan", "ninety-day-plan", { en: "90-Day Business Revival Plan", ar: "خطة إنعاش الأعمال لمدة 90 يومًا" }, "plan", "ninetyDayPlan"),
    section("daily-schedule", "daily-schedule", { en: "Daily Schedule", ar: "الجدول اليومي" }, "schedule", "dailySchedule"),
  ],
};

function section(
  id: string,
  kind: ReportDefinition["sections"][number]["kind"],
  title: Readonly<Record<string, string>>,
  widgetKind: ReportDefinition["sections"][number]["widgets"][number]["kind"],
  dataPath: string,
): ReportDefinition["sections"][number] {
  return {
    id,
    kind,
    title,
    audiences: ["participant"],
    widgets: [{ id: `${id}-content`, kind: widgetKind, title, dataPath }],
  };
}
