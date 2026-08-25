import type { Metadata } from "next";
import { ParticipantsList } from "@/components/admin/participants-list";
import { listParticipants } from "@/modules/participants/participant-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Participants | Career Labs AI", robots: { index: false, follow: false } };

export default async function ParticipantsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const result = await listParticipants({
    search: first(searchParams.q),
    filter: first(searchParams.filter),
    sort: first(searchParams.sort),
    direction: first(searchParams.direction),
    page: first(searchParams.page),
  });
  return <ParticipantsList result={result} />;
}
