"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Preview = {
  currentState: { company?: unknown; packageSize?: unknown; creditsRemaining?: unknown; creditsUsed?: unknown };
  expectedResult: { creditsRemaining?: unknown; creditsUsed?: unknown; creditImpact?: unknown };
  affectedRecords: Array<{ type: string; id: string; label?: string }>;
  warnings: string[];
};

export function RestoreCreditAction({ companyId, companyName, disabled }: { companyId: string; companyName: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [operationId, setOperationId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(mode: "preview" | "execute") {
    const normalizedReason = reason.trim();
    if (!normalizedReason) { setError("A reason is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/actions/credits/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, companyId, reason: normalizedReason, operationId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result?.error?.fields?.reason || result?.error?.message || "The credit could not be restored.");
        return;
      }
      if (mode === "preview") {
        setPreview(result.data.dryRun);
      } else {
        toast.success(`One credit restored. Balance: ${result.data.previousBalance} → ${result.data.newBalance}.`);
        setOpen(false);
        setReason("");
        setPreview(null);
        setOperationId("");
        router.refresh();
      }
    } catch {
      setError("The credit could not be restored. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setOperationId(crypto.randomUUID());
    } else {
      setReason("");
      setPreview(null);
      setOperationId("");
      setError("");
    }
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}><DialogTrigger asChild><Button type="button" variant="outline" disabled={disabled} className="h-11 justify-start gap-2 bg-white"><Undo2 className="h-4 w-4" aria-hidden="true" />Restore Credit</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Restore one credit to:</DialogTitle><DialogDescription className="text-base font-bold text-slate-950">{companyName}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="restore-credit-reason">Reason (required)</Label><Textarea id="restore-credit-reason" value={reason} onChange={(event) => { setReason(event.target.value); setPreview(null); }} maxLength={500} rows={4} placeholder="Describe the approved exceptional correction." aria-describedby={error ? "restore-credit-error" : undefined} aria-invalid={Boolean(error)} /></div>{error ? <p id="restore-credit-error" role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}{preview ? <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" aria-label="Restore Credit preview"><p><strong>Company:</strong> {String(preview.currentState.company || companyName)}</p><p><strong>Package size:</strong> {String(preview.currentState.packageSize)}</p><p><strong>Current balance:</strong> {String(preview.currentState.creditsRemaining)}</p><p><strong>Expected balance:</strong> {String(preview.expectedResult.creditsRemaining)}</p>{preview.warnings.map((warning) => <p key={warning}><strong>Warning:</strong> {warning}</p>)}</div> : null}</div><DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>{!preview ? <Button type="button" onClick={() => submit("preview")} disabled={submitting || !reason.trim() || !operationId}>{submitting ? "Checking…" : "Preview"}</Button> : <Button type="button" onClick={() => submit("execute")} disabled={submitting || !operationId} className="bg-blue-700 hover:bg-blue-800">{submitting ? "Restoring…" : "Restore Credit"}</Button>}</DialogFooter></DialogContent></Dialog>;
}
