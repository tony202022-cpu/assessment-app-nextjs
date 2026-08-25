import { AlertCircle, Gift, Mail, RotateCcw, Trash2, Undo2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "Reset Assessment", icon: RotateCcw },
  { label: "Delete Attempt", icon: Trash2 },
  { label: "Restore Credit", icon: Undo2 },
  { label: "Change Email", icon: Mail },
  { label: "Restart Assessment", icon: RotateCcw },
  { label: "Mark Complete", icon: CheckCircle2 },
  { label: "Generate Complimentary Link", icon: Gift },
];

export function ParticipantFutureActions() {
  return (
    <section aria-labelledby="participant-future-actions" className="space-y-4">
      <Alert className="border-blue-200 bg-blue-50 text-blue-950">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle id="participant-future-actions">Available in a future milestone.</AlertTitle>
        <AlertDescription>These controls are disabled and perform no action.</AlertDescription>
      </Alert>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return <Button key={action.label} type="button" variant="outline" disabled className="h-11 justify-start gap-2 bg-white"><Icon className="h-4 w-4" aria-hidden="true" />{action.label}</Button>;
        })}
      </div>
    </section>
  );
}
