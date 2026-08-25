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
import { Textarea } from "@/components/ui/textarea";

type Preview = { currentState: Record<string, unknown>; expectedResult: Record<string, unknown>; affectedRecords: Array<{ type: string; id: string; label?: string }>; warnings: string[] };
type Generated = { assessmentName: string; assessmentUrl: string; expiresAt: string; status: string };

const disabledActions = [
  { label: "Email Link", icon: Mail },
  { label: "Revoke Token", icon: Ban },
  { label: "Extend Expiry", icon: Clock3 },
  { label: "Delete Token", icon: Trash2 },
];

function defaultExpiry() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ComplimentaryFutureActions({ assessmentId, assessmentName, eligible }: { assessmentId: string; assessmentName: string; eligible: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function call(mode: "preview" | "execute") {
    const normalizedReason = reason.trim();
    if (!normalizedReason) { setError("A reason is required."); return; }
    if (!expiresAt) { setError("Choose an expiry."); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/actions/complimentary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, assessmentId, reason: normalizedReason, expiresAt: new Date(expiresAt).toISOString() }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result?.error?.fields?.reason || result?.error?.fields?.expiresAt || result?.error?.fields?.assessmentId || result?.error?.message || "The request could not be completed.");
        return;
      }
      if (mode === "preview") setPreview(result.data.dryRun);
      else { setGenerated(result.data); toast.success("Complimentary access generated."); router.refresh(); }
    } catch { setError("The request could not be completed. Please try again."); }
    finally { setSubmitting(false); }
  }

  async function copyLink() {
    if (!generated) return;
    await navigator.clipboard.writeText(generated.assessmentUrl);
    toast.success("Assessment link copied.");
  }

  return <section aria-labelledby="complimentary-actions" className="space-y-4">
    <Alert className="border-blue-200 bg-blue-50 text-blue-950"><Gift className="h-4 w-4" aria-hidden="true" /><AlertTitle id="complimentary-actions">Complimentary administration</AlertTitle><AlertDescription>Generate is enabled for authorized administrators. Revocation, expiry changes, deletion, and email delivery remain unavailable.</AlertDescription></Alert>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !generated) { setPreview(null); setError(""); } }}>
        <DialogTrigger asChild><Button type="button" disabled={!eligible} className="h-11 justify-start gap-2 bg-blue-700 hover:bg-blue-800"><Gift className="h-4 w-4" aria-hidden="true" />Generate Complimentary Token</Button></DialogTrigger>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Generate complimentary access for:</DialogTitle><DialogDescription className="text-base font-bold text-slate-950">{assessmentName}</DialogDescription></DialogHeader>
          {generated ? <div className="space-y-4"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-900">{generated.status} until {new Date(generated.expiresAt).toLocaleString()}</p><Input readOnly value={generated.assessmentUrl} className="mt-3 bg-white" aria-label="Generated assessment URL" /></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={copyLink}><Copy className="mr-2 h-4 w-4" />Copy Link</Button><Button asChild><a href={generated.assessmentUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open Assessment</a></Button></div></div> : <div className="space-y-4"><div className="space-y-2"><Label htmlFor="complimentary-expiry">Expiry</Label><Input id="complimentary-expiry" type="datetime-local" value={expiresAt} onChange={(event) => { setExpiresAt(event.target.value); setPreview(null); }} /></div><div className="space-y-2"><Label htmlFor="complimentary-reason">Reason (required)</Label><Textarea id="complimentary-reason" value={reason} onChange={(event) => { setReason(event.target.value); setPreview(null); }} maxLength={500} rows={3} aria-invalid={Boolean(error)} /></div>{error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}{preview ? <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p><strong>Assessment:</strong> {String(preview.currentState.assessment)}</p><p><strong>Expiry:</strong> {String(preview.expectedResult.expiry)}</p><p><strong>Access type:</strong> {String(preview.expectedResult.accessType)}</p><p><strong>Token lifetime:</strong> {String(preview.expectedResult.tokenLifetimeHours)} hours</p><p><strong>Expected result:</strong> {String(preview.expectedResult.result)}</p><p><strong>Affected records:</strong> {preview.affectedRecords.map((record) => record.label || record.type).join(", ")}</p>{preview.warnings.map((warning) => <p key={warning} className="text-amber-800">Warning: {warning}</p>)}</div> : null}</div>}
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>{!generated && !preview ? <Button type="button" onClick={() => call("preview")} disabled={submitting || !reason.trim() || !expiresAt}>{submitting ? "Checking…" : "Preview"}</Button> : null}{!generated && preview ? <Button type="button" onClick={() => call("execute")} disabled={submitting}>{submitting ? "Generating…" : "Generate"}</Button> : null}</DialogFooter>
        </DialogContent>
      </Dialog>
      {disabledActions.map((action) => { const Icon = action.icon; return <Button key={action.label} type="button" variant="outline" disabled className="h-11 justify-start gap-2 bg-white"><Icon className="h-4 w-4" aria-hidden="true" />{action.label}</Button>; })}
    </div>
  </section>;
}
