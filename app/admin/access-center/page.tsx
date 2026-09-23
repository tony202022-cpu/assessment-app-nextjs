import type { Metadata } from "next";
import { AssessmentAccessCenter } from "@/components/admin/assessment-access-center";
import { assessmentRegistry } from "@/modules/assessment-definition";
import type { AssessmentAccessCatalogItem } from "@/modules/assessment-access-center";
import { getSupabaseAdmin } from "@/lib/offline-company";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Assessment Access Center | Career Labs AI",
  robots: { index: false, follow: false },
};

export default async function AssessmentAccessCenterPage() {
  const assessments: AssessmentAccessCatalogItem[] = assessmentRegistry.listCurrent().map((definition) => ({
    id: definition.metadata.id,
    version: definition.metadata.version,
    name: definition.metadata.name,
    slug: definition.metadata.slug,
    languages: [...definition.localization.supportedLocales],
    individualAvailable: definition.capabilities.individualAvailability,
    companyAvailable: definition.capabilities.corporateAvailability,
    companyIssuanceAvailable: definition.capabilities.corporateAvailability,
    complimentaryAvailable: definition.capabilities.complimentaryAccess,
  }));
  const db = getSupabaseAdmin();
  const { data: companyRows } = db
    ? await db.from("companies").select("id,name,billing_email,manager_name,package_size,credits_balance").order("name").limit(500)
    : { data: [] };
  const { data: historyRows } = db
    ? await db.from("assessment_issuance_policies").select("id,issued_at,access_type,funding_type,report_visibility,assessment_definition_id,recipient_name,recipient_email,manager_name,manager_email,quantity,issuance_type,language_mode,status,issued_by").order("issued_at", { ascending: false }).limit(100)
    : { data: [] };
  return <div className="space-y-8"><AssessmentAccessCenter assessments={assessments} companies={(companyRows || []) as any} /><Card><CardHeader><CardTitle>Access History</CardTitle><CardDescription>Latest issuance records. Raw access and manager tokens are never displayed.</CardDescription></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b text-left text-slate-500">{["Date","Recipient","Assessment","Quantity","Type","Visibility","Language","Created by","Status","Reference"].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{(historyRows||[]).map((row:any)=><tr key={row.id} className="border-b"><td className="p-3">{new Date(row.issued_at).toLocaleString()}</td><td className="p-3">{row.access_type==="company"?(row.manager_name||row.manager_email):row.recipient_name||row.recipient_email}</td><td className="p-3">{row.assessment_definition_id}</td><td className="p-3">{row.quantity}</td><td className="p-3">{row.issuance_type||row.funding_type}</td><td className="p-3">{row.report_visibility}</td><td className="p-3">{row.language_mode}</td><td className="p-3">{row.issued_by}</td><td className="p-3">{row.status}</td><td className="p-3 font-mono text-xs">{row.id}</td></tr>)}{!historyRows?.length?<tr><td colSpan={10} className="p-8 text-center text-slate-500">No issuance history yet.</td></tr>:null}</tbody></table></CardContent></Card></div>;
}
