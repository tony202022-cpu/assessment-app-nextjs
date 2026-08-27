"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Copy, ExternalLink, KeyRound, Loader2, UserRound } from "lucide-react";
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
  type AssessmentAccessType,
  type AssessmentFundingType,
  type AssessmentReportVisibility,
} from "@/modules/assessment-issuance-policy/assessment-issuance-policy";
import {
  EMPTY_ASSESSMENT_ACCESS_WIZARD,
  validateAssessmentAccessWizardStep,
  type AssessmentAccessCatalogItem,
  type AssessmentAccessWizardErrors,
  type AssessmentAccessWizardState,
} from "@/modules/assessment-access-center";

const steps = ["Assessment", "Access Type", "Configure", "Report Visibility", "Summary"];

type IssuancePreview = {
  expectedResult: Record<string, unknown>;
  affectedRecords: Array<{ type: string; id: string; label?: string }>;
  warnings: string[];
};

type IssuanceResult = {
  policyId: string;
  companyId: string;
  companyName: string;
  managerName: string;
  managerEmail: string;
  credits: number;
  employeeAssessmentPath: string;
  managerDashboardPath: string;
  issuedAt: string;
};

function ErrorText({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="mt-1.5 text-sm font-semibold text-rose-700">{message}</p> : null;
}

function SummaryRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[180px_1fr]"><dt className="text-sm font-semibold text-slate-500">{label}</dt><dd className="text-sm font-bold text-slate-950">{value}</dd></div>;
}

export function AssessmentAccessCenter({ assessments }: { assessments: AssessmentAccessCatalogItem[] }) {
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

  function update<K extends keyof AssessmentAccessWizardState>(field: K, value: AssessmentAccessWizardState[K]) {
    setState((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setPreview(null);
    setIssued(null);
    setActionError("");
  }

  function chooseAssessment(id: string) {
    const assessment = assessments.find((item) => item.id === id);
    setState((current) => ({
      ...current,
      assessmentId: id,
      accessType:
        current.accessType === "company" && (!assessment?.companyAvailable || !assessment.companyIssuanceAvailable)
          ? ""
          : current.accessType === "individual" && !assessment?.individualAvailable
            ? ""
            : current.accessType,
      fundingType:
        current.fundingType === "complimentary" && !assessment?.complimentaryAvailable
          ? ""
          : current.fundingType,
    }));
    setErrors({});
  }

  async function submitCompanyIssuance(mode: "preview" | "execute") {
    if (!selectedAssessment || state.accessType !== "company") return;
    const id = operationId || crypto.randomUUID();
    if (!operationId) setOperationId(id);
    setSubmitting(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/actions/assessment-access/company/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          operationId: id,
          assessmentDefinitionId: selectedAssessment.id,
          assessmentDefinitionVersion: selectedAssessment.version,
          companyName: state.companyName,
          managerName: state.managerName,
          managerEmail: state.managerEmail,
          credits: Number(state.credits),
          commercialReference: state.commercialReference,
          reportVisibility: state.reportVisibility,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setActionError(result?.error?.message || "Company assessment access could not be issued.");
        return;
      }
      if (mode === "preview") {
        setPreview(result.data.dryRun);
        setConfirmationOpen(true);
      } else {
        setIssued(result.data);
        setConfirmationOpen(false);
        toast.success("Company assessment access issued successfully.");
      }
    } catch {
      setActionError("Company assessment access could not be issued. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink(path: string, label: string) {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success(`${label} copied.`);
  }

  function chooseAccessType(value: AssessmentAccessType) {
    setState((current) => ({
      ...current,
      accessType: value,
      fundingType: value === "company" ? "paid" : current.fundingType,
    }));
    setErrors({});
  }

  function next() {
    const nextErrors = validateAssessmentAccessWizardStep(step, state, assessments);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep((current) => Math.min(5, current + 1));
  }

  if (!started) {
    return <div className="space-y-7"><section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8 lg:p-10"><div className="max-w-3xl"><Badge className="border-blue-400/30 bg-blue-500/15 text-blue-100 hover:bg-blue-500/15">Version 1.0 · Company Issuance</Badge><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Assessment Access Center</h1><p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">Issue governed company assessment access through the existing production company, credit, token, and manager-dashboard architecture.</p><Button type="button" size="lg" onClick={() => setStarted(true)} disabled={!assessments.length} className="mt-7 bg-blue-600 font-bold hover:bg-blue-500"><KeyRound className="mr-2 h-5 w-5" />Create Assessment Access</Button></div></section><section className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-base">Dynamic catalog</CardTitle><CardDescription>{assessments.length} current published assessments loaded from the Assessment Definition Engine.</CardDescription></CardHeader></Card><Card><CardHeader><CardTitle className="text-base">Company issuance</CardTitle><CardDescription>Available only where the current definition and existing production manager dashboard are both supported.</CardDescription></CardHeader></Card><Card><CardHeader><CardTitle className="text-base">Individual locked</CardTitle><CardDescription>Individual and complimentary issuance remain unavailable in this milestone.</CardDescription></CardHeader></Card></section></div>;
  }

  return <div className="mx-auto max-w-5xl space-y-6"><header><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Assessment Access Center</p><h1 className="mt-2 text-3xl font-black tracking-tight">Create Assessment Access</h1><p className="mt-2 text-sm leading-6 text-slate-600">Complete all five steps, review the dry run, and explicitly confirm company issuance.</p></header>
    <nav aria-label="Assessment access progress" className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3"><ol className="flex min-w-[680px] items-center gap-2">{steps.map((label, index) => { const number = index + 1; const active = number === step; const complete = number < step; return <li key={label} className="flex flex-1 items-center"><span aria-current={active ? "step" : undefined} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${active ? "bg-blue-600 text-white" : complete ? "bg-emerald-50 text-emerald-800" : "text-slate-500"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white/20" : complete ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>{complete ? <Check className="h-4 w-4" aria-hidden="true" /> : number}</span>{label}</span></li>; })}</ol></nav>
    <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle>{steps[step - 1]}</CardTitle><CardDescription>{step === 1 ? "Select a current published production assessment." : step === 2 ? "Choose how access will be issued." : step === 3 ? "Enter the operational details for this access." : step === 4 ? "Choose the report audience for this issuance." : "Review the validated request before the execution milestone."}</CardDescription></CardHeader><CardContent className="space-y-6">
      {step === 1 && <fieldset><legend className="sr-only">Select assessment</legend><div className="grid gap-3 md:grid-cols-2">{assessments.map((assessment) => <button key={`${assessment.id}@${assessment.version}`} type="button" onClick={() => chooseAssessment(assessment.id)} aria-pressed={state.assessmentId === assessment.id} className={`rounded-2xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${state.assessmentId === assessment.id ? "border-blue-600 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-300"}`}><span className="flex items-start justify-between gap-3"><span><span className="block font-black text-slate-950">{assessment.name}</span><span className="mt-1 block text-xs text-slate-500">/{assessment.slug} · v{assessment.version}</span></span>{state.assessmentId === assessment.id && <Check className="h-5 w-5 text-blue-700" aria-hidden="true" />}</span><span className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">{assessment.languages.join(" · ").toUpperCase()}</Badge>{assessment.individualAvailable && <Badge variant="outline">Individual</Badge>}{assessment.companyAvailable && <Badge variant="outline">Company</Badge>}</span></button>)}</div><ErrorText id="assessment-error" message={errors.assessmentId} /></fieldset>}
      {step === 2 && <RadioGroup value={state.accessType} onValueChange={(value) => chooseAccessType(value as AssessmentAccessType)} className="grid gap-4 md:grid-cols-2" aria-describedby={errors.accessType ? "access-type-error" : undefined}>{(["company", "individual"] as const).map((type) => { const available = type === "company" ? selectedAssessment?.companyAvailable && selectedAssessment.companyIssuanceAvailable : selectedAssessment?.individualAvailable; const Icon = type === "company" ? Building2 : UserRound; return <Label key={type} htmlFor={`access-${type}`} className={`flex min-h-36 cursor-pointer items-start gap-4 rounded-2xl border p-5 ${available ? "hover:border-blue-400" : "cursor-not-allowed bg-slate-50 text-slate-400"}`}><RadioGroupItem id={`access-${type}`} value={type} disabled={!available} className="mt-1" /><span><Icon className="mb-3 h-6 w-6" aria-hidden="true" /><span className="block text-lg font-black capitalize">{type}</span><span className="mt-1 block text-sm font-normal leading-6">{type === "company" ? "Company wallet, manager, and employee access configuration." : "Named participant with paid or complimentary funding."}</span>{!available && <span className="mt-2 block text-xs font-bold">{type === "company" && selectedAssessment?.companyAvailable ? "Existing manager-dashboard activation is not available for this assessment yet." : "Not supported by this assessment definition."}</span>}</span></Label>; })}<ErrorText id="access-type-error" message={errors.accessType} /></RadioGroup>}
      {step === 3 && state.accessType === "company" && <div className="grid gap-5 sm:grid-cols-2"><Field id="company-name" label="Company Name" value={state.companyName} error={errors.companyName} onChange={(value) => update("companyName", value)} /><Field id="manager-name" label="Manager Name" value={state.managerName} error={errors.managerName} onChange={(value) => update("managerName", value)} /><Field id="manager-email" label="Manager Email" type="email" value={state.managerEmail} error={errors.managerEmail} onChange={(value) => update("managerEmail", value)} /><Field id="credits" label="Credits" type="number" min="2" max="100000" step="1" value={state.credits} error={errors.credits} onChange={(value) => update("credits", value)} hint="Any whole number from 2 to 100,000. No package presets." /><div className="sm:col-span-2"><Field id="company-commercial-reference" label="Commercial Reference" value={state.commercialReference} error={errors.commercialReference} onChange={(value) => update("commercialReference", value)} hint="Invoice, PO, Cash, Bank Transfer, Stripe, Manual Sale, or Corporate Contract." /></div></div>}
      {step === 3 && state.accessType === "individual" && <div className="grid gap-5 sm:grid-cols-2"><Field id="participant-name" label="Participant Name" value={state.participantName} error={errors.participantName} onChange={(value) => update("participantName", value)} /><Field id="participant-email" label="Participant Email" type="email" value={state.participantEmail} error={errors.participantEmail} onChange={(value) => update("participantEmail", value)} /><fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-bold">Funding Type</legend><RadioGroup value={state.fundingType} onValueChange={(value) => update("fundingType", value as AssessmentFundingType)} className="grid gap-3 sm:grid-cols-2" aria-describedby={errors.fundingType ? "funding-error" : undefined}>{(["paid", "complimentary"] as const).map((type) => { const disabled = type === "complimentary" && !selectedAssessment?.complimentaryAvailable; return <Label key={type} htmlFor={`funding-${type}`} className={`flex items-center gap-3 rounded-xl border p-4 font-bold capitalize ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "cursor-pointer"}`}><RadioGroupItem id={`funding-${type}`} value={type} disabled={disabled} />{type}{disabled && <span className="text-xs font-normal">Not supported</span>}</Label>; })}</RadioGroup><ErrorText id="funding-error" message={errors.fundingType} /></fieldset><div className="sm:col-span-2"><Field id="individual-commercial-reference" label="Commercial Reference" value={state.commercialReference} error={errors.commercialReference} onChange={(value) => update("commercialReference", value)} hint="Invoice, PO, Cash, Bank Transfer, Stripe, Manual Sale, or Corporate Contract." /></div></div>}
      {step === 4 && <div className="max-w-xl"><Label htmlFor="report-visibility" className="font-bold">Report Visibility</Label><Select value={state.reportVisibility} onValueChange={(value) => update("reportVisibility", value as AssessmentReportVisibility)}><SelectTrigger id="report-visibility" className="mt-2 h-11" aria-describedby={errors.reportVisibility ? "visibility-error" : "visibility-help"}><SelectValue placeholder="Select report visibility" /></SelectTrigger><SelectContent>{ASSESSMENT_REPORT_VISIBILITIES.map((value) => <SelectItem key={value} value={value}>{value === "participant" ? "Participant" : "Manager Only"}</SelectItem>)}</SelectContent></Select><p id="visibility-help" className="mt-2 text-sm leading-6 text-slate-500">This policy belongs to this issuance. It is not inherited from the assessment.</p><ErrorText id="visibility-error" message={errors.reportVisibility} /></div>}
      {step === 5 && <div className="space-y-5"><dl className="rounded-2xl border border-slate-200 bg-slate-50 px-5"><SummaryRow label="Assessment" value={selectedAssessment ? `${selectedAssessment.name} · v${selectedAssessment.version}` : ""} /><SummaryRow label="Access Type" value={state.accessType === "company" ? "Company" : "Individual"} />{state.accessType === "company" ? <><SummaryRow label="Company" value={state.companyName} /><SummaryRow label="Manager" value={`${state.managerName} · ${state.managerEmail}`} /><SummaryRow label="Credits" value={state.credits} /><SummaryRow label="Funding Type" value="Paid" /></> : <><SummaryRow label="Participant" value={`${state.participantName} · ${state.participantEmail}`} /><SummaryRow label="Funding Type" value={state.fundingType === "paid" ? "Paid" : "Complimentary"} /></>}<SummaryRow label="Commercial Reference" value={state.commercialReference} /><SummaryRow label="Report Visibility" value={state.reportVisibility === "participant" ? "Participant" : "Manager Only"} /></dl>{state.accessType === "company" ? issued ? <div role="status" className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div><p className="font-black text-emerald-950">Company assessment access issued</p><p className="mt-1 text-sm leading-6 text-emerald-800">{issued.companyName} now has {issued.credits} credits. The issuance policy and administrative audit were saved.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => copyLink(issued.employeeAssessmentPath, "Participant assessment link")}><Copy className="mr-2 h-4 w-4" />Copy Participant Link</Button><Button type="button" variant="outline" onClick={() => copyLink(issued.managerDashboardPath, "Manager dashboard link")}><Copy className="mr-2 h-4 w-4" />Copy Manager Link</Button><Button asChild><a href={issued.managerDashboardPath} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open Manager Dashboard</a></Button></div></div> : <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-5"><div role="status"><p className="font-black text-blue-950">Ready to issue company access</p><p className="mt-1 text-sm leading-6 text-blue-800">Preview the live records first. Confirmation is required before anything is created.</p></div>{actionError && <p role="alert" className="text-sm font-semibold text-rose-700">{actionError}</p>}<Button type="button" onClick={() => submitCompanyIssuance("preview")} disabled={submitting} className="bg-blue-700 font-bold hover:bg-blue-800">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking…</> : "Preview Issuance"}</Button></div> : <div role="status" className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="font-black text-slate-950">Individual issuance is not available in this milestone.</p><p className="mt-1 text-sm leading-6 text-slate-600">No individual or complimentary access has been created.</p></div>}</div>}
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row"><Button type="button" variant="outline" onClick={() => step === 1 ? setStarted(false) : setStep((current) => current - 1)}><ArrowLeft className="mr-2 h-4 w-4" />{step === 1 ? "Exit wizard" : "Back"}</Button>{step < 5 && <Button type="button" onClick={next} className="bg-slate-950 font-bold hover:bg-slate-800">Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>}</div>
    </CardContent></Card>
    <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Issue company assessment access?</DialogTitle><DialogDescription>This creates live company access and cannot be automatically rolled back.</DialogDescription></DialogHeader>{preview && <div className="space-y-4"><dl className="rounded-xl border border-slate-200 px-4"><SummaryRow label="Company" value={String(preview.expectedResult.company || "")} /><SummaryRow label="Manager" value={String(preview.expectedResult.manager || "")} /><SummaryRow label="Credits" value={Number(preview.expectedResult.credits || 0)} /><SummaryRow label="Report Visibility" value={String(preview.expectedResult.reportVisibility || "")} /></dl><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{preview.warnings.map((warning) => <p key={warning} className="mb-2 last:mb-0"><strong>Warning:</strong> {warning}</p>)}</div></div>}{actionError && <p role="alert" className="text-sm font-semibold text-rose-700">{actionError}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => setConfirmationOpen(false)} disabled={submitting}>Cancel</Button><Button type="button" onClick={() => submitCompanyIssuance("execute")} disabled={submitting} className="bg-rose-700 font-bold hover:bg-rose-800">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Issuing…</> : "Issue Company Access"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Field({ id, label, value, onChange, error, hint, type = "text", min, max, step }: { id: string; label: string; value: string; onChange(value: string): void; error?: string; hint?: string; type?: string; min?: string; max?: string; step?: string }) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div><Label htmlFor={id} className="font-bold">{label}</Label><Input id={id} type={type} min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={describedBy} className="mt-2 h-11" />{hint && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>}<ErrorText id={`${id}-error`} message={error} /></div>;
}
