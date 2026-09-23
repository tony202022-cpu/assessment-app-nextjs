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

type AdjustmentType = "add" | "remove";
type Preview = {
  currentState: { company?: unknown; packageSize?: unknown; creditsRemaining?: unknown; creditsUsed?: unknown };
  expectedResult: { packageSize?: unknown; creditsRemaining?: unknown; creditsUsed?: unknown; creditImpact?: unknown };
  warnings: string[];
};

export function CreditAdjustmentAction({ companyId, companyName, type, disabled }: { companyId: string; companyName: string; type: AdjustmentType; disabled: boolean }) {
  const router = useRouter();
  const isAdd = type === "add";
  const title = isAdd ? "Add Credits" : "Remove Credits";
  const Icon = isAdd ? PlusCircle : MinusCircle;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [operationId, setOperationId] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(mode: "preview" | "execute") {
    if (!reason.trim()) { setError("A reason is required."); return; }
    if (!/^\d+$/.test(amount) || Number(amount) < 1) { setError("Enter a positive whole-number credit amount."); return; }
    setSubmitting(true); setError("");
    try {
      const response = await fetch("/api/admin/actions/credits/adjust", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, adjustmentType: type, companyId, amount: Number(amount), reason: reason.trim(), operationId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result?.error?.fields?.amount || result?.error?.fields?.reason || result?.error?.message || "The credits could not be adjusted.");
        return;
      }
      if (mode === "preview") setPreview(result.data.dryRun);
      else {
        toast.success(`${title} completed. Balance: ${result.data.previousBalance} → ${result.data.newBalance}.`);
        setOpen(false); setAmount("1"); setReason(""); setPreview(null); setOperationId(""); router.refresh();
      }
    } catch { setError("The credits could not be adjusted. Please try again."); }
    finally { setSubmitting(false); }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setOperationId(crypto.randomUUID());
    else { setAmount("1"); setReason(""); setPreview(null); setOperationId(""); setError(""); }
  }

  return <Dialog open={open} onOpenChange={handleOpenChange}><DialogTrigger asChild><Button type="button" variant="outline" disabled={disabled} className="h-11 justify-start gap-2 bg-white"><Icon className="h-4 w-4" aria-hidden="true" />{title}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{title}:</DialogTitle><DialogDescription className="text-base font-bold text-slate-950">{companyName}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor={`${type}-credit-amount`}>Number of credits</Label><Input id={`${type}-credit-amount`} type="number" min={1} max={100000} step={1} value={amount} onChange={(event) => { setAmount(event.target.value); setPreview(null); }} /></div><div className="space-y-2"><Label htmlFor={`${type}-credit-reason`}>Reason (required)</Label><Textarea id={`${type}-credit-reason`} value={reason} onChange={(event) => { setReason(event.target.value); setPreview(null); }} maxLength={500} rows={4} placeholder="State the approved business reason." /></div>{error ? <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}{preview ? <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" aria-label={`${title} preview`}><p><strong>Current package:</strong> {String(preview.currentState.packageSize)}</p><p><strong>New package:</strong> {String(preview.expectedResult.packageSize)}</p><p><strong>Current balance:</strong> {String(preview.currentState.creditsRemaining)}</p><p><strong>New balance:</strong> {String(preview.expectedResult.creditsRemaining)}</p><p><strong>Credits used:</strong> {String(preview.expectedResult.creditsUsed)} (unchanged)</p>{preview.warnings.map((warning) => <p key={warning}><strong>Warning:</strong> {warning}</p>)}</div> : null}</div><DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>{!preview ? <Button type="button" onClick={() => submit("preview")} disabled={submitting || !reason.trim() || !operationId}>{submitting ? "Checking…" : "Preview"}</Button> : <Button type="button" onClick={() => submit("execute")} disabled={submitting || !operationId} className={isAdd ? "bg-blue-700 hover:bg-blue-800" : "bg-rose-700 hover:bg-rose-800"}>{submitting ? "Applying…" : `Confirm ${title}`}</Button>}</DialogFooter></DialogContent></Dialog>;
}
