import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ParticipantDetail } from "@/components/admin/participant-detail";
import { getParticipantDetail } from "@/modules/participants/participant-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Participant | Career Labs AI", robots: { index: false, follow: false } };

export default async function ParticipantPage({ params }: { params: { id: string } }) {
  const participant = await getParticipantDetail(params.id);
  if (!participant) notFound();
  return <ParticipantDetail participant={participant} />;
}
