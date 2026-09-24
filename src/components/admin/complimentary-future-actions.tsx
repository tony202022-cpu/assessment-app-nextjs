"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Clock3, Copy, ExternalLink, Gift, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Preview = { currentState: Record<string, unknown>; expectedResult: Record<string, unknown>; affectedRecords: Array<{ type: string; id: string; label?: string }>; warnings: string[] };
type Generated = { participantName: string; participantEmail: string; assessmentUrl: string; expiresAt: string | null; status: string };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const disabledActions = [
  { label: "Email Link", icon: Mail },
  { label: "Revoke Token", icon: Ban },
  { label: "Extend Expiry", icon: Clock3 },
  { label: "Delete Token", icon: Trash2 },
];

export function ComplimentaryFutureActions({
  assessmentId,
  assessmentVersion,
  assessmentName,
  eligible,
}: {
  assessmentId: string;
  assessmentVersion: string;
  assessmentName: string;
  eligible: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [languageMode, setLanguageMode] = useState<"participant-choice" | "en" | "ar">("participant-choice");
  const [reportVisibility, setReportVisibility] = useState<"participant-only" | "admin-only">("participant-only");
  const [operationId, setOperationId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function invalidatePreview() {
    setPreview(null);
    setOperationId("");
  }

  async function call(mode: "preview" | "execute") {
    const normalizedName = participantName.trim().replace(/\s+/g, " ");
    const normalizedEmail = participantEmail.trim().toLowerCase();
    const normalizedReason = reason.trim().replace(/\s+/g, " ");
    if (normalizedName.length < 2) { setError("Participant name is required."); return; }
    if (!EMAIL_PATTERN.test(normalizedEmail)) { setError("Enter a valid participant email."); return; }
    if (!normalizedReason) { setError("A reason is required."); return; }
    const id = operationId || crypto.randomUUID();
    if (!operationId) setOperationId(id);
    const expiry = expiresAt ? new Date(expiresAt).toISOString() : null;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/actions/assessment-access/individual/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          operationId: id,
          assessmentDefinitionId: assessmentId,
          assessmentDefinitionVersion: assessmentVersion,
          participantName: normalizedName,
          participantEmail: normalizedEmail,
          fundingType: "complimentary",
          issuanceType: "complimentary",
          reportVisibility,
          languageMode,
          expiresAt: expiry,
          reason: normalizedReason,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result?.error?.fields?.participantName || result?.error?.fields?.participantEmail || result?.error?.fields?.reason || result?.error?.fields?.expiresAt || result?.error?.fields?.assessmentDefinitionId || result?.error?.message || "The request could not be completed.");
        return;
      }
      if (mode === "preview") {
        setPreview(result.data.dryRun);
      } else {
        setGenerated({ ...result.data, expiresAt: expiry, status: "Active" });
        toast.success("Complimentary access generated.");
        router.refresh();
      }
    } catch {
      setError("The request could not be completed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.assessmentUrl);
    toast.success("Assessment link copied.");
  }

  return <section aria-labelledby="complimentary-actions" className="space-y-4">
    <Alert className="border-blue-200 bg-blue-50 text-blue-950"><Gift className="h-4 w-4" aria-hidden="true" /><AlertTitle id="complimentary-actions">Complimentary administration</AlertTitle><AlertDescription>Generate is enabled for authorized administrators. Revocation, expiry changes, deletion, and email delivery remain unavailable.</AlertDescription></Alert>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !generated) { invalidatePreview(); setError(""); } }}>
        <DialogTrigger asChild><Button type="button" disabled={!eligible || !assessmentVersion} className="h-11 justify-start gap-2 bg-blue-700 hover:bg-blue-800"><Gift className="h-4 w-4" aria-hidden="true" />Generate Complimentary Access</Button></DialogTrigger>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Generate complimentary access for:</DialogTitle><DialogDescription className="text-base font-bold text-slate-950">{assessmentName}</DialogDescription></DialogHeader>
          {generated ? <div className="space-y-4"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-900">{generated.status} for {generated.participantName} ({generated.participantEmail}) · {generated.expiresAt ? `expires ${new Date(generated.expiresAt).toLocaleString()}` : "No expiry"}</p><Input readOnly value={generated.assessmentUrl} className="mt-3 bg-white" aria-label="Generated assessment URL" /></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={copyLink}><Copy className="mr-2 h-4 w-4" />Copy Link</Button><Button asChild><a href={generated.assessmentUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open Assessment</a></Button></div></div> : <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="complimentary-participant-name">Participant name</Label><Input id="complimentary-participant-name" value={participantName} onChange={(event) => { setParticipantName(event.target.value); invalidatePreview(); }} maxLength={200} /></div><div className="space-y-2"><Label htmlFor="complimentary-participant-email">Participant email</Label><Input id="complimentary-participant-email" type="email" value={participantEmail} onChange={(event) => { setParticipantEmail(event.target.value); invalidatePreview(); }} maxLength={254} /></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="complimentary-language">Language</Label><Select value={languageMode} onValueChange={(value) => { setLanguageMode(value as typeof languageMode); invalidatePreview(); }}><SelectTrigger id="complimentary-language"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="participant-choice">Participant chooses English / Arabic</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="ar">Arabic</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="complimentary-report-visibility">Report visibility</Label><Select value={reportVisibility} onValueChange={(value) => { setReportVisibility(value as typeof reportVisibility); invalidatePreview(); }}><SelectTrigger id="complimentary-report-visibility"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="participant-only">Participant only</SelectItem><SelectItem value="admin-only">Admin only</SelectItem></SelectContent></Select></div></div>
            <div className="space-y-2"><Label htmlFor="complimentary-expiry">Optional expiry</Label><Input id="complimentary-expiry" type="datetime-local" value={expiresAt} onChange={(event) => { setExpiresAt(event.target.value); invalidatePreview(); }} /><p className="text-xs text-slate-500">Leave blank for No Expiry.</p></div>
            <div className="space-y-2"><Label htmlFor="complimentary-reason">Reason (required)</Label><Textarea id="complimentary-reason" value={reason} onChange={(event) => { setReason(event.target.value); invalidatePreview(); }} maxLength={500} rows={3} aria-invalid={Boolean(error)} /></div>
            {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
            {preview ? <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">{Object.entries(preview.expectedResult).map(([key, value]) => <p key={key}><strong>{previewLabel(key)}:</strong> {normalizedPreviewValue(value)}</p>)}<p><strong>Affected records:</strong> {preview.affectedRecords.map((record) => record.label || record.type).join(", ")}</p>{preview.warnings.map((warning) => <p key={warning} className="text-amber-800">Warning: {warning}</p>)}</div> : null}
          </div>}
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>{!generated && !preview ? <Button type="button" onClick={() => call("preview")} disabled={submitting || !participantName.trim() || !participantEmail.trim() || !reason.trim()}>{submitting ? "Checking…" : "Preview"}</Button> : null}{!generated && preview ? <Button type="button" onClick={() => call("execute")} disabled={submitting}>{submitting ? "Generating…" : "Confirm and Generate"}</Button> : null}</DialogFooter>
        </DialogContent>
      </Dialog>
      {disabledActions.map((action) => { const Icon = action.icon; return <Button key={action.label} type="button" variant="outline" disabled className="h-11 justify-start gap-2 bg-white"><Icon className="h-4 w-4" aria-hidden="true" />{action.label}</Button>; })}
    </div>
  </section>;
}

function normalizedPreviewValue(value: unknown) {
  return value == null ? "—" : String(value);
}

function previewLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
}
