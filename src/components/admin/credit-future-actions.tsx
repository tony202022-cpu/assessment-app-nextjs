import { AlertCircle, ArrowRightLeft, Ban, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RestoreCreditAction } from "@/components/admin/restore-credit-action";
import { CreditAdjustmentAction } from "@/components/admin/credit-adjustment-action";

const actions = [
  { label: "Transfer Credits", icon: ArrowRightLeft },
  { label: "Expire Credits", icon: Ban },
  { label: "Reset Package", icon: RotateCcw },
];

export function CreditFutureActions({ companyId, companyName, packageSize, creditsRemaining, canAdd, canRemove, canRestore }: { companyId: string; companyName: string; packageSize: number; creditsRemaining: number; canAdd: boolean; canRemove: boolean; canRestore: boolean }) {
  return <section aria-labelledby="credit-future-actions" className="space-y-4"><Alert className="border-blue-200 bg-blue-50 text-blue-950"><AlertCircle className="h-4 w-4" aria-hidden="true" /><AlertTitle id="credit-future-actions">Credit administration</AlertTitle><AlertDescription>Add and Remove change allocation and balance together. Restore Credit remains an exceptional one-credit correction. Every action is capability-gated and audited.</AlertDescription></Alert><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><CreditAdjustmentAction kind="add" companyId={companyId} companyName={companyName} currentAllocation={packageSize} currentBalance={creditsRemaining} disabled={!canAdd} /><CreditAdjustmentAction kind="remove" companyId={companyId} companyName={companyName} currentAllocation={packageSize} currentBalance={creditsRemaining} disabled={!canRemove || creditsRemaining === 0} /><RestoreCreditAction companyId={companyId} companyName={companyName} disabled={!canRestore || creditsRemaining >= packageSize} />{actions.map((action) => { const Icon = action.icon; return <Button key={action.label} type="button" variant="outline" disabled className="h-11 justify-start gap-2 bg-white"><Icon className="h-4 w-4" aria-hidden="true" />{action.label}</Button>; })}</div></section>;
}
