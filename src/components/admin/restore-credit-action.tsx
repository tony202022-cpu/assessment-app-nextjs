"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RestoreCreditAction({ companyId, companyName, disabled }: { companyId: string; companyName: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function restore() {
    const normalizedReason = reason.trim();
    if (!normalizedReason) { setError("A reason is required."); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/actions/credits/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, reason: normalizedReason }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setError(result?.error?.fields?.reason || result?.error?.message || "The credit could not be restored.");
        return;
      }
      toast.success(`One credit restored. Balance: ${result.data.oldBalance} → ${result.data.newBalance}.`);
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("The credit could not be restored. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(""); }}><DialogTrigger asChild><Button type="button" variant="outline" disabled={disabled} className="h-11 justify-start gap-2 bg-white"><Undo2 className="h-4 w-4" aria-hidden="true" />Restore Credit</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Restore one credit to:</DialogTitle><DialogDescription className="text-base font-bold text-slate-950">{companyName}</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="restore-credit-reason">Reason (required)</Label><Textarea id="restore-credit-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={4} placeholder="Describe the approved exceptional correction." aria-describedby={error ? "restore-credit-error" : undefined} aria-invalid={Boolean(error)} />{error ? <p id="restore-credit-error" role="alert" className="text-sm font-semibold text-rose-700">{error}</p> : null}</div><DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose><Button type="button" onClick={restore} disabled={submitting || !reason.trim()} className="bg-blue-700 hover:bg-blue-800">{submitting ? "Restoring…" : "Restore Credit"}</Button></DialogFooter></DialogContent></Dialog>;
}
