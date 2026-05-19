import { pool } from "../database/pool";
import { Investigation } from "../../domain/entities/Investigation";
import { IInvestigationRepository } from "../../domain/repositories/IInvestigationRepository";

export class InvestigationRepository implements IInvestigationRepository {
  async findById(id: string): Promise<Investigation | null> {
    const { rows } = await pool.query("SELECT * FROM investigations WHERE id = $1", [id]);
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async findByClaimId(claimId: string): Promise<Investigation | null> {
    const { rows } = await pool.query(
      "SELECT * FROM investigations WHERE claim_id = $1 ORDER BY started_at DESC LIMIT 1",
      [claimId]
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async list(filters?: { status?: string; limit?: number; offset?: number }): Promise<Investigation[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.status) { conditions.push(`status = $${idx++}`); values.push(filters.status); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const { rows } = await pool.query(
      `SELECT * FROM investigations ${where} ORDER BY started_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset]
    );
    return rows.map(this.mapRow);
  }

  async create(investigation: Omit<Investigation, "id" | "startedAt" | "completedAt">): Promise<Investigation> {
    const { rows } = await pool.query(
      `INSERT INTO investigations (claim_id, status, fraud_score, confidence, recommendation_action, recommendation_amount, recommendation_reason, recommendation_tone, active_agents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [investigation.claimId, investigation.status, investigation.fraudScore,
       investigation.confidence, investigation.recommendationAction,
       investigation.recommendationAmount, investigation.recommendationReason,
       investigation.recommendationTone, investigation.activeAgents]
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, data: Partial<Omit<Investigation, "id" | "startedAt">>): Promise<Investigation> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.status) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.fraudScore !== undefined) { fields.push(`fraud_score = $${idx++}`); values.push(data.fraudScore); }
    if (data.confidence !== undefined) { fields.push(`confidence = $${idx++}`); values.push(data.confidence); }
    if (data.recommendationAction !== undefined) { fields.push(`recommendation_action = $${idx++}`); values.push(data.recommendationAction); }
    if (data.recommendationAmount !== undefined) { fields.push(`recommendation_amount = $${idx++}`); values.push(data.recommendationAmount); }
    if (data.recommendationReason !== undefined) { fields.push(`recommendation_reason = $${idx++}`); values.push(data.recommendationReason); }
    if (data.recommendationTone !== undefined) { fields.push(`recommendation_tone = $${idx++}`); values.push(data.recommendationTone); }
    if (data.activeAgents) { fields.push(`active_agents = $${idx++}`); values.push(data.activeAgents); }
    if (data.completedAt !== undefined) { fields.push(`completed_at = $${idx++}`); values.push(data.completedAt); }

    values.push(id);

    const { rows } = await pool.query(
      `UPDATE investigations SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return this.mapRow(rows[0]);
  }

  private mapRow(row: any): Investigation {
    return {
      id: row.id,
      claimId: row.claim_id,
      status: row.status,
      fraudScore: row.fraud_score ? parseFloat(row.fraud_score) : null,
      confidence: row.confidence ? parseFloat(row.confidence) : null,
      recommendationAction: row.recommendation_action,
      recommendationAmount: row.recommendation_amount ? parseFloat(row.recommendation_amount) : null,
      recommendationReason: row.recommendation_reason,
      recommendationTone: row.recommendation_tone,
      activeAgents: row.active_agents || [],
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }
}
