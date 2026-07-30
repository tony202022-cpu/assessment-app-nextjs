import "server-only";

import { createHash, randomBytes, randomUUID } from "crypto";
import {
  PAID_MRI_ASSESSMENT_BY_SLUG,
  normalizeAccessSlug,
} from "@/lib/paid-mri-access";

export const DEVELOPER_TEST_LAUNCH_SECONDS = 60 * 60;

export type DeveloperTestLanguage = "en" | "ar";

export type DeveloperTestAssessment = {
  assessmentId: string;
  slug: string;
  title: string;
  languages: DeveloperTestLanguage[];
  timerMinutes: number;
  totalQuestions: number;
};

export function supportedDeveloperTestAssessment(
  assessment: Record<string, unknown>,
): DeveloperTestAssessment | null {
  const slug = normalizeAccessSlug(assessment.slug);
  const assessmentId = String(assessment.id || "").trim();
  if (
    assessment.status !== "active" ||
    PAID_MRI_ASSESSMENT_BY_SLUG[slug] !== assessmentId
  ) {
    return null;
  }

  const englishTitle = String(
    assessment.title_en || assessment.name_en || slug,
  ).trim();
  const arabicTitle = String(
    assessment.title_ar || assessment.name_ar || "",
  ).trim();

  return {
    assessmentId,
    slug,
    title: englishTitle,
    languages: arabicTitle ? ["en", "ar"] : ["en"],
    timerMinutes: Number(assessment.timer_minutes || 0),
    totalQuestions: Number(assessment.num_questions || 0),
  };
}

export function validateDeveloperTestSelection(
  value: unknown,
  assessments: DeveloperTestAssessment[],
):
  | { ok: true; data: { assessment: DeveloperTestAssessment; language: DeveloperTestLanguage } }
  | { ok: false; error: string } {
  const body = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
  const slug = normalizeAccessSlug(body.assessmentSlug);
  const language: DeveloperTestLanguage = body.language === "ar" ? "ar" : "en";
  const assessment = assessments.find((item) => item.slug === slug);

  if (!assessment) {
    return { ok: false, error: "Choose a supported active assessment." };
  }
  if (!assessment.languages.includes(language)) {
    return { ok: false, error: "Choose a language supported by this assessment." };
  }
  return { ok: true, data: { assessment, language } };
}

export function generateDeveloperTestIdentity(slug: string) {
  const slugPart = normalizeAccessSlug(slug)
    .replace(/-mri$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36) || "assessment";
  const uniqueId = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  return {
    email: `devtest+${slugPart}-${uniqueId}@internal.test`,
    fullName: `Developer Test ${uniqueId}`,
  };
}

export function generateDeveloperLaunchToken() {
  return randomBytes(32).toString("base64url");
}

export function hashDeveloperLaunchToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
