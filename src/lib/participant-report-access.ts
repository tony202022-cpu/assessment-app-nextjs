import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export const PARTICIPANT_REPORT_ACCESS_COOKIE = "participant_report_access";
export const PARTICIPANT_REPORT_ACCESS_SECONDS = 24 * 60 * 60;

export type ParticipantReportAccess = {
  attemptId: string;
  userId: string;
  assessmentId: string;
  expires: number;
};

function signingSecret(env = process.env) {
  return String(env.ADMIN_ACTIVATION_SECRET || "");
}

export function createParticipantReportAccess(
  value: Omit<ParticipantReportAccess, "expires">,
  now = Date.now(),
) {
  const secret = signingSecret();
  if (secret.length < 24) throw new Error("Participant report access signing is not configured.");
  const payload: ParticipantReportAccess = {
    ...value,
    expires: Math.floor(now / 1000) + PARTICIPANT_REPORT_ACCESS_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function readParticipantReportAccess(
  value: string | undefined,
  now = Date.now(),
): ParticipantReportAccess | null {
  if (!value) return null;
  const secret = signingSecret();
  if (secret.length < 24) return null;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as ParticipantReportAccess;
    if (
      !payload.attemptId ||
      !payload.userId ||
      !payload.assessmentId ||
      !Number.isInteger(payload.expires) ||
      payload.expires <= Math.floor(now / 1000)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}
