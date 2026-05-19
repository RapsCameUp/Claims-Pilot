import { AgentEvent } from "../entities/AgentEvent";

export interface IAgentEventRepository {
  findByInvestigationId(investigationId: string): Promise<AgentEvent[]>;
  findByClaimId(claimId: string): Promise<AgentEvent[]>;
  create(event: Omit<AgentEvent, "id" | "timestamp">): Promise<AgentEvent>;
  getRecentActivity(limit?: number): Promise<AgentEvent[]>;
}
