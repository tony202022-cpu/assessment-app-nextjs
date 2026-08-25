import { AlertCircle, Coins, FileDown, Gift, KeyRound, RotateCcw, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "Add Credits", icon: Coins },
  { label: "Remove Credits", icon: Coins },
  { label: "Restore Credits", icon: RotateCcw },
  { label: "Generate Complimentary Link", icon: Gift },
  { label: "Regenerate Manager Token", icon: KeyRound },
  { label: "Export Reports", icon: FileDown },
  { label: "Delete Company", icon: Trash2 },
];

export function FutureActions() {
  return (
    <section aria-labelledby="future-actions-title" className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50 text-blue-950">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle id="future-actions-title">Coming in a future milestone.</AlertTitle>
        <AlertDescription>These controls are visible for roadmap clarity. They are disabled and perform no action.</AlertDescription>
      </Alert>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button key={action.label} type="button" variant="outline" disabled className="h-11 justify-start gap-2 bg-white">
              <Icon className="h-4 w-4" aria-hidden="true" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}

