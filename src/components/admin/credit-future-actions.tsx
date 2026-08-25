import { AlertCircle, ArrowRightLeft, Ban, Coins, RotateCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RestoreCreditAction } from "@/components/admin/restore-credit-action";

const actions = [
  { label: "Add Credits", icon: Coins },
  { label: "Remove Credits", icon: Coins },
  { label: "Transfer Credits", icon: ArrowRightLeft },
  { label: "Expire Credits", icon: Ban },
  { label: "Reset Package", icon: RotateCcw },
];

export function CreditFutureActions({ companyId, companyName, canRestore }: { companyId: string; companyName: string; canRestore: boolean }) {
  return <section aria-labelledby="credit-future-actions" className="space-y-4"><Alert className="border-blue-200 bg-blue-50 text-blue-950"><AlertCircle className="h-4 w-4" aria-hidden="true" /><AlertTitle id="credit-future-actions">Exceptional administrative actions</AlertTitle><AlertDescription>Restore Credit is enabled for approved corrections. Every other control remains unavailable.</AlertDescription></Alert><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><RestoreCreditAction companyId={companyId} companyName={companyName} disabled={!canRestore} />{actions.map((action) => { const Icon = action.icon; return <Button key={action.label} type="button" variant="outline" disabled className="h-11 justify-start gap-2 bg-white"><Icon className="h-4 w-4" aria-hidden="true" />{action.label}</Button>; })}</div></section>;
}
