"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Preview = {
  currentState: Record<string, unknown>;
  expectedResult: Record<string, unknown>;
  affectedRecords: Array<{ type: string; id: string; label?: string }>;
  warnings: string[];
};

type Regenerated = { companyName: string; managerDashboardPath: string; status: "Active" };

export function RegenerateManagerTokenAction({ companyId, companyName, disabled }: { companyId: string; companyName: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [regenerated, setRegenerated] = useState<Regenerated | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(mode: "preview" | "execute") {
    const normalizedReason = reason.trim();
    if (!normalizedReason) { setError("A reason is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/actions/companies/regenerate-manager-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, companyId, reason: normalizedReason }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result?.error?.fields?.reason || result?.error?.fields?.companyId || result?.error?.message || "The manager token could not be regenerated.");
        return;
      }
      if (mode === "preview") {
        setPreview(result.data.dryRun);
      } else {
        setRegenerated(result.data);
        toast.success("Manager token regenerated. The previous link is no longer valid.");
        router.refresh();
      }
    } catch {
      setError("The manager token could not be regenerated. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyReplacementLink() {
    if (!regenerated) return;
    await navigator.clipboard.writeText(`${window.location.origin}${regenerated.managerDashboardPath}`);
    toast.success("Replacement manager dashboard link copied.");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setReason("");
      setPreview(null);
      setRegenerated(null);
      setError("");
    }
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button type="button" variant="outline" disabled={disabled} className="h-11 justify-start gap-2 bg-white"><KeyRound className="h-4 w-4" aria-hidden="true" />Regenerate Manager Token</Button></DialogTrigger>
    <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Regenerate manager token for:</DialogTitle><DialogDescription className="text-base font-bold text-slate-950">{companyName}</DialogDescription></DialogHeader>
      {regenerated ? <div className="space-y-4"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-bold text-emerald-900">Replacement link active</p><p className="mt-1 text-sm text-emerald-800">The previous manager dashboard link is now invalid.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={copyReplacementLink}><Copy className="mr-2 h-4 w-4" aria-hidden="true" />Copy New Link</Button><Button asChild><a href={regenerated.managerDashboardPath} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />Open Dashboard</a></Button></div></div> : <div className="space-y-4"><div className="space-y-2"><Label htmlFor="regenerate-manager-token-reason">Reason (required)</Label><Textarea id="regenerate-manager-token-reason" value={reason} onChange={(event) => { setReason(event.target.value); setPreview(null); }} maxLength={500} rows={3} placeholder="Explain why manager access must be replaced." aria-invalid={Boolean(error)} aria-describedby={error ? "regenerate-manager-token-error" : undefined} /></div>{error ? <p id="regenerate-manager-token-error" role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}{preview ? <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p><strong>Current state:</strong> Manager access is active.</p><p><strong>Expected result:</strong> Current link invalidated; replacement link active.</p>{preview.warnings.map((warning) => <p key={warning}><strong>Warning:</strong> {warning}</p>)}</div> : null}</div>}
      <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Close</Button></DialogClose>{!regenerated && !preview ? <Button type="button" onClick={() => submit("preview")} disabled={submitting || !reason.trim()}>{submitting ? "Checking…" : "Preview"}</Button> : null}{!regenerated && preview ? <Button type="button" onClick={() => submit("execute")} disabled={submitting} className="bg-rose-700 hover:bg-rose-800">{submitting ? "Regenerating…" : "Regenerate Manager Token"}</Button> : null}</DialogFooter>
    </DialogContent>
  </Dialog>;
}
