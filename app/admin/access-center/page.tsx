import type { Metadata } from "next";
import { AssessmentAccessCenter } from "@/components/admin/assessment-access-center";
import { assessmentRegistry } from "@/modules/assessment-definition";
import type { AssessmentAccessCatalogItem } from "@/modules/assessment-access-center";

export const metadata: Metadata = {
  title: "Assessment Access Center | Career Labs AI",
  robots: { index: false, follow: false },
};

export default function AssessmentAccessCenterPage() {
  const assessments: AssessmentAccessCatalogItem[] = assessmentRegistry.listCurrent().map((definition) => ({
    id: definition.metadata.id,
    version: definition.metadata.version,
    name: definition.metadata.name,
    slug: definition.metadata.slug,
    languages: [...definition.localization.supportedLocales],
    individualAvailable: definition.capabilities.individualAvailability,
    companyAvailable: definition.capabilities.corporateAvailability,
    companyIssuanceAvailable:
      definition.capabilities.corporateAvailability && definition.capabilities.managerDashboard,
    complimentaryAvailable: definition.capabilities.complimentaryAccess,
  }));
  return <AssessmentAccessCenter assessments={assessments} />;
}
