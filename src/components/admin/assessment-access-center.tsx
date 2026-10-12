"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Copy, ExternalLink, Gift, KeyRound, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ASSESSMENT_REPORT_VISIBILITIES,
  type AssessmentReportVisibility,
} from "@/modules/assessment-issuance-policy/assessment-issuance-policy";
import {
  EMPTY_ASSESSMENT_ACCESS_WIZARD,
  validateAssessmentAccessWizardStep,
  type AssessmentAccessCatalogItem,
  type AssessmentAccessWizardErrors,
  type AssessmentAccessWizardState,
  type AssessmentRecipientType,
} from "@/modules/assessment-access-center";

const steps = ["Assessment", "Access Type", "Configure", "Report Visibility", "Summary"];

type IssuancePreview = {
  expectedResult: Record<string, unknown>;
  affectedRecords: Array<{ type: string; id: string; label?: string }>;
  warnings: string[];
};

type IssuanceResult = {
  policyId: string;
  companyId?: string;
  companyName?: string;
  managerName?: string;
  managerEmail?: string;
  credits?: number;
  participantAllocation?: number;
  employeeAssessmentPath?: string;
  managerDashboardPath?: string;
  issuedAt: string;
  directAccessPath?: string;
  participantName?: string;
  participantEmail?: string;
};

type CompanyOption = {
  id: string;
  name: string;
  billing_email: string;
  manager_name?: string | null;
  package_size: number;
  credits_balance: number;
};

const reportVisibilityLabels: Record<AssessmentReportVisibility, string> = {
  "participant-only": "Participant only",
  "manager-only": "Manager only",
  "participant-and-manager": "Participant + Manager",
  "admin-only": "Admin only",
};

const GENERIC_ISSUANCE_TYPES = ["offline-paid", "online-paid", "complimentary"] as const;
type GenericIssuanceType = (typeof GENERIC_ISSUANCE_TYPES)[number];

const issuanceTypeLabels: Record<(typeof GENERIC_ISSUANCE_TYPES)[number], string> = {
  "offline-paid": "Offline Paid",
  "online-paid": "Online Paid",
  complimentary: "Complimentary",
};

function ErrorText({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="mt-1.5 text-sm font-semibold text-rose-700">{message}</p> : null;
}

function SummaryRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[180px_1fr]"><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="text-sm font-bold text-slate-950">{value}</dd></div>;
}

export function AssessmentAccessCenter({ assessments, companies = [] }: { assessments: AssessmentAccessCatalogItem[]; companies?: CompanyOption[] }) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [state, setState] = useState<AssessmentAccessWizardState>(EMPTY_ASSESSMENT_ACCESS_WIZARD);
  const [errors, setErrors] = useState<AssessmentAccessWizardErrors>({});
  const [operationId, setOperationId] = useState("");
  const [preview, setPreview] = useState<IssuancePreview | null>(null);
  const [issued, setIssued] = useState<IssuanceResult | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const selectedAssessment = useMemo(
    () => assessments.find((assessment) => assessment.id === state.assessmentId),
    [assessments, state.assessmentId],
  );
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === state.existingCompanyId),
    [companies, state.existingCompanyId],
  );
  const freeCompanyScan = ["outdoor_sales_scan", "sales_manager_scan"].includes(selectedAssessment?.id || "");
  const recipientTypes: readonly AssessmentRecipientType[] = freeCompanyScan
    ? selectedAssessment?.individualAvailable ? ["company", "individual"] : ["company"]
    : ["company", "individual", "complimentary"];
  const reportVisibilityOptions = freeCompanyScan
    ? ASSESSMENT_REPORT_VISIBILITIES.filter((value) => value !== "admin-only")
    : ASSESSMENT_REPORT_VISIBILITIES;

  function update<K extends keyof AssessmentAccessWizardState>(field: K, value: AssessmentAccessWizardState[K]) {
    setState((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setPreview(null);
    setIssued(null);
    setActionError("");
  }

  function chooseAssessment(id: string) {
    const assessment = assessments.find((item) => item.id === id);
    const scan = ["outdoor_sales_scan", "sales_manager_scan"].includes(assessment?.id || "");
    setState((current) => {
      const accessType = scan && current.accessType === "complimentary"
        ? "individual"
        : current.accessType === "company" && (!assessment?.companyAvailable || !assessment.companyIssuanceAvailable)
          ? ""
          : ["individual", "complimentary"].includes(current.accessType) && !assessment?.individualAvailable
            ? ""
            : current.accessType === "complimentary" && !assessment?.complimentaryAvailable
              ? ""
              : current.accessType;
      return {
        ...current,
        assessmentId: id,
        accessType,
        credits: scan ? "0" : current.credits,
        participantAllocation: scan ? current.participantAllocation || "1" : current.participantAllocation,
        issuanceType: scan ? "complimentary" : current.issuanceType,
        fundingType: scan ? "complimentary" : current.fundingType === "complimentary" && !assessment?.complimentaryAvailable ? "" : current.fundingType,
        reportVisibility: scan && current.reportVisibility === "admin-only" ? "" : current.reportVisibility,
      };
    });
    setErrors({});
  }

  async function submitIssuance(mode: "preview" | "execute") {
    if (!selectedAssessment || !state.accessType) return;
    const id = operationId || crypto.randomUUID();
    if (!operationId) setOperationId(id);
    setSubmitting(true);
    setActionError("");
    try {
      const company = state.accessType === "company";
      const response = await fetch(company
        ? "/api/admin/actions/assessment-access/company/issue"
        : "/api/admin/actions/assessment-access/individual/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company ? {
          mode,
          operationId: id,
          assessmentDefinitionId: selectedAssessment.id,
          assessmentDefinitionVersion: selectedAssessment.version,
          existingCompanyId: state.existingCompanyId || null,
          companyName: state.companyName,
          managerName: state.managerName,
          managerEmail: state.managerEmail,
          credits: Number(state.credits),
          participantAllocation: Number(state.participantAllocation),
          commercialReference: state.commercialReference,
          reportVisibility: state.reportVisibility,
          issuanceType: state.issuanceType,
          languageMode: state.languageMode,
          expiresAt: state.expiresAt ? new Date(state.expiresAt).toISOString() : null,
        } : {
          mode,
          operationId: id,
          assessmentDefinitionId: selectedAssessment.id,
          assessmentDefinitionVersion: selectedAssessment.version,
          recipientType: state.accessType,
          participantName: state.participantName,
          participantEmail: state.participantEmail,
          commercialReference: state.commercialReference,
          reportVisibility: state.reportVisibility,
          issuanceType: state.issuanceType,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setActionError(result?.error?.message || "Assessment access could not be issued.");
        return;
      }
      if (mode === "preview") {
        setPreview(result.data.dryRun);
        setConfirmationOpen(true);
      } else {
        setIssued(result.data);
        setConfirmationOpen(false);
        toast.success("Assessment access issued successfully.");
      }
    } catch {
      setActionError("Assessment access could not be issued. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink(path: string, label: string) {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success(`${label} copied.`);
  }

  function chooseAccessType(value: AssessmentRecipientType) {
    const scan = ["outdoor_sales_scan", "sales_manager_scan"].includes(selectedAssessment?.id || "");
    const issuanceType: GenericIssuanceType = scan || value === "complimentary" ? "complimentary" : "offline-paid";
    setState((current) => ({
      ...current,
      accessType: value,
      issuanceType,
      fundingType: scan || value === "complimentary" ? "complimentary" : "paid",
      credits: scan ? "0" : current.credits,
      participantAllocation: scan ? current.participantAllocation || "1" : current.participantAllocation,
      reportVisibility: scan && value === "individual" ? "participant-only" : current.reportVisibility,
    }));
    setErrors({});
  }

  function chooseIssuanceType(value: GenericIssuanceType) {
    update("issuanceType", value);
    setState((current) => ({
      ...current,
      issuanceType: value,
      fundingType: value === "complimentary" ? "complimentary" : "paid",
    }));
  }

  function next() {
    const nextErrors = validateAssessmentAccessWizardStep(step, state, assessments);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep((current) => Math.min(5, current + 1));
  }

  if (!started) {
    return <div className="space-y-7"><section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8 lg:p-10"><div className="max-w-3xl"><Badge className="border-blue-400/30 bg-blue-500/15 text-blue-100 hover:bg-blue-500/15">Unified Assessment Access</Badge><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Assessment Access Center</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">Issue governed company, individual, or complimentary access through the existing token, credit, policy, and manager-dashboard architecture.</p><Button type="button" size="lg" onClick={() => setStarted(true)} disabled={!assessments.length} className="mt-7 bg-blue-600 font-bold hover:bg-blue-500"><KeyRound className="mr-2 h-5 w-5" />Create Assessment Access</Button></div></section><section className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-base">Company / Team</CardTitle><CardDescription>Reuse the company and manager token where possible, with a governed participant link.</CardDescription></CardHeader></Card><Card><CardHeader><CardTitle className="text-base">Individual</CardTitle><CardDescription>Create one named direct link without a company dashboard.</CardDescription></CardHeader></Card><Card><CardHeader><CardTitle className="text-base">Complimentary</CardTitle><CardDescription>Create free access without consuming paid company credit.</CardDescription></CardHeader></Card></section></div>;
  }

  return <div className="mx-auto max-w-5xl space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Assessment Access Center</p><h1 className="mt-2 text-3xl font-black tracking-tight">Create Assessment Access</h1><p className="mt-2 text-sm leading-6 text-slate-600">Complete all five steps, review the dry run, and explicitly confirm company issuance.</p></header>
    <nav aria-label="Assessment access progress" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3"><ol className="flex min-w-[680px] items-center gap-2">{steps.map((label, index) => { const number = index + 1; const active = number === step; const complete = number < step; return <li key={label} className="flex flex-1 items-center"><span aria-current={active ? "step" : undefined} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${active ? "bg-blue-600 text-white" : complete ? "bg-emerald-50 text-emerald-800" : "text-slate-500"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white/20" : complete ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>{complete ? <Check className="h-4 w-4" aria-hidden="true" /> : number}</span>{label}</span></li>; })}</ol></nav>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>{steps[step - 1]}</CardTitle><CardDescription>{step === 1 ? "Select a current published production assessment." : step === 2 ? "Choose how access will be issued." : step === 3 ? "Enter the operational details for this access." : step === 4 ? "Choose the report audience for this issuance." : "Review the validated request before the execution milestone."}</CardDescription></CardHeader><CardContent className="space-y-6">
      {step === 1 && <fieldset><legend className="sr-only">Select assessment</legend><div className="grid gap-3 md:grid-cols-2">{assessments.map((assessment) => <button key={`${assessment.id}@${assessment.version}`} type="button" onClick={() => chooseAssessment(assessment.id)} aria-pressed={state.assessmentId === assessment.id} className={`rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${state.assessmentId === assessment.id ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300"}`}><span className="flex items-start justify-between gap-3"><span><span className="block font-black text-slate-950">{assessment.name}</span><span className="mt-1 block text-xs text-slate-500">/{assessment.slug} · v{assessment.version}</span></span>{state.assessmentId === assessment.id && <Check className="h-5 w-5 text-blue-700" aria-hidden="true" />}</span><span className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">{assessment.languages.join(" · ").toUpperCase()}</Badge>{assessment.individualAvailable && <Badge variant="outline">Individual</Badge>}{assessment.companyAvailable && <Badge variant="outline">Company</Badge>}</span></button>)}</div><ErrorText id="assessment-error" message={errors.assessmentId} /></fieldset>}
      {step === 2 && <RadioGroup value={state.accessType} onValueChange={(value) => chooseAccessType(value as AssessmentRecipientType)} className="grid gap-4 md:grid-cols-3" aria-describedby={errors.accessType ? "access-type-error" : undefined}>{recipientTypes.map((type) => { const available = type === "company" ? selectedAssessment?.companyAvailable && selectedAssessment.companyIssuanceAvailable : type === "complimentary" ? selectedAssessment?.individualAvailable && selectedAssessment.complimentaryAvailable : selectedAssessment?.individualAvailable; const Icon = type === "company" ? Building2 : type === "complimentary" ? Gift : UserRound; return <Label key={type} htmlFor={`access-${type}`} className={`flex min-h-36 cursor-pointer items-start gap-4 rounded-2xl border p-5 ${available ? "hover:border-blue-400" : "cursor-not-allowed bg-slate-50 text-slate-400"}`}><RadioGroupItem id={`access-${type}`} value={type} disabled={!available} className="mt-1" /><span><Icon className="mb-3 h-6 w-6" aria-hidden="true" /><span className="block text-lg font-black capitalize">{type === "company" ? "Company / Team" : type}</span><span className="mt-1 block text-sm font-normal leading-6">{type === "company" ? freeCompanyScan ? "Free company Scan link and manager dashboard; no package credits." : "Company wallet, manager, seats, and shared participant link." : freeCompanyScan ? "One free named participant link." : "One named participant link with no company dashboard."}</span>{!available && <span className="mt-2 block text-xs font-bold">Not supported by this assessment definition.</span>}</span></Label>; })}<ErrorText id="access-type-error" message={errors.accessType} /></RadioGroup>}
      {step === 3 && state.accessType === "company" && <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="existing-company" className="font-bold">Existing Company (optional)</Label><Select value={state.existingCompanyId || "new"} onValueChange={(id) => { const company = companies.find((item) => item.id === id); setState((current) => company ? { ...current, existingCompanyId: company.id, companyName: company.name, managerName: company.manager_name || "", managerEmail: company.billing_email, credits: freeCompanyScan ? "0" : "" } : { ...current, existingCompanyId: "", companyName: "", managerName: "", managerEmail: "", credits: "" }); setErrors({}); setPreview(null); setIssued(null); }}><SelectTrigger id="existing-company" className="mt-2 h-11"><SelectValue placeholder="Create new or select an existing company" /></SelectTrigger><SelectContent><SelectItem value="new">Create a new company</SelectItem>{companies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name} · {company.billing_email}{!freeCompanyScan ? ` · ${company.credits_balance}/${company.package_size} credits` : ""}</SelectItem>)}</SelectContent></Select>{selectedCompany && <p className="mt-2 text-sm text-slate-500">{freeCompanyScan ? "Free Scan access will not change this company’s package or paid credit balance." : `Current package: ${selectedCompany.package_size}; available: ${selectedCompany.credits_balance}. Existing manager token and records are preserved.`}</p>}<ErrorText id="existing-company-error" message={errors.existingCompanyId} /></div><Field id="company-name" label="Company Name" value={state.companyName} error={errors.companyName} disabled={Boolean(selectedCompany)} onChange={(value) => update("companyName", value)} /><Field id="manager-name" label="Manager Name" value={state.managerName} error={errors.managerName} disabled={Boolean(selectedCompany?.manager_name)} onChange={(value) => update("managerName", value)} /><Field id="manager-email" label="Manager Email" type="email" value={state.managerEmail} error={errors.managerEmail} disabled={Boolean(selectedCompany)} onChange={(value) => update("managerEmail", value)} />{!freeCompanyScan && <><Field id="credits" label={selectedCompany ? "Additional Seats / Credits" : "Seats / Credits"} type="number" min={selectedCompany ? "0" : "1"} max="100000" step="1" value={state.credits} error={errors.credits} onChange={(value) => update("credits", value)} hint={selectedCompany ? "Added to the existing company wallet; enter 0 to issue without a top-up." : "Creates the initial company wallet allocation."} /><IssuanceTypeField value={state.issuanceType} error={errors.issuanceType} onChange={chooseIssuanceType} /></>}{freeCompanyScan && <><Field id="participant-allocation" label="Participant Allocation" type="number" min="1" max="100000" step="1" value={state.participantAllocation} error={errors.participantAllocation} onChange={(value) => update("participantAllocation", value)} hint="Tracking capacity only; this does not create or consume paid credits." /><LanguageModeField value={state.languageMode} error={errors.languageMode} onChange={(value) => update("languageMode", value)} /><Field id="scan-expiry" label="Expiry (optional)" type="datetime-local" value={state.expiresAt} error={errors.expiresAt} onChange={(value) => update("expiresAt", value)} hint="Leave blank for no expiry; maximum 366 days." /></>}<Field id="company-commercial-reference" label={freeCompanyScan ? "Issuance Note (optional)" : "Commercial Reference"} value={state.commercialReference} error={errors.commercialReference} onChange={(value) => update("commercialReference", value)} hint={freeCompanyScan ? "Administrative tracking note only; the Scan remains free." : "Invoice, PO, online payment, manual sale, or complimentary approval reference."} /></div>}
      {step === 3 && ["individual", "complimentary"].includes(state.accessType) && <div className="grid gap-5 sm:grid-cols-2"><Field id="participant-name" label="Participant Name" value={state.participantName} error={errors.participantName} onChange={(value) => update("participantName", value)} /><Field id="participant-email" label="Participant Email" type="email" value={state.participantEmail} error={errors.participantEmail} onChange={(value) => update("participantEmail", value)} />{!freeCompanyScan && <IssuanceTypeField value={state.issuanceType} error={errors.issuanceType} disabled={state.accessType === "complimentary"} onChange={chooseIssuanceType} />}<Field id="individual-commercial-reference" label={freeCompanyScan ? "Issuance Note" : "Commercial Reference"} value={state.commercialReference} error={errors.commercialReference} onChange={(value) => update("commercialReference", value)} hint={freeCompanyScan ? "Administrative tracking note only; this direct Scan is free." : "Invoice, PO, online payment, manual sale, or complimentary approval reference."} /></div>}
      {step === 4 && <div className="max-w-xl"><Label htmlFor="report-visibility" className="font-bold">Report Visibility</Label><Select value={state.reportVisibility} onValueChange={(value) => update("reportVisibility", value as AssessmentReportVisibility)}><SelectTrigger id="report-visibility" className="mt-2 h-11" aria-describedby={errors.reportVisibility ? "visibility-error" : "visibility-help"}><SelectValue placeholder="Select report visibility" /></SelectTrigger><SelectContent>{reportVisibilityOptions.map((value) => <SelectItem key={value} value={value}>{reportVisibilityLabels[value]}</SelectItem>)}</SelectContent></Select><p id="visibility-help" className="mt-2 text-sm leading-6 text-slate-500">The server enforces this policy for the resulting attempt. Public Scan attempts without a stored policy default to participant access.</p><ErrorText id="visibility-error" message={errors.reportVisibility} /></div>}
      {step === 5 && <div className="space-y-5"><dl className="rounded-2xl border border-slate-200 bg-slate-50 px-5"><SummaryRow label="Assessment" value={selectedAssessment ? `${selectedAssessment.name} · v${selectedAssessment.version}` : ""} /><SummaryRow label="Recipient Type" value={state.accessType === "company" ? "Company / Team" : state.accessType === "complimentary" ? "Complimentary" : "Individual"} /><SummaryRow label="Access" value={freeCompanyScan ? "Free — no package or paid credits" : ""} />{state.accessType === "company" ? <><SummaryRow label="Company" value={state.companyName} /><SummaryRow label="Manager" value={`${state.managerName} · ${state.managerEmail}`} />{!freeCompanyScan && <SummaryRow label="Seats / Credits" value={state.credits} />}{freeCompanyScan && <><SummaryRow label="Participant Allocation" value={state.participantAllocation} /><SummaryRow label="Language" value={state.languageMode === "participant-choice" ? "Participant chooses English / Arabic" : state.languageMode === "ar" ? "Arabic" : "English"} /><SummaryRow label="Expiry" value={state.expiresAt || "No expiry"} /></>}</> : <SummaryRow label="Participant" value={`${state.participantName} · ${state.participantEmail}`} />}{!freeCompanyScan && <SummaryRow label="Issuance Type" value={state.issuanceType ? issuanceTypeLabels[state.issuanceType] : ""} />}<SummaryRow label={freeCompanyScan ? "Issuance Note" : "Commercial Reference"} value={state.commercialReference} /><SummaryRow label="Report Visibility" value={state.reportVisibility ? reportVisibilityLabels[state.reportVisibility] : ""} /></dl>{issued ? <div role="status" className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div><p className="font-black text-emerald-950">Assessment access issued</p><p className="mt-1 text-sm leading-6 text-emerald-800">The access token, issuance policy, and administrative audit were saved.</p></div><div className="flex flex-wrap gap-2">{(issued.employeeAssessmentPath || issued.directAccessPath) && <Button type="button" variant="outline" onClick={() => copyLink((issued.employeeAssessmentPath || issued.directAccessPath)!, "Participant assessment link")}><Copy className="mr-2 h-4 w-4" />Copy Participant Link</Button>}{issued.managerDashboardPath && <><Button type="button" variant="outline" onClick={() => copyLink(issued.managerDashboardPath!, "Manager dashboard link")}><Copy className="mr-2 h-4 w-4" />Copy Manager Link</Button><Button asChild><a href={issued.managerDashboardPath} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open Manager Dashboard</a></Button></>}</div></div> : <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-5"><div role="status"><p className="font-black text-blue-950">Ready to issue assessment access</p><p className="mt-1 text-sm leading-6 text-blue-800">Preview the live records first. Confirmation is required before anything is created.</p></div>{actionError && <p role="alert" className="text-sm font-semibold text-rose-700">{actionError}</p>}<Button type="button" onClick={() => submitIssuance("preview")} disabled={submitting} className="bg-blue-700 font-bold hover:bg-blue-800">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking…</> : "Preview Issuance"}</Button></div>}</div>}
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row"><Button type="button" variant="outline" onClick={() => step === 1 ? setStarted(false) : setStep((current) => current - 1)}><ArrowLeft className="mr-2 h-4 w-4" />{step === 1 ? "Exit wizard" : "Back"}</Button>{step < 5 && <Button type="button" onClick={next} className="bg-slate-950 font-bold hover:bg-slate-800">Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>
    </CardContent></Card>
    <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Issue assessment access?</DialogTitle><DialogDescription>This creates live access through the existing token architecture.</DialogDescription></DialogHeader>{preview && <div className="space-y-4"><dl className="rounded-xl border border-slate-200 px-4">{Object.entries(preview.expectedResult).map(([key, value]) => <SummaryRow key={key} label={key.replace(/([A-Z])/g, " $1")} value={String(value ?? "")} />)}</dl><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{preview.warnings.map((warning) => <p key={warning} className="mb-2 last:mb-0"><strong>Warning:</strong> {warning}</p>)}</div></div>}{actionError && <p role="alert" className="text-sm font-semibold text-rose-700">{actionError}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setConfirmationOpen(false)} disabled={submitting}>Cancel</Button><Button type="button" onClick={() => submitIssuance("execute")} disabled={submitting} className="bg-rose-700 font-bold hover:bg-rose-800">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Issuing…</> : "Issue Access"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function IssuanceTypeField({ value, error, disabled, onChange }: { value: GenericIssuanceType | ""; error?: string; disabled?: boolean; onChange(value: GenericIssuanceType): void }) {
  return <div><Label htmlFor="issuance-type" className="font-bold">Issuance Type</Label><Select value={value} disabled={disabled} onValueChange={(next) => onChange(next as GenericIssuanceType)}><SelectTrigger id="issuance-type" className="mt-2 h-11" aria-invalid={Boolean(error)} aria-describedby={error ? "issuance-type-error" : undefined}><SelectValue placeholder="Select issuance type" /></SelectTrigger><SelectContent>{GENERIC_ISSUANCE_TYPES.map((type) => <SelectItem key={type} value={type}>{issuanceTypeLabels[type]}</SelectItem>)}</SelectContent></Select><ErrorText id="issuance-type-error" message={error} /></div>;
}

function LanguageModeField({ value, error, onChange }: { value: "participant-choice" | "en" | "ar"; error?: string; onChange(value: "participant-choice" | "en" | "ar"): void }) {
  return <div><Label htmlFor="language-mode" className="font-bold">Language</Label><Select value={value} onValueChange={(next) => onChange(next as "participant-choice" | "en" | "ar")}><SelectTrigger id="language-mode" className="mt-2 h-11" aria-invalid={Boolean(error)} aria-describedby={error ? "language-mode-error" : undefined}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="participant-choice">Participant chooses English / Arabic</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="ar">Arabic</SelectItem></SelectContent></Select><ErrorText id="language-mode-error" message={error} /></div>;
}

function Field({ id, label, value, onChange, error, hint, type = "text", min, max, step, disabled }: { id: string; label: string; value: string; onChange(value: string): void; error?: string; hint?: string; type?: string; min?: string; max?: string; step?: string; disabled?: boolean }) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div><Label htmlFor={id} className="font-bold">{label}</Label><Input id={id} type={type} min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy} className="mt-2 h-11" />{hint && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>}<ErrorText id={`${id}-error`} message={error} /></div>;
}
