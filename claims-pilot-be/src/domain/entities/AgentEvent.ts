export type AgentEventKind = "delegate" | "reason" | "evidence" | "debate" | "decision" | "escalate";
export type AgentEventColor = "info" | "success" | "warning" | "danger" | "cyan";

export interface AgentEvent {
  id: string;
  investigationId: string;
  claimId: string;
  agent: string;
  color: AgentEventColor;
  kind: AgentEventKind;
  text: string;
  confidence: number | null;
  targetAgent: string | null;
  timestamp: Date;
}
