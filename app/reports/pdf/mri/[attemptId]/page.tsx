// FILE: app/reports/pdf/mri/[attemptId]/page.tsx
import "server-only";
import { createClient } from "@supabase/supabase-js";
import React from "react";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

type PageProps = {
  params: { attemptId: string };
  searchParams?: { lang?: string };
};

type MRIConfig = {
  pdf?: {
    template?: string;
    composition?: {
      order?: string[];
      sections?: Record<string, any>;
    };
  };
  tier_thresholds?: {
    strength: number;
    opportunity: number;
    threat: number;
    weakness: number;
  };
  model?: {
    competencies?: Array<{
      id: string;
      title?: { en?: string; ar?: string };
      deep_dive?: any;
    }>;
    bonuses?: any[];
  };
};

function getTierLabel(pct: number, ar: boolean, thresholds?: MRIConfig["tier_thresholds"]) {
  const t = thresholds || { strength: 75, opportunity: 50, threat: 30, weakness: 0 };
  if (pct >= t.strength) return ar ? "نقطة قوة" : "Strength";
  if (pct >= t.opportunity) return ar ? "فرصة تطوير" : "Opportunity";
  if (pct >= t.threat) return ar ? "تهديد" : "Threat";
  return ar ? "نقطة ضعف" : "Weakness";
}

const IMPACT_LABELS_FALLBACK: Record<string, { ar: string; en: string }> = {
  close_rate: { ar: "معدل الإغلاق", en: "Close rate" },
  cycle_time: { ar: "مدة دورة البيع", en: "Sales cycle time" },
  resilience: { ar: "المرونة", en: "Resilience" },
  productivity: { ar: "الإنتاجية", en: "Productivity" },
  deal_stability: { ar: "استقرار الصفقة", en: "Deal stability" },
  internal_trust: { ar: "ثقة الإدارة", en: "Internal trust" },
  execution_speed: { ar: "سرعة التنفيذ", en: "Execution speed" },
  pipeline_volume: { ar: "حجم خط الفرص", en: "Pipeline volume" },
  long_term_growth: { ar: "نمو طويل المدى", en: "Long-term growth" },
  account_retention: { ar: "الاحتفاظ بالحسابات", en: "Account retention" },
  follow_up_quality: { ar: "جودة المتابعة", en: "Follow-up quality" },
  margin_protection: { ar: "حماية الهامش", en: "Margin protection" },
  pipeline_velocity: { ar: "سرعة حركة خط الفرص", en: "Pipeline velocity" },
  price_sensitivity: { ar: "حساسية السعر", en: "Price sensitivity" },
  career_progression: { ar: "التقدم المهني", en: "Career progression" },
  internal_influence: { ar: "التأثير الداخلي", en: "Internal influence" },
  meeting_conversion: { ar: "تحويل الاجتماعات", en: "Meeting conversion" },
  revenue_realization: { ar: "تحقق الإيراد", en: "Revenue realization" },
  competitive_win_rate: { ar: "معدل الفوز التنافسي", en: "Competitive win rate" },
  emotional_resilience: { ar: "المرونة العاطفية", en: "Emotional resilience" },
  pipeline_consistency: { ar: "ثبات خط الفرص", en: "Pipeline consistency" },
  authority_positioning: { ar: "الصورة القيادية", en: "Authority positioning" },
  performance_consistency: { ar: "ثبات الأداء", en: "Performance consistency" },
  first_impression_strength: { ar: "قوة الانطباع الأول", en: "First impression" },
};

export default async function PdfMriReportPage({ params, searchParams }: PageProps) {
  const attemptId = (params.attemptId || "").trim();
  const lang = (searchParams?.lang || "en").toLowerCase() === "ar" ? "ar" : "en";
  const ar = lang === "ar";

  const supabase = getSupabaseAdmin();

  // 1) Load attempt (single source of truth)
  const { data: attempt, error: attemptErr } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptErr) throw new Error(`Failed to load attempt: ${attemptErr.message}`);
  if (!attempt) return <div style={{ padding: 32 }}>Attempt not found.</div>;

  const assessmentId = (attempt as any).assessment_id as string | null;
  if (!assessmentId) return <div style={{ padding: 32 }}>Missing assessment_id on attempt.</div>;

  // 2) Load assessment config from DB
  const { data: assessment, error: assessErr } = await supabase
    .from("assessments")
    .select("id, config")
    .eq("id", assessmentId)
    .maybeSingle();

  if (assessErr) throw new Error(`Failed to load assessment config: ${assessErr.message}`);

const rawConfig = (assessment as any)?.config;

// IMPORTANT: Supabase can return json as string depending on driver/column/type
let config: MRIConfig = {};
try {
  if (typeof rawConfig === "string") {
    config = JSON.parse(rawConfig);
  } else if (rawConfig && typeof rawConfig === "object") {
    config = rawConfig;
  }
} catch (e) {
  console.error("CONFIG JSON PARSE FAILED", e);
  config = {};
}

console.log("CONFIG typeof:", typeof rawConfig);
console.log("CONFIG keys:", config ? Object.keys(config as any) : null);
console.log("MODEL exists?", !!(config as any)?.model);
console.log(
  "IMPACT LABEL COUNT:",
  Object.keys((config as any)?.model?.labels?.impact_weights || {}).length
);

console.log("FULL CONFIG MODEL EXISTS?", !!config.model);
console.log("FULL CONFIG KEYS:", Object.keys(config));

console.log("assessmentId:", assessmentId);
console.log("assessment row found?", !!assessment);
console.log("impact_labels_keys:", Object.keys((config as any)?.model?.labels?.impact_weights || {}));


console.log(
  "impact_labels_exists?",
  !!(config as any)?.model?.labels?.impact_weights
);

	console.log("MRI impact labels keys:", Object.keys((config as any)?.model?.labels?.impact_weights || {}));
  const order = config?.pdf?.composition?.order || [
    "cover",
    "identity",
    "overall",
    "competency_loop",
    "closing",
  ];
  const sections = config?.pdf?.composition?.sections || {};

  // 3) Build competency list from attempt (preferred: competency_scores)
  const fromAttemptKey = sections?.competency_loop?.render_from_attempt || "competency_scores";
  const attemptCompetencies = (attempt as any)[fromAttemptKey];

  const scores: Array<{ competencyId: string; percentage: number }> = Array.isArray(attemptCompetencies)
    ? attemptCompetencies
    : [];

  // Map to titles from config.model.competencies
  const catalog = Array.isArray(config?.model?.competencies) ? config!.model!.competencies! : [];
  const titleById = new Map<string, { en?: string; ar?: string }>();
  for (const c of catalog) titleById.set(c.id, c.title || {});

  // Sort weakest first if configured
  const sortBy = sections?.competency_loop?.sort?.by || "score";
  const sortDir = sections?.competency_loop?.sort?.dir || "asc";
  const sortedScores = [...scores].sort((a, b) => {
    const av = a.percentage ?? 0;
    const bv = b.percentage ?? 0;
    const d = av - bv;
    return sortDir === "desc" ? -d : d;
  });

  const limit: number | null = sections?.competency_loop?.limit ?? null;
  const finalScores = typeof limit === "number" ? sortedScores.slice(0, limit) : sortedScores;

  // -----------------------
  // Minimal section renderers (safe placeholders)
  // -----------------------
  const SectionShell = ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <section style={{ padding: 24, border: "1px solid #eee", borderRadius: 12, marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{title}</h2>
      <div style={{ marginTop: 12 }}>{children}</div>
    </section>
  );

  const Cover = () => (
    <SectionShell title={ar ? "الغلاف" : "Cover"}>
      <div style={{ opacity: 0.85 }}>
        <div>
          <strong>{ar ? "تقرير MRI" : "MRI Report"}</strong>
        </div>
        <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
          attemptId: {attemptId}
          <br />
          assessment_id: {assessmentId}
          <br />
          lang: {lang}
        </div>
      </div>
    </SectionShell>
  );

  const Identity = () => (
    <SectionShell title={ar ? "الهوية" : "Identity"}>
      <div style={{ fontSize: 14 }}>
        <div>
          <strong>{ar ? "الاسم" : "Name"}:</strong> {(attempt as any).full_name || "—"}
        </div>
        <div>
          <strong>{ar ? "البريد" : "Email"}:</strong> {(attempt as any).user_email || "—"}
        </div>
        <div>
          <strong>{ar ? "الشركة" : "Company"}:</strong> {(attempt as any).company || "—"}
        </div>
      </div>
    </SectionShell>
  );

  const Overall = () => (
    <SectionShell title={ar ? "الملخص العام" : "Overall"}>
      <div style={{ fontSize: 14 }}>
        <div>
          <strong>{ar ? "النتيجة الكلية" : "Total"}:</strong> {(attempt as any).total_percentage ?? "—"}%
        </div>
        <div style={{ marginTop: 8, opacity: 0.85 }}>
          {ar
            ? "هذا قسم تمهيدي. سنملؤه لاحقاً بتحليل شامل."
            : "This is a starter section. We will expand it into a full diagnostic overview."}
        </div>
      </div>
    </SectionShell>
  );

  const CompetencyLoop = () => {
    // Build lookup for deep dive content
    const competencyById = new Map(catalog.map((c) => [c.id, c]));

    return (
      <SectionShell title={ar ? "تحليل الكفاءات (تفصيلي)" : "Competencies (Deep Dive)"}>
        {finalScores.length === 0 ? (
          <div style={{ color: "#b00" }}>
            {ar ? `لا توجد بيانات في ${fromAttemptKey}.` : `No data found in ${fromAttemptKey}.`}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {finalScores.map((x) => {
              const pct = Number(x.percentage ?? 0);
              const tierLabel = getTierLabel(pct, ar, config.tier_thresholds);

              const t = titleById.get(x.competencyId) || {};
              const title = ar ? t.ar || x.competencyId : t.en || x.competencyId;

              const c = competencyById.get(x.competencyId);
              const dd = c?.deep_dive || {};

              // Choose tier key for interpretation block
              const tierKey =
                pct >= (config.tier_thresholds?.strength ?? 75)
                  ? "strength"
                  : pct >= (config.tier_thresholds?.opportunity ?? 50)
                  ? "opportunity"
                  : pct >= (config.tier_thresholds?.threat ?? 30)
                  ? "threat"
                  : "weakness";

              const interpretation =
                (ar ? dd?.interpretation?.[tierKey]?.ar : dd?.interpretation?.[tierKey]?.en) || "";

              const behaviorSignals: string[] = Array.isArray(ar ? dd?.signals?.behavior?.ar : dd?.signals?.behavior?.en)
                ? (ar ? dd.signals.behavior.ar : dd.signals.behavior.en)
                : [];

              const stressSignals: string[] = Array.isArray(ar ? dd?.signals?.stress?.ar : dd?.signals?.stress?.en)
                ? (ar ? dd.signals.stress.ar : dd.signals.stress.en)
                : [];

              const risks: string[] = Array.isArray(ar ? dd?.risks_if_untreated?.ar : dd?.risks_if_untreated?.en)
                ? (ar ? dd.risks_if_untreated.ar : dd.risks_if_untreated.en)
                : [];

              const weights = dd?.impact_weights && typeof dd.impact_weights === "object" ? dd.impact_weights : null;
// 🔹 Localized impact labels (from config.model.labels)
const impactLabels =
  (config as any)?.model?.labels?.impact_weights ||
  (config as any)?.impact_weights ||
  {};


const labelForImpact = (key: string) => {
  const rec = impactLabels?.[key];
  if (rec && typeof rec === "object") {
    return ar ? rec.ar || key : rec.en || key;
  }
  // fallback formatting
  return key.replace(/_/g, " ");
};


              return (
                <div
                  key={x.competencyId}
                  style={{
                    padding: 14,
                    border: "1px solid #e6e6e6",
                    borderRadius: 14,
                    background: "#fff",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>
                      <strong>{pct}%</strong> — {tierLabel}
                    </div>
                  </div>

                  {/* Interpretation */}
                  <div style={{ marginTop: 10, lineHeight: 1.55, opacity: 0.95 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7, marginBottom: 4 }}>
                      {ar ? "التفسير" : "Interpretation"}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      {interpretation || (ar ? "لم يتم إضافة تفسير لهذه الكفاءة بعد." : "No interpretation added yet.")}
                    </div>
                  </div>

                  {/* Signals */}
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7, marginBottom: 6 }}>
                        {ar ? "إشارات سلوكية" : "Behavior signals"}
                      </div>
                      {behaviorSignals.length === 0 ? (
                        <div style={{ fontSize: 13, opacity: 0.75 }}>
                          {ar ? "لم يتم إضافة إشارات بعد." : "No signals added yet."}
                        </div>
                      ) : (
                        <ul
                          style={{
                            margin: 0,
                            paddingInlineStart: ar ? 0 : 18,
                            paddingRight: ar ? 18 : 0,
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          {behaviorSignals.map((s, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>
                              {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7, marginBottom: 6 }}>
                        {ar ? "إشارات تحت الضغط" : "Stress signals"}
                      </div>
                      {stressSignals.length === 0 ? (
                        <div style={{ fontSize: 13, opacity: 0.75 }}>
                          {ar ? "لم يتم إضافة إشارات الضغط بعد." : "No stress signals added yet."}
                        </div>
                      ) : (
                        <ul
                          style={{
                            margin: 0,
                            paddingInlineStart: ar ? 0 : 18,
                            paddingRight: ar ? 18 : 0,
                            fontSize: 13,
                            lineHeight: 1.5,
                          }}
                        >
                          {stressSignals.map((s, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>
                              {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Risks */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7, marginBottom: 6 }}>
                      {ar ? "مخاطر إذا لم تُعالج" : "Risks if untreated"}
                    </div>
                    {risks.length === 0 ? (
                      <div style={{ fontSize: 13, opacity: 0.75 }}>
                        {ar ? "لم يتم إضافة مخاطر بعد." : "No risks added yet."}
                      </div>
                    ) : (
                      <ul
                        style={{
                          margin: 0,
                          paddingInlineStart: ar ? 0 : 18,
                          paddingRight: ar ? 18 : 0,
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {risks.map((r, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>
                            {r}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

{/* Impact weights (localized) */}
{weights ? (
  <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
    <div style={{ fontWeight: 800, opacity: 0.7, marginBottom: 4 }}>
      {ar ? "أثر متوقع" : "Expected impact"}
    </div>

    {(() => {
      const impactLabelsFromConfig =
        (config as any)?.model?.labels?.impact_weights ||
        (config as any)?.impact_weights ||
        {};

      const normalizeKey = (k: string) => k.trim().toLowerCase().replace(/\s+/g, "_");

      const labelForImpact = (rawKey: string) => {
        const key = normalizeKey(rawKey);

        // 1) try config labels (if present)
        const rec = impactLabelsFromConfig?.[rawKey] || impactLabelsFromConfig?.[key];
        if (rec && typeof rec === "object") return ar ? rec.ar || rawKey : rec.en || rawKey;

        // 2) fallback hardcoded labels (guaranteed)
        const fb = IMPACT_LABELS_FALLBACK[key];
        if (fb) return ar ? fb.ar : fb.en;

        // 3) last fallback: prettify key
        return key.replace(/_/g, " ");
      };

      return (
        <div style={{ lineHeight: 1.5 }}>
          {Object.entries(weights).map(([k, v]) => (
            <div key={k}>
              {labelForImpact(k)}: <strong>{String(v)}</strong>
            </div>
          ))}
        </div>
      );
    })()}
  </div>
) : null}


                </div>
              );
            })}
          </div>
        )}
      </SectionShell>
    );
  };


  const Placeholder = ({ keyName }: { keyName: string }) => (
    <SectionShell title={keyName}>
      <div style={{ opacity: 0.85 }}>
        {ar
          ? "هذا القسم مفعّل في التكوين لكنه لم يُنفّذ بعد."
          : "This section is enabled in config but not implemented yet."}
      </div>
    </SectionShell>
  );

  // 4) Render sections in order, using DB config
  const renderSection = (keyName: string) => {
    const enabled = sections?.[keyName]?.enabled !== false; // default true if missing
    if (!enabled) return null;

    switch (keyName) {
      case "cover":
        return <Cover />;
      case "identity":
        return <Identity />;
      case "overall":
        return <Overall />;
      case "competency_loop":
        return <CompetencyLoop />;
      default:
        return <Placeholder keyName={keyName} />;
    }
  };

  return (
    <div style={{ padding: 32, fontFamily: "system-ui" }} dir={ar ? "rtl" : "ltr"}>
      {order.map((k) => (
        <React.Fragment key={k}>{renderSection(k)}</React.Fragment>
      ))}
    </div>
  );
}
