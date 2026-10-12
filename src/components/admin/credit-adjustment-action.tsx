"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MinusCircle, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AdjustmentKind = "add" | "remove";
type Preview = {
  currentState: { company?: unknown; packageSize?: unknown; creditsRemaining?: unknown; creditsUsed?: unknown };
  expectedResult: { action?: unknown; amount?: unknown; packageSize?: unknown; creditsRemaining?: unknown; creditsUsed?: unknown };
  warnings: string[];
};

export function CreditAdjustmentAction({ kind, companyId, companyName, currentAllocation, currentBalance, disabled }: {
  kind: AdjustmentKind;
  companyId: string;
  companyName: string;
  currentAllocation: number;
  currentBalance: number;
  disabled: boolean;
}) {
  const router = useRouter();
  const label = kind === "add" ? "Add Credits" : "Remove Credits";
  const Icon = kind === "add" ? PlusCircle : MinusCircle;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [operationId, setOperationId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetPreview() { setPreview(null); setError(""); }

  async function submit(mode: "preview" | "execute") {
    const parsedAmount = Number(amount);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount < 1) { setError("Enter a positive whole-number amount."); return; }
    if (!reason.trim()) { setError("A reason is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/actions/credits/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, companyId, amount: parsedAmount, reason: reason.trim(), internalNote: internalNote.trim(), operationId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result?.error?.fields?.amount || result?.error?.fields?.reason || result?.error?.fields?.internalNote || result?.error?.message || `${label} could not be completed.`);
        return;
      }
      if (mode === "preview") {
        setPreview(result.data.dryRun);
      } else {
        toast.success(`${label} completed. Balance: ${result.data.previousBalance} → ${result.data.newBalance}.`);
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError(`${label} could not be completed. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setOperationId(crypto.randomUUID());
    } else {
      setAmount(""); setReason(""); setInternalNote(""); setPreview(null); setOperationId(""); setError("");
    }
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><Button type="button" variant="outline" disabled={disabled} className="h-11 justify-start gap-2 bg-white"><Icon className="h-4 w-4" aria-hidden="true" />{label}</Button></DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>{label}</DialogTitle><DialogDescription>Adjust the allocation and remaining balance for <strong className="text-slate-950">{companyName}</strong>. Used credits remain unchanged.</DialogDescription></DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><p><strong>Current allocation:</strong> {currentAllocation}</p><p><strong>Current balance:</strong> {currentBalance}</p></div>
        <div className="space-y-2"><Label htmlFor={`${kind}-credits-amount`}>Amount</Label><Input id={`${kind}-credits-amount`} type="number" min={1} step={1} value={amount} onChange={(event) => { setAmount(event.target.value); resetPreview(); }} placeholder="Enter a whole number" /></div>
        <div className="space-y-2"><Label htmlFor={`${kind}-credits-reason`}>Reason (required)</Label><Textarea id={`${kind}-credits-reason`} value={reason} onChange={(event) => { setReason(event.target.value); resetPreview(); }} maxLength={500} rows={3} placeholder="Why is this allocation adjustment required?" /></div>
        <div className="space-y-2"><Label htmlFor={`${kind}-credits-note`}>Internal note (optional)</Label><Textarea id={`${kind}-credits-note`} value={internalNote} onChange={(event) => { setInternalNote(event.target.value); resetPreview(); }} maxLength={1000} rows={2} placeholder="Internal context for administrators." /></div>
        {error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}
        {preview ? <div className={`space-y-2 rounded-xl border p-4 text-sm ${kind === "remove" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-blue-200 bg-blue-50 text-blue-950"}`} aria-label={`${label} confirmation`}>
          <p><strong>Company:</strong> {String(preview.currentState.company || companyName)}</p>
          <p><strong>Action:</strong> {label}</p>
          <p><strong>Amount:</strong> {String(preview.expectedResult.amount)}</p>
          <p><strong>Current balance:</strong> {String(preview.currentState.creditsRemaining)}</p>
          <p><strong>New balance:</strong> {String(preview.expectedResult.creditsRemaining)}</p>
          <p><strong>Allocation:</strong> {String(preview.currentState.packageSize)} → {String(preview.expectedResult.packageSize)}</p>
          {preview.warnings.map((warning) => <p key={warning}><strong>Note:</strong> {warning}</p>)}
        </div> : null}
      </div>
      <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>{!preview ? <Button type="button" onClick={() => submit("preview")} disabled={submitting || !amount || !reason.trim() || !operationId}>{submitting ? "Checking…" : "Preview"}</Button> : <Button type="button" onClick={() => submit("execute")} disabled={submitting || !operationId} className={kind === "remove" ? "bg-rose-700 hover:bg-rose-800" : "bg-blue-700 hover:bg-blue-800"}>{submitting ? "Applying…" : `Confirm ${label}`}</Button>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}
