import "server-only";

export type ActionPhase = "permission" | "validation" | "dry-run" | "confirmation" | "execution" | "audit" | "refresh" | "success" | "rollback";
export type ActionPhaseStatus = "pending" | "running" | "completed" | "skipped" | "failed";

export type ActionProgressEvent = {
  phase: ActionPhase;
  status: ActionPhaseStatus;
  occurredAt: string;
};

export type ActionProgressState = {
  current: ActionPhase;
  status: "running" | "completed" | "failed";
  events: ActionProgressEvent[];
};

export class ProgressStateModel {
  private readonly events: ActionProgressEvent[] = [];
  private current: ActionPhase = "permission";
  private status: ActionProgressState["status"] = "running";

  mark(phase: ActionPhase, status: ActionPhaseStatus, occurredAt = new Date().toISOString()) {
    this.current = phase;
    this.events.push({ phase, status, occurredAt });
    if (status === "failed") this.status = "failed";
    if (phase === "success" && status === "completed") this.status = "completed";
  }

  snapshot(): ActionProgressState {
    return { current: this.current, status: this.status, events: this.events.map((event) => ({ ...event })) };
  }
}
