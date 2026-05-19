export type InvestigationStatus =
  | "queued"
  | "delegating"
  | "investigating"
  | "debating"
  | "deciding"
  | "complete"
  | "escalated";

export interface Investigation {
  id: string;
  claimId: string;
  status: InvestigationStatus;
  fraudScore: number | null;
  confidence: number | null;
  recommendationAction: string | null;
  recommendationAmount: number | null;
  recommendationReason: string | null;
  recommendationTone: "success" | "warning" | "danger" | null;
  activeAgents: string[];
  startedAt: Date;
  completedAt: Date | null;
}
