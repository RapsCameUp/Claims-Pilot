import { pool } from "../database/pool";
import { Claim, ClaimStatus } from "../../domain/entities/Claim";
import { IClaimRepository } from "../../domain/repositories/IClaimRepository";

export class ClaimRepository implements IClaimRepository {
  async findById(id: string): Promise<Claim | null> {
    const { rows } = await pool.query("SELECT * FROM claims WHERE id = $1", [id]);
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async list(filters?: { status?: ClaimStatus; region?: string; limit?: number; offset?: number }): Promise<Claim[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.status) { conditions.push(`status = $${idx++}`); values.push(filters.status); }
    if (filters?.region) { conditions.push(`region = $${idx++}`); values.push(filters.region); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const { rows } = await pool.query(
      `SELECT * FROM claims ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset]
    );
    return rows.map(this.mapRow);
  }

  async count(filters?: { status?: ClaimStatus; region?: string }): Promise<number> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.status) { conditions.push(`status = $${idx++}`); values.push(filters.status); }
    if (filters?.region) { conditions.push(`region = $${idx++}`); values.push(filters.region); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(`SELECT COUNT(*) as count FROM claims ${where}`, values);
    return parseInt(rows[0].count, 10);
  }

  async create(claim: Omit<Claim, "id" | "createdAt" | "updatedAt">): Promise<Claim> {
    const id = `CP-${10000 + Math.floor(Math.random() * 90000)}`;
    const { rows } = await pool.query(
      `INSERT INTO claims (id, customer_id, customer_name, policy_number, type, region, amount, status, fraud_score, confidence, vehicle, description, assigned_agents, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [id, claim.customerId, claim.customerName, claim.policyNumber, claim.type, claim.region,
       claim.amount, claim.status, claim.fraudScore, claim.confidence, claim.vehicle,
       claim.description, claim.assignedAgents, claim.createdBy]
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, data: Partial<Omit<Claim, "id" | "createdAt" | "updatedAt">>): Promise<Claim> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.status) { fields.push(`status = $${idx++}`); values.push(data.status); }
    if (data.fraudScore !== undefined) { fields.push(`fraud_score = $${idx++}`); values.push(data.fraudScore); }
    if (data.confidence !== undefined) { fields.push(`confidence = $${idx++}`); values.push(data.confidence); }
    if (data.assignedAgents) { fields.push(`assigned_agents = $${idx++}`); values.push(data.assignedAgents); }
    if (data.description) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.amount) { fields.push(`amount = $${idx++}`); values.push(data.amount); }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE claims SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return this.mapRow(rows[0]);
  }

  async getStatusCounts(): Promise<Record<ClaimStatus, number>> {
    const { rows } = await pool.query(
      "SELECT status, COUNT(*) as count FROM claims GROUP BY status"
    );
    const counts: Record<string, number> = {
      FNOL: 0, Investigation: 0, "Fraud Review": 0,
      "Policy Validation": 0, "Settlement Review": 0, Escalated: 0, Closed: 0,
    };
    for (const row of rows) {
      counts[row.status] = parseInt(row.count, 10);
    }
    return counts as Record<ClaimStatus, number>;
  }

  async getRegionStats(): Promise<Array<{ region: string; claims: number; fraudRate: number }>> {
    const { rows } = await pool.query(`
      SELECT region,
             COUNT(*) as claims,
             COALESCE(AVG(CASE WHEN fraud_score > 70 THEN 1.0 ELSE 0.0 END), 0) as fraud_rate
      FROM claims
      GROUP BY region
      ORDER BY claims DESC
    `);
    return rows.map((r: any) => ({
      region: r.region,
      claims: parseInt(r.claims, 10),
      fraudRate: parseFloat(r.fraud_rate),
    }));
  }

  private mapRow(row: any): Claim {
    return {
      id: row.id,
      customerId: row.customer_id,
      customerName: row.customer_name,
      policyNumber: row.policy_number,
      type: row.type,
      region: row.region,
      amount: parseFloat(row.amount),
      status: row.status,
      fraudScore: row.fraud_score ? parseFloat(row.fraud_score) : null,
      confidence: row.confidence ? parseFloat(row.confidence) : null,
      vehicle: row.vehicle,
      description: row.description,
      assignedAgents: row.assigned_agents || [],
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
