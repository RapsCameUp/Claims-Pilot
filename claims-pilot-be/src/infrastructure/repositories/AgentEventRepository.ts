import { pool } from "../database/pool";
import { AgentEvent } from "../../domain/entities/AgentEvent";
import { IAgentEventRepository } from "../../domain/repositories/IAgentEventRepository";

export class AgentEventRepository implements IAgentEventRepository {
  async findByInvestigationId(investigationId: string): Promise<AgentEvent[]> {
    const { rows } = await pool.query(
      "SELECT * FROM agent_events WHERE investigation_id = $1 ORDER BY timestamp ASC",
      [investigationId]
    );
    return rows.map(this.mapRow);
  }

  async findByClaimId(claimId: string): Promise<AgentEvent[]> {
    const { rows } = await pool.query(
      "SELECT * FROM agent_events WHERE claim_id = $1 ORDER BY timestamp ASC",
      [claimId]
    );
    return rows.map(this.mapRow);
  }

  async create(event: Omit<AgentEvent, "id" | "timestamp">): Promise<AgentEvent> {
    const { rows } = await pool.query(
      `INSERT INTO agent_events (investigation_id, claim_id, agent, color, kind, text, confidence, target_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [event.investigationId, event.claimId, event.agent, event.color,
       event.kind, event.text, event.confidence, event.targetAgent]
    );
    return this.mapRow(rows[0]);
  }

  async getRecentActivity(limit: number = 20): Promise<AgentEvent[]> {
    const { rows } = await pool.query(
      "SELECT * FROM agent_events ORDER BY timestamp DESC LIMIT $1",
      [limit]
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: any): AgentEvent {
    return {
      id: row.id,
      investigationId: row.investigation_id,
      claimId: row.claim_id,
      agent: row.agent,
      color: row.color,
      kind: row.kind,
      text: row.text,
      confidence: row.confidence ? parseFloat(row.confidence) : null,
      targetAgent: row.target_agent,
      timestamp: row.timestamp,
    };
  }
}
